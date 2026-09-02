import sys
import os
import asyncio
import uuid
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from contextlib import asynccontextmanager

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.database import get_db, AsyncSessionLocal
from shared.idempotency import idempotent
from shared.outbox import run_outbox_worker
from repairs_service import models, schemas
from uuid import UUID

@asynccontextmanager
async def lifespan(app: FastAPI):
    outbox_task = asyncio.create_task(run_outbox_worker("repairs", AsyncSessionLocal))
    yield
    outbox_task.cancel()

app = FastAPI(title="Repairs Service", lifespan=lifespan)

def generate_jo_number():
    return f"JO-{uuid.uuid4().hex[:8].upper()}"

@app.get("/jobs", response_model=List[schemas.JobOrderResponse])
async def get_jobs(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.JobOrder).order_by(models.JobOrder.created_at.desc()))
    return result.scalars().all()

@app.post("/jobs", response_model=schemas.JobOrderResponse)
@idempotent
async def create_job(request: Request, job: schemas.JobOrderCreate, session: AsyncSession = Depends(get_db)):
    db_job = models.JobOrder(
        jo_number=generate_jo_number(),
        **job.model_dump()
    )
    session.add(db_job)
    await session.commit()
    await session.refresh(db_job)
    return db_job

@app.patch("/jobs/{job_id}/status", response_model=schemas.JobOrderResponse)
@idempotent
async def update_job_status(request: Request, job_id: UUID, status_update: schemas.JobOrderStatusUpdate, session: AsyncSession = Depends(get_db)):
    stmt = select(models.JobOrder).where(models.JobOrder.id == job_id)
    result = await session.execute(stmt)
    db_job = result.scalar_one_or_none()
    
    if not db_job:
        raise HTTPException(status_code=404, detail="Job Order not found")
        
    db_job.status = status_update.status
    
    # Calculate commission if job is completed
    if db_job.status == models.JobStatus.COMPLETED:
        commission_rate = 0.40 # 40% standard mechanic commission
        commission_amount = float(db_job.labor_charge) * commission_rate
        
        db_commission = models.Commission(
            job_order_id=db_job.id,
            mechanic_id=db_job.mechanic_id,
            labor_base=db_job.labor_charge,
            rate_percentage=commission_rate * 100,
            amount_earned=commission_amount
        )
        session.add(db_commission)
        
        # Publish event for reporting/payroll
        outbox = models.OutboxEvent(
            event_type="JobCompleted",
            payload={
                "job_id": str(db_job.id),
                "mechanic_id": str(db_job.mechanic_id),
                "commission_earned": float(commission_amount)
            }
        )
        session.add(outbox)

    await session.commit()
    await session.refresh(db_job)
    
    return db_job
