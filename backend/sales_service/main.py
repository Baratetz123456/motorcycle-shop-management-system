import sys
import os
import asyncio
import json
import uuid
import aio_pika
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
from contextlib import asynccontextmanager

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.database import get_db, AsyncSessionLocal
from shared.idempotency import idempotent
from shared.outbox import run_outbox_worker
from shared.audit import log_audit_event
from shared.security import require_roles, get_client_ip
from sales_service import models, schemas
from uuid import UUID

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
                print(f"[Sales] Received {event_type} event: {event}")
                
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
                            print(f"[Sales] Updated Tx {transaction_id} status to {db_tx.status}")
                    except Exception as e:
                        print(f"[Sales] Error processing inventory event: {e}")
                        await session.rollback()

@asynccontextmanager
async def lifespan(app: FastAPI):
    outbox_task = asyncio.create_task(run_outbox_worker("sales", AsyncSessionLocal))
    consumer_task = asyncio.create_task(consume_inventory_events())
    yield
    outbox_task.cancel()
    consumer_task.cancel()

app = FastAPI(title="Sales Service", lifespan=lifespan)

def generate_invoice_no():
    return f"INV-{uuid.uuid4().hex[:8].upper()}"

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
    transaction_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Transaction).where(models.Transaction.id == transaction_id)
    result = await session.execute(stmt)
    db_tx = result.scalar_one_or_none()
    if not db_tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return db_tx

@app.post("/transactions/{transaction_id}/void", response_model=schemas.TransactionResponse)
@idempotent
async def void_transaction(
    request: Request,
    transaction_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Transaction).where(models.Transaction.id == transaction_id)
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

@app.post("/checkout", response_model=schemas.TransactionResponse, status_code=202)
@idempotent
async def checkout(
    request: Request,
    checkout_data: schemas.CheckoutRequest,
    current_user: dict = Depends(require_roles(["admin", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    subtotal = sum(item.qty * item.price for item in checkout_data.items)
    total = subtotal
    
    cashier_user_name = checkout_data.cashier_name or current_user.get("email") or "Cashier"

    db_tx = models.Transaction(
        invoice_no=generate_invoice_no(),
        customer_id=checkout_data.customer_id,
        cashier_name=cashier_user_name,
        mechanic_name=checkout_data.mechanic_name,
        job_order_id=checkout_data.job_order_id,
        subtotal=subtotal,
        total=total,
        amount_paid=checkout_data.amount_paid,
        status=models.TransactionStatus.PENDING
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
        amount=checkout_data.amount_paid,
        method=checkout_data.payment_method
    )
    session.add(db_payment)
    
    payload_items = [{"item_id": str(item.item_id), "qty": item.qty} for item in checkout_data.items]
    outbox = models.OutboxEvent(
        event_type="SaleCreated",
        payload={
            "transaction_id": str(db_tx.id),
            "items": payload_items
        }
    )
    session.add(outbox)
    
    # Audit Logging
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="POS_CHECKOUT",
        resource="/api/v1/sales/checkout",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "invoice_no": db_tx.invoice_no,
            "total": float(total),
            "item_count": len(checkout_data.items),
            "payment_method": checkout_data.payment_method
        },
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_tx)
    
    return db_tx
