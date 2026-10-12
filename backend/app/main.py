from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import vehicles, auth, tracking, shipments, maintenance, drivers, analytics

app = FastAPI(title="FleetFlow API")

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect routes
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(tracking.router)
app.include_router(shipments.router)
app.include_router(maintenance.router)
app.include_router(drivers.router)
app.include_router(analytics.router)

@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "message": "FleetFlow API is running!",
        "version": "1.0.0",
    }

@app.get("/ping")
async def ping_server():
    return {"ping": "pong"}
