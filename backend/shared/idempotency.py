import json
import redis.asyncio as redis
import os
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from functools import wraps

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = redis.from_url(REDIS_URL)

async def check_idempotency(request: Request, response: Response):
    # This is a basic implementation of idempotency via dependency injection or middleware
    idempotency_key = request.headers.get("Idempotency-Key")
    if not idempotency_key:
        return None # No key, skip check

    cached_response = await redis_client.get(f"idemp:{idempotency_key}")
    if cached_response:
        data = json.loads(cached_response)
        return JSONResponse(content=data, status_code=200) # Simplified, should cache status code too
    return None

def idempotent(func):
    """
    Decorator for endpoints that need idempotency handling.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request: Request = kwargs.get('request')
        if not request:
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break

        if request:
            idempotency_key = request.headers.get("Idempotency-Key")
            if idempotency_key:
                cached = await redis_client.get(f"idemp:{idempotency_key}")
                if cached:
                    data = json.loads(cached)
                    return JSONResponse(content=data["body"], status_code=data["status"])
        
        # Execute the actual endpoint
        response = await func(*args, **kwargs)
        
        # If response is successful (2xx), cache it
        if request and idempotency_key:
            if isinstance(response, JSONResponse) and 200 <= response.status_code < 300:
                cache_data = json.dumps({
                    "status": response.status_code,
                    "body": json.loads(response.body.decode('utf-8'))
                })
                await redis_client.set(f"idemp:{idempotency_key}", cache_data, ex=86400) # 24h
        
        return response
    return wrapper
