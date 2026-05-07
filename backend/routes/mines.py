"""
Mines API routes.
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from models.schemas import (
    MineRegisterRequest, MineResponse, MineComplianceUpdateRequest, MessageResponse
)
from services.database import get_mongo_db
from services.blockchain import get_contracts, send_transaction, bytes32_to_hex, hex_to_bytes32
from middleware.auth import require_roles

router = APIRouter()


@router.post("/register", response_model=MessageResponse, status_code=201)
async def register_mine(
    payload: MineRegisterRequest,
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor"])),
):
    """Register a new mining site on-chain and in MongoDB."""
    contracts = get_contracts()

    # On-chain
    tx_hash = None
    mine_id = None
    if contracts["mine_registry"]:
        receipt = await send_transaction(
            contracts["mine_registry"].functions.registerMine,
            payload.name,
            payload.country,
            payload.coordinates,
            payload.operator_id,
            payload.operator_address,
            payload.certifications,
            payload.metadata_ipfs_hash or "",
        )
        tx_hash = receipt.transactionHash.hex()
        # Parse mineId from event logs
        events = contracts["mine_registry"].events.MineRegistered().process_receipt(receipt)
        if events:
            mine_id = bytes32_to_hex(events[0]["args"]["mineId"])

    # MongoDB (off-chain mirror)
    doc = {
        "mine_id": mine_id,
        "name": payload.name,
        "country": payload.country,
        "coordinates": payload.coordinates,
        "operator_id": payload.operator_id,
        "operator_address": payload.operator_address,
        "certifications": payload.certifications,
        "status": "PENDING",
        "registered_at": datetime.utcnow(),
        "last_audit_date": None,
        "metadata_ipfs_hash": payload.metadata_ipfs_hash,
        "tx_hash": tx_hash,
    }
    await db.mines.insert_one(doc)

    return MessageResponse(message="Mine registered", data={"mine_id": mine_id, "tx_hash": tx_hash})


@router.get("/{mine_id}", response_model=MineResponse)
async def get_mine(mine_id: str, db=Depends(get_mongo_db)):
    """Get mine details."""
    doc = await db.mines.find_one({"mine_id": mine_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Mine not found")
    return _doc_to_mine(doc)


@router.get("/", response_model=List[MineResponse])
async def list_mines(
    status: Optional[str] = None,
    country: Optional[str] = None,
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor", "operator", "viewer"])),
):
    """List all mines with optional filters."""
    query = {}
    if status:
        query["status"] = status
    if country:
        query["country"] = country

    cursor = db.mines.find(query).sort("registered_at", -1).limit(100)
    docs = await cursor.to_list(100)
    return [_doc_to_mine(d) for d in docs]


@router.put("/{mine_id}/compliance", response_model=MessageResponse)
async def update_mine_compliance(
    mine_id: str,
    payload: MineComplianceUpdateRequest,
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor"])),
):
    """Update mine compliance status on-chain and in MongoDB."""
    doc = await db.mines.find_one({"mine_id": mine_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Mine not found")

    status_map = {"PENDING": 0, "ACTIVE": 1, "SUSPENDED": 2, "REVOKED": 3}
    contracts = get_contracts()
    tx_hash = None

    if contracts["mine_registry"]:
        receipt = await send_transaction(
            contracts["mine_registry"].functions.updateMineStatus,
            hex_to_bytes32(mine_id),
            status_map[payload.status],
        )
        tx_hash = receipt.transactionHash.hex()

        if payload.audit_ipfs_hash:
            await send_transaction(
                contracts["mine_registry"].functions.updateAudit,
                hex_to_bytes32(mine_id),
                payload.audit_ipfs_hash,
            )

    update = {
        "$set": {
            "status": payload.status,
            "last_audit_date": datetime.utcnow(),
        }
    }
    if payload.audit_ipfs_hash:
        update["$set"]["metadata_ipfs_hash"] = payload.audit_ipfs_hash

    await db.mines.update_one({"mine_id": mine_id}, update)

    return MessageResponse(message="Mine compliance updated", data={"tx_hash": tx_hash})


def _doc_to_mine(doc: dict) -> MineResponse:
    return MineResponse(
        mine_id=doc.get("mine_id") or str(doc["_id"]),
        name=doc["name"],
        country=doc["country"],
        coordinates=doc["coordinates"],
        operator_id=doc["operator_id"],
        operator_address=doc["operator_address"],
        certifications=doc.get("certifications", []),
        status=doc.get("status", "PENDING"),
        registered_at=doc["registered_at"],
        last_audit_date=doc.get("last_audit_date"),
        metadata_ipfs_hash=doc.get("metadata_ipfs_hash"),
        tx_hash=doc.get("tx_hash"),
    )
