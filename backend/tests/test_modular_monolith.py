import pytest
from httpx import AsyncClient, ASGITransport
import uuid
from app.main import app

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "motoshop-modular-monolith"

@pytest.mark.asyncio
async def test_auth_seed_and_login():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Seed default users
        seed_res = await ac.post("/api/v1/auth/seed-admin")
        assert seed_res.status_code in [200, 201]

        # Login as Admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@motoshop.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        assert token_data["role"] == "admin"
        assert "refresh_token" in login_res.cookies

@pytest.mark.asyncio
async def test_inventory_and_checkout_acid():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Login as admin
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@motoshop.com",
            "password": "admin123"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create item
        item_sku = f"TEST-PART-{uuid.uuid4().hex[:6].upper()}"
        item_res = await ac.post("/api/v1/inventory/items", headers=headers, json={
            "sku": item_sku,
            "name": "Test Spark Plug",
            "brand": "NGK",
            "item_type": "PRODUCT",
            "category": "Ignition",
            "current_stock": 20,
            "reorder_level": 5,
            "cost_price": 100.0,
            "selling_price": 250.0
        })
        assert item_res.status_code == 200
        created_item = item_res.json()
        item_id = created_item["id"]
        assert created_item["current_stock"] == 20

        # 3. Create a repair job order
        jo_res = await ac.post("/api/v1/repairs/jobs", headers=headers, json={
            "customer_name": "Test Rider",
            "motorcycle_id": "Yamaha NMAX 155",
            "labor_charge": 200.0,
            "status": "COMPLETED"
        })
        assert jo_res.status_code == 200
        job_order = jo_res.json()
        jo_id = job_order["id"]

        # 4. Perform atomic POS checkout
        idempotency_key = str(uuid.uuid4())
        checkout_headers = {
            "Authorization": f"Bearer {token}",
            "Idempotency-Key": idempotency_key
        }
        checkout_res = await ac.post("/api/v1/sales/checkout", headers=checkout_headers, json={
            "cashier_name": "System Admin",
            "job_order_id": jo_id,
            "items": [
                {
                    "item_id": item_id,
                    "qty": 2,
                    "price": 250.0
                }
            ],
            "amount_paid": 700.0,
            "payment_method": "CASH"
        })
        assert checkout_res.status_code == 201
        tx_data = checkout_res.json()
        assert tx_data["status"] == "COMPLETED"
        assert tx_data["total"] == 500.0 # 2 * 250

        # 5. Verify inventory stock was deducted atomically in PostgreSQL
        check_item_res = await ac.get(f"/api/v1/inventory/items/{item_id}", headers=headers)
        assert check_item_res.status_code == 200
        updated_item = check_item_res.json()
        assert updated_item["current_stock"] == 18 # 20 - 2

        # 6. Verify idempotency: resend exact checkout request
        duplicate_res = await ac.post("/api/v1/sales/checkout", headers=checkout_headers, json={
            "cashier_name": "System Admin",
            "job_order_id": jo_id,
            "items": [
                {
                    "item_id": item_id,
                    "qty": 2,
                    "price": 250.0
                }
            ],
            "amount_paid": 700.0,
            "payment_method": "CASH"
        })
        assert duplicate_res.status_code == 201
        dup_data = duplicate_res.json()
        assert dup_data["invoice_no"] == tx_data["invoice_no"]

        # Stock should STILL be 18 (not deducted twice!)
        check_item_res2 = await ac.get(f"/api/v1/inventory/items/{item_id}", headers=headers)
        assert check_item_res2.json()["current_stock"] == 18
