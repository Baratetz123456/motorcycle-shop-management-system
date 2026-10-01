import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_unauthenticated_request_rejected(client: AsyncClient):
    """Verify protected endpoints return HTTP 401 without Bearer token."""
    res_inv = await client.get("/api/v1/inventory/items")
    assert res_inv.status_code == 401

    res_users = await client.get("/api/v1/auth/users")
    assert res_users.status_code == 401

    res_audit = await client.get("/api/v1/audit-logs")
    assert res_audit.status_code == 401

@pytest.mark.asyncio
async def test_tampered_token_rejected(client: AsyncClient):
    """Verify forged or corrupted JWT tokens are rejected with 401 Unauthorized."""
    tampered_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.forged.signature"}
    res = await client.get("/api/v1/inventory/items", headers=tampered_headers)
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_cashier_cannot_access_admin_user_registration(client: AsyncClient, cashier_headers: dict):
    """Verify Cashier role is forbidden from registering new user accounts (Admin only)."""
    res_reg = await client.post("/api/v1/auth/users/register", headers=cashier_headers, json={
        "email": "hacked@motoshop.com",
        "password": "Password123",
        "first_name": "Bad",
        "last_name": "Actor",
        "role": "admin"
    })
    assert res_reg.status_code == 403

@pytest.mark.asyncio
async def test_cashier_cannot_access_audit_logs(client: AsyncClient, cashier_headers: dict):
    """Verify Cashier role is forbidden from viewing system audit logs (Admin/Manager only)."""
    res_audit = await client.get("/api/v1/audit-logs", headers=cashier_headers)
    assert res_audit.status_code == 403

@pytest.mark.asyncio
async def test_mechanic_cannot_access_pos_checkout(client: AsyncClient, mechanic_headers: dict):
    """Verify Mechanic role is forbidden from processing POS checkout financial transactions."""
    checkout_res = await client.post("/api/v1/sales/checkout", headers=mechanic_headers, json={
        "items": [],
        "amount_paid": 500.0,
        "payment_method": "CASH"
    })
    assert checkout_res.status_code == 403

@pytest.mark.asyncio
async def test_mechanic_cannot_create_inventory_items(client: AsyncClient, mechanic_headers: dict):
    """Verify Mechanic role is forbidden from adding inventory items (Admin/Manager only)."""
    res = await client.post("/api/v1/inventory/items", headers=mechanic_headers, json={
        "sku": "FORBIDDEN-SKU",
        "name": "Forbidden Item",
        "brand": "Generic",
        "item_type": "PRODUCT",
        "category": "Brakes",
        "current_stock": 1,
        "cost_price": 10.0,
        "selling_price": 20.0
    })
    assert res.status_code == 403

@pytest.mark.asyncio
async def test_admin_has_full_domain_access(client: AsyncClient, admin_headers: dict):
    """Verify Admin role can access all operational and administrative endpoints."""
    endpoints = [
        "/api/v1/auth/users",
        "/api/v1/inventory/items",
        "/api/v1/repairs/jobs",
        "/api/v1/sales/transactions",
        "/api/v1/audit-logs"
    ]
    for ep in endpoints:
        res = await client.get(ep, headers=admin_headers)
        assert res.status_code in [200, 201], f"Admin failed on {ep}: {res.status_code}"
