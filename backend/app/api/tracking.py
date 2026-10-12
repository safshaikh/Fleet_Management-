import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.auth.auth_utils import decode_access_token
from app.db.database import SessionLocal
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/tracking", tags=["Tracking"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, trip_id: int, websocket: WebSocket):
        await websocket.accept()
        self.connections.setdefault(trip_id, []).append(websocket)

    def disconnect(self, trip_id: int, websocket: WebSocket):
        if trip_id in self.connections and websocket in self.connections[trip_id]:
            self.connections[trip_id].remove(websocket)

    async def broadcast(self, trip_id: int, payload: dict):
        for connection in list(self.connections.get(trip_id, [])):
            try:
                await connection.send_json(payload)
            except Exception:
                self.disconnect(trip_id, connection)


manager = ConnectionManager()


def distance_km(first_lat, first_lng, second_lat, second_lng):
    radius = 6371
    lat_delta = math.radians(second_lat - first_lat)
    lng_delta = math.radians(second_lng - first_lng)
    a = math.sin(lat_delta / 2) ** 2 + math.cos(math.radians(first_lat)) * math.cos(math.radians(second_lat)) * math.sin(lng_delta / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def traffic_multiplier(level: str):
    return {"Low": 1.0, "Moderate": 1.2, "Heavy": 1.55}.get(level, 1.2)


def calculate_eta(distance: float, traffic: str, from_time=None):
    departure = from_time or datetime.now(timezone.utc)
    minutes = max(1, round(distance / 45 * 60 * traffic_multiplier(traffic)))
    return departure + timedelta(minutes=minutes), minutes


def trip_payload(trip):
    return {
        "trip_id": trip.id,
        "reference": trip.reference,
        "status": trip.status,
        "latitude": trip.current_lat,
        "longitude": trip.current_lng,
        "eta": trip.eta.isoformat() if trip.eta else None,
        "traffic_level": trip.traffic_level,
    }


@router.get("/trips", response_model=List[schemas.TripResponse])
def get_trips(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Trip).order_by(models.Trip.scheduled_departure).all()


@router.get("/trips/{trip_id}", response_model=schemas.TripDetailResponse)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    points = db.query(models.TrackingPoint).filter(models.TrackingPoint.trip_id == trip_id).order_by(models.TrackingPoint.recorded_at).all()
    return {**trip.__dict__, "tracking_points": points}


@router.post("/trips", response_model=schemas.TripResponse)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not db.query(models.Vehicle).filter(models.Vehicle.id == trip.vehicle_id).first():
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if db.query(models.Trip).filter(models.Trip.reference == trip.reference).first():
        raise HTTPException(status_code=400, detail="Trip reference already exists")
    distance = distance_km(trip.origin_lat, trip.origin_lng, trip.destination_lat, trip.destination_lng)
    eta, duration = calculate_eta(distance, trip.traffic_level, trip.scheduled_departure)
    db_trip = models.Trip(**trip.model_dump(), current_lat=trip.origin_lat, current_lng=trip.origin_lng, distance_km=distance, duration_minutes=duration, eta=eta, created_at=datetime.now(timezone.utc))
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip


@router.patch("/trips/{trip_id}/status", response_model=schemas.TripResponse)
def update_status(trip_id: int, update: schemas.TripStatusUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if update.status not in {"Scheduled", "In Transit", "Delayed", "Delivered", "Cancelled"}:
        raise HTTPException(status_code=400, detail="Unsupported trip status")
    trip.status = update.status
    db.commit()
    db.refresh(trip)
    return trip


@router.post("/trips/{trip_id}/location", response_model=schemas.TripResponse)
async def update_location(trip_id: int, location: schemas.LocationUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip.current_lat = location.latitude
    trip.current_lng = location.longitude
    trip.status = "In Transit"
    remaining = distance_km(location.latitude, location.longitude, trip.destination_lat, trip.destination_lng)
    trip.eta, trip.duration_minutes = calculate_eta(remaining, trip.traffic_level)
    db.add(models.TrackingPoint(trip_id=trip.id, latitude=location.latitude, longitude=location.longitude, speed_kph=location.speed_kph, recorded_at=datetime.now(timezone.utc)))
    db.commit()
    db.refresh(trip)
    await manager.broadcast(trip_id, trip_payload(trip))
    return trip


@router.post("/routes/optimize", response_model=schemas.RoutePlanResponse)
def optimize_route(route: schemas.RoutePlanRequest, current_user: models.User = Depends(get_current_user)):
    if not route.stops:
        raise HTTPException(status_code=400, detail="At least one stop is required")
    remaining = route.stops.copy()
    ordered = [remaining.pop(0)]
    while remaining:
        current = ordered[-1]
        next_stop = min(remaining, key=lambda stop: distance_km(current.latitude, current.longitude, stop.latitude, stop.longitude))
        ordered.append(next_stop)
        remaining.remove(next_stop)
    distance = sum(distance_km(a.latitude, a.longitude, b.latitude, b.longitude) for a, b in zip(ordered, ordered[1:]))
    _, duration = calculate_eta(distance, route.traffic_level)
    return {"ordered_stops": ordered, "distance_km": round(distance, 2), "duration_minutes": duration, "traffic_level": route.traffic_level}


@router.websocket("/ws/{trip_id}")
async def tracking_socket(websocket: WebSocket, trip_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        decode_access_token(token)
    except HTTPException:
        await websocket.close(code=1008)
        return
    await manager.connect(trip_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(trip_id, websocket)