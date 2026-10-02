import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_seed_admin(client: AsyncClient):
    """Verify idempotent admin seeding."""
    res = await client.post("/api/v1/auth/seed-admin")
    assert res.status_code in [200, 201]
    data = res.json()
    assert "msg" in data or "message" in data or "status" in data

@pytest.mark.asyncio
async def test_admin_login_success(client: AsyncClient):
    """Verify admin login emits JWT access token and session refresh cookie."""
    await client.post("/api/v1/auth/seed-admin")
    res = await client.post("/api/v1/auth/login", json={
        "email": "admin@motoshop.com",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert "refresh_token" in res.cookies

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    """Verify login with incorrect password returns 401 Unauthorized."""
    await client.post("/api/v1/auth/seed-admin")
    res = await client.post("/api/v1/auth/login", json={
        "email": "admin@motoshop.com",
        "password": "wrong_password_999"
    })
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    """Verify login with non-existent user returns 401 Unauthorized."""
    res = await client.post("/api/v1/auth/login", json={
        "email": f"nonexistent_{uuid.uuid4().hex[:6]}@motoshop.com",
        "password": "some_password"
    })
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_token_refresh(client: AsyncClient):
    """Verify refresh cookie can be used to obtain a new JWT access token."""
    await client.post("/api/v1/auth/seed-admin")
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "admin@motoshop.com",
        "password": "admin123"
    })
    assert login_res.status_code == 200
    assert "refresh_token" in login_res.cookies

    refresh_res = await client.post("/api/v1/auth/refresh", cookies=login_res.cookies)
    assert refresh_res.status_code == 200
    new_token_data = refresh_res.json()
    assert "access_token" in new_token_data
    assert new_token_data["role"] == "admin"

@pytest.mark.asyncio
async def test_register_staff_user(client: AsyncClient, admin_headers: dict):
    """Verify admin can provision a new staff user with designated role."""
    unique_email = f"staff_{uuid.uuid4().hex[:6]}@motoshop.com"
    res = await client.post("/api/v1/auth/users/register", headers=admin_headers, json={
        "email": unique_email,
        "password": "SecurePassword123",
        "first_name": "Juan",
        "last_name": "Dela Cruz",
        "role": "mechanic",
        "commission_rate": 45.0,
        "base_wage": 600.0
    })
    assert res.status_code == 201
    user = res.json()
    assert user["email"] == unique_email
    assert user["role"] == "mechanic"
    assert user["first_name"] == "Juan"

@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, admin_headers: dict):
    """Verify registering a duplicate email returns HTTP 400."""
    unique_email = f"dup_{uuid.uuid4().hex[:6]}@motoshop.com"
    user_payload = {
        "email": unique_email,
        "password": "Password123",
        "first_name": "Maria",
        "last_name": "Clara",
        "role": "cashier"
    }
    first_res = await client.post("/api/v1/auth/users/register", headers=admin_headers, json=user_payload)
    assert first_res.status_code == 201

    dup_res = await client.post("/api/v1/auth/users/register", headers=admin_headers, json=user_payload)
    assert dup_res.status_code == 400

@pytest.mark.asyncio
async def test_patch_user_profile(client: AsyncClient, admin_headers: dict):
    """Verify user profile customization patch (avatar and name)."""
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "admin@motoshop.com",
        "password": "admin123"
    })
    user_id = str(login_res.json()["user_id"])

    patch_res = await client.patch(f"/api/v1/auth/users/{user_id}", headers=admin_headers, json={
        "avatar": "avatar-5",
        "first_name": "SuperAdmin"
    })
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["avatar"] == "avatar-5"
    assert updated["first_name"] == "SuperAdmin"

@pytest.mark.asyncio
async def test_list_staff_users(client: AsyncClient, admin_headers: dict):
    """Verify paginated listing of staff users."""
    res = await client.get("/api/v1/auth/users?page=1&page_size=10", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data or "users" in data
    assert "total" in data
    assert len(data.get("items", data.get("users", []))) >= 1
