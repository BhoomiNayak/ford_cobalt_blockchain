"""
ESG Report generation route.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from services.database import get_mongo_db
from middleware.auth import require_roles

router = APIRouter()


@router.get("/report")
async def generate_esg_report(
    date_from: datetime = Query(None),
    date_to: datetime = Query(None),
    db=Depends(get_mongo_db),
    _=Depends(require_roles(["admin", "auditor", "viewer"])),
):
    """Generate ESG report with aggregate metrics."""
    now = datetime.utcnow()
    date_from = date_from or datetime(now.year, 1, 1)
    date_to = date_to or now

    date_filter = {"created_at": {"$gte": date_from, "$lte": date_to}}

    # Mine metrics
    total_mines = await db.mines.count_documents({})
    active_mines = await db.mines.count_documents({"status": "ACTIVE"})
    suspended_mines = await db.mines.count_documents({"status": "SUSPENDED"})

    # Batch metrics
    total_batches = await db.batches.count_documents(date_filter)
    pipeline = [
        {"$match": date_filter},
        {"$group": {
            "_id": None,
            "total_weight_kg": {"$sum": "$weight_kg"},
            "avg_purity": {"$avg": "$purity_percent"},
        }}
    ]
    batch_agg = await db.batches.aggregate(pipeline).to_list(1)
    total_weight = batch_agg[0]["total_weight_kg"] if batch_agg else 0
    avg_purity = batch_agg[0]["avg_purity"] if batch_agg else 0

    # Compliance metrics
    passed = await db.compliance_checks.count_documents({"status": "PASSED", **date_filter})
    failed = await db.compliance_checks.count_documents({"status": "FAILED", **date_filter})
    pending = await db.compliance_checks.count_documents({"status": "PENDING"})

    # Shipment metrics
    delivered = await db.shipments.count_documents({"status": "DELIVERED"})
    in_transit = await db.shipments.count_documents({"status": "IN_TRANSIT"})

    # Country breakdown
    country_pipeline = [
        {"$group": {"_id": "$country", "count": {"$sum": 1}}}
    ]
    country_breakdown = await db.mines.aggregate(country_pipeline).to_list(50)

    compliance_rate = (passed / (passed + failed) * 100) if (passed + failed) > 0 else 0

    return {
        "report_period": {
            "from": date_from.isoformat(),
            "to": date_to.isoformat(),
        },
        "generated_at": now.isoformat(),
        "mines": {
            "total": total_mines,
            "active": active_mines,
            "suspended": suspended_mines,
            "by_country": [{"country": c["_id"], "count": c["count"]} for c in country_breakdown],
        },
        "batches": {
            "total": total_batches,
            "total_weight_kg": round(total_weight, 2),
            "average_purity_percent": round(avg_purity, 2),
        },
        "compliance": {
            "passed": passed,
            "failed": failed,
            "pending": pending,
            "compliance_rate_percent": round(compliance_rate, 1),
        },
        "shipments": {
            "delivered": delivered,
            "in_transit": in_transit,
        },
        "esg_score": _calculate_esg_score(compliance_rate, active_mines, total_mines),
    }


def _calculate_esg_score(compliance_rate: float, active_mines: int, total_mines: int) -> dict:
    """Simple ESG scoring model."""
    compliance_score = compliance_rate * 0.5
    mine_health = (active_mines / total_mines * 100 * 0.3) if total_mines > 0 else 0
    base_score = min(compliance_score + mine_health + 15, 100)

    grade = "A" if base_score >= 85 else "B" if base_score >= 70 else "C" if base_score >= 55 else "D"
    return {
        "score": round(base_score, 1),
        "grade": grade,
        "components": {
            "compliance": round(compliance_score, 1),
            "mine_health": round(mine_health, 1),
        }
    }
