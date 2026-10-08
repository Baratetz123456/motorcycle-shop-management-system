import sys
from pathlib import Path

# Defensive path insertion: ensure backend root is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base, init_db_schemas

@pytest.fixture(autouse=True)
async def cleanup_db_connections():
    """
    Ensure SQLAlchemy asyncpg connection pool is disposed after each test
    so connections created on one event loop do not leak into another.
    """
    yield
    await engine.dispose()

@pytest.fixture
async def client():
    """
    Reusable HTTP async test client communicating directly with ASGI app.
    """
    try:
        await init_db_schemas(engine, Base.metadata)
    except Exception:
        pass
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def admin_headers(client: AsyncClient):
    """
    Ensures admin user exists and returns an Authorization header with a valid admin JWT.
    """
    await client.post("/api/v1/auth/seed-admin")
    res = await client.post("/api/v1/auth/login", json={
        "email": "admin@motoshop.com",
        "password": "admin123"
    })
    assert res.status_code == 200, f"Failed to login as admin: {res.text}"
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def cashier_headers(client: AsyncClient, admin_headers: dict):
    """
    Ensures cashier user exists and returns an Authorization header with a valid cashier JWT.
    """
    email = "cashier@motoshop.com"
    login_res = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "cashier123"
    })
    if login_res.status_code != 200:
        await client.post("/api/v1/auth/users/register", headers=admin_headers, json={
            "email": email,
            "password": "cashier123",
            "first_name": "Cashier",
            "last_name": "Staff",
            "role": "cashier"
        })
        login_res = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "cashier123"
        })
    assert login_res.status_code == 200, f"Failed to login as cashier: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
async def mechanic_headers(client: AsyncClient, admin_headers: dict):
    """
    Ensures mechanic user exists and returns an Authorization header with a valid mechanic JWT.
    """
    email = "mechanic@motoshop.com"
    login_res = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "mechanic123"
    })
    if login_res.status_code != 200:
        await client.post("/api/v1/auth/users/register", headers=admin_headers, json={
            "email": email,
            "password": "mechanic123",
            "first_name": "Mechanic",
            "last_name": "Tech",
            "role": "mechanic"
        })
        login_res = await client.post("/api/v1/auth/login", json={
            "email": email,
            "password": "mechanic123"
        })
    assert login_res.status_code == 200, f"Failed to login as mechanic: {login_res.text}"
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
