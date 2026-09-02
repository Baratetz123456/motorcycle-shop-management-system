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
