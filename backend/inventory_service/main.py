import sys
import os
import asyncio
import json
import aio_pika
from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
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
from inventory_service import models, schemas
from uuid import UUID

logger = get_logger("inventory_service")

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def consume_sales_events():
    while True:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            channel = await connection.channel()
            exchange = await channel.declare_exchange('pos_events', aio_pika.ExchangeType.TOPIC)
            queue = await channel.declare_queue('inventory_saga_queue', durable=True)
            await queue.bind(exchange, routing_key='SaleCreated')

            async with queue.iterator() as queue_iter:
                async for message in queue_iter:
                    async with message.process():
                        event = json.loads(message.body.decode())
                        logger.info(f"Received SaleCreated event: {event}")
                        transaction_id = event['transaction_id']
                        items = event['items']
                        
                        async with AsyncSessionLocal() as session:
                            try:
                                success = True
                                for item in items:
                                    item_id = item['item_id']
                                    qty = item['qty']
                                    
                                    stmt = select(models.Item).where(models.Item.id == item_id)
                                    res = await session.execute(stmt)
                                    db_item = res.scalar_one_or_none()
                                    
                                    if not db_item or db_item.current_stock < qty:
                                        success = False
                                        break
                                    
                                    db_item.current_stock -= qty
                                    try:
                                        ref_id = UUID(str(transaction_id))
                                    except Exception:
                                        ref_id = None

                                    movement = models.StockMovement(
                                        item_id=db_item.id,
                                        type=models.MovementType.SALE,
                                        quantity_changed=-qty,
                                        new_quantity=db_item.current_stock,
                                        reference_id=ref_id
                                    )
                                    session.add(movement)
                                
                                if success:
                                    outbox = models.OutboxEvent(
                                        event_type='StockDeducted',
                                        payload={'transaction_id': transaction_id}
                                    )
                                    session.add(outbox)
                                    await session.commit()
                                    logger.info(f"Successfully deducted stock for Tx: {transaction_id}")
                                else:
                                    await session.rollback()
                                    outbox = models.OutboxEvent(
                                        event_type='StockDeductionFailed',
                                        payload={'transaction_id': transaction_id, 'reason': 'Insufficient stock'}
                                    )
                                    session.add(outbox)
                                    await session.commit()
                                    logger.warning(f"Failed to deduct stock for Tx: {transaction_id} (Insufficient stock)")
                                    
                            except Exception as e:
                                logger.error(f"Error processing saga: {e}")
                                await session.rollback()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Inventory consume_sales_events connection retry in 5s: {e}")
            await asyncio.sleep(5)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db_schemas(engine, models.Base.metadata)
    except Exception as e:
        logger.warning(f"Could not auto-create tables on startup: {e}")
    outbox_task = asyncio.create_task(run_outbox_worker("inventory", AsyncSessionLocal))
    consumer_task = asyncio.create_task(consume_sales_events())
    yield
    outbox_task.cancel()
    consumer_task.cancel()

app = FastAPI(title="Inventory Service", lifespan=lifespan)
app.add_middleware(RequestLoggingMiddleware, service_name="inventory_service")

@app.get("/items", response_model=List[schemas.ItemResponse])
async def get_items(
    item_type: Optional[str] = None,
    include_inactive: bool = False,
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    query = select(models.Item)
    if not include_inactive:
        query = query.where(models.Item.is_active == True)
    if item_type:
        query = query.where(models.Item.item_type == item_type)
    result = await session.execute(query)
    return result.scalars().all()

@app.post("/items", response_model=schemas.ItemResponse)
@idempotent
async def create_item(
    request: Request,
    item: schemas.ItemCreate,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    item_data = item.model_dump()
    db_item = models.Item(**item_data)
    db_item.is_active = True
    session.add(db_item)
    
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="ITEM_CREATED",
        resource="/api/v1/inventory/items",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"name": item.name, "sku": item.sku, "brand": item.brand, "item_type": str(item.item_type), "initial_stock": item.current_stock},
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_item)
    return db_item

@app.put("/items/{item_id}", response_model=schemas.ItemResponse)
@idempotent
async def update_item(
    request: Request,
    item_id: UUID,
    item_update: schemas.ItemUpdate,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Item).where(models.Item.id == item_id)
    result = await session.execute(stmt)
    db_item = result.scalar_one_or_none()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    update_data = item_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
        
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="ITEM_UPDATED",
        resource=f"/api/v1/inventory/items/{item_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"item_id": str(item_id), "updated_fields": list(update_data.keys())},
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_item)
    return db_item

@app.delete("/items/{item_id}")
@idempotent
async def delete_item(
    request: Request,
    item_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Item).where(models.Item.id == item_id)
    result = await session.execute(stmt)
    db_item = result.scalar_one_or_none()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db_item.is_active = False
    
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="ITEM_DELETED",
        resource=f"/api/v1/inventory/items/{item_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"item_id": str(item_id), "sku": db_item.sku, "name": db_item.name},
        ip_address=client_ip
    )
    
    await session.commit()
    return {"message": "Item deleted successfully", "id": str(item_id), "is_active": False}

@app.post("/items/{item_id}/stock", response_model=schemas.ItemResponse)
@idempotent
async def adjust_stock(
    request: Request,
    item_id: UUID,
    movement: schemas.StockMovementCreate,
    current_user: dict = Depends(require_roles(["admin"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Item).where(models.Item.id == item_id).with_for_update()
    result = await session.execute(stmt)
    db_item = result.scalar_one_or_none()
    
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    db_item.current_stock += movement.quantity_changed
    
    db_movement = models.StockMovement(
        item_id=item_id,
        type=movement.type,
        quantity_changed=movement.quantity_changed,
        new_quantity=db_item.current_stock,
        reference_id=movement.reference_id
    )
    session.add(db_movement)
    
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="STOCK_UPDATE",
        resource=f"/api/v1/inventory/items/{item_id}/stock",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "item_id": str(item_id),
            "quantity_changed": movement.quantity_changed,
            "new_stock": db_item.current_stock,
            "type": str(movement.type)
        },
        ip_address=client_ip
    )
    
    await session.commit()
    await session.refresh(db_item)
    
    return db_item
