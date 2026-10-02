import uuid
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.database import get_db
from app.core.idempotency import idempotent
from app.core.audit import log_audit_event
from app.core.security import require_roles, get_client_ip
from app.modules.repairs import models, schemas

router = APIRouter(prefix="/repairs", tags=["Repairs"])

def generate_jo_number():
    return f"JO-{uuid.uuid4().hex[:8].upper()}"

async def find_job_order(session: AsyncSession, job_id: str):
    try:
        val_uuid = UUID(job_id)
        stmt = select(models.JobOrder).where((models.JobOrder.id == val_uuid) | (models.JobOrder.jo_number == job_id))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
    except (ValueError, AttributeError):
        stmt = select(models.JobOrder).where(models.JobOrder.jo_number.ilike(job_id))
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

@router.get("/motorcycle-models", response_model=List[schemas.MotorcycleModelResponse])
async def get_motorcycle_models(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    models_res = await session.execute(
        select(models.MotorcycleModel)
        .where(models.MotorcycleModel.is_active == True)
        .order_by(models.MotorcycleModel.brand, models.MotorcycleModel.model)
    )
    db_models = models_res.scalars().all()

    completed_jobs_res = await session.execute(
        select(models.JobOrder)
        .where(models.JobOrder.status.in_([models.JobStatus.COMPLETED, models.JobStatus.RELEASED]))
    )
    completed_jobs = completed_jobs_res.scalars().all()

    motos_res = await session.execute(select(models.Motorcycle))
    motos = motos_res.scalars().all()
    moto_uuid_map = {str(m.id): f"{m.brand} {m.model}".lower() for m in motos}

    response_items = []
    for m in db_models:
        model_lower = (m.model or "").strip().lower()
        freq = 0
        for job in completed_jobs:
            raw_moto = (job.motorcycle_id or "").strip().lower()
            mapped_str = moto_uuid_map.get(raw_moto, "")
            if (model_lower and model_lower in raw_moto) or (mapped_str and model_lower in mapped_str):
                freq += 1

        response_items.append(
            schemas.MotorcycleModelResponse(
                id=m.id,
                brand=m.brand,
                model=m.model,
                year=m.year,
                category=m.category,
                is_active=m.is_active,
                service_frequency=freq,
                created_at=m.created_at
            )
        )
    return response_items

@router.post("/motorcycle-models", response_model=schemas.MotorcycleModelResponse)
@idempotent
async def create_motorcycle_model(
    request: Request,
    moto_model: schemas.MotorcycleModelCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_model = models.MotorcycleModel(**moto_model.model_dump(), is_active=True)
    session.add(db_model)
    await session.commit()
    await session.refresh(db_model)

    await log_audit_event(
        session=session,
        action="MOTORCYCLE_MODEL_CREATED",
        resource=f"/api/v1/repairs/motorcycle-models/{db_model.id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"brand": db_model.brand, "model": db_model.model, "year": db_model.year},
        ip_address=get_client_ip(request)
    )

    return schemas.MotorcycleModelResponse(
        id=db_model.id,
        brand=db_model.brand,
        model=db_model.model,
        year=db_model.year,
        category=db_model.category,
        is_active=db_model.is_active,
        service_frequency=0,
        created_at=db_model.created_at
    )

@router.get("/jobs/active-carts", response_model=List[schemas.ActiveCustomerRepairCartResponse])
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

@router.post("/jobs/{job_id}/cart-items", response_model=schemas.RepairCartItemResponse)
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

@router.get("/motorcycles", response_model=List[schemas.MotorcycleResponse])
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

@router.post("/motorcycles", response_model=schemas.MotorcycleResponse)
@idempotent
async def create_motorcycle(
    request: Request,
    moto: schemas.MotorcycleCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
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

@router.get("/jobs", response_model=List[schemas.JobOrderResponse])
async def get_jobs(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    result = await session.execute(select(models.JobOrder).order_by(models.JobOrder.created_at.desc()))
    return result.scalars().all()

@router.post("/jobs", response_model=schemas.JobOrderResponse)
@idempotent
async def create_job(
    request: Request,
    job: schemas.JobOrderCreate,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    job_dict = job.model_dump()
    if "is_paid" not in job_dict or job_dict["is_paid"] is None:
        job_dict["is_paid"] = False
    if not job_dict.get("payment_status"):
        job_dict["payment_status"] = "UNPAID"
    if not job_dict.get("status"):
        job_dict["status"] = models.JobStatus.PENDING

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

    await session.commit()
    await session.refresh(db_job)
    return db_job

@router.patch("/jobs/{job_id}/status", response_model=schemas.JobOrderResponse)
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
    if status_update.status == models.JobStatus.RELEASED and not db_job.is_paid:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot release Job Order '{db_job.jo_number}' because payment has not been completed in POS."
        )

    db_job.status = status_update.status

    # Generate Commission on Completion if not already paid
    if db_job.status == models.JobStatus.COMPLETED and old_status != models.JobStatus.COMPLETED and db_job.mechanic_id:
        commission_rate = 40.0
        commission_amount = float(db_job.labor_charge) * (commission_rate / 100.0)
        commission = models.Commission(
            job_order_id=db_job.id,
            mechanic_id=db_job.mechanic_id,
            labor_base=db_job.labor_charge,
            rate_percentage=commission_rate,
            amount_earned=commission_amount
        )
        session.add(commission)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="REPAIR_JOB_UPDATE",
        resource=f"/api/v1/repairs/jobs/{job_id}/status",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"job_id": str(db_job.id), "old_status": str(old_status), "new_status": str(db_job.status)},
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_job)
    return db_job

@router.put("/jobs/{job_id}", response_model=schemas.JobOrderResponse)
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
        raise HTTPException(status_code=404, detail="Job Order not found")

    update_data = job_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(db_job, field) and value is not None:
            setattr(db_job, field, value)

    await session.commit()
    await session.refresh(db_job)
    return db_job

@router.delete("/jobs/{job_id}")
async def delete_job_order(
    request: Request,
    job_id: str,
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    db_job = await find_job_order(session, job_id)
    if not db_job:
        raise HTTPException(status_code=404, detail="Job Order not found")

    if db_job.is_paid:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete paid Job Order '{db_job.jo_number}' because it is already synchronized with sales management."
        )

    jo_num = db_job.jo_number
    await session.execute(text("DELETE FROM repairs.commissions WHERE job_order_id = :jid"), {"jid": db_job.id})
    await session.execute(text("DELETE FROM repairs.repair_cart_items WHERE job_order_id = :jid"), {"jid": db_job.id})
    await session.delete(db_job)

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

@router.patch("/jobs/{job_id}/payment-status", response_model=schemas.JobOrderResponse)
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

    # Check if commission already exists for this job order
    comm_check = await session.execute(
        select(models.Commission).where(models.Commission.job_order_id == db_job.id)
    )
    if not comm_check.scalars().first():
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

    await session.commit()
    await session.refresh(db_job)
    return db_job

@router.get("/customer-history", response_model=List[schemas.CustomerHistoryRecordResponse])
async def get_all_customer_history(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    jobs_res = await session.execute(select(models.JobOrder).order_by(models.JobOrder.created_at.desc()))
    jobs = jobs_res.scalars().all()

    motos_res = await session.execute(select(models.Motorcycle))
    motos = motos_res.scalars().all()
    moto_contact_map = {m.customer_name.strip().lower(): m.customer_contact for m in motos if m.customer_name and m.customer_contact}
    moto_model_map = {m.customer_name.strip().lower(): f"{m.brand} {m.model}" for m in motos if m.customer_name}

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

    grouped = {}
    for j in jobs:
        c_name = (j.customer_name or "Customer").strip()
        key = c_name.lower()
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
        
        has_active = any(j.status in [models.JobStatus.PENDING, models.JobStatus.ONGOING, models.JobStatus.COMPLETED] for j in c_jobs)
        active_status = "ACTIVE_REPAIR" if has_active else "INACTIVE"
        
        contact = moto_contact_map.get(key, "+63 912 345 6789")
        latest_job = c_jobs[0]
        model_name = str(latest_job.motorcycle_id) if latest_job.motorcycle_id else moto_model_map.get(key, "Motorcycle")
        
        past_jobs_list = []
        for j in c_jobs:
            c_items = job_items_map.get(str(j.id), [])
            parts_charge = sum(float(i.price * i.qty) for i in c_items) if c_items else float(j.parts_charge)
            total_billed = float(j.labor_charge) + parts_charge
            past_jobs_list.append(schemas.CustomerHistoryPastJob(
                job_id=str(j.id),
                jo_number=j.jo_number,
                date_repaired=j.created_at.isoformat() if j.created_at else datetime.utcnow().isoformat(),
                status=j.status.value if hasattr(j.status, "value") else str(j.status),
                mechanic_name=j.mechanic_name or "Mike Smith",
                mechanic_notes=j.mechanic_notes or "",
                labor_charge=float(j.labor_charge),
                parts_charge=parts_charge,
                total_billed=total_billed,
                invoice_no=f"INV-{j.jo_number.replace('JO-', '')}" if j.is_paid else None,
                items_used=c_items
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

@router.get("/commissions", response_model=List[schemas.CommissionResponse])
async def get_commissions(
    current_user: dict = Depends(require_roles(["admin", "manager", "mechanic", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Commission).order_by(models.Commission.created_at.desc())
    res = await session.execute(stmt)
    commissions = res.scalars().all()

    job_ids = [c.job_order_id for c in commissions if c.job_order_id]
    job_map = {}
    if job_ids:
        jobs_stmt = select(models.JobOrder).where(models.JobOrder.id.in_(job_ids))
        jobs_res = await session.execute(jobs_stmt)
        for j in jobs_res.scalars().all():
            job_map[j.id] = j

    response = []
    for c in commissions:
        j = job_map.get(c.job_order_id)
        response.append(schemas.CommissionResponse(
            id=c.id,
            job_order_id=c.job_order_id,
            jo_number=j.jo_number if j else None,
            customer_name=j.customer_name if j else "Customer",
            motorcycle_name=str(j.motorcycle_id or "Motorcycle") if j else "Motorcycle",
            mechanic_id=c.mechanic_id,
            mechanic_name=(j.mechanic_name if j and j.mechanic_name else "Mechanic"),
            labor_base=float(c.labor_base),
            rate_percentage=float(c.rate_percentage),
            amount_earned=float(c.amount_earned),
            status="DISBURSED" if (j and j.is_paid) else "PENDING",
            created_at=c.created_at
        ))
    return response

