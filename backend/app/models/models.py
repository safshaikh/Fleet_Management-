from sqlalchemy import Column, Integer, String, Boolean, Enum, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "Administrator"
    FLEET_MANAGER = "Fleet Manager"
    DRIVER = "Driver"
    DISPATCHER = "Dispatcher"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(Enum(UserRole), default=UserRole.DRIVER)
    is_active = Column(Boolean, default=True)
    
    driver_profile = relationship("Driver", back_populates="user", uselist=False)

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    registration_number = Column(String, unique=True, index=True)
    vehicle_type = Column(String)
    capacity = Column(Integer)
    current_status = Column(String, default="Available")
    fuel_type = Column(String)
    fuel_efficiency_kmpl = Column(Float, nullable=True)   # km per litre
    odometer_km = Column(Float, default=0.0)               # total km driven

    trips = relationship("Trip", back_populates="vehicle")
    maintenance_records = relationship("MaintenanceRecord", back_populates="vehicle")

class Driver(Base):
    __tablename__ = "drivers"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    license_number = Column(String, unique=True)
    status = Column(String, default="Off Duty") # Available, On Trip, Off Duty
    
    user = relationship("User", back_populates="driver_profile")
    trips = relationship("Trip", back_populates="driver")

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)
    
    origin = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    status = Column(String, default="Scheduled") # Scheduled, In Transit, Delivered, Cancelled
    
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    
    scheduled_departure = Column(DateTime(timezone=True), nullable=False)
    eta = Column(DateTime(timezone=True), nullable=True)
    distance_km = Column(Float, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    traffic_level = Column(String, default="Moderate")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vehicle = relationship("Vehicle", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    shipments = relationship("Shipment", back_populates="trip")
    tracking_points = relationship("TrackingPoint", back_populates="trip")

class Shipment(Base):
    __tablename__ = "shipments"
    
    id = Column(Integer, primary_key=True, index=True)
    tracking_number = Column(String, unique=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True)
    
    delivery_address = Column(String, nullable=False)
    weight = Column(Float, nullable=False)
    status = Column(String, default="Created") # Created, Assigned, In Transit, Delayed, Delivered, Cancelled
    eta = Column(DateTime(timezone=True), nullable=True)
    delivery_progress = Column(Float, default=0.0)
    
    trip = relationship("Trip", back_populates="shipments")

class TrackingPoint(Base):
    __tablename__ = "tracking_points"
    __table_args__ = (
        CheckConstraint('latitude >= -90 AND latitude <= 90', name='check_valid_latitude'),
        CheckConstraint('longitude >= -180 AND longitude <= 180', name='check_valid_longitude'),
    )

    id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trips.id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kph = Column(Float, default=0.0)
    heading = Column(Float, nullable=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="tracking_points")

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    maintenance_type = Column(String, nullable=False)   # Oil Change, Tyre, Brake, Service, Inspection
    status = Column(String, default="Scheduled")        # Scheduled, In Progress, Completed, Overdue
    description = Column(String, nullable=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    completed_date = Column(DateTime(timezone=True), nullable=True)
    cost = Column(Float, nullable=True)
    technician = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    vehicle = relationship("Vehicle", back_populates="maintenance_records")
