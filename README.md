# 🏍️ Motorcycle Shop Management System

Welcome to the Motorcycle Shop Management System! This is a cloud-native, microservices-based enterprise application designed to manage POS transactions, motorcycle repairs, inventory tracking, and operational reporting.

## 🏗️ Architecture Overview

- **Frontend**: Next.js 15 (App Router), React, Zustand (State), TanStack Query, Tailwind CSS v4.
- **Backend Microservices**: FastAPI (Python), SQLAlchemy, Pydantic.
  - `auth_service`: JWT Authentication and RBAC.
  - `inventory_service`: Stock management.
  - `sales_service`: POS Transactions.
  - `repairs_service`: Job Orders and Mechanic Commissions.
- **API Gateway**: KrakenD (Handles routing, CORS, and Rate Limiting).
- **Data & Brokers**: PostgreSQL (Supabase schema), Redis (Caching & Idempotency), RabbitMQ (Saga Pattern messaging).

---

## 🚀 Setup & Launch Guide

Follow these steps to set up the local development environment.

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Python 3.12+](https://www.python.org/)

### 1. Start Infrastructure Services
The system relies on a local database, Redis, and RabbitMQ. 
1. Open a terminal in the root directory (`d:\POS`).
2. Run the following command to start the infrastructure and API Gateway:
   ```bash
   docker-compose up -d
   ```
3. Ensure the Postgres container initializes with the `init.sql` schema script.

### 2. Start Backend Microservices
Each service needs to be running. For local development, you can run them directly via Python or configure Docker to build them.

**Using Python/Uvicorn (Recommended for Dev):**
1. Navigate to the backend directory: `cd backend`
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Open separate terminal windows and start each service on its designated port:
   ```bash
   # Auth Service (Port 8000)
   uvicorn auth_service.main:app --port 8000 --reload
   
   # Inventory Service (Port 8002)
   uvicorn inventory_service.main:app --port 8002 --reload
   
   # Sales Service (Port 8003)
   uvicorn sales_service.main:app --port 8003 --reload
   
   # Repairs Service (Port 8004)
   uvicorn repairs_service.main:app --port 8004 --reload
   ```
*(Note: KrakenD is configured to look for these services on these ports.)*

### 3. Start the Next.js Frontend
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Access the application at **http://localhost:3000**.

### 📍 Application Entry Points
| Service | Entry Point URL | Description |
|---|---|---|
| **Web App (Frontend)** | [`http://localhost:3000`](http://localhost:3000) | Main Portal (Redirects to `/login`) |
| **Login Page** | [`http://localhost:3000/login`](http://localhost:3000/login) | Interactive JWT Login UI |
| **API Gateway (KrakenD)** | `http://localhost:8080/api/v1` | Unified Microservices Gateway |
| **Auth Service** | `http://localhost:8001` | JWT Auth & Seeding Service |
| **RabbitMQ Dashboard** | `http://localhost:15672` | Messaging & Event Monitoring (`guest`/`guest`) |

---

## 🔐 Authentication & Onboarding Guide

The system uses JWT-based Role-Based Access Control (RBAC) powered by `auth_service` and routed through the KrakenD API Gateway.

### Supported Roles
- **`admin`**: Full administrative access across all management modules.
- **`cashier`**: Default role for POS checkout and sales handling.
- **`mechanic`**: Assigned to repair job orders to earn labor commissions.

### 1. Seed Initial Admin Account
Before logging in for the first time, seed the initial administrator account:

**PowerShell:**
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8001/seed-admin
```

**Curl:**
```bash
curl.exe -X POST http://localhost:8001/seed-admin
```

**Response:**
```json
{
  "msg": "Admin user created",
  "email": "admin@motoshop.com",
  "password": "admin123"
}
```

### 2. Login & Token Authentication
Authenticate via the KrakenD API Gateway (`http://localhost:8080/api/v1/auth/login`) or direct auth service (`http://localhost:8001/login`):

**PowerShell:**
```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/auth/login -ContentType "application/json" -Body '{"email":"admin@motoshop.com","password":"admin123"}'
```

**Curl:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@motoshop.com","password":"admin123"}'
```

**Response:**
```json
{
  "access_token": "<JWT_BEARER_TOKEN>",
  "token_type": "bearer",
  "user_id": "<USER_UUID>",
  "role": "admin"
}
```

### 3. Registering & Provisioning Users with Roles
Users are stored in PostgreSQL under `auth.users`. Passwords are encrypted using **bcrypt**:

**SQL Insertion Example:**
```sql
-- Connect to Postgres (port 5432, db: motorcycle_shop, user: postgres)
INSERT INTO auth.users (email, password_hash, role)
VALUES (
  'cashier1@motoshop.com',
  '$2b$12$eImiTXuWVxfM37uY4JANjO...', -- Bcrypt hash of password
  'cashier'
);
```

---

## 📖 Operation Guide

Once the system is fully launched, navigate to `http://localhost:3000` to interact with the system.

### Point of Sale (POS) Checkout
- **URL**: `/pos`
- **How to use**: 
  1. Click on products in the grid to add them to your cart. 
  2. Adjust quantities using the `+` and `-` buttons in the cart sidebar.
  3. Click **Charge**.
  4. Select a payment method (Cash/Card) and confirm.
  5. *Under the hood*: The system initiates a distributed Saga. The UI locks, polling the API Gateway. The Sales service asks the Inventory service to deduct stock. If stock is available, it resolves as `COMPLETED`. If not, it rolls back and resolves as `VOIDED`.

### Inventory Management
- **URL**: `/inventory`
- **How to use**: 
  - View current stock levels, cost, and selling prices.
  - The grid visually alerts you (Orange `Reorder` pill) if a product's stock falls below its reorder threshold.
  - Profit margins are automatically calculated and displayed.

### Repairs Kanban Board
- **URL**: `/repairs/board`
- **How to use**: 
  - Represents mechanic Job Orders.
  - Drag and drop cards between `Pending`, `In Progress`, `Completed`, and `Released` columns.
  - *Under the hood*: Moving a card to `Completed` automatically triggers the backend to calculate the mechanic's commission (e.g., 40% of the labor charge) and records it to the database.

### Executive Dashboard
- **URL**: `/reports`
- **How to use**: 
  - View high-level metrics like Total Revenue, Net Profit, and Completed Repairs.
  - Charts are fully interactive; hover over the Area and Bar charts to see daily/weekly breakdowns.

---

## 🧪 Running Tests
To run the automated integration tests for the Saga transactions and Rate Limiting:
1. Ensure the system is running.
2. In the `backend` directory, install test requirements:
   ```bash
   pip install -r requirements-dev.txt
   ```
3. Run pytest:
   ```bash
   pytest tests/
   ```
