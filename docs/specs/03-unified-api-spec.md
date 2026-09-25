# MotoShop POS: Unified API Specification
## Document ID: SPEC-003 | Version: 1.0.0-PROD | Status: APPROVED

---

## 1. API Architecture & Routing Conventions

The unified FastAPI Modular Monolith serves all endpoints directly under `/api/v1/*`.

- **Base URL (Local)**: `http://localhost:8000/api/v1`
- **Base URL (Production)**: `https://dXXXXXXXXXX.cloudfront.net/api/v1` (Same-origin with frontend SPA)
- **Authentication**: `Bearer <access_token>` in `Authorization` header + `refresh_token` in HttpOnly cookie.

---

## 2. Core Endpoints Reference

### 2.1 Auth Module (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate user, set refresh cookie, return access token | No |
| `POST` | `/api/v1/auth/refresh` | Rotate access token using valid refresh token cookie | Cookie |
| `POST` | `/api/v1/auth/logout` | Revoke active token in DB and clear refresh cookie | Yes |
| `GET` | `/api/v1/auth/me` | Retrieve current authenticated user profile | Yes |
| `POST` | `/api/v1/auth/change-password` | Update user password, increment token_version | Yes |
| `GET` | `/api/v1/auth/users` | List all users (staff accounts) | Admin |
| `POST` | `/api/v1/auth/users` | Create new staff user | Admin |
| `PUT` | `/api/v1/auth/users/{user_id}`| Update user details, role, wage, commission | Admin |

---

### 2.2 Inventory Module (`/api/v1/inventory`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/inventory/items` | List inventory items with category/search filters (alias: `/api/v1/inventory`) | Yes |
| `GET` | `/api/v1/inventory/items/{id}` | Get specific item by UUID or SKU (alias: `/api/v1/inventory/{id}`) | Yes |
| `POST` | `/api/v1/inventory/items` | Create new product or service item | Admin |
| `PUT` | `/api/v1/inventory/items/{id}` | Update item details, pricing, reorder level | Admin |
| `POST` | `/api/v1/inventory/stock-adjustment` | Record manual stock IN/OUT adjustment | Admin |
| `GET` | `/api/v1/inventory/movements` | List historical stock movements | Yes |

---

### 2.3 Sales & POS Module (`/api/v1/sales`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/sales/checkout` | Process POS checkout (ACID transaction) | Yes (`Idempotency-Key`) |
| `GET` | `/api/v1/sales/transactions` | List past transactions / invoices with pagination | Yes |
| `GET` | `/api/v1/sales/transactions/{id}`| Get 10-section invoice details by ID or invoice_no | Yes |
| `POST` | `/api/v1/sales/transactions/{id}/void` | Void an existing transaction | Admin (`ConfirmModal`) |
| `GET` | `/api/v1/sales/reports/daily` | Get daily register sales summary & cash total | Admin/Cashier |

#### Checkout Request Payload (`POST /api/v1/sales/checkout`):
```json
{
  "customer_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "cashier_name": "Maria Santos",
  "mechanic_name": "Juan Dela Cruz",
  "job_order_id": "4fa85f64-5717-4562-b3fc-2c963f66afa7",
  "items": [
    {
      "item_id": "1fa85f64-5717-4562-b3fc-2c963f66afa1",
      "sku": "MOTUL-7100-10W40",
      "name": "Motul 7100 4T 10W40 1L",
      "item_type": "PRODUCT",
      "qty": 2,
      "price": 650.00
    },
    {
      "item_id": "2fa85f64-5717-4562-b3fc-2c963f66afa2",
      "sku": "SRV-OIL-CHANGE",
      "name": "Oil Change Service",
      "item_type": "SERVICE",
      "qty": 1,
      "price": 150.00
    }
  ],
  "subtotal": 1450.00,
  "discount_percentage": 0.0,
  "discount_amount": 0.0,
  "total": 1450.00,
  "cash_received": 1500.00,
  "cash_change": 50.00,
  "payment_method": "CASH"
}
```

---

### 2.4 Repairs Module (`/api/v1/repairs`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/repairs/motorcycles` | Search registered bikes by plate/customer | Yes |
| `POST` | `/api/v1/repairs/motorcycles` | Register new customer motorcycle | Yes |
| `GET` | `/api/v1/repairs/motorcycle-models` | List active catalog motorcycle models with frequency | Yes |
| `POST` | `/api/v1/repairs/motorcycle-models` | Register new bike catalog profile | Admin |
| `PUT` | `/api/v1/repairs/motorcycle-models/{id}` | Update bike catalog profile | Admin |
| `DELETE` | `/api/v1/repairs/motorcycle-models/{id}` | Archive bike catalog profile | Admin |
| `GET` | `/api/v1/repairs/jobs` | List active job orders by status | Yes |
| `POST` | `/api/v1/repairs/jobs` | Create new job order | Yes |
| `GET` | `/api/v1/repairs/jobs/active-carts` | Retrieve pending & ongoing repair carts for POS terminal | Yes |
| `POST` | `/api/v1/repairs/jobs/{id}/cart-items` | Add product or labor item to repair cart | Yes |
| `PATCH` | `/api/v1/repairs/jobs/{id}/status` | Update job order status (PENDING->ONGOING->COMPLETED) | Yes |
| `PATCH` | `/api/v1/repairs/jobs/{id}/payment-status` | Settle job order, mark PAID, credit commissions | Yes |
| `GET` | `/api/v1/repairs/customer-history` | Aggregate repair history records grouped by customer | Yes |
| `GET` | `/api/v1/repairs/commissions` | List enriched mechanic commissions with job metadata | Yes |

---

### 2.5 Audit Module (`/api/v1/audit`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/audit/logs` | Fetch paginated immutable audit log events | Admin |

---

## 3. Error Handling & Standard Responses

All errors conform to RFC 7807 problem details:
```json
{
  "detail": "Error description message",
  "error_code": "INSUFFICIENT_STOCK",
  "status_code": 400
}
```
Standard status codes:
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure or business constraint violation.
- `401 Unauthorized`: Token missing, expired, or revoked.
- `403 Forbidden`: Role lacks necessary permission.
- `404 Not Found`: Target entity does not exist.
- `409 Conflict`: Unique constraint violation or idempotency conflict.
- `500 Internal Server Error`: Unhandled server exception.
