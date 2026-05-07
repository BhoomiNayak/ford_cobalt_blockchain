"""
Batches API routes - create, custody, provenance.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from models.schemas import (
    BatchCreateRequest, BatchResponse, CustodyAddRequest,
    BatchSearchParams, PaginatedResponse, MessageResponse
)
from services.database import get_mongo_db
from services.blockchain import (
    get_contracts, send_transaction, bytes32_to_hex, hex_to_bytes32,
    purity_to_bps, bps_to_purity
)
from middleware.auth import require_roles, get_current_user

router = APIRouter()

ROLE_MAP = {"MINE": 0, "TRANSPORTER": 1, "PROCESSOR": 2, "REFINERY": 3, "MANUFACTURER": 4}
STATUS_MAP = {"EXTRACTED": 0, "IN_TRANSIT": 1, "PROCESSING": 2, "DELIVERED": 3, "REJECTED": 4, "FLAGGED": 5}


@router.post("/create", response_model=MessageResponse, status_code=201)
async def create_batch(
    payload: BatchCreateRequest,
    db=Depends(get_mongo_db),
    user=Depends(require_roles(["admin", "auditor", "operator"])),
):
    """Create a new cobalt batch."""
    # Verify mine exists
    mine = await db.mines.find_one({"mine_id": payload.mine_id, "status": "ACTIVE"})
    if not mine:
        raise HTTPException(status_code=400, detail="Mine not found or not active")

    contracts = get_contracts()
    tx_hash = None
    batch_id = None

    if contracts["batch_tracking"]:
        receipt = await send_transaction(
            contracts["batch_tracking"].functions.createBatch,
            hex_to_bytes32(payload.mine_id),
            int(payload.extraction_date.timestamp()),
            int(payload.weight_kg),
            purity_to_bps(payload.purity_percent),
            payload.geolocation,
            payload.photo_ipfs_hash or "",
        )
        tx_hash = receipt.transactionHash.hex()
        events = contracts["batch_tracking"].events.BatchCreated().process_receipt(receipt)
        if events:
            batch_id = bytes32_to_hex(events[0]["args"]["batchId"])

    doc = {
        "batch_id": batch_id,
        "mine_id": payload.mine_id,
        "extraction_date": payload.extraction_date,
        "weight_kg": payload.weight_kg,
        "purity_percent": payload.purity_percent,
        "geolocation": payload.geolocation,
        "photo_ipfs_hash": payload.photo_ipfs_hash,
        "status": "EXTRACTED",
        "custody_chain": [],
        "created_at": datetime.utcnow(),
        "tx_hash": tx_hash,
    }
    await db.batches.insert_one(doc)

    return MessageResponse(message="Batch created", data={"batch_id": batch_id, "tx_hash": tx_hash})


@router.post("/{batch_id}/custody", response_model=MessageResponse)
async def add_custody(
    batch_id: str,
    payload: CustodyAddRequest,
    db=Depends(get_mongo_db),
    user=Depends(get_current_user),
):
    """Add a custody handoff record to a batch."""
    batch = await db.batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    contracts = get_contracts()
    tx_hash = None

    if contracts["batch_tracking"]:
        receipt = await send_transaction(
            contracts["batch_tracking"].functions.addCustody,
            hex_to_bytes32(batch_id),
            payload.actor_id,
            ROLE_MAP.get(payload.role, 0),
            payload.location,
            bytes.fromhex(payload.signature.replace("0x", "") if payload.signature else ""),
            payload.notes or "",
        )
        tx_hash = receipt.transactionHash.hex()

    custody_record = {
        "actor_id": payload.actor_id,
        "actor_address": user["ethereum_address"] or "",
        "role": payload.role,
        "timestamp": datetime.utcnow(),
        "location": payload.location,
        "signature": payload.signature,
        "notes": payload.notes,
        "tx_hash": tx_hash,
    }

    await db.batches.update_one(
        {"batch_id": batch_id},
        {"$push": {"custody_chain": custody_record}}
    )

    return MessageResponse(message="Custody added", data={"tx_hash": tx_hash})


@router.get("/{batch_id}/provenance", response_model=BatchResponse)
async def get_provenance(batch_id: str, db=Depends(get_mongo_db)):
    """Get full provenance trail for a batch."""
    batch = await db.batches.find_one({"batch_id": batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return _doc_to_batch(batch)


@router.get("/search", response_model=PaginatedResponse)
async def search_batches(
    mine_id: str = Query(None),
    status: str = Query(None),
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    min_weight: float = Query(None),
    max_weight: float = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db=Depends(get_mongo_db),
):
    """Search batches with filters."""
    query = {}
    if mine_id:
        query["mine_id"] = mine_id
    if status:
        query["status"] = status
    if date_from or date_to:
        query["extraction_date"] = {}
        if date_from:
            query["extraction_date"]["$gte"] = date_from
        if date_to:
            query["extraction_date"]["$lte"] = date_to
    if min_weight or max_weight:
        query["weight_kg"] = {}
        if min_weight:
            query["weight_kg"]["$gte"] = min_weight
        if max_weight:
            query["weight_kg"]["$lte"] = max_weight

    total = await db.batches.count_documents(query)
    skip = (page - 1) * page_size

    cursor = db.batches.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    docs = await cursor.to_list(page_size)

    return PaginatedResponse(
        items=[_doc_to_batch(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


def _doc_to_batch(doc: dict) -> BatchResponse:
    return BatchResponse(
        batch_id=doc.get("batch_id") or str(doc["_id"]),
        mine_id=doc["mine_id"],
        extraction_date=doc["extraction_date"],
        weight_kg=doc["weight_kg"],
        purity_percent=doc["purity_percent"],
        geolocation=doc["geolocation"],
        photo_ipfs_hash=doc.get("photo_ipfs_hash"),
        status=doc.get("status", "EXTRACTED"),
        custody_chain=doc.get("custody_chain", []),
        created_at=doc["created_at"],
        tx_hash=doc.get("tx_hash"),
    )
