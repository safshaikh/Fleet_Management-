from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
from app.models.models import UserRole

# --- Vehicle Schemas ---
class VehicleBase(BaseModel):
    registration_number: str
    vehicle_type: str
    capacity: int
    fuel_type: str

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    current_status: str
    model_config = {"from_attributes": True}

class VehicleStatusUpdate(BaseModel):
    current_status: str

# --- User / Auth Schemas ---
class UserCreate(BaseModel):
    email: str
    password: str
    role: Optional[UserRole] = UserRole.DRIVER

class UserResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    is_active: bool
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str


class TripCreate(BaseModel):
    reference: str
    vehicle_id: int
    origin: str
    destination: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    scheduled_departure: datetime
    traffic_level: str = "Moderate"


class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    speed_kph: float = 0


class TripStatusUpdate(BaseModel):
    status: str


class TripResponse(BaseModel):
    id: int
    reference: str
    vehicle_id: int
    origin: str
    destination: str
    status: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    current_lat: Optional[float]
    current_lng: Optional[float]
    scheduled_departure: datetime
    eta: Optional[datetime]
    distance_km: Optional[float]
    duration_minutes: Optional[int]
    traffic_level: str
    created_at: datetime
    model_config = {"from_attributes": True}


class TrackingPointResponse(BaseModel):
    latitude: float
    longitude: float
    speed_kph: float
    recorded_at: datetime
    model_config = {"from_attributes": True}


class TripDetailResponse(TripResponse):
    tracking_points: List[TrackingPointResponse] = []


class RouteStop(BaseModel):
    name: str
    latitude: float
    longitude: float


class RoutePlanRequest(BaseModel):
    stops: List[RouteStop]
    traffic_level: str = "Moderate"


class RoutePlanResponse(BaseModel):
    ordered_stops: List[RouteStop]
    distance_km: float
    duration_minutes: int
    traffic_level: str


# --- Shipment Schemas ---
class ShipmentBase(BaseModel):
    tracking_number: str
    trip_id: Optional[int] = None
    delivery_address: str
    weight: float

class ShipmentCreate(ShipmentBase):
    pass

class ShipmentStatusUpdate(BaseModel):
    status: str
    delivery_progress: Optional[float] = None

class ShipmentResponse(ShipmentBase):
    id: int
    status: str
    eta: Optional[datetime] = None
    delivery_progress: float
    model_config = {"from_attributes": True}
