# Celery Background Jobs — FleetFlow

## What is Celery?
Celery is a Python task queue for running background jobs asynchronously.
For FleetFlow, it would be used to:
- Automatically mark overdue maintenance records as "Overdue" on a schedule
- Send email/SMS notifications when a shipment is delivered
- Recalculate ETAs in bulk periodically

## Architecture
```
FastAPI → publishes task → Celery Worker → executes task
                ↕
            Redis (message broker)
```

## Why Celery is not running yet
Celery requires a **Redis** or **RabbitMQ** server as a message broker.
For a local development / internship submission setup, we simulate
background jobs using FastAPI's `BackgroundTasks` instead — which runs
the job in the same process without needing a separate server.

## For demonstration, background jobs are implemented as:
- `GET /maintenance/alerts` — queries overdue records on demand
- Shipment status updates are synchronous via the PATCH endpoint

## To enable full Celery in production:
1. Install Redis: `winget install Redis.Redis`
2. Install Celery: `pip install celery[redis]`
3. Create `backend/celery_worker.py`
4. Start worker: `celery -A celery_worker worker --loglevel=info`

## Example Celery task (for reference):
```python
from celery import Celery
from datetime import datetime, timezone
from app.db.database import SessionLocal
from app.models.models import MaintenanceRecord

celery_app = Celery("fleetflow", broker="redis://localhost:6379/0")

@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(3600.0, check_overdue_maintenance.s(), name="check overdue every hour")

@celery_app.task
def check_overdue_maintenance():
    db = SessionLocal()
    now = datetime.now(timezone.utc)
    overdue = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.status == "Scheduled",
        MaintenanceRecord.scheduled_date < now
    ).all()
    for r in overdue:
        r.status = "Overdue"
    db.commit()
    db.close()
    return f"Marked {len(overdue)} records as overdue"
```
