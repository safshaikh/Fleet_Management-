# 🚚 FleetFlow — Intelligent Fleet Management Platform

> **Infosys Internship Capstone Project** | Full-Stack Web Application
> Built with React · FastAPI · PostgreSQL (Supabase) · Docker

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Features by Milestone](#features-by-milestone)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Running Locally (Development)](#running-locally-development)
8. [Docker Deployment](#docker-deployment)
9. [Testing](#testing)
10. [Project Structure](#project-structure)

---

## Project Overview

**FleetFlow** is a comprehensive fleet and logistics management platform that enables organizations to:
- Monitor vehicles in **real-time** using GPS simulation and WebSockets
- Manage **shipments** end-to-end from creation to delivery
- Schedule and track **vehicle maintenance** with automated alerts
- Assign **drivers** to trips and track their availability
- Visualize **fleet analytics** including fuel efficiency and performance KPIs

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         FleetFlow Platform                         │
│                                                                    │
│  ┌──────────────┐    HTTPS/WS     ┌──────────────────────────┐    │
│  │  React SPA   │ ────────────── ▶│  FastAPI Backend          │    │
│  │  (Vite)      │ ◀────────────── │  (Python 3.11)           │    │
│  │              │    JSON/REST    │                           │    │
│  │  Nginx       │                │  JWT Auth                 │    │
│  └──────────────┘                │  SQLAlchemy ORM           │    │
│                                  │  Alembic Migrations       │    │
│                                  └───────────┬───────────────┘    │
│                                              │ PostgreSQL          │
│                                              ▼                     │
│                                   ┌─────────────────────┐         │
│                                   │  Supabase (Postgres) │         │
│                                   │  aws-ap-south-1      │         │
│                                   └─────────────────────┘         │
└────────────────────────────────────────────────────────────────────┘
```

**Pattern:** Modular Monolith — FastAPI handles multiple logical domains (Fleet, Tracking, Maintenance, Analytics) via separate router modules, without the operational complexity of true microservices.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, React Router v7, Axios |
| Map Integration | @react-google-maps/api, OpenStreetMap Nominatim |
| Backend | FastAPI (Python 3.11), Uvicorn |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Auth | JWT (python-jose), bcrypt password hashing |
| Database | PostgreSQL 15 via Supabase |
| Real-time | WebSockets (FastAPI native) |
| Testing | Pytest, HTTPX, TestClient |
| Deployment | Docker, Docker Compose, Nginx |

---

## Features by Milestone

### ✅ Milestone 1 — Core Platform
- **JWT Authentication** with role-based access (Admin, Fleet Manager, Driver, Dispatcher)
- **Vehicle Registration** with full CRUD operations
- **Fleet Monitoring Dashboard** showing live vehicle statuses
- **PostgreSQL** integration via Supabase with Alembic migrations

### ✅ Milestone 2 — Shipment Tracking & Route Optimization
- **Real-time GPS Tracking** using WebSocket-based simulator
- **Google Maps Integration** for route visualization
- **Route Optimization** — live traffic via Google Directions API with greedy-math fallback
- **Shipment Management** — full CRUD with trip assignment and delivery progress
- **ETA Calculation** using distance and traffic model

### ✅ Milestone 3 — Maintenance, Drivers & Analytics
- **Maintenance Scheduling** — schedule jobs, get overdue alerts, track costs
- **Driver Assignment System** — register drivers, assign to trips, track status
- **Fleet Analytics Dashboard** — utilization rate, delivery rate, KPI cards
- **Fuel Monitoring** — per-vehicle fuel efficiency and consumption reports
- **Maintenance Reports** — cost breakdown by maintenance type
- **Celery Background Jobs** — documented with implementation code

### ✅ Milestone 4 — Testing, Deployment & Documentation
- **Automated Test Suite** (Pytest + HTTPX) covering all API endpoints
- **Docker Containerization** — multi-stage builds for backend and frontend
- **Docker Compose** — single command to spin up the entire platform
- **UI Responsiveness** improvements across all views
- **Complete Documentation** (this file)

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except auth routes.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT token |

### Vehicles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vehicles/` | List all vehicles |
| POST | `/vehicles/` | Register new vehicle |
| PATCH | `/vehicles/{id}/status` | Update vehicle status |

### Tracking & Trips
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tracking/trips` | List all trips |
| POST | `/tracking/trips` | Create new trip |
| PATCH | `/tracking/trips/{id}/location` | Update GPS position |
| POST | `/tracking/routes/optimize` | Get optimized route + ETA |
| WS | `/tracking/ws/{trip_id}` | Real-time GPS WebSocket |

### Shipments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shipments/` | List all shipments |
| POST | `/shipments/` | Create shipment |
| PATCH | `/shipments/{id}/assign` | Assign to a trip |
| PATCH | `/shipments/{id}/status` | Update delivery status |

### Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/maintenance/` | List maintenance records |
| POST | `/maintenance/` | Schedule maintenance |
| PATCH | `/maintenance/{id}/status` | Update status |
| GET | `/maintenance/alerts` | Get overdue + upcoming alerts |

### Drivers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/drivers/` | List all drivers |
| POST | `/drivers/` | Register driver profile |
| PATCH | `/drivers/{id}/status` | Update driver status |
| POST | `/drivers/trips/{id}/assign-driver` | Assign driver to trip |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/fleet-summary` | Fleet-wide KPIs |
| GET | `/analytics/fuel-report` | Per-vehicle fuel analytics |
| GET | `/analytics/trip-performance` | Trip status breakdown |
| GET | `/analytics/maintenance-report` | Maintenance cost analytics |

---

## Database Schema

```
users ──────────────── drivers ──────────── trips
  │ id                    │ id                │ id
  │ email                 │ user_id (FK)      │ vehicle_id (FK)
  │ hashed_password       │ license_number    │ driver_id (FK)
  │ role                  │ status            │ origin / destination
  └──── driver_profile    └──── trips         │ status / ETA
                                              │ lat/lng coords
vehicles ──────────────────────────────────  └──── shipments
  │ id                                              tracking_points
  │ registration_number
  │ vehicle_type / capacity                maintenance_records
  │ fuel_type                                │ id
  │ fuel_efficiency_kmpl                     │ vehicle_id (FK)
  │ odometer_km                              │ maintenance_type
  └──── trips                               │ status / scheduled_date
        maintenance_records                 └──── cost / technician
```

---

## Running Locally (Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- A Supabase PostgreSQL connection string in `backend/.env`

### Backend
```powershell
cd backend
.\venv\Scripts\activate          # Activate virtual environment
.\venv\Scripts\alembic upgrade head   # Run DB migrations
uvicorn app.main:app --reload    # Start server → http://127.0.0.1:8000
```

### Frontend
```powershell
cd frontend
npm install                      # Install dependencies
npm run dev                      # Start dev server → http://localhost:5173
```

### Environment Variables (`backend/.env`)
```env
DATABASE_URL=postgresql+psycopg2://postgres.<ref>:<password>@<host>:5432/postgres
SECRET_KEY=your-super-secret-key-here
GOOGLE_MAPS_API_KEY=           # Optional — enables live traffic routing
```

---

## Docker Deployment

### Single Command Deployment
```bash
# Clone and configure
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL

# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Ports after deployment:**
- Frontend: `http://localhost:80`
- Backend API: `http://localhost:8000`
- API Docs (Swagger): `http://localhost:8000/docs`

---

## Testing

```powershell
cd backend
.\venv\Scripts\activate
.\venv\Scripts\pytest tests/ -v     # Run all tests with verbose output
```

The test suite uses an in-memory **SQLite** database — no Supabase connection required to run tests.

**Test Coverage:**
- ✅ Health endpoints
- ✅ User registration & authentication
- ✅ Vehicle CRUD
- ✅ Maintenance scheduling & alerts
- ✅ Driver registration & assignment
- ✅ All analytics endpoints

---

## Project Structure

```
InfosysFLEETproject/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py           # JWT auth endpoints
│   │   │   ├── vehicles.py       # Fleet management
│   │   │   ├── tracking.py       # GPS tracking + route optimization
│   │   │   ├── shipments.py      # Shipment management
│   │   │   ├── maintenance.py    # Maintenance scheduling
│   │   │   ├── drivers.py        # Driver management
│   │   │   └── analytics.py      # Fleet analytics
│   │   ├── auth/
│   │   │   └── dependencies.py   # JWT middleware
│   │   ├── db/
│   │   │   └── database.py       # SQLAlchemy setup
│   │   ├── models/
│   │   │   └── models.py         # ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py        # Pydantic schemas
│   │   └── main.py               # FastAPI app + CORS
│   ├── alembic/                  # DB migrations
│   ├── tests/
│   │   └── test_api.py           # Integration tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx     # Main hub with sidebar tabs
│   │   │   ├── ShipmentsView.jsx
│   │   │   ├── MaintenanceView.jsx
│   │   │   ├── DriversView.jsx
│   │   │   └── AnalyticsView.jsx
│   │   ├── components/
│   │   │   ├── GoogleMapView.jsx
│   │   │   └── TrackingSimulator.jsx
│   │   └── api.js                # Axios client + all API helpers
│   ├── Dockerfile
│   ├── nginx.conf
│   └── vite.config.js
│
├── docker-compose.yml
├── CELERY_BACKGROUND_JOBS.md
└── README.md
```

---

*FleetFlow — Built as the Infosys Spring Internship 2026 Capstone Project.*
