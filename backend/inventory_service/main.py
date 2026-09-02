import sys
import os
import asyncio
import json
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
from inventory_service import models, schemas
from uuid import UUID

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def consume_sales_events():
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    channel = await connection.channel()
    exchange = await channel.declare_exchange('pos_events', aio_pika.ExchangeType.TOPIC)
    queue = await channel.declare_queue('inventory_saga_queue', durable=True)
    await queue.bind(exchange, routing_key='SaleCreated')

    async with queue.iterator() as queue_iter:
        async for message in queue_iter:
            async with message.process():
                event = json.loads(message.body.decode())
                print(f"[Inventory] Received SaleCreated event: {event}")
                # Saga logic: Check stock and deduct or fail
                transaction_id = event['transaction_id']
                items = event['items'] # [{'item_id': uuid, 'qty': int}]
                
                async with AsyncSessionLocal() as session:
                    try:
                        success = True
                        for item in items:
                            item_id = item['item_id']
                            qty = item['qty']
                            
                            # Lock row for update
                            stmt = select(models.Item).where(models.Item.id == item_id).with_for_update()
                            result = await session.execute(stmt)
                            db_item = result.scalar_one_or_none()
                            
                            if not db_item or db_item.current_stock < qty:
                                success = False
                                break
                                
                            # Deduct
                            db_item.current_stock -= qty
                            movement = models.StockMovement(
                                item_id=item_id,
                                type=models.MovementType.SALE,
                                quantity_changed=-qty,
                                new_quantity=db_item.current_stock,
                                reference_id=transaction_id
                            )
                            session.add(movement)
                        
                        if success:
                            outbox = models.OutboxEvent(
                                event_type='StockDeducted',
                                payload={'transaction_id': transaction_id}
                            )
                            session.add(outbox)
                            await session.commit()
                            print(f"[Inventory] Successfully deducted stock for Tx: {transaction_id}")
                        else:
                            await session.rollback()
                            outbox = models.OutboxEvent(
                                event_type='StockDeductionFailed',
                                payload={'transaction_id': transaction_id, 'reason': 'Insufficient stock'}
                            )
                            session.add(outbox)
                            await session.commit()
                            print(f"[Inventory] Failed to deduct stock for Tx: {transaction_id}")
                            
                    except Exception as e:
                        print(f"[Inventory] Error processing saga: {e}")
                        await session.rollback()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start outbox worker and consumer
    outbox_task = asyncio.create_task(run_outbox_worker("inventory", AsyncSessionLocal))
    consumer_task = asyncio.create_task(consume_sales_events())
    yield
    outbox_task.cancel()
    consumer_task.cancel()

app = FastAPI(title="Inventory Service", lifespan=lifespan)

@app.get("/items", response_model=List[schemas.ItemResponse])
async def get_items(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(models.Item))
    return result.scalars().all()

@app.post("/items", response_model=schemas.ItemResponse)
@idempotent
async def create_item(request: Request, item: schemas.ItemCreate, session: AsyncSession = Depends(get_db)):
    db_item = models.Item(**item.model_dump())
    session.add(db_item)
    await session.commit()
    await session.refresh(db_item)
    return db_item

@app.post("/items/{item_id}/stock", response_model=schemas.ItemResponse)
@idempotent
async def adjust_stock(request: Request, item_id: UUID, movement: schemas.StockMovementCreate, session: AsyncSession = Depends(get_db)):
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
    await session.commit()
    await session.refresh(db_item)
    
    return db_item
