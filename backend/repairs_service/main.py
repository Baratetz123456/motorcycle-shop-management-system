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
from shared.audit import log_audit_event
from shared.security import require_roles, get_client_ip
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
async def get_jobs(
    current_user: dict = Depends(require_roles(["admin", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(select(models.JobOrder).order_by(models.JobOrder.created_at.desc()))
    return result.scalars().all()

@app.post("/jobs", response_model=schemas.JobOrderResponse)
@idempotent
async def create_job(
    request: Request,
    job: schemas.JobOrderCreate,
    current_user: dict = Depends(require_roles(["admin", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_job = models.JobOrder(
        jo_number=generate_jo_number(),
        **job.model_dump()
    )
    session.add(db_job)
    
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="REPAIR_JOB_CREATED",
        resource="/api/v1/repairs/jobs",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"jo_number": db_job.jo_number, "labor_charge": float(db_job.labor_charge)},
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_job)
    return db_job

@app.patch("/jobs/{job_id}/status", response_model=schemas.JobOrderResponse)
@idempotent
async def update_job_status(
    request: Request,
    job_id: UUID,
    status_update: schemas.JobOrderStatusUpdate,
    current_user: dict = Depends(require_roles(["admin", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.JobOrder).where(models.JobOrder.id == job_id)
    result = await session.execute(stmt)
    db_job = result.scalar_one_or_none()
    
    if not db_job:
        raise HTTPException(status_code=404, detail="Job Order not found")
        
    old_status = db_job.status
    db_job.status = status_update.status
    
    if db_job.status == models.JobStatus.COMPLETED:
        commission_rate = 0.40
        commission_amount = float(db_job.labor_charge) * commission_rate
        
        db_commission = models.Commission(
            job_order_id=db_job.id,
            mechanic_id=db_job.mechanic_id,
            labor_base=db_job.labor_charge,
            rate_percentage=commission_rate * 100,
            amount_earned=commission_amount
        )
        session.add(db_commission)
        
        outbox = models.OutboxEvent(
            event_type="JobCompleted",
            payload={
                "job_id": str(db_job.id),
                "mechanic_id": str(db_job.mechanic_id),
                "commission_earned": float(commission_amount)
            }
        )
        session.add(outbox)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="REPAIR_JOB_UPDATE",
        resource=f"/api/v1/repairs/jobs/{job_id}/status",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "job_id": str(job_id),
            "old_status": str(old_status),
            "new_status": str(db_job.status),
            "jo_number": db_job.jo_number
        },
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_job)
    
    return db_job
