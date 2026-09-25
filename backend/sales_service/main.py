import sys
import os
import asyncio
import json
import uuid
import aio_pika
import csv
import io
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, cast, String, extract, Date as SADate
from sqlalchemy.orm import selectinload
from datetime import datetime
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
from sales_service import models, schemas
from uuid import UUID

logger = get_logger("sales_service")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def consume_inventory_events():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    exchange = await channel.declare_exchange('pos_events', aio_pika.ExchangeType.TOPIC)
    queue = await channel.declare_queue('sales_saga_queue', durable=True)
    
    await queue.bind(exchange, routing_key='StockDeducted')
    await queue.bind(exchange, routing_key='StockDeductionFailed')

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                event_type = message.routing_key
                event = json.loads(message.body.decode())
                logger.info(f"Received {event_type} saga event: {event}")
                
                transaction_id = event['transaction_id']
                
                async with AsyncSessionLocal() as session:
                    try:
                        stmt = select(models.Transaction).where(models.Transaction.id == transaction_id)
                        result = await session.execute(stmt)
                        db_tx = result.scalar_one_or_none()
                        
                        if db_tx:
                            if event_type == 'StockDeducted':
                                db_tx.status = models.TransactionStatus.COMPLETED
                            elif event_type == 'StockDeductionFailed':
                                db_tx.status = models.TransactionStatus.VOIDED
                            
                            await session.commit()
                            logger.info(f"Updated Transaction {transaction_id} status to {db_tx.status}")
                    except Exception as e:
                        logger.error(f"Error processing inventory event: {e}")
                        await session.rollback()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db_schemas(engine, models.Base.metadata)
    except Exception as e:
        logger.warning(f"Could not auto-create tables on startup: {e}")
    outbox_task = asyncio.create_task(run_outbox_worker("sales", AsyncSessionLocal))
    consumer_task = asyncio.create_task(consume_inventory_events())
    yield
    outbox_task.cancel()
    consumer_task.cancel()

app = FastAPI(title="Sales Service", lifespan=lifespan)
app.add_middleware(RequestLoggingMiddleware, service_name="sales_service")

def generate_invoice_no():
    return f"INV-{uuid.uuid4().hex[:8].upper()}"

@app.get("/reports/export")
async def export_sales_reports(
    request: Request,
    report_type: str = Query("MONTHLY"),
    date: Optional[str] = Query(None),
    month: Optional[str] = Query(None),
    year: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["admin", "manager", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="SALES_REPORT_EXPORT",
        resource="/api/v1/sales/reports/export",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"exported_by": current_user.get("email"), "report_type": report_type, "date": date, "month": month, "year": year},
        ip_address=client_ip
    )

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

    total_revenue = sum(float(t.total or 0) for t in transactions)
    total_subtotal = sum(float(t.subtotal or 0) for t in transactions)
    total_discount = sum(float(t.discount_amount or 0) for t in transactions)
    tx_count = len(transactions)
    avg_ticket = (total_revenue / tx_count) if tx_count > 0 else 0.0

    period_label = (
        date if report_type.upper() == "DAILY" and date else
        month if report_type.upper() == "MONTHLY" and month else
        year if report_type.upper() == "YEARLY" and year else
        "all_time"
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Shop Metadata Header
    writer.writerow(["VERSIKLO MOTORCYCLE PARTS & REPAIR SHOP"])
    writer.writerow(["Official Sales & Financial Extraction Ledger (Python Backend Engine)"])
    writer.writerow(["Report Interval", report_type.upper()])
    writer.writerow(["Target Period", period_label])
    writer.writerow(["Exported At (UTC)", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow(["Exported By", current_user.get("email", "Staff User")])
    writer.writerow([])

    # Executive Summary Block
    writer.writerow(["EXECUTIVE FINANCIAL SUMMARY"])
    writer.writerow(["Metric", "Value (PHP)"])
    writer.writerow(["Gross Completed Sales Revenue", f"{total_revenue:.2f}"])
    writer.writerow(["Net Subtotal Billed", f"{total_subtotal:.2f}"])
    writer.writerow(["Total Discounts Applied", f"{total_discount:.2f}"])
    writer.writerow(["Completed Invoices Count", tx_count])
    writer.writerow(["Average Transaction Value", f"{avg_ticket:.2f}"])
    writer.writerow([])

    # Itemized Sales Transactions
    writer.writerow(["ITEMIZED SALES TRANSACTIONS LEDGER"])
    writer.writerow([
        "Invoice No", "Date & Time", "Cashier", "Mechanic", "Subtotal (PHP)",
        "Discount (PHP)", "Total (PHP)", "Cash Received (PHP)", "Change (PHP)", "Status", "Items Breakdown"
    ])

    for tx in transactions:
        created_str = tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else "N/A"
        items_desc = "; ".join([f"{item.qty}x [ID:{item.item_id}] @ ₱{float(item.price):.2f}" for item in (tx.items or [])])
        writer.writerow([
            tx.invoice_no or "",
            created_str,
            tx.cashier_name or "Counter Cashier",
            tx.mechanic_name or "N/A",
            f"{float(tx.subtotal or 0):.2f}",
            f"{float(tx.discount_amount or 0):.2f}",
            f"{float(tx.total or 0):.2f}",
            f"{float(tx.cash_received or 0):.2f}",
            f"{float(tx.cash_change or 0):.2f}",
            tx.status.value if hasattr(tx.status, 'value') else str(tx.status),
            items_desc
        ])

    output.seek(0)
    filename = f"versiklo_sales_report_{report_type.lower()}_{period_label}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/transactions", response_model=List[schemas.TransactionResponse])
async def get_transactions(
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Transaction).order_by(models.Transaction.created_at.desc())
    result = await session.execute(stmt)
    return result.scalars().all()

@app.get("/transactions/{transaction_id}", response_model=schemas.TransactionResponse)
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

@app.post("/transactions/{transaction_id}/void", response_model=schemas.TransactionResponse)
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

    logger.warning(f"TRANSACTION VOIDED | Invoice: {db_tx.invoice_no} | Tx ID: {transaction_id} | User: {current_user.get('email')}")

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

@app.post("/checkout", response_model=schemas.TransactionResponse, status_code=202)
@idempotent
async def checkout(
    request: Request,
    checkout_data: schemas.CheckoutRequest,
    current_user: dict = Depends(require_roles(["admin", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    subtotal = sum(item.qty * item.price for item in checkout_data.items)
    disc_pct = checkout_data.discount_percentage or 0.0
    disc_amt = checkout_data.discount_amount if checkout_data.discount_amount is not None else (subtotal * (disc_pct / 100.0))
    total = max(0.0, subtotal - disc_amt)
    
    cashier_user_name = checkout_data.cashier_name or current_user.get("email") or "Cashier"

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
    
    for item in checkout_data.items:
        db_item = models.TransactionItem(
            transaction_id=db_tx.id,
            item_id=item.item_id,
            qty=item.qty,
            price=item.price
        )
        session.add(db_item)
        
    db_payment = models.Payment(
        transaction_id=db_tx.id,
        amount=checkout_data.amount_paid or total,
        method=checkout_data.payment_method
    )
    session.add(db_payment)
    
    payload_items = [{"item_id": str(item.item_id), "qty": item.qty, "price": item.price, "total": item.qty * item.price} for item in checkout_data.items]
    
    outbox = models.OutboxEvent(
        event_type="SaleCreated",
        payload={
            "transaction_id": str(db_tx.id),
            "items": payload_items
        }
    )
    session.add(outbox)

    logger.info(
        f"DETAILED POS CHECKOUT TRANSACTION | Invoice: {db_tx.invoice_no} | JobOrder: {db_tx.job_order_id} | "
        f"Cashier: {cashier_user_name} | Mechanic: {checkout_data.mechanic_name} | "
        f"Subtotal: ₱{subtotal:.2f} | Discount: {disc_pct}% (₱{disc_amt:.2f}) | "
        f"Net Total: ₱{total:.2f} | Amount Paid: ₱{(checkout_data.amount_paid or total):.2f} | "
        f"Cash Received: ₱{(checkout_data.cash_received or total):.2f} | Change Due: ₱{(checkout_data.cash_change or 0.0):.2f} | "
        f"Payment Method: {checkout_data.payment_method} | Items Purchased ({len(checkout_data.items)}): {json.dumps(payload_items)}"
    )

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
            "mechanic_name": checkout_data.mechanic_name,
            "subtotal": float(subtotal),
            "discount_percentage": float(disc_pct),
            "discount_amount": float(disc_amt),
            "total": float(total),
            "amount_paid": float(checkout_data.amount_paid or total),
            "cash_received": float(checkout_data.cash_received or total),
            "cash_change": float(checkout_data.cash_change or 0.0),
            "payment_method": checkout_data.payment_method,
            "item_count": len(checkout_data.items),
            "items": payload_items
        },
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_tx)
    
    return db_tx

# AWS Lambda Handler (Serverless deployment)
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off", api_gateway_base_path="/api/v1/sales")
except ImportError:
    handler = None
