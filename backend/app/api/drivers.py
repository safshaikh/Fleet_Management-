from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.database import SessionLocal
from app.models import models
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/drivers", tags=["Drivers"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Inline Schemas ---
class DriverCreate(BaseModel):
    user_id: int
    license_number: str

class DriverAssign(BaseModel):
    driver_id: int

class DriverStatusUpdate(BaseModel):
    status: str

class DriverResponse(BaseModel):
    id: int
    user_id: int
    license_number: str
    status: str
    model_config = {"from_attributes": True}

# --- Endpoints ---
@router.post("/", response_model=DriverResponse)
def create_driver_profile(
    driver: DriverCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.Driver).filter(models.Driver.user_id == driver.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Driver profile already exists for this user")
    
    db_driver = models.Driver(**driver.model_dump())
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver


@router.get("/", response_model=List[DriverResponse])
def list_drivers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Driver).all()


@router.patch("/{driver_id}/status", response_model=DriverResponse)
def update_driver_status(
    driver_id: int,
    update: DriverStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    driver = db.query(models.Driver).filter(models.Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    driver.status = update.status
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/trips/{trip_id}/assign-driver")
def assign_driver_to_trip(
    trip_id: int,
    assignment: DriverAssign,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    driver = db.query(models.Driver).filter(models.Driver.id == assignment.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if driver.status == "On Trip":
        raise HTTPException(status_code=400, detail="Driver is already on another trip")
    
    trip.driver_id = assignment.driver_id
    driver.status = "On Trip"
    db.commit()
    return {"message": f"Driver {driver.license_number} assigned to trip {trip.reference}"}


@router.get("/trips/{trip_id}/driver")
def get_trip_driver(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if not trip.driver_id:
        return {"driver": None, "message": "No driver assigned"}
    driver = db.query(models.Driver).filter(models.Driver.id == trip.driver_id).first()
    return {"driver": {"id": driver.id, "license_number": driver.license_number, "status": driver.status}}
