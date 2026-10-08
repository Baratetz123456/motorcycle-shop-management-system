import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_list_inventory_items(client: AsyncClient, admin_headers: dict):
    """Verify listing catalog items returns a 200 OK list."""
    res = await client.get("/api/v1/inventory/items", headers=admin_headers)
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)

@pytest.mark.asyncio
async def test_create_product_item(client: AsyncClient, admin_headers: dict):
    """Verify creating a physical stockable product."""
    sku = f"BRK-RCB-{uuid.uuid4().hex[:6].upper()}"
    res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Racing Caliper 4-Piston",
        "brand": "RCB",
        "item_type": "PRODUCT",
        "category": "Brakes",
        "current_stock": 15,
        "reorder_level": 3,
        "cost_price": 1800.0,
        "selling_price": 2600.0
    })
    assert res.status_code == 200
    item = res.json()
    assert item["sku"] == sku
    assert item["name"] == "Racing Caliper 4-Piston"
    assert item["current_stock"] == 15
    assert item["item_type"] == "PRODUCT"

@pytest.mark.asyncio
async def test_create_service_item(client: AsyncClient, admin_headers: dict):
    """Verify creating a labor workshop service."""
    sku = f"SRV-FLUSH-{uuid.uuid4().hex[:6].upper()}"
    res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Brake Line Bleed & Flush",
        "brand": "MotoShop Service",
        "item_type": "SERVICE",
        "category": "Brakes",
        "current_stock": 0,
        "reorder_level": 0,
        "cost_price": 50.0,
        "selling_price": 350.0
    })
    assert res.status_code == 200
    item = res.json()
    assert item["sku"] == sku
    assert item["item_type"] == "SERVICE"
    assert item["selling_price"] == 350.0

@pytest.mark.asyncio
async def test_get_item_by_id(client: AsyncClient, admin_headers: dict):
    """Verify fetching an existing inventory item by UUID."""
    # Create item
    sku = f"GET-TEST-{uuid.uuid4().hex[:6].upper()}"
    create_res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Synthetic Fork Oil",
        "brand": "Motul",
        "item_type": "PRODUCT",
        "category": "Fluids",
        "current_stock": 10,
        "reorder_level": 2,
        "cost_price": 200.0,
        "selling_price": 400.0
    })
    assert create_res.status_code == 200
    item_id = create_res.json()["id"]

    # Fetch by ID
    get_res = await client.get(f"/api/v1/inventory/items/{item_id}", headers=admin_headers)
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == item_id
    assert fetched["sku"] == sku

@pytest.mark.asyncio
async def test_get_item_not_found(client: AsyncClient, admin_headers: dict):
    """Verify fetching a non-existent UUID returns HTTP 404."""
    random_id = str(uuid.uuid4())
    res = await client.get(f"/api/v1/inventory/items/{random_id}", headers=admin_headers)
    assert res.status_code == 404

@pytest.mark.asyncio
async def test_update_item_pricing_and_stock(client: AsyncClient, admin_headers: dict):
    """Verify updating price, stock level, and name."""
    # Create item
    sku = f"UPD-TEST-{uuid.uuid4().hex[:6].upper()}"
    create_res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Standard Spark Plug",
        "brand": "NGK",
        "item_type": "PRODUCT",
        "category": "Ignition",
        "current_stock": 25,
        "reorder_level": 5,
        "cost_price": 80.0,
        "selling_price": 180.0
    })
    item_id = create_res.json()["id"]

    # Update item
    update_res = await client.put(f"/api/v1/inventory/items/{item_id}", headers=admin_headers, json={
        "name": "Iridium Racing Spark Plug",
        "selling_price": 280.0,
        "current_stock": 50
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Iridium Racing Spark Plug"
    assert updated["selling_price"] == 280.0
    assert updated["current_stock"] == 50

@pytest.mark.asyncio
async def test_delete_inventory_item(client: AsyncClient, admin_headers: dict):
    """Verify deleting/deactivating an inventory item."""
    sku = f"DEL-TEST-{uuid.uuid4().hex[:6].upper()}"
    create_res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Temporary Consumable",
        "brand": "Generic",
        "item_type": "PRODUCT",
        "category": "Supplies",
        "current_stock": 5,
        "reorder_level": 1,
        "cost_price": 10.0,
        "selling_price": 20.0
    })
    item_id = create_res.json()["id"]

    delete_res = await client.delete(f"/api/v1/inventory/items/{item_id}", headers=admin_headers)
    assert delete_res.status_code in [200, 204]

@pytest.mark.asyncio
async def test_filter_items_by_type(client: AsyncClient, admin_headers: dict):
    """Verify filtering items by item_type query parameter."""
    res_prod = await client.get("/api/v1/inventory/items?item_type=PRODUCT", headers=admin_headers)
    assert res_prod.status_code == 200
    for it in res_prod.json():
        assert it["item_type"] == "PRODUCT"

    res_srv = await client.get("/api/v1/inventory/items?item_type=SERVICE", headers=admin_headers)
    assert res_srv.status_code == 200
    for it in res_srv.json():
        assert it["item_type"] == "SERVICE"
