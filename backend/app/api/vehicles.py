from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.db.database import SessionLocal
from app.models import models
from app.models.models import UserRole
from app.schemas import schemas
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Only Admin and Fleet Manager can register vehicles
@router.post("/", response_model=schemas.VehicleResponse)
def register_vehicle(
    vehicle: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER)),
):
    db_vehicle = models.Vehicle(**vehicle.model_dump())
    db.add(db_vehicle)
    try:
        db.commit()
        db.refresh(db_vehicle)
        return db_vehicle
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="A vehicle with this registration number already exists.")

# Any logged-in user can view vehicles
@router.get("/", response_model=List[schemas.VehicleResponse])
def get_vehicles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vehicles = db.query(models.Vehicle).all()
    return vehicles

@router.patch("/{vehicle_id}/status", response_model=schemas.VehicleResponse)
def update_vehicle_status(
    vehicle_id: int,
    status_update: schemas.VehicleStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.current_status = status_update.current_status
    db.commit()
    db.refresh(vehicle)
    return vehicle
