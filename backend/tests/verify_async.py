import asyncio
import uuid
import sys
import os
import httpx
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.database import engine, Base, init_db_schemas

async def main():
    print("--- 0. Initializing DB Schemas ---")
    await init_db_schemas(engine, Base.metadata)
    print("✅ DB Schemas and tables initialized.")

    print("\n--- 1. Testing Health Check ---")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:

        res = await client.get("/api/v1/health")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert data["status"] == "healthy"
        print("✅ Health check passed: ", data)

        print("\n--- 2. Testing Seed & Admin Login ---")
        seed_res = await client.post("/api/v1/auth/seed-admin")
        assert seed_res.status_code in [200, 201], f"Seed failed: {seed_res.text}"
        print("✅ Admin seeded successfully.")

        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@motoshop.com",
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token_data = login_res.json()
        token = token_data["access_token"]
        assert token_data["role"] == "admin"
        assert "refresh_token" in login_res.cookies
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Admin login successful, JWT token and HttpOnly cookie received.")

        print("\n--- 3. Testing Token Refresh (PostgreSQL Session Manager) ---")
        refresh_res = await client.post("/api/v1/auth/refresh", cookies=login_res.cookies)
        assert refresh_res.status_code == 200, f"Refresh failed: {refresh_res.text}"
        new_token = refresh_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {new_token}"}
        print("✅ PostgreSQL Session Manager successfully rotated token.")

        print("\n--- 4. Testing Inventory Creation ---")
        sku = f"TEST-PLUG-{uuid.uuid4().hex[:6].upper()}"
        item_res = await client.post("/api/v1/inventory/items", headers=headers, json={
            "sku": sku,
            "name": "Iridium Spark Plug",
            "brand": "NGK",
            "item_type": "PRODUCT",
            "category": "Ignition",
            "current_stock": 25,
            "reorder_level": 5,
            "cost_price": 120.0,
            "selling_price": 280.0
        })
        assert item_res.status_code == 200, f"Create item failed: {item_res.text}"
        item = item_res.json()
        item_id = item["id"]
        assert item["current_stock"] == 25
        print(f"✅ Inventory Item created: {item['name']} (SKU: {sku}) with stock {item['current_stock']}")

        print("\n--- 5. Testing Repair Job Order Creation ---")
        jo_res = await client.post("/api/v1/repairs/jobs", headers=headers, json={
            "customer_name": "Juan Dela Cruz",
            "motorcycle_id": "Honda Click 125i",
            "labor_charge": 150.0,
            "status": "COMPLETED"
        })
        assert jo_res.status_code == 200, f"Create JO failed: {jo_res.text}"
        job_order = jo_res.json()
        jo_id = job_order["id"]
        print(f"✅ Repair Job Order created: {job_order['jo_number']} for {job_order['customer_name']}")

        print("\n--- 6. Testing POS Atomic ACID Checkout & Inventory Deduction ---")
        idemp_key = str(uuid.uuid4())
        checkout_headers = {
            "Authorization": f"Bearer {new_token}",
            "Idempotency-Key": idemp_key
        }
        checkout_res = await client.post("/api/v1/sales/checkout", headers=checkout_headers, json={
            "cashier_name": "System Admin",
            "job_order_id": jo_id,
            "items": [
                {
                    "item_id": item_id,
                    "qty": 3,
                    "price": 280.0
                }
            ],
            "amount_paid": 840.0,
            "payment_method": "CASH"
        })
        assert checkout_res.status_code == 201, f"Checkout failed: {checkout_res.text}"
        tx = checkout_res.json()
        assert tx["status"] == "COMPLETED"
        assert tx["total"] == 840.0
        print(f"✅ POS Checkout successful: Invoice {tx['invoice_no']}, Total: ₱{tx['total']:.2f}")

        # Verify inventory was deducted in PostgreSQL (25 - 3 = 22)
        verify_item_res = await client.get(f"/api/v1/inventory/items/{item_id}", headers=headers)
        assert verify_item_res.status_code == 200
        updated_item = verify_item_res.json()
        assert updated_item["current_stock"] == 22, f"Expected stock 22, got {updated_item['current_stock']}"
        print(f"✅ Inventory stock atomically deducted: {item['current_stock']} -> {updated_item['current_stock']}")

        print("\n--- 7. Testing PostgreSQL Idempotency Deduplication ---")
        dup_checkout_res = await client.post("/api/v1/sales/checkout", headers=checkout_headers, json={
            "cashier_name": "System Admin",
            "job_order_id": jo_id,
            "items": [
                {
                    "item_id": item_id,
                    "qty": 3,
                    "price": 280.0
                }
            ],
            "amount_paid": 840.0,
            "payment_method": "CASH"
        })
        assert dup_checkout_res.status_code in [200, 201]
        dup_tx = dup_checkout_res.json()
        assert dup_tx["invoice_no"] == tx["invoice_no"], "Idempotency failed: generated different invoice!"

        # Verify inventory stock was NOT deducted again (still 22)
        verify_item_res2 = await client.get(f"/api/v1/inventory/items/{item_id}", headers=headers)
        assert verify_item_res2.json()["current_stock"] == 22
        print("✅ Idempotency deduplication verified: Exact cached response returned without duplicate deduction.")

        print("\n--- 8. Testing Immutable Audit Logs Query ---")
        audit_res = await client.get("/api/v1/audit/logs", headers=headers)
        assert audit_res.status_code == 200, f"Audit logs failed: {audit_res.text}"
        audit_data = audit_res.json()
        assert audit_data["total"] > 0
        print(f"✅ Audit logging verified: {audit_data['total']} immutable records logged.")

        print("\n--- 9. Testing Client-Recorded Audit Log (POST /api/v1/audit-logs) ---")
        client_audit_res = await client.post("/api/v1/audit-logs", json={
            "action": "CLIENT_RECORDED_TEST",
            "resource": "/dashboard",
            "details": {"source": "verify_async"},
            "user_role": "admin"
        })
        assert client_audit_res.status_code == 201, f"Post audit failed: {client_audit_res.text}"
        assert client_audit_res.json()["status"] == "recorded"
        print("✅ Client audit logging (POST /api/v1/audit-logs) verified successfully.")

        print("\n--- 10. Testing User Profile Partial Update (PATCH /api/v1/auth/users/{id}) ---")
        user_id = token_data["user_id"]
        patch_res = await client.patch(f"/api/v1/auth/users/{user_id}", headers=headers, json={
            "theme": "emerald",
            "display_mode": "dark"
        })
        assert patch_res.status_code == 200, f"Patch user failed: {patch_res.text}"
        patched_user = patch_res.json()
        assert patched_user["theme"] == "emerald"
        assert patched_user["display_mode"] == "dark"
        print(f"✅ User profile patch verified: theme={patched_user['theme']}, mode={patched_user['display_mode']}")

    print("\n=======================================================")
    print("🎉 ALL MODULAR MONOLITH INTEGRATION TESTS PASSED (100%)")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(main())
