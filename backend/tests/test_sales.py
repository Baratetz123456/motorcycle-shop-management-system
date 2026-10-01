import pytest
import uuid
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_pos_checkout_atomic_success(client: AsyncClient, admin_headers: dict):
    """Verify full atomic checkout reduces stock and creates completed invoice."""
    # 1. Create inventory item
    sku = f"SALE-{uuid.uuid4().hex[:6].upper()}"
    item_res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Heavy Duty Drive Belt",
        "brand": "Bando",
        "item_type": "PRODUCT",
        "category": "CVT",
        "current_stock": 25,
        "reorder_level": 5,
        "cost_price": 500.0,
        "selling_price": 850.0
    })
    assert item_res.status_code == 200
    item = item_res.json()
    item_id = item["id"]

    # 2. Checkout 3 items
    idempotency_key = str(uuid.uuid4())
    headers = {**admin_headers, "Idempotency-Key": idempotency_key}
    checkout_res = await client.post("/api/v1/sales/checkout", headers=headers, json={
        "cashier_name": "Main Cashier",
        "items": [
            {
                "item_id": item_id,
                "qty": 3,
                "price": 850.0
            }
        ],
        "amount_paid": 3000.0,
        "payment_method": "CASH"
    })
    assert checkout_res.status_code == 201
    tx = checkout_res.json()
    assert tx["status"] == "COMPLETED"
    assert tx["total"] == 2550.0 # 3 * 850
    assert "invoice_no" in tx

    # 3. Verify stock is now 22 (25 - 3)
    check_item = await client.get(f"/api/v1/inventory/items/{item_id}", headers=admin_headers)
    assert check_item.json()["current_stock"] == 22

@pytest.mark.asyncio
async def test_pos_checkout_idempotency(client: AsyncClient, admin_headers: dict):
    """Verify identical idempotency key returns cached receipt without double stock deduction."""
    sku = f"IDEM-{uuid.uuid4().hex[:6].upper()}"
    item_res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Brake Fluid DOT 4",
        "brand": "Motul",
        "item_type": "PRODUCT",
        "category": "Fluids",
        "current_stock": 10,
        "reorder_level": 2,
        "cost_price": 120.0,
        "selling_price": 220.0
    })
    item_id = item_res.json()["id"]

    idempotency_key = str(uuid.uuid4())
    headers = {**admin_headers, "Idempotency-Key": idempotency_key}
    payload = {
        "cashier_name": "Test Cashier",
        "items": [{"item_id": item_id, "qty": 2, "price": 220.0}],
        "amount_paid": 500.0,
        "payment_method": "CASH"
    }

    # First request
    res1 = await client.post("/api/v1/sales/checkout", headers=headers, json=payload)
    assert res1.status_code == 201
    invoice_no = res1.json()["invoice_no"]

    # Replay identical request
    res2 = await client.post("/api/v1/sales/checkout", headers=headers, json=payload)
    assert res2.status_code in [200, 201]
    assert res2.json()["invoice_no"] == invoice_no

    # Stock should be 8 (10 - 2), NOT 6
    check_item = await client.get(f"/api/v1/inventory/items/{item_id}", headers=admin_headers)
    assert check_item.json()["current_stock"] == 8

@pytest.mark.asyncio
async def test_pos_checkout_multi_item_and_discount(client: AsyncClient, admin_headers: dict):
    """Verify purchasing multiple distinct items with discount calculates total and deducts each stock."""
    # Item 1
    sku1 = f"MLT1-{uuid.uuid4().hex[:6].upper()}"
    res1 = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku1,
        "name": "Front Brake Pads",
        "brand": "Nissin",
        "item_type": "PRODUCT",
        "category": "Brakes",
        "current_stock": 20,
        "cost_price": 150.0,
        "selling_price": 300.0
    })
    id1 = res1.json()["id"]

    # Item 2
    sku2 = f"MLT2-{uuid.uuid4().hex[:6].upper()}"
    res2 = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku2,
        "name": "Rear Brake Shoes",
        "brand": "Nissin",
        "item_type": "PRODUCT",
        "category": "Brakes",
        "current_stock": 15,
        "cost_price": 100.0,
        "selling_price": 200.0
    })
    id2 = res2.json()["id"]

    headers = {**admin_headers, "Idempotency-Key": str(uuid.uuid4())}
    checkout_res = await client.post("/api/v1/sales/checkout", headers=headers, json={
        "cashier_name": "Test Cashier",
        "items": [
            {"item_id": id1, "qty": 2, "price": 300.0}, # 600
            {"item_id": id2, "qty": 1, "price": 200.0}  # 200 => Subtotal: 800
        ],
        "discount_percentage": 10.0,
        "discount_amount": 80.0,
        "amount_paid": 720.0,
        "cash_received": 1000.0,
        "cash_change": 280.0,
        "payment_method": "CASH"
    })
    assert checkout_res.status_code == 201
    tx = checkout_res.json()
    assert tx["subtotal"] == 800.0
    assert tx["discount_amount"] == 80.0
    assert tx["total"] == 720.0

    # Verify both stock levels were deducted atomically
    c1 = await client.get(f"/api/v1/inventory/items/{id1}", headers=admin_headers)
    assert c1.json()["current_stock"] == 18 # 20 - 2
    c2 = await client.get(f"/api/v1/inventory/items/{id2}", headers=admin_headers)
    assert c2.json()["current_stock"] == 14 # 15 - 1

@pytest.mark.asyncio
async def test_list_and_get_transaction(client: AsyncClient, admin_headers: dict):
    """Verify retrieving transaction list and looking up a specific transaction."""
    list_res = await client.get("/api/v1/sales/transactions", headers=admin_headers)
    assert list_res.status_code == 200
    transactions = list_res.json()
    assert isinstance(transactions, list)

    if transactions:
        tx_id = transactions[0]["id"]
        tx_res = await client.get(f"/api/v1/sales/transactions/{tx_id}", headers=admin_headers)
        assert tx_res.status_code == 200
        assert tx_res.json()["id"] == tx_id

@pytest.mark.asyncio
async def test_void_transaction(client: AsyncClient, admin_headers: dict):
    """Verify marking a transaction as VOIDED."""
    # 1. Perform checkout
    sku = f"VOID-{uuid.uuid4().hex[:6].upper()}"
    item_res = await client.post("/api/v1/inventory/items", headers=admin_headers, json={
        "sku": sku,
        "name": "Test Product For Void",
        "brand": "Generic",
        "item_type": "PRODUCT",
        "category": "Supplies",
        "current_stock": 10,
        "reorder_level": 1,
        "cost_price": 50.0,
        "selling_price": 100.0
    })
    item_id = item_res.json()["id"]

    headers = {**admin_headers, "Idempotency-Key": str(uuid.uuid4())}
    checkout_res = await client.post("/api/v1/sales/checkout", headers=headers, json={
        "cashier_name": "Test Cashier",
        "items": [{"item_id": item_id, "qty": 1, "price": 100.0}],
        "amount_paid": 100.0,
        "payment_method": "CASH"
    })
    tx_id = checkout_res.json()["id"]

    # 2. Void transaction
    void_res = await client.post(f"/api/v1/sales/transactions/{tx_id}/void", headers=admin_headers)
    assert void_res.status_code == 200
    assert void_res.json()["status"] == "VOIDED"
