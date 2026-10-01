import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_record_client_audit_event(client: AsyncClient):
    """Verify frontend/client audit event ingestion returns 201 Created."""
    unique_action = f"TEST_ACTION_{uuid.uuid4().hex[:6].upper()}"
    res = await client.post("/api/v1/audit-logs", json={
        "action": unique_action,
        "resource": "/inventory",
        "details": {"button": "add_filter_clicked"},
        "user_role": "admin"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "recorded"
    assert "id" in data

@pytest.mark.asyncio
async def test_list_audit_logs_pagination(client: AsyncClient, admin_headers: dict):
    """Verify paginated listing of audit logs."""
    res = await client.get("/api/v1/audit-logs?page=1&page_size=5", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 5

@pytest.mark.asyncio
async def test_filter_audit_logs_by_action(client: AsyncClient, admin_headers: dict):
    """Verify filtering audit logs by specific action name."""
    unique_action = f"FILTER_AUDIT_{uuid.uuid4().hex[:8].upper()}"
    # Ingest log
    await client.post("/api/v1/audit-logs", json={
        "action": unique_action,
        "resource": "/sales/checkout",
        "details": {"test": True},
        "user_role": "cashier"
    })

    # Query with action filter
    res = await client.get(f"/api/v1/audit-logs?action={unique_action}", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    items = data["items"]
    assert len(items) >= 1
    assert items[0]["action"] == unique_action

@pytest.mark.asyncio
async def test_export_audit_logs_csv(client: AsyncClient, admin_headers: dict):
    """Verify exporting audit logs as streaming RFC 4180 CSV."""
    res = await client.get("/api/v1/audit-logs/export", headers=admin_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers.get("content-type", "")
    assert "Timestamp" in res.text
    assert "Action" in res.text
    assert "User Role" in res.text
