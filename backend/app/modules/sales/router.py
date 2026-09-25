import uuid
import csv
import io
import json
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String, extract, Date as SADate, text
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.idempotency import idempotent
from app.core.audit import log_audit_event
from app.core.security import require_roles, get_client_ip
from app.modules.sales import models, schemas
from app.modules.inventory.models import Item, StockMovement, MovementType
from app.modules.repairs.models import JobOrder, Commission
from app.modules.auth.models import User

router = APIRouter(prefix="/sales", tags=["Sales"])

def generate_invoice_no():
    return f"INV-{uuid.uuid4().hex[:8].upper()}"

@router.get("/transactions", response_model=List[schemas.TransactionResponse])
async def get_transactions(
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Transaction).order_by(models.Transaction.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()

@router.get("/transactions/{transaction_id}", response_model=schemas.TransactionResponse)
async def get_transaction(
    transaction_id: str,
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    try:
        parsed_uuid = UUID(transaction_id)
        stmt = select(models.Transaction).where(models.Transaction.id == parsed_uuid)
    except (ValueError, AttributeError):
        stmt = select(models.Transaction).where(
            (models.Transaction.invoice_no == transaction_id) |
            (cast(models.Transaction.id, String) == transaction_id)
        )
    result = await session.execute(stmt)
    db_tx = result.scalar_one_or_none()
    if not db_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_tx

@router.post("/transactions/{transaction_id}/void", response_model=schemas.TransactionResponse)
@idempotent
async def void_transaction(
    request: Request,
    transaction_id: str,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    try:
        parsed_uuid = UUID(transaction_id)
        stmt = select(models.Transaction).where(models.Transaction.id == parsed_uuid)
    except (ValueError, AttributeError):
        stmt = select(models.Transaction).where(
            (models.Transaction.invoice_no == transaction_id) |
            (cast(models.Transaction.id, String) == transaction_id)
        )
    result = await session.execute(stmt)
    db_tx = result.scalar_one_or_none()
    if not db_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db_tx.status = models.TransactionStatus.VOIDED

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="TRANSACTION_VOIDED",
        resource=f"/api/v1/sales/transactions/{transaction_id}/void",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"invoice_no": db_tx.invoice_no, "transaction_id": str(transaction_id)},
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_tx)
    return db_tx

@router.post("/checkout", response_model=schemas.TransactionResponse, status_code=201)
@idempotent
async def checkout(
    request: Request,
    checkout_data: schemas.CheckoutRequest,
    current_user: dict = Depends(require_roles(["admin", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    """
    ACID POS Checkout Transaction:
    Atomically creates the transaction, deducts inventory stock,
    and updates repair job order & commissions inside a single database transaction.
    """
    subtotal = sum(item.qty * item.price for item in checkout_data.items)
    disc_pct = checkout_data.discount_percentage or 0.0
    disc_amt = checkout_data.discount_amount if checkout_data.discount_amount is not None else (subtotal * (disc_pct / 100.0))
    total = max(0.0, subtotal - disc_amt)

    cashier_user_name = checkout_data.cashier_name or current_user.get("email") or "Cashier"

    # 1. Create Transaction
    db_tx = models.Transaction(
        invoice_no=generate_invoice_no(),
        customer_id=checkout_data.customer_id,
        cashier_name=cashier_user_name,
        mechanic_name=checkout_data.mechanic_name,
        job_order_id=checkout_data.job_order_id,
        subtotal=subtotal,
        discount_percentage=disc_pct,
        discount_amount=disc_amt,
        total=total,
        amount_paid=checkout_data.amount_paid or total,
        cash_received=checkout_data.cash_received or checkout_data.amount_paid or total,
        cash_change=checkout_data.cash_change or 0.0,
        status=models.TransactionStatus.COMPLETED
    )
    session.add(db_tx)
    await session.flush()

    # 2. Add Transaction Items and deduct inventory in-place
    for item in checkout_data.items:
        db_item = models.TransactionItem(
            transaction_id=db_tx.id,
            item_id=item.item_id,
            qty=item.qty,
            price=item.price
        )
        session.add(db_item)

        # If item exists in inventory, deduct physical stock
        try:
            item_uuid = UUID(item.item_id)
            inv_res = await session.execute(
                select(Item).where(Item.id == item_uuid).with_for_update()
            )
            inv_item = inv_res.scalar_one_or_none()
            if inv_item and inv_item.item_type == "PRODUCT":
                inv_item.current_stock -= item.qty
                movement = StockMovement(
                    item_id=inv_item.id,
                    type=MovementType.SALE,
                    quantity_changed=-item.qty,
                    new_quantity=inv_item.current_stock,
                    reference_id=db_tx.id
                )
                session.add(movement)
        except Exception:
            pass

    # 3. Add Payment
    db_payment = models.Payment(
        transaction_id=db_tx.id,
        amount=checkout_data.amount_paid or total,
        method=checkout_data.payment_method
    )
    session.add(db_payment)

    # 4. If linked to Job Order, update status to PAID and settle mechanic commission
    if checkout_data.job_order_id:
        try:
            jo_res = await session.execute(
                select(JobOrder).where(JobOrder.id == checkout_data.job_order_id).with_for_update()
            )
            job_order = jo_res.scalar_one_or_none()
            if job_order:
                job_order.is_paid = True
                job_order.payment_status = "PAID"

                # Settle mechanic commission if mechanic assigned
                if job_order.mechanic_id:
                    mech_res = await session.execute(
                        select(User).where(User.id == job_order.mechanic_id)
                    )
                    mechanic = mech_res.scalar_one_or_none()
                    comm_rate = float(mechanic.commission_rate or 40.0) if mechanic else 40.0
                    labor_base = float(job_order.labor_charge or 0.0)
                    amount_earned = labor_base * (comm_rate / 100.0)

                    comm = Commission(
                        job_order_id=job_order.id,
                        mechanic_id=job_order.mechanic_id,
                        labor_base=labor_base,
                        rate_percentage=comm_rate,
                        amount_earned=amount_earned
                    )
                    session.add(comm)
        except Exception:
            pass

    # 5. Log audit event
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="POS_CHECKOUT",
        resource="/api/v1/sales/checkout",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "invoice_no": db_tx.invoice_no,
            "job_order_id": str(db_tx.job_order_id) if db_tx.job_order_id else None,
            "cashier_name": cashier_user_name,
            "total": float(total),
            "amount_paid": float(checkout_data.amount_paid or total),
            "payment_method": checkout_data.payment_method,
            "item_count": len(checkout_data.items)
        },
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_tx)
    return db_tx

@router.get("/reports/export")
async def export_sales_reports(
    request: Request,
    report_type: str = Query("MONTHLY"),
    date: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["admin", "manager", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Transaction).options(selectinload(models.Transaction.items)).order_by(models.Transaction.created_at.desc())
    stmt = stmt.where(models.Transaction.status == models.TransactionStatus.COMPLETED)

    if report_type.upper() == "DAILY" and date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d").date()
            stmt = stmt.where(cast(models.Transaction.created_at, SADate) == target_date)
        except Exception:
            pass
    elif report_type.upper() == "MONTHLY" and month:
        try:
            parts = month.split("-")
            yr, mo = int(parts[0]), int(parts[1])
            stmt = stmt.where(extract('year', models.Transaction.created_at) == yr, extract('month', models.Transaction.created_at) == mo)
        except Exception:
            pass
    elif report_type.upper() == "YEARLY" and year:
        try:
            yr = int(year)
            stmt = stmt.where(extract('year', models.Transaction.created_at) == yr)
        except Exception:
            pass

    result = await session.execute(stmt)
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Invoice No", "Date", "Cashier", "Mechanic", "Subtotal", "Discount", "Total", "Status"])
    for t in transactions:
        writer.writerow([
            t.invoice_no,
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.cashier_name or "",
            t.mechanic_name or "",
            f"{float(t.subtotal or 0):.2f}",
            f"{float(t.discount_amount or 0):.2f}",
            f"{float(t.total or 0):.2f}",
            str(t.status.value) if hasattr(t.status, "value") else str(t.status)
        ])

    output.seek(0)
    filename = f"sales_report_{report_type.lower()}_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
