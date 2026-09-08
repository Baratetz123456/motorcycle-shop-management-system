import json
import asyncio
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Callable, Optional

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/")
SQS_QUEUE_URL = os.getenv("SQS_QUEUE_URL", None)

async def publish_event_sqs(event_type: str, payload: dict):
    """
    Publishes an event to AWS SQS for serverless event-driven processing.
    """
    if not SQS_QUEUE_URL:
        return
    try:
        import boto3
        sqs = boto3.client('sqs', region_name=os.getenv("AWS_REGION", "ap-southeast-1"))
        message_body = json.dumps({
            "event_type": event_type,
            "payload": payload
        })
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=message_body,
            MessageAttributes={
                "EventType": {
                    "DataType": "String",
                    "StringValue": event_type
                }
            }
        )
    except Exception as e:
        print(f"Error publishing to SQS: {e}")
        raise

async def publish_event(connection, event_type: str, payload: dict):
    """
    Publishes an event to RabbitMQ (local / Docker Compose mode) or SQS (Serverless mode).
    """
    if SQS_QUEUE_URL:
        await publish_event_sqs(event_type, payload)
        return

    import aio_pika
    channel = await connection.channel()
    exchange = await channel.declare_exchange('pos_events', aio_pika.ExchangeType.TOPIC)
    
    message = aio_pika.Message(
        body=json.dumps(payload).encode(),
        content_type='application/json'
    )
    
    await exchange.publish(message, routing_key=event_type)
    await channel.close()

async def process_outbox(session: AsyncSession, schema_name: str, connection=None):
    """
    Poll the outbox table for a specific schema, publish pending events, and mark them as PROCESSED.
    Works with both RabbitMQ and AWS SQS.
    """
    try:
        result = await session.execute(
            text(f"SELECT id, event_type, payload FROM {schema_name}.outbox_events WHERE status = 'PENDING' FOR UPDATE SKIP LOCKED")
        )
        events = result.fetchall()
        
        for event in events:
            event_id, event_type, payload = event
            
            if SQS_QUEUE_URL:
                await publish_event_sqs(event_type, payload)
            elif connection:
                await publish_event(connection, event_type, payload)
            
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
    Background worker for local/container mode that continuously polls the outbox.
    """
    if SQS_QUEUE_URL:
        # In serverless mode, Lambda triggers on SQS; this continuous polling loop is not needed.
        return

    import aio_pika
    while True:
        try:
            connection = await aio_pika.connect_robust(RABBITMQ_URL)
            try:
                while True:
                    async with session_factory() as session:
                        await process_outbox(session, schema_name, connection)
                    await asyncio.sleep(1)
            finally:
                try:
                    await connection.close()
                except Exception:
                    pass
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[{schema_name}] Outbox worker connection retry in 5s: {e}")
            await asyncio.sleep(5)
