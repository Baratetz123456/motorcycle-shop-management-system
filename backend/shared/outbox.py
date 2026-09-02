import json
import asyncio
import aio_pika
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Callable

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")

async def publish_event(connection: aio_pika.Connection, event_type: str, payload: dict):
    channel = await connection.channel()
    # Using default exchange for simplicity, or we can use a topic exchange
    exchange = await channel.declare_exchange('pos_events', aio_pika.ExchangeType.TOPIC)
    
    message = aio_pika.Message(
        body=json.dumps(payload).encode(),
        content_type='application/json'
    )
    
    await exchange.publish(message, routing_key=event_type)
    await channel.close()

async def process_outbox(session: AsyncSession, schema_name: str, connection: aio_pika.Connection):
    """
    Poll the outbox table for a specific schema, publish pending events, and mark them as PROCESSED.
    """
    try:
        # Fetch pending events
        result = await session.execute(
            text(f"SELECT id, event_type, payload FROM {schema_name}.outbox_events WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED")
        )
        events = result.fetchall()
        
        for event in events:
            event_id, event_type, payload = event
            
            # Publish to RabbitMQ
            await publish_event(connection, event_type, payload)
            
            # Mark as processed
            await session.execute(
                text(f"UPDATE {schema_name}.outbox_events SET status = 'PROCESSED' WHERE id = :id"),
                {"id": event_id}
            )
            
        if events:
            await session.commit()
            
    except Exception as e:
        print(f"Error processing outbox for {schema_name}: {e}")
        await session.rollback()

async def run_outbox_worker(schema_name: str, session_factory: Callable[[], AsyncSession]):
    """
    Background worker that continuously polls the outbox.
    """
    connection = await aio_pika.connect_robust(RABBITMQ_URL)
    try:
        while True:
            async with session_factory() as session:
                await process_outbox(session, schema_name, connection)
            await asyncio.sleep(1) # Poll every 1 second
    finally:
        await connection.close()
