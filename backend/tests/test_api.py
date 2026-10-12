"""
FleetFlow Backend — Integration Test Suite (Milestone 4)
========================================================
Tests all API endpoints using TestClient (in-memory SQLite DB).
Run with:  cd backend && pytest tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.database import Base, SessionLocal

# ── In-memory SQLite for tests (no Supabase connection needed) ──────
TEST_DB_URL = "sqlite:///./test_fleetflow.db"

engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

# Override every router's get_db with the test SQLite DB
import app.api.auth as _auth
import app.api.vehicles as _vehicles
import app.api.maintenance as _maintenance
import app.api.drivers as _drivers
import app.api.analytics as _analytics
import app.api.shipments as _shipments
import app.api.tracking as _tracking
import app.auth.dependencies as _auth_deps

for mod in [_auth, _vehicles, _maintenance, _drivers, _analytics, _shipments, _tracking, _auth_deps]:
    if hasattr(mod, "get_db"):
        app.dependency_overrides[mod.get_db] = override_get_db

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Create all tables before tests, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

# ────────────────────────────────────────────────────────────────────
# Helper: Register + login to get a JWT token
# ────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def auth_token():
    # Register
    client.post("/auth/register", json={
        "email": "testadmin@fleetflow.com",
        "password": "Test@1234",
        "role": "Administrator"
    })
    # Login
    resp = client.post("/auth/login", data={
        "username": "testadmin@fleetflow.com",
        "password": "Test@1234"
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ════════════════════════════════════════════════════════════════════
# 1. HEALTH / SYSTEM
# ════════════════════════════════════════════════════════════════════
class TestHealth:
    def test_root(self):
        resp = client.get("/")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_ping(self):
        resp = client.get("/ping")
        assert resp.status_code == 200
        assert resp.json() == {"ping": "pong"}


# ════════════════════════════════════════════════════════════════════
# 2. AUTHENTICATION
# ════════════════════════════════════════════════════════════════════
class TestAuth:
    def test_register_duplicate(self, auth_token):
        resp = client.post("/auth/register", json={
            "email": "testadmin@fleetflow.com",
            "password": "Test@1234",
            "role": "Administrator"
        })
        assert resp.status_code == 400

    def test_login_wrong_password(self):
        resp = client.post("/auth/login", data={
            "username": "testadmin@fleetflow.com",
            "password": "WrongPass"
        })
        assert resp.status_code == 401

    def test_protected_without_token(self):
        resp = client.get("/vehicles/")
        assert resp.status_code == 401


# ════════════════════════════════════════════════════════════════════
# 3. VEHICLES
# ════════════════════════════════════════════════════════════════════
class TestVehicles:
    vehicle_id = None

    def test_create_vehicle(self, headers):
        resp = client.post("/vehicles/", json={
            "registration_number": "MH-12-AB-1234",
            "vehicle_type": "Truck",
            "capacity": 5000,
            "fuel_type": "Diesel"
        }, headers=headers)
        assert resp.status_code == 200
        TestVehicles.vehicle_id = resp.json()["id"]

    def test_list_vehicles(self, headers):
        resp = client.get("/vehicles/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_update_vehicle_status(self, headers):
        resp = client.patch(f"/vehicles/{TestVehicles.vehicle_id}/status",
                            json={"current_status": "In Transit"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["current_status"] == "In Transit"


# ════════════════════════════════════════════════════════════════════
# 4. MAINTENANCE
# ════════════════════════════════════════════════════════════════════
class TestMaintenance:
    record_id = None

    def test_schedule_maintenance(self, headers):
        resp = client.post("/maintenance/", json={
            "vehicle_id": TestVehicles.vehicle_id,
            "maintenance_type": "Oil Change",
            "description": "Regular 5000km service",
            "scheduled_date": "2026-12-01T10:00:00",
            "cost": 1500.0,
            "technician": "Raj Kumar"
        }, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["maintenance_type"] == "Oil Change"
        TestMaintenance.record_id = resp.json()["id"]

    def test_list_maintenance(self, headers):
        resp = client.get("/maintenance/", headers=headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_maintenance_alerts(self, headers):
        resp = client.get("/maintenance/alerts", headers=headers)
        assert resp.status_code == 200
        assert "overdue_count" in resp.json()

    def test_update_maintenance_status(self, headers):
        resp = client.patch(f"/maintenance/{TestMaintenance.record_id}/status",
                            json={"status": "In Progress"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "In Progress"


# ════════════════════════════════════════════════════════════════════
# 5. DRIVERS
# ════════════════════════════════════════════════════════════════════
class TestDrivers:
    driver_id = None

    def test_create_driver(self, headers, auth_token):
        # Get the user id from token — create a 2nd user to be driver
        client.post("/auth/register", json={
            "email": "driver1@fleetflow.com",
            "password": "Driver@123",
            "role": "Driver"
        })
        login = client.post("/auth/login", data={
            "username": "driver1@fleetflow.com", "password": "Driver@123"
        })
        # Get user ID by listing — use admin token to create driver profile
        resp = client.post("/drivers/", json={
            "user_id": 2,
            "license_number": "MH-0123456789"
        }, headers=headers)
        assert resp.status_code == 200
        TestDrivers.driver_id = resp.json()["id"]

    def test_list_drivers(self, headers):
        resp = client.get("/drivers/", headers=headers)
        assert resp.status_code == 200

    def test_update_driver_status(self, headers):
        resp = client.patch(f"/drivers/{TestDrivers.driver_id}/status",
                            json={"status": "Available"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "Available"


# ════════════════════════════════════════════════════════════════════
# 6. ANALYTICS
# ════════════════════════════════════════════════════════════════════
class TestAnalytics:
    def test_fleet_summary(self, headers):
        resp = client.get("/analytics/fleet-summary", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "vehicles" in data
        assert "trips" in data
        assert "shipments" in data
        assert "drivers" in data

    def test_fuel_report(self, headers):
        resp = client.get("/analytics/fuel-report", headers=headers)
        assert resp.status_code == 200
        assert "vehicles" in resp.json()

    def test_trip_performance(self, headers):
        resp = client.get("/analytics/trip-performance", headers=headers)
        assert resp.status_code == 200
        assert "trip_status_breakdown" in resp.json()

    def test_maintenance_report(self, headers):
        resp = client.get("/analytics/maintenance-report", headers=headers)
        assert resp.status_code == 200
        assert "summary" in resp.json()
