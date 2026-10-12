from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.db.database import SessionLocal
from app.models import models
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/fleet-summary")
def get_fleet_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """High-level fleet KPIs for the analytics dashboard."""
    total_vehicles = db.query(func.count(models.Vehicle.id)).scalar() or 0
    available = db.query(func.count(models.Vehicle.id)).filter(models.Vehicle.current_status == "Available").scalar() or 0
    in_transit = db.query(func.count(models.Vehicle.id)).filter(models.Vehicle.current_status == "In Transit").scalar() or 0
    maintenance = db.query(func.count(models.Vehicle.id)).filter(models.Vehicle.current_status == "Maintenance").scalar() or 0

    total_trips = db.query(func.count(models.Trip.id)).scalar() or 0
    completed_trips = db.query(func.count(models.Trip.id)).filter(models.Trip.status == "Delivered").scalar() or 0
    active_trips = db.query(func.count(models.Trip.id)).filter(models.Trip.status == "In Transit").scalar() or 0
    delayed_trips = db.query(func.count(models.Trip.id)).filter(models.Trip.status == "Delayed").scalar() or 0

    total_shipments = db.query(func.count(models.Shipment.id)).scalar() or 0
    delivered_shipments = db.query(func.count(models.Shipment.id)).filter(models.Shipment.status == "Delivered").scalar() or 0

    total_drivers = db.query(func.count(models.Driver.id)).scalar() or 0
    drivers_on_trip = db.query(func.count(models.Driver.id)).filter(models.Driver.status == "On Trip").scalar() or 0

    overdue_maintenance = db.query(func.count(models.MaintenanceRecord.id)).filter(
        models.MaintenanceRecord.status == "Scheduled"
    ).scalar() or 0

    utilization_rate = round((in_transit / total_vehicles * 100), 1) if total_vehicles > 0 else 0
    delivery_rate = round((delivered_shipments / total_shipments * 100), 1) if total_shipments > 0 else 0

    return {
        "vehicles": {
            "total": total_vehicles,
            "available": available,
            "in_transit": in_transit,
            "maintenance": maintenance,
            "utilization_rate_pct": utilization_rate,
        },
        "trips": {
            "total": total_trips,
            "completed": completed_trips,
            "active": active_trips,
            "delayed": delayed_trips,
        },
        "shipments": {
            "total": total_shipments,
            "delivered": delivered_shipments,
            "delivery_rate_pct": delivery_rate,
        },
        "drivers": {
            "total": total_drivers,
            "on_trip": drivers_on_trip,
            "available": total_drivers - drivers_on_trip,
        },
        "maintenance": {
            "overdue_alerts": overdue_maintenance,
        }
    }


@router.get("/fuel-report")
def get_fuel_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Per-vehicle fuel efficiency report."""
    vehicles = db.query(models.Vehicle).all()
    report = []
    for v in vehicles:
        total_distance = sum(t.distance_km or 0 for t in v.trips)
        fuel_used = round(total_distance / v.fuel_efficiency_kmpl, 2) if v.fuel_efficiency_kmpl and total_distance > 0 else None
        report.append({
            "vehicle_id": v.id,
            "registration_number": v.registration_number,
            "fuel_type": v.fuel_type,
            "fuel_efficiency_kmpl": v.fuel_efficiency_kmpl,
            "odometer_km": v.odometer_km,
            "total_distance_trips_km": round(total_distance, 2),
            "estimated_fuel_used_litres": fuel_used,
            "trips_count": len(v.trips),
        })
    return {"vehicles": report}


@router.get("/trip-performance")
def get_trip_performance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Per-status trip breakdown for bar/pie charts on the frontend."""
    statuses = ["Scheduled", "In Transit", "Delivered", "Delayed", "Cancelled"]
    breakdown = []
    for status in statuses:
        count = db.query(func.count(models.Trip.id)).filter(models.Trip.status == status).scalar() or 0
        breakdown.append({"status": status, "count": count})

    # Top vehicles by trip count
    top_vehicles = (
        db.query(models.Vehicle.registration_number, func.count(models.Trip.id).label("trip_count"))
        .join(models.Trip, models.Trip.vehicle_id == models.Vehicle.id, isouter=True)
        .group_by(models.Vehicle.registration_number)
        .order_by(func.count(models.Trip.id).desc())
        .limit(5)
        .all()
    )

    return {
        "trip_status_breakdown": breakdown,
        "top_vehicles_by_trips": [{"vehicle": v[0], "trips": v[1]} for v in top_vehicles],
    }


@router.get("/maintenance-report")
def get_maintenance_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Maintenance cost and completion analytics."""
    records = db.query(models.MaintenanceRecord).all()
    
    total_cost = sum(r.cost or 0 for r in records)
    completed = [r for r in records if r.status == "Completed"]
    scheduled = [r for r in records if r.status == "Scheduled"]
    overdue = [r for r in records if r.status == "Overdue"]

    # Group cost by type
    cost_by_type = {}
    for r in completed:
        cost_by_type[r.maintenance_type] = cost_by_type.get(r.maintenance_type, 0) + (r.cost or 0)

    return {
        "summary": {
            "total_records": len(records),
            "completed": len(completed),
            "scheduled": len(scheduled),
            "overdue": len(overdue),
            "total_maintenance_cost": round(total_cost, 2),
        },
        "cost_by_type": [{"type": k, "cost": round(v, 2)} for k, v in cost_by_type.items()],
    }
