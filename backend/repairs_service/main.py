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

@app.get("/motorcycle-models", response_model=List[schemas.MotorcycleModelResponse])
async def get_motorcycle_models(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(select(models.MotorcycleModel).order_by(models.MotorcycleModel.brand, models.MotorcycleModel.model))
    return result.scalars().all()

@app.post("/motorcycle-models", response_model=schemas.MotorcycleModelResponse)
@idempotent
async def create_motorcycle_model(
    request: Request,
    moto_model: schemas.MotorcycleModelCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_model = models.MotorcycleModel(**moto_model.model_dump())
    session.add(db_model)
    await session.commit()
    await session.refresh(db_model)
    return db_model

@app.get("/jobs/active-carts", response_model=List[schemas.ActiveCustomerRepairCartResponse])
async def get_active_repair_carts(
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    query = select(models.JobOrder).where(models.JobOrder.status.in_([models.JobStatus.PENDING, models.JobStatus.ONGOING, models.JobStatus.COMPLETED])).order_by(models.JobOrder.created_at.desc())
    result = await session.execute(query)
    jobs = result.scalars().all()

    active_carts = []
    for job in jobs:
        cart_items_stmt = select(models.RepairCartItem).where(models.RepairCartItem.job_order_id == job.id)
        cart_res = await session.execute(cart_items_stmt)
        c_items = cart_res.scalars().all()

        parts_sum = sum(float(i.total_price) for i in c_items if i.item_type == "PRODUCT")
        services_sum = sum(float(i.total_price) for i in c_items if i.item_type == "SERVICE")
        total_amt = float(job.labor_charge) + parts_sum + services_sum

        active_carts.append(schemas.ActiveCustomerRepairCartResponse(
            job_id=job.id,
            jo_number=job.jo_number,
            customer_name="Customer",
            motorcycle_name=str(job.motorcycle_id or "Motorcycle"),
            status=job.status,
            labor_charge=float(job.labor_charge),
            parts_charge=parts_sum + services_sum,
            total_amount=total_amt,
            cart_items=[schemas.RepairCartItemResponse.model_validate(ci) for ci in c_items]
        ))
    return active_carts

@app.post("/jobs/{job_id}/cart-items", response_model=schemas.RepairCartItemResponse)
@idempotent
async def add_cart_item_to_job(
    request: Request,
    job_id: UUID,
    cart_item: schemas.RepairCartItemCreate,
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.JobOrder).where(models.JobOrder.id == job_id)
    result = await session.execute(stmt)
    db_job = result.scalar_one_or_none()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job Order not found")

    db_item = models.RepairCartItem(
        job_order_id=job_id,
        **cart_item.model_dump()
    )
    session.add(db_item)
    await session.commit()
    await session.refresh(db_item)
    return db_item

@app.get("/motorcycles", response_model=List[schemas.MotorcycleResponse])
async def get_motorcycles(
    search: Optional[str] = None,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    query = select(models.Motorcycle)
    if search:
        s_val = f"%{search}%"
        query = query.where(
            (models.Motorcycle.plate_number.ilike(s_val)) |
            (models.Motorcycle.model.ilike(s_val)) |
            (models.Motorcycle.brand.ilike(s_val)) |
            (models.Motorcycle.customer_name.ilike(s_val))
        )
    query = query.order_by(models.Motorcycle.created_at.desc())
    result = await session.execute(query)
    return result.scalars().all()

@app.post("/motorcycles", response_model=schemas.MotorcycleResponse)
@idempotent
async def create_motorcycle(
    request: Request,
    moto: schemas.MotorcycleCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    # Check duplicate plate number
    existing_stmt = select(models.Motorcycle).where(models.Motorcycle.plate_number == moto.plate_number)
    existing_res = await session.execute(existing_stmt)
    if existing_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Motorcycle with plate number '{moto.plate_number}' already exists")

    db_moto = models.Motorcycle(**moto.model_dump())
    session.add(db_moto)
    
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="MOTORCYCLE_PROFILE_CREATED",
        resource="/api/v1/repairs/motorcycles",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"plate_number": moto.plate_number, "model": moto.model, "customer_name": moto.customer_name},
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_moto)
    return db_moto

@app.get("/motorcycles/{moto_id}", response_model=schemas.MotorcycleResponse)
async def get_motorcycle(
    moto_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Motorcycle).where(models.Motorcycle.id == moto_id)
    result = await session.execute(stmt)
    db_moto = result.scalar_one_or_none()
    if not db_moto:
        raise HTTPException(status_code=404, detail="Motorcycle profile not found")
    return db_moto

@app.put("/motorcycles/{moto_id}", response_model=schemas.MotorcycleResponse)
@idempotent
async def update_motorcycle(
    request: Request,
    moto_id: UUID,
    moto_update: schemas.MotorcycleUpdate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Motorcycle).where(models.Motorcycle.id == moto_id)
    result = await session.execute(stmt)
    db_moto = result.scalar_one_or_none()
    if not db_moto:
        raise HTTPException(status_code=404, detail="Motorcycle profile not found")
        
    update_data = moto_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_moto, field, value)
        
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="MOTORCYCLE_PROFILE_UPDATED",
        resource=f"/api/v1/repairs/motorcycles/{moto_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"moto_id": str(moto_id), "updated_fields": list(update_data.keys())},
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_moto)
    return db_moto

@app.get("/motorcycles/{moto_id}/history", response_model=List[schemas.RepairLogEntry])
async def get_motorcycle_history(
    moto_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    # Fetch motorcycle profile
    moto_stmt = select(models.Motorcycle).where(models.Motorcycle.id == moto_id)
    moto_res = await session.execute(moto_stmt)
    db_moto = moto_res.scalar_one_or_none()
    if not db_moto:
        raise HTTPException(status_code=404, detail="Motorcycle profile not found")
        
    # Fetch jobs matching motorcycle_id (ID string or plate number)
    query = select(models.JobOrder).where(
        (models.JobOrder.motorcycle_id == str(moto_id)) | 
        (models.JobOrder.motorcycle_id == db_moto.plate_number) |
        (models.JobOrder.motorcycle_id == db_moto.model)
    ).order_by(models.JobOrder.created_at.desc())
    
    result = await session.execute(query)
    jobs = result.scalars().all()
    
    log_entries = []
    for job in jobs:
        log_entries.append(schemas.RepairLogEntry(
            job_id=job.id,
            jo_number=job.jo_number,
            motorcycle_id=str(job.motorcycle_id),
            motorcycle_model=db_moto.model,
            date_repaired=job.created_at,
            status=job.status,
            customer_name=db_moto.customer_name,
            mechanic_id=job.mechanic_id,
            mechanic_name="Assigned Mechanic",
            labor_charge=float(job.labor_charge),
            parts_charge=float(job.parts_charge)
        ))
    return log_entries

@app.get("/motorcycles/history/customer", response_model=List[schemas.RepairLogEntry])
async def get_customer_repair_history(
    customer_name: str,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    # Find all motorcycles for this customer
    moto_stmt = select(models.Motorcycle).where(models.Motorcycle.customer_name.ilike(f"%{customer_name}%"))
    moto_res = await session.execute(moto_stmt)
    motos = moto_res.scalars().all()
    
    moto_map = {str(m.id): m for m in motos}
    for m in motos:
        moto_map[m.plate_number] = m
        moto_map[m.model] = m
        
    moto_identifiers = list(moto_map.keys())
    
    if not moto_identifiers:
        return []
        
    jobs_stmt = select(models.JobOrder).where(models.JobOrder.motorcycle_id.in_(moto_identifiers)).order_by(models.JobOrder.created_at.desc())
    jobs_res = await session.execute(jobs_stmt)
    jobs = jobs_res.scalars().all()
    
    log_entries = []
    for job in jobs:
        matched_moto = moto_map.get(str(job.motorcycle_id))
        c_name = matched_moto.customer_name if matched_moto else customer_name
        m_model = matched_moto.model if matched_moto else "Unknown Model"
        
        log_entries.append(schemas.RepairLogEntry(
            job_id=job.id,
            jo_number=job.jo_number,
            motorcycle_id=str(job.motorcycle_id),
            motorcycle_model=m_model,
            date_repaired=job.created_at,
            status=job.status,
            customer_name=c_name,
            mechanic_id=job.mechanic_id,
            mechanic_name="Assigned Mechanic",
            labor_charge=float(job.labor_charge),
            parts_charge=float(job.parts_charge)
        ))
    return log_entries

@app.get("/jobs", response_model=List[schemas.JobOrderResponse])
async def get_jobs(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(select(models.JobOrder).order_by(models.JobOrder.created_at.desc()))
    return result.scalars().all()

@app.post("/jobs", response_model=schemas.JobOrderResponse)
@idempotent
async def create_job(
    request: Request,
    job: schemas.JobOrderCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
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
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
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
