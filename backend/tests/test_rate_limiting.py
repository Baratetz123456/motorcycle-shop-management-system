import pytest
import httpx
import asyncio
import uuid

# Test hitting the KrakenD API Gateway which has ratelimiting configured
GATEWAY_URL = "http://localhost:8080/api/v1"

@pytest.mark.asyncio
async def test_rate_limiting_checkout():
    """
    Test the KrakenD API Gateway rate limiting on the /checkout endpoint.
    Configured for 20 req/minute per IP in krakend.json.
    """
    async with httpx.AsyncClient() as client:
        payload = {
            "items": [{"item_id": str(uuid.uuid4()), "qty": 1, "price": 10.0}],
            "amount_paid": 10.0,
            "payment_method": "CASH"
        }
        
        # Send 25 rapid requests
        responses = []
        for i in range(25):
            res = await client.post(
                f"{GATEWAY_URL}/sales/checkout", 
                json=payload,
                headers={"Idempotency-Key": str(uuid.uuid4())}
            )
            responses.append(res.status_code)
            
        # We expect the first 20 to be 202 (Accepted) or 500 (if backend not seeded),
        # but the last 5 should be 429 (Too Many Requests) from KrakenD
        too_many_requests = [code for code in responses if code == 429]
        
        assert len(too_many_requests) > 0, "Rate limiting did not trigger!"
