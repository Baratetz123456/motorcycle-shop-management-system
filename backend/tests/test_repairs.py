import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_repair_job(client: AsyncClient, admin_headers: dict):
    """Verify creating a repair job order with customer info and labor charge."""
    res = await client.post("/api/v1/repairs/jobs", headers=admin_headers, json={
        "customer_name": "Rider Bryan",
        "motorcycle_id": "Honda Click 160",
        "labor_charge": 350.0,
        "status": "PENDING"
    })
    assert res.status_code == 200
    job = res.json()
    assert "jo_number" in job
    assert job["customer_name"] == "Rider Bryan"
    assert job["labor_charge"] == 350.0
    assert job["status"] == "PENDING"

@pytest.mark.asyncio
async def test_list_repair_jobs(client: AsyncClient, admin_headers: dict):
    """Verify fetching list of repair jobs returns 200 OK list."""
    res = await client.get("/api/v1/repairs/jobs", headers=admin_headers)
    assert res.status_code == 200
    jobs = res.json()
    assert isinstance(jobs, list)

@pytest.mark.asyncio
async def test_update_repair_job_status_transition(client: AsyncClient, admin_headers: dict):
    """Verify transitioning job status from PENDING to ONGOING and COMPLETED."""
    # 1. Create Job
    create_res = await client.post("/api/v1/repairs/jobs", headers=admin_headers, json={
        "customer_name": "Rider Kevin",
        "motorcycle_id": "Yamaha Sniper 155",
        "labor_charge": 500.0,
        "status": "PENDING"
    })
    job = create_res.json()
    job_id = job["id"]

    # 2. Advance to ONGOING
    ongoing_res = await client.patch(f"/api/v1/repairs/jobs/{job_id}/status", headers=admin_headers, json={
        "status": "ONGOING"
    })
    assert ongoing_res.status_code == 200
    assert ongoing_res.json()["status"] == "ONGOING"

    # 3. Advance to COMPLETED
    completed_res = await client.patch(f"/api/v1/repairs/jobs/{job_id}/status", headers=admin_headers, json={
        "status": "COMPLETED"
    })
    assert completed_res.status_code == 200
    assert completed_res.json()["status"] == "COMPLETED"

@pytest.mark.asyncio
async def test_release_unpaid_job_rejected(client: AsyncClient, admin_headers: dict):
    """Verify safeguard: cannot release a job that has not been settled/paid."""
    create_res = await client.post("/api/v1/repairs/jobs", headers=admin_headers, json={
        "customer_name": "Rider Unpaid",
        "motorcycle_id": "Suzuki Raider 150",
        "labor_charge": 400.0,
        "status": "COMPLETED",
        "is_paid": False
    })
    job_id = create_res.json()["id"]

    release_res = await client.patch(f"/api/v1/repairs/jobs/{job_id}/status", headers=admin_headers, json={
        "status": "RELEASED"
    })
    assert release_res.status_code == 400
    assert "payment has not been completed" in release_res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_create_and_list_motorcycle_profiles(client: AsyncClient, admin_headers: dict):
    """Verify registering a motorcycle profile and querying it."""
    plate = f"PL-{uuid.uuid4().hex[:5].upper()}"
    create_res = await client.post("/api/v1/repairs/motorcycles", headers=admin_headers, json={
        "plate_number": plate,
        "brand": "Yamaha",
        "model": "Mio Aerox 155",
        "customer_name": "Mark Santos",
        "customer_phone": "09171234567"
    })
    assert create_res.status_code == 200
    moto = create_res.json()
    assert moto["plate_number"] == plate

    list_res = await client.get(f"/api/v1/repairs/motorcycles?search={plate}", headers=admin_headers)
    assert list_res.status_code == 200
    results = list_res.json()
    assert len(results) >= 1
    assert results[0]["plate_number"] == plate

@pytest.mark.asyncio
async def test_add_cart_item_to_repair_job(client: AsyncClient, admin_headers: dict):
    """Verify adding parts or services to a job's repair cart."""
    # Create Job
    job_res = await client.post("/api/v1/repairs/jobs", headers=admin_headers, json={
        "customer_name": "Cart Rider",
        "motorcycle_id": "Honda ADV 160",
        "labor_charge": 250.0,
        "status": "ONGOING"
    })
    job_id = job_res.json()["id"]

    # Add Cart Item
    cart_res = await client.post(f"/api/v1/repairs/jobs/{job_id}/cart-items", headers=admin_headers, json={
        "item_id": str(uuid.uuid4()),
        "item_name": "Synthetic 4T Oil",
        "item_type": "PRODUCT",
        "qty": 1,
        "unit_price": 450.0,
        "total_price": 450.0
    })
    assert cart_res.status_code == 200
    item = cart_res.json()
    assert item["item_name"] == "Synthetic 4T Oil"
    assert item["qty"] == 1
    assert item["total_price"] == 450.0
