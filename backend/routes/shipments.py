"""
Shipments API routes - create, IoT logging, live tracking.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
import uuid

from models.schemas import (
    ShipmentCreateRequest, ShipmentResponse, IoTReading, MessageResponse
)
from services.database import get_mongo_db
from middleware.auth import get_current_user, require_roles

router = APIRouter()


@router.post("/create", response_model=MessageResponse, status_code=201)
async def create_shipment(
    payload: ShipmentCreateRequest,
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor", "operator"])),
):
    """Create a new shipment for a batch."""
    batch = await db.batches.find_one({"batch_id": payload.batch_id})
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    shipment_id = str(uuid.uuid4())
    doc = {
        "shipment_id": shipment_id,
        "batch_id": payload.batch_id,
        "origin": payload.origin,
        "destination": payload.destination,
        "carrier": payload.carrier,
        "carrier_id": payload.carrier_id,
        "container_id": payload.container_id,
        "status": "CREATED",
        "estimated_arrival": payload.estimated_arrival,
        "actual_arrival": None,
        "iot_readings": [],
        "notes": payload.notes,
        "created_at": datetime.utcnow(),
    }
    await db.shipments.insert_one(doc)

    # Update batch status
    await db.batches.update_one(
        {"batch_id": payload.batch_id},
        {"$set": {"status": "IN_TRANSIT"}}
    )

    return MessageResponse(message="Shipment created", data={"shipment_id": shipment_id})


@router.post("/{shipment_id}/iot", response_model=MessageResponse)
async def log_iot_data(
    shipment_id: str,
    reading: IoTReading,
    db=Depends(get_mongo_db),
):
    """Log IoT sensor data for a shipment (no auth - device endpoint)."""
    shipment = await db.shipments.find_one({"shipment_id": shipment_id})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    reading_doc = reading.dict()
    await db.shipments.update_one(
        {"shipment_id": shipment_id},
        {
            "$push": {
                "iot_readings": {
                    "$each": [reading_doc],
                    "$slice": -1000  # Keep last 1000 readings
                }
            }
        }
    )

    # Auto-flag anomalies
    alerts = []
    if reading.temperature_c and (reading.temperature_c < -10 or reading.temperature_c > 60):
        alerts.append(f"Temperature out of range: {reading.temperature_c}°C")
    if reading.shock_g and reading.shock_g > 5:
        alerts.append(f"High shock detected: {reading.shock_g}g")

    if alerts:
        await db.audit_logs.insert_one({
            "type": "IOT_ALERT",
            "shipment_id": shipment_id,
            "alerts": alerts,
            "reading": reading_doc,
            "timestamp": datetime.utcnow(),
        })

    return MessageResponse(message="IoT data logged", data={"alerts": alerts})


@router.get("/{shipment_id}/tracking", response_model=ShipmentResponse)
async def get_tracking(shipment_id: str, db=Depends(get_mongo_db)):
    """Get live tracking info for a shipment."""
    doc = await db.shipments.find_one({"shipment_id": shipment_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return _doc_to_shipment(doc)


@router.get("/", response_model=List[ShipmentResponse])
async def list_shipments(
    status: str = None,
    batch_id: str = None,
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor", "operator", "viewer"])),
):
    query = {}
    if status:
        query["status"] = status
    if batch_id:
        query["batch_id"] = batch_id

    cursor = db.shipments.find(query).sort("created_at", -1).limit(50)
    docs = await cursor.to_list(50)
    return [_doc_to_shipment(d) for d in docs]


@router.put("/{shipment_id}/status", response_model=MessageResponse)
async def update_shipment_status(
    shipment_id: str,
    new_status: str,
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor", "operator"])),
):
    valid = {"CREATED", "IN_TRANSIT", "CUSTOMS", "DELIVERED", "DELAYED"}
    if new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid}")

    update = {"$set": {"status": new_status}}
    if new_status == "DELIVERED":
        update["$set"]["actual_arrival"] = datetime.utcnow()

    result = await db.shipments.update_one({"shipment_id": shipment_id}, update)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Shipment not found")

    return MessageResponse(message="Status updated")


def _doc_to_shipment(doc: dict) -> ShipmentResponse:
    return ShipmentResponse(
        shipment_id=doc["shipment_id"],
        batch_id=doc["batch_id"],
        origin=doc["origin"],
        destination=doc["destination"],
        carrier=doc["carrier"],
        carrier_id=doc["carrier_id"],
        status=doc.get("status", "CREATED"),
        estimated_arrival=doc["estimated_arrival"],
        actual_arrival=doc.get("actual_arrival"),
        iot_readings=doc.get("iot_readings", [])[-20:],  # Last 20
        container_id=doc.get("container_id"),
        created_at=doc["created_at"],
    )
