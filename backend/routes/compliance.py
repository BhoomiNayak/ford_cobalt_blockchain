"""
Compliance and ESG API routes.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from models.schemas import (
    ComplianceCheckRequest, ComplianceResponse, ESGCertificateRequest, MessageResponse
)
from services.database import get_mongo_db
from services.blockchain import get_contracts, send_transaction, hex_to_bytes32
from middleware.auth import require_roles

router = APIRouter()


@router.post("/verify", response_model=MessageResponse)
async def verify_batch_compliance(
    payload: ComplianceCheckRequest,
    db=Depends(get_mongo_db),
    user=Depends(require_roles(["admin", "auditor"])),
):
    """Run compliance checks on a batch."""
    batch = await db.batches.find_one({"batch_id": payload.batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    all_passed = all([
        payload.labor_standards,
        payload.environmental_safety,
        payload.conflict_free,
        payload.documentation_valid,
        payload.audit_passed,
    ])
    status = "PASSED" if all_passed else "FAILED"

    contracts = get_contracts()
    tx_hash = None

    if contracts["compliance_verifier"]:
        receipt = await send_transaction(
            contracts["compliance_verifier"].functions.checkCompliance,
            hex_to_bytes32(payload.batch_id),
            payload.labor_standards,
            payload.environmental_safety,
            payload.conflict_free,
            payload.documentation_valid,
            payload.audit_passed,
            payload.report_ipfs_hash or "",
        )
        tx_hash = receipt.transactionHash.hex()

    doc = {
        "batch_id": payload.batch_id,
        "labor_standards": payload.labor_standards,
        "environmental_safety": payload.environmental_safety,
        "conflict_free": payload.conflict_free,
        "documentation_valid": payload.documentation_valid,
        "audit_passed": payload.audit_passed,
        "status": status,
        "checked_at": datetime.utcnow(),
        "verifier": user["email"],
        "verifier_address": user.get("ethereum_address", ""),
        "report_ipfs_hash": payload.report_ipfs_hash,
        "notes": payload.notes,
        "tx_hash": tx_hash,
    }
    await db.compliance_checks.update_one(
        {"batch_id": payload.batch_id},
        {"$set": doc},
        upsert=True,
    )

    if status == "FLAGGED":
        await db.batches.update_one(
            {"batch_id": payload.batch_id},
            {"$set": {"status": "FLAGGED"}}
        )

    return MessageResponse(message=f"Compliance {status}", data={"tx_hash": tx_hash, "status": status})


@router.get("/batches", response_model=list)
async def get_compliance_statuses(
    status: str = None,
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor", "viewer"])),
):
    """Get compliance statuses for all batches."""
    query = {}
    if status:
        query["status"] = status
    cursor = db.compliance_checks.find(query).sort("checked_at", -1).limit(100)
    docs = await cursor.to_list(100)
    for d in docs:
        d.pop("_id", None)
    return docs


@router.get("/batch/{batch_id}")
async def get_batch_compliance(batch_id: str, db=Depends(get_mongo_db)):
    """Get compliance status for a specific batch."""
    doc = await db.compliance_checks.find_one({"batch_id": batch_id})
    if not doc:
        raise HTTPException(status_code=404, detail="No compliance record found")
    doc.pop("_id", None)
    return doc
