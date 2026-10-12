from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.database import SessionLocal
from app.models import models
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Schemas (inline to avoid circular imports) ---
class MaintenanceCreate(BaseModel):
    vehicle_id: int
    maintenance_type: str
    description: Optional[str] = None
    scheduled_date: datetime
    cost: Optional[float] = None
    technician: Optional[str] = None

class MaintenanceStatusUpdate(BaseModel):
    status: str
    completed_date: Optional[datetime] = None
    cost: Optional[float] = None

class MaintenanceResponse(BaseModel):
    id: int
    vehicle_id: int
    maintenance_type: str
    status: str
    description: Optional[str]
    scheduled_date: datetime
    completed_date: Optional[datetime]
    cost: Optional[float]
    technician: Optional[str]
    created_at: datetime
    model_config = {"from_attributes": True}

# --- Endpoints ---
@router.post("/", response_model=MaintenanceResponse)
def schedule_maintenance(
    record: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == record.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    db_record = models.MaintenanceRecord(**record.model_dump())
    db.add(db_record)

    # Set vehicle to Maintenance if it's currently Available
    if vehicle.current_status == "Available":
        vehicle.current_status = "Maintenance"

    db.commit()
    db.refresh(db_record)
    return db_record


@router.get("/", response_model=List[MaintenanceResponse])
def get_maintenance_records(
    vehicle_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.MaintenanceRecord)
    if vehicle_id:
        query = query.filter(models.MaintenanceRecord.vehicle_id == vehicle_id)
    if status:
        query = query.filter(models.MaintenanceRecord.status == status)
    return query.order_by(models.MaintenanceRecord.scheduled_date.desc()).all()


@router.patch("/{record_id}/status", response_model=MaintenanceResponse)
def update_maintenance_status(
    record_id: int,
    update: MaintenanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    record = db.query(models.MaintenanceRecord).filter(models.MaintenanceRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record.status = update.status
    if update.completed_date:
        record.completed_date = update.completed_date
    if update.cost is not None:
        record.cost = update.cost

    # When completed — set vehicle back to Available
    if update.status == "Completed":
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == record.vehicle_id).first()
        if vehicle and vehicle.current_status == "Maintenance":
            vehicle.current_status = "Available"

    db.commit()
    db.refresh(record)
    return record


@router.get("/alerts")
def get_maintenance_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns scheduled/overdue records — the basis for alerts."""
    from datetime import timezone
    now = datetime.now(timezone.utc)
    overdue = db.query(models.MaintenanceRecord).filter(
        models.MaintenanceRecord.status == "Scheduled",
        models.MaintenanceRecord.scheduled_date < now
    ).all()
    upcoming = db.query(models.MaintenanceRecord).filter(
        models.MaintenanceRecord.status == "Scheduled",
        models.MaintenanceRecord.scheduled_date >= now
    ).order_by(models.MaintenanceRecord.scheduled_date).limit(10).all()

    def to_dict(r):
        return {
            "id": r.id,
            "vehicle_id": r.vehicle_id,
            "maintenance_type": r.maintenance_type,
            "status": r.status,
            "scheduled_date": r.scheduled_date.isoformat(),
        }

    return {
        "overdue_count": len(overdue),
        "overdue": [to_dict(r) for r in overdue],
        "upcoming": [to_dict(r) for r in upcoming],
    }
