from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import SessionLocal
from app.models import models
from app.schemas import schemas
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/shipments", tags=["Shipments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=schemas.ShipmentResponse)
def create_shipment(shipment: schemas.ShipmentCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_shipment = models.Shipment(**shipment.model_dump())
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

@router.get("/", response_model=List[schemas.ShipmentResponse])
def get_shipments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Shipment).offset(skip).limit(limit).all()

@router.patch("/{shipment_id}/status", response_model=schemas.ShipmentResponse)
def update_shipment_status(shipment_id: int, update_data: schemas.ShipmentStatusUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    shipment = db.query(models.Shipment).filter(models.Shipment.id == shipment_id).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    shipment.status = update_data.status
    if update_data.delivery_progress is not None:
        shipment.delivery_progress = update_data.delivery_progress
        
    db.commit()
    db.refresh(shipment)
    return shipment

@router.get("/track/{tracking_number}", response_model=schemas.ShipmentResponse)
def track_shipment_by_number(tracking_number: str, db: Session = Depends(get_db)):
    # This endpoint could be public (no get_current_user) for customers tracking their package
    shipment = db.query(models.Shipment).filter(models.Shipment.tracking_number == tracking_number).first()
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    return shipment
