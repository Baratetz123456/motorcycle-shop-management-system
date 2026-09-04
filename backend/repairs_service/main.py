import sys
import os
import asyncio
import uuid
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.database import get_db, AsyncSessionLocal, engine, init_db_schemas
from shared.idempotency import idempotent
from shared.outbox import run_outbox_worker
from shared.audit import log_audit_event
from shared.security import require_roles, get_client_ip
from shared.logger import get_logger
from shared.logging_middleware import RequestLoggingMiddleware
from repairs_service import models, schemas
from uuid import UUID

logger = get_logger("repairs_service")

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db_schemas(engine, models.Base.metadata)
    except Exception as e:
        logger.warning(f"Could not auto-create tables on startup: {e}")
    outbox_task = asyncio.create_task(run_outbox_worker("repairs", AsyncSessionLocal))
    yield
    outbox_task.cancel()

app = FastAPI(title="Repairs Service", lifespan=lifespan)
app.add_middleware(RequestLoggingMiddleware, service_name="repairs_service")

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
            customer_name=job.customer_name or "Customer",
            motorcycle_name=str(job.motorcycle_id or "Motorcycle"),
            status=job.status,
            is_paid=bool(job.is_paid),
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
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(select(models.JobOrder).order_by(models.JobOrder.created_at.desc()))
    return result.scalars().all()

@app.post("/jobs", response_model=schemas.JobOrderResponse)
@idempotent
async def create_job(
    request: Request,
    job: schemas.JobOrderCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    job_dict = job.model_dump()
    
    # Ensure boolean is_paid and valid default payment status
    if "is_paid" not in job_dict or job_dict["is_paid"] is None:
        job_dict["is_paid"] = False
    if not job_dict.get("payment_status"):
        job_dict["payment_status"] = "UNPAID"
    if not job_dict.get("status"):
        job_dict["status"] = models.JobStatus.PENDING

    # Safely validate mechanic_id foreign key
    mech_id = job_dict.get("mechanic_id")
    if mech_id:
        try:
            check_user = await session.execute(text("SELECT id FROM auth.users WHERE id = :uid"), {"uid": mech_id})
            if not check_user.scalar_one_or_none():
                job_dict["mechanic_id"] = None
        except Exception:
            job_dict["mechanic_id"] = None
            
    if not job_dict.get("mechanic_id") and current_user.get("user_id"):
        try:
            curr_uid = UUID(str(current_user.get("user_id")))
            check_user = await session.execute(text("SELECT id FROM auth.users WHERE id = :uid"), {"uid": curr_uid})
            if check_user.scalar_one_or_none():
                job_dict["mechanic_id"] = curr_uid
        except Exception:
            pass

    db_job = models.JobOrder(
        jo_number=generate_jo_number(),
        **job_dict
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
    
    logger.info(f"REPAIR JOB CREATED | JO Number: {db_job.jo_number} | Customer: {db_job.customer_name} | Motorcycle: {db_job.motorcycle_id} | Mechanic: {db_job.mechanic_name} | Labor: ₱{float(db_job.labor_charge):.2f}")

    await session.commit()
    await session.refresh(db_job)
    return db_job

async def find_job_order(session: AsyncSession, job_id: str):
    db_job = None
    try:
        val_uuid = UUID(job_id)
        stmt = select(models.JobOrder).where((models.JobOrder.id == val_uuid) | (models.JobOrder.jo_number == job_id))
        result = await session.execute(stmt)
        db_job = result.scalar_one_or_none()
    except (ValueError, AttributeError):
        stmt = select(models.JobOrder).where(models.JobOrder.jo_number.ilike(job_id))
        result = await session.execute(stmt)
        db_job = result.scalar_one_or_none()
    return db_job

@app.patch("/jobs/{job_id}/status", response_model=schemas.JobOrderResponse)
@idempotent
async def update_job_status(
    request: Request,
    job_id: str,
    status_update: schemas.JobOrderStatusUpdate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_job = await find_job_order(session, job_id)
    
    if not db_job:
        raise HTTPException(status_code=404, detail="Job Order not found")
        
    old_status = db_job.status

    # Validate payment requirement for RELEASED status
    if status_update.status == models.JobStatus.RELEASED and not db_job.is_paid:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot release Job Order '{db_job.jo_number}' because payment has not been completed in POS."
        )

    db_job.status = status_update.status

    logger.info(f"REPAIR JOB STATUS UPDATED | JO Number: {db_job.jo_number} | Old Status: {old_status} -> New Status: {db_job.status}")

    # Generate Commission on Completion
    if db_job.status == models.JobStatus.COMPLETED and old_status != models.JobStatus.COMPLETED:
        commission_rate = 0.40
        commission_amount = float(db_job.labor_charge) * commission_rate
        
        commission = models.Commission(
            job_order_id=db_job.id,
            mechanic_id=db_job.mechanic_id,
            labor_base=db_job.labor_charge,
            rate_percentage=commission_rate * 100,
            amount_earned=commission_amount
        )
        session.add(commission)

        outbox = models.OutboxEvent(
            event_type="JobOrderCompleted",
            payload={
                "job_order_id": str(db_job.id),
                "jo_number": db_job.jo_number,
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
            "job_id": str(db_job.id),
            "old_status": str(old_status),
            "new_status": str(db_job.status),
            "jo_number": db_job.jo_number
        },
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_job)
    
    return db_job

@app.patch("/jobs/{job_id}/payment-status", response_model=schemas.JobOrderResponse)
@idempotent
async def update_job_payment_status(
    request: Request,
    job_id: str,
    current_user: dict = Depends(require_roles(["admin", "manager", "cashier", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_job = await find_job_order(session, job_id)
    
    if not db_job:
        raise HTTPException(status_code=404, detail="Job Order not found")
        
    db_job.is_paid = True
    db_job.payment_status = "PAID"
    db_job.status = models.JobStatus.COMPLETED

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

    logger.info(f"REPAIR JOB PAYMENT COMPLETED | JO Number: {db_job.jo_number} | Status: COMPLETED | Paid: True")

    await session.commit()
    await session.refresh(db_job)
    return db_job

@app.put("/jobs/{job_id}", response_model=schemas.JobOrderResponse)
@idempotent
async def update_job_details(
    request: Request,
    job_id: str,
    job_update: schemas.JobOrderUpdate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_job = await find_job_order(session, job_id)
    
    if not db_job:
        db_job = models.JobOrder(
            jo_number=job_id if job_id.upper().startswith("JO-") else f"JO-{job_id.upper()}",
            customer_name="Customer",
            motorcycle_id="Motorcycle",
            mechanic_name=job_update.mechanic_name or "Mike Smith",
            mechanic_notes=job_update.mechanic_notes or "",
            labor_charge=job_update.labor_charge if job_update.labor_charge is not None else 100.0,
            parts_charge=job_update.parts_charge if job_update.parts_charge is not None else 0.0,
            status=models.JobStatus.PENDING,
            payment_status="UNPAID",
            is_paid=False
        )
        session.add(db_job)
        await session.flush()
        
    update_data = job_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(db_job, field) and value is not None:
            setattr(db_job, field, value)
            
    logger.info(f"REPAIR JOB DETAILS & DIAGNOSIS UPDATED | JO Number: {db_job.jo_number} | Diagnosis Notes: '{db_job.mechanic_notes}' | Mechanic: {db_job.mechanic_name} | Labor Charge: ₱{float(db_job.labor_charge):.2f}")

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="REPAIR_JOB_DETAILS_UPDATED",
        resource=f"/api/v1/repairs/jobs/{db_job.id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"job_id": str(db_job.id), "updated_fields": list(update_data.keys()), "mechanic_notes": db_job.mechanic_notes},
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_job)
    return db_job

@app.delete("/jobs/{job_id}")
async def delete_job_order(
    request: Request,
    job_id: str,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_job = await find_job_order(session, job_id)
    
    if not db_job:
        raise HTTPException(status_code=404, detail="Job Order not found")
        
    # Enforce rule: Paid job orders cannot be deleted by anyone as they are already synchronized with sales, invoices, and inventory
    if db_job.is_paid:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete paid Job Order '{db_job.jo_number}' because it is already synchronized with sales management, invoice, and inventory."
        )

    jo_num = db_job.jo_number

    # Explicitly remove child commission and cart item records to prevent foreign key constraint errors
    await session.execute(
        text("DELETE FROM repairs.commissions WHERE job_order_id = :jid"),
        {"jid": db_job.id}
    )
    await session.execute(
        text("DELETE FROM repairs.repair_cart_items WHERE job_order_id = :jid"),
        {"jid": db_job.id}
    )

    await session.delete(db_job)
    
    logger.warning(f"REPAIR JOB REMOVED | JO Number: {jo_num} | Job ID: {job_id}")

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="REPAIR_JOB_REMOVED",
        resource=f"/api/v1/repairs/jobs/{job_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"job_id": str(job_id), "jo_number": jo_num},
        ip_address=client_ip
    )
    
    await session.commit()
    return {"message": "Job Order removed successfully", "job_id": str(job_id)}

@app.get("/customer-history", response_model=List[schemas.CustomerHistoryRecordResponse])
async def get_all_customer_history(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    # Fetch all job orders
    jobs_res = await session.execute(select(models.JobOrder).order_by(models.JobOrder.created_at.desc()))
    jobs = jobs_res.scalars().all()

    # Fetch all motorcycles
    motos_res = await session.execute(select(models.Motorcycle))
    motos = motos_res.scalars().all()
    moto_contact_map = {m.customer_name.lower(): m.customer_contact for m in motos if m.customer_name and m.customer_contact}
    moto_model_map = {m.customer_name.lower(): f"{m.brand} {m.model}" for m in motos if m.customer_name}

    # Fetch cart items for all jobs
    cart_res = await session.execute(select(models.RepairCartItem))
    cart_items = cart_res.scalars().all()
    job_items_map = {}
    for ci in cart_items:
        jid = str(ci.job_order_id)
        if jid not in job_items_map:
            job_items_map[jid] = []
        job_items_map[jid].append(schemas.CustomerHistoryItemUsed(
            name=ci.item_name,
            qty=ci.qty,
            price=float(ci.unit_price)
        ))

    # Group jobs by customer name
    grouped = {}
    for j in jobs:
        c_name = j.customer_name or "Customer"
        key = c_name.strip().lower()
        if key not in grouped:
            grouped[key] = {
                "customer_name": c_name,
                "jobs": []
            }
        grouped[key]["jobs"].append(j)

    result = []
    for key, data in grouped.items():
        c_name = data["customer_name"]
        c_jobs = data["jobs"]
        
        # Determine active status: if any job is PENDING, ONGOING, or COMPLETED
        has_active = any(j.status in [models.JobStatus.PENDING, models.JobStatus.ONGOING, models.JobStatus.COMPLETED] for j in c_jobs)
        active_status = "ACTIVE_REPAIR" if has_active else "INACTIVE"
        
        contact = moto_contact_map.get(key, "+1 (555) 234-5678")
        latest_job = c_jobs[0]
        model_name = str(latest_job.motorcycle_id) if latest_job.motorcycle_id else moto_model_map.get(key, "Motorcycle")
        
        past_jobs_list = []
        for j in c_jobs:
            past_jobs_list.append(schemas.CustomerHistoryPastJob(
                job_id=str(j.id),
                jo_number=j.jo_number,
                date_repaired=j.created_at.isoformat() if j.created_at else datetime.utcnow().isoformat(),
                status=j.status.value if hasattr(j.status, "value") else str(j.status),
                mechanic_name=j.mechanic_name or "Mike Smith",
                mechanic_notes=j.mechanic_notes or "",
                labor_charge=float(j.labor_charge),
                parts_charge=float(j.parts_charge),
                items_used=job_items_map.get(str(j.id), [])
            ))

        result.append(schemas.CustomerHistoryRecordResponse(
            customer_id=f"cust-{abs(hash(key)) % 1000000}",
            customer_name=c_name,
            contact_number=contact,
            motorcycle_model=model_name,
            total_repair_sessions=len(c_jobs),
            last_service_date=latest_job.created_at.isoformat() if latest_job.created_at else datetime.utcnow().isoformat(),
            active_status=active_status,
            past_jobs=past_jobs_list
        ))

    return result

@app.get("/commissions")
async def get_commissions(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Commission).order_by(models.Commission.created_at.desc())
    result = await session.execute(stmt)
    commissions = result.scalars().all()
    return [
        {
            "id": str(c.id),
            "job_order_id": str(c.job_order_id) if c.job_order_id else None,
            "mechanic_id": str(c.mechanic_id) if c.mechanic_id else None,
            "labor_base": float(c.labor_base),
            "rate_percentage": float(c.rate_percentage),
            "amount_earned": float(c.amount_earned),
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in commissions
    ]

