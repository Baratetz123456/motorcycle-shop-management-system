import json
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from functools import wraps
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

def compute_request_hash(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()

def idempotent(func):
    """
    Decorator for state-altering endpoints requiring idempotency handling via PostgreSQL auth.idempotency_keys.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request: Optional[Request] = kwargs.get('request')
        if not request:
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

        idempotency_key = request.headers.get("Idempotency-Key") if request else None

        if request and idempotency_key:
            # Read and reset request body stream for hashing
            body = await request.body()
            req_hash = compute_request_hash(body)

            async with AsyncSessionLocal() as session:
                query = text("""
                    SELECT response_code, response_body, request_hash
                    FROM auth.idempotency_keys
                    WHERE key = :key AND expires_at > NOW()
                """)
                res = await session.execute(query, {"key": idempotency_key})
                row = res.first()
                if row:
                    cached_code, cached_body, saved_hash = row
                    # Return exact cached response
                    return JSONResponse(content=cached_body, status_code=cached_code)

        # Execute endpoint function
        response = await func(*args, **kwargs)

        # Cache successful response in PostgreSQL
        if request and idempotency_key:
            status_code = getattr(response, "status_code", 200)
            if 200 <= status_code < 300:
                body = await request.body()
                req_hash = compute_request_hash(body)
                
                resp_content = None
                if isinstance(response, JSONResponse):
                    resp_content = json.loads(response.body.decode('utf-8'))
                elif hasattr(response, "model_dump"):
                    resp_content = response.model_dump(mode="json")
                elif hasattr(response, "dict"):
                    resp_content = response.dict()
                elif isinstance(response, dict):
                    resp_content = response
                elif hasattr(response, "__dict__"):
                    d = {k: v for k, v in response.__dict__.items() if not k.startswith('_')}
                    resp_content = json.loads(json.dumps(d, default=str))

                if resp_content is not None:
                    async with AsyncSessionLocal() as session:
                        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
                        insert_query = text("""
                            INSERT INTO auth.idempotency_keys (key, endpoint, request_hash, response_code, response_body, expires_at)
                            VALUES (:key, :endpoint, :req_hash, :code, CAST(:body AS jsonb), :expires_at)
                            ON CONFLICT (key) DO UPDATE
                            SET response_code = EXCLUDED.response_code,
                                response_body = EXCLUDED.response_body;
                        """)
                        await session.execute(
                            insert_query,
                            {
                                "key": idempotency_key,
                                "endpoint": str(request.url.path),
                                "req_hash": req_hash,
                                "code": status_code,
                                "body": json.dumps(resp_content, default=str),
                                "expires_at": expires_at
                            }
                        )
                        await session.commit()


        return response
    return wrapper
