# Versiklo: Production-Grade System Architecture & Security Documentation

> **Product**: Versiklo — Motorcycle Shop Management System  
> **Classification**: Vertical Dealership & Shop Floor Management System (DMS / ERP)  
> **System Architecture**: Event-Driven Microservices with API Gateway, Transactional Outbox, & Distributed Saga  
> **Version**: 1.0.0-PROD  
> **Documentation Target**: Technical Onboarding, Architectural Reference, Security Audit & Incident Runbook  

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack & Strategy](#2-tech-stack--strategy)
3. [Critical Libraries & Dependencies](#3-critical-libraries--dependencies)
4. [System Architecture](#4-system-architecture)
5. [Microservices Inventory & Bounded Contexts](#5-microservices-inventory--bounded-contexts)
6. [API Gateway (KrakenD)](#6-api-gateway-krakend)
7. [API Rate Limiting & Abuse Prevention](#7-api-rate-limiting--abuse-prevention)
8. [Idempotency Strategy & Execution](#8-idempotency-strategy--execution)
9. [Backend Architecture](#9-backend-architecture)
10. [Database Design & Schema Reference](#10-database-design--schema-reference)
11. [Frontend Architecture](#11-frontend-architecture)
12. [Frontend ↔ Backend Wire-Level Communication](#12-frontend--backend-wire-level-communication)
13. [Security Architecture & Strategy](#13-security-architecture--strategy)
    - [13.1 Threat Model & Trust Boundaries](#131-threat-model--trust-boundaries)
    - [13.2 Authentication Security](#132-authentication-security)
    - [13.3 Authorization & Access Control (RBAC)](#133-authorization--access-control-rbac)
    - [13.4 Input Validation & Injection Prevention](#134-input-validation--injection-prevention)
    - [13.5 Web & API Layer Security](#135-web--api-layer-security)
    - [13.6 Data Security & Privacy (PII)](#136-data-security--privacy-pii)
    - [13.7 Secrets Management](#137-secrets-management)
    - [13.8 Frontend Security](#138-frontend-security)
    - [13.9 Container & Infrastructure Security](#139-container--infrastructure-security)
    - [13.10 Audit Logging & Security Monitoring](#1310-audit-logging--security-monitoring)
    - [13.11 Supply Chain & Dependency Security](#1311-supply-chain--dependency-security)
    - [13.12 Security Configuration Reference](#1312-security-configuration-reference)
    - [13.13 Security Gaps & Prioritized Recommendations](#1313-security-gaps--prioritized-recommendations)
14. [UI/UX Design System](#14-uiux-design-system)
15. [Full Operational Workflow](#15-full-operational-workflow)
16. [User Journeys](#16-user-journeys)
17. [Docker & Container Service Management](#17-docker--container-service-management)
18. [Common Operational Scenarios & Incident Runbook](#18-common-operational-scenarios--incident-runbook)
19. [Developer Onboarding Guide](#19-developer-onboarding-guide)
20. [End-User Onboarding Guide](#20-end-user-onboarding-guide)
21. [Appendices](#21-appendices)

---

## 1. Project Overview

### 1.1 Purpose & Mission
**Versiklo** is an integrated vertical shop management platform engineered specifically for independent motorcycle repair shops, multi-bay service garages, and motorcycle dealerships. It replaces fragmented paper receipts, manual job whiteboards, and disjointed retail cash registers with an integrated shop floor mental model.

### 1.2 Target Personas
1. **Shop Owners & General Managers**: Need real-time business visibility, gross revenue tracking, labor vs. parts margins, payroll commission disbursements, and tamper-resistant audit trails.
2. **Service Managers & Lead Mechanics**: Need digital job cards, bay assignments, service interval tracking, bike model specifications, and labor note history.
3. **Parts Counter Clerks & Cashiers**: Need fast walk-in counter sales, barcode scanning, stock level reorder alerts, and split-second checkout.
4. **Mechanics**: Need mobile-friendly bench cards, task timers, assigned repair status updates, and transparent labor commission tracking.

### 1.3 Core Value Proposition
- **The "Shop Floor" Mental Model**: Eliminates software engineering jargon (*"ERP"*, *"DMS"*, *"data pipelines"*) in favor of physical workspace concepts: *Dashboard*, *Showroom Counter*, *Job Cards*, *Parts & Stock*, *Customer Records*, *Bike Registry*, *Invoices & Receipts*, and *Payroll*.
- **Data Integrity via Asynchronous Outbox Saga**: Stock deductions and repair billing stay strictly consistent across microservices without distributed two-phase commit lockups.
- **Cryptographic Immutability**: Database-level PostgreSQL triggers prevent any mutation or deletion of audit logs, providing tamper-resistant legal and financial traceability.

---

## 2. Tech Stack & Strategy

| Layer | Technology | Version | Purpose | Architectural Rationale |
|---|---|---|---|---|
| **Client Frontend** | Next.js (App Router) | `16.3.4` | Single Page Application & SSR | High performance, automatic static optimization, streaming SSR, built-in Turbopack bundler. |
| **UI Framework** | React | `19.2.8` | Component Architecture | Concurrent rendering, declarative hooks, component-level state isolation. |
| **Styling** | Tailwind CSS | `^4.0.0` | Atomic Styling & Theming | Zero-runtime CSS custom property resolution; allows dynamic theme palette switching without DOM re-renders. |
| **API Gateway** | KrakenD Stateless Gateway | `2.6` | Unified Client Entrypoint | High-performance Go-based gateway (30k+ req/sec); handles CORS, rate limiting, request validation, and backend service decoupling. |
| **Backend Services** | Python / FastAPI | `0.111.0` | Microservice APIs | High concurrency asynchronous ASGI framework with native Pydantic v2 data validation and OpenAPI doc generation. |
| **ASGI Server** | Uvicorn (Standard) | `0.30.1` | Asynchronous Execution | Ultra-fast ASGI server implementation powered by `uvloop` and `httptools`. |
| **ORM / Data Layer** | SQLAlchemy | `2.0.31` | Relational Mapping & Async DB | Asyncio-first unit-of-work pattern; complete type annotations and strict schema qualification. |
| **Database Driver** | asyncpg | `0.29.0` | PostgreSQL Driver | Direct async binary protocol driver for PostgreSQL; highest throughput Python driver available. |
| **Primary Database** | PostgreSQL | `16-alpine` | Relational Persistence | Schema-level multi-tenancy (`auth`, `inventory`, `sales`, `repairs`, `audit`), ACID compliance, PL/pgSQL triggers. |
| **Caching & Idempotency** | Redis | `7-alpine` | Distributed Cache & Locking | In-memory atomic store for sub-millisecond idempotency response caching and token blacklisting. |
| **Message Broker** | RabbitMQ | `3-management-alpine` | Asynchronous Saga Queue | Reliable AMQP 0-9-1 topic exchange messaging for Transactional Outbox event consumers. |
| **Containerization** | Docker & Compose | Compose v2 | Infrastructure Orchestration | Reproducible local and staging deployment with container healthchecks and internal network isolation. |

---

## 3. Critical Libraries & Dependencies

### 3.1 Backend Critical Libraries ([`backend/requirements.txt`](file:///d:/POS/motorcycle-shop-management-system/backend/requirements.txt))

| Library | Version | Category | Criticality | Where Used | Failure Impact if Removed |
|---|---|---|---|---|---|
| `fastapi` | `0.111.0` | API Framework | **Critical** | All 4 microservices `main.py` | Complete service failure; no HTTP endpoints can mount or receive requests. |
| `pydantic` | `2.7.4` | Data Validation | **Critical** | `schemas.py` across all services | Unchecked JSON deserialization; mass assignment vulnerabilities, SQL errors on malformed types. |
| `SQLAlchemy` | `2.0.31` | Database ORM | **Critical** | `shared/database.py`, all `models.py` | Total persistence failure; microservices lose all database querying capabilities. |
| `asyncpg` | `0.29.0` | DB Driver | **Critical** | `shared/database.py` (via connection URL) | SQLAlchemy cannot establish async connections to PostgreSQL 16. |
| `python-jose[cryptography]` | `3.3.0` | Auth & Tokens | **Security Critical** | `shared/security.py`, `auth_service/main.py` | Inability to sign, decode, or verify JWT authorization tokens. |
| `passlib[bcrypt]` | `1.7.4` / `bcrypt` | Password Hashing | **Security Critical** | `auth_service/main.py` | Passwords cannot be salted or hashed; authentication is disabled. |
| `aio-pika` | `9.4.1` | AMQP / RabbitMQ | **Critical** | `shared/outbox.py`, `inventory_service`, `sales_service` | Distributed Saga halts; inventory will not deduct on checkout and invoices will not settle. |
| `redis` | `5.0.7` | Caching / Idempotency | **Critical** | `shared/idempotency.py` | Write endpoints lose replay protection; network retries result in duplicate customer charges. |

### 3.2 Frontend Critical Libraries ([`frontend/package.json`](file:///d:/POS/motorcycle-shop-management-system/frontend/package.json))

| Library | Version | Category | Criticality | Where Used | Failure Impact if Removed |
|---|---|---|---|---|---|
| `next` | `16.3.4` | App Framework | **Critical** | Entire `frontend/src/app` | Frontend build fails; routing, layout SSR, and page rendering collapse. |
| `axios` | `^1.20.0` | HTTP Client | **Critical** | `frontend/src/lib/api-client.ts` | All API gateway communication fails; app cannot load or submit data. |
| `zustand` | `^5.0.15` | State Management | **Critical** | `frontend/src/lib/pos-store.ts` | Counter sales cart, customer selection, and active repair tracking break. |
| `uuid` | `^14.0.2` | Key Generation | **Security Critical** | `frontend/src/lib/api-client.ts` | Idempotency headers cannot be attached; requests become non-idempotent. |
| `lucide-react` | `^1.38.0` | Visual Iconography | Utility | All page components & headers | UI renders missing icon elements, degrading visual usability. |
| `clsx` & `tailwind-merge` | `2.1.1` / `3.6.0` | Style Composition | Utility | Layout, modals, badges | Class collisions; themes fail to style dynamic elements correctly. |

---

## 4. System Architecture

Versiklo employs an **Event-Driven Microservices Architecture** governed by an edge API gateway, decoupled backend microservices, an immutable append-only audit stream, and an asynchronous message broker implementing the **Transactional Outbox Saga Pattern**.

```mermaid
flowchart TD
    subgraph External["Client Tier (External / Untrusted)"]
        Browser["Next.js 16 Web Client\n(Port 3000)"]
    end

    subgraph Edge["API Gateway Tier"]
        KrakenD["KrakenD Gateway\n(Port 8080: /api/v1/*)\nStateless Router & CORS Guard"]
    end

    subgraph Services["Core Microservices Tier (Internal Network)"]
        Auth["Auth Service\n(Port 8001 / Internal 8000)\nUsers, Roles, Token Revocation"]
        Inventory["Inventory Service\n(Port 8002 / Internal 8000)\nParts, Stock Movements, Services"]
        Sales["Sales Service\n(Port 8003 / Internal 8000)\nInvoices, Checkout, Payments"]
        Repairs["Repairs Service\n(Port 8004 / Internal 8000)\nJob Cards, Bikes, Commissions"]
    end

    subgraph Data["Persistence & Messaging Tier"]
        Postgres[("PostgreSQL 16 Engine\nSchemas: auth, inventory,\nsales, repairs, audit")]
        Redis[("Redis 7 Cache\nIdempotency Store (TTL 24h)\nKey: idemp:{uuid}")]
        RabbitMQ{{"RabbitMQ 3.9 Broker\nTopic Exchange: pos_events\nQueues: inventory_saga, sales_saga"}}
    end

    Browser -->|HTTP Bearer + Idempotency-Key| KrakenD
    KrakenD -->|Route /api/v1/auth/*| Auth
    KrakenD -->|Route /api/v1/inventory/*| Inventory
    KrakenD -->|Route /api/v1/sales/*| Sales
    KrakenD -->|Route /api/v1/repairs/*| Repairs

    Auth -->|Direct Async Connection| Postgres
    Inventory -->|Direct Async Connection| Postgres
    Sales -->|Direct Async Connection| Postgres
    Repairs -->|Direct Async Connection| Postgres

    Inventory -.->|Idempotency Check/Set| Redis
    Sales -.->|Idempotency Check/Set| Redis
    Repairs -.->|Idempotency Check/Set| Redis

    Sales -->|Transactional Outbox Insert| Postgres
    Inventory -->|Transactional Outbox Insert| Postgres
    Repairs -->|Transactional Outbox Insert| Postgres

    Postgres -.->|Poll Outbox: SKIP LOCKED| Sales
    Postgres -.->|Poll Outbox: SKIP LOCKED| Inventory
    Postgres -.->|Poll Outbox: SKIP LOCKED| Repairs

    Sales -->|Publish SaleCreated| RabbitMQ
    RabbitMQ -->|Consume SaleCreated| Inventory
    Inventory -->|Publish StockDeducted / Failed| RabbitMQ
    RabbitMQ -->|Consume Stock Status| Sales
```

### 4.1 Architecture Style Justification
- **Microservices with Schema Isolation**: Rather than maintaining 5 separate databases, Versiklo leverages PostgreSQL schemas (`auth`, `inventory`, `sales`, `repairs`, `audit`). This eliminates the infrastructure overhead of multiple DB engines while strictly maintaining logical bounded contexts and foreign key barriers.
- **Decoupled Asynchronous Saga vs Two-Phase Locking**: Retail counters cannot tolerate downtime or distributed deadlocks. When a cashier completes an order, the `sales_service` commits locally and writes a `SaleCreated` event to `sales.outbox_events`. Even if RabbitMQ or Inventory is momentarily slow, the cashier is never blocked.

---

## 5. Microservices

| Service Name | Bounded Context & Responsibility | Port (Host / Int) | Database Schema | Dependencies |
|---|---|---|---|---|
| **`auth_service`** | Authentication, user credential hashing, token issuance, live role revocation (`token_version`), audit log querying and CSV extraction. | `8001:8000` | `auth`, `audit` | PostgreSQL, Redis |
| **`inventory_service`** | Parts catalog, stock movement logging, soft-deletion tracking, service labor pricing, Saga stock deduction. | `8002:8000` | `inventory`, `audit` | PostgreSQL, Redis, RabbitMQ |
| **`sales_service`** | Order checkout, invoice generation, cashier payment processing, labor commission settlement, transaction voiding. | `8003:8000` | `sales`, `audit` | PostgreSQL, Redis, RabbitMQ |
| **`repairs_service`** | Workshop Job Cards, bike registry, Kanban status drops, technician notes, mechanic commission calculations. | `8004:8000` | `repairs`, `audit` | PostgreSQL, Redis, RabbitMQ |

---

## 6. API Gateway (KrakenD)

The API Gateway is configured in [`krakend/krakend.json`](file:///d:/POS/motorcycle-shop-management-system/krakend/krakend.json). It acts as the single reverse proxy for the Next.js frontend, shielding the microservices from direct public exposure.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Next.js Web Client
    participant GW as KrakenD Gateway (8080)
    participant Auth as Auth Service (8001)
    participant Sales as Sales Service (8003)

    Client->>GW: POST /api/v1/auth/login
    Note over GW: Validates CORS & Routes to backend
    GW->>Auth: POST http://auth_service:8000/login
    Auth-->>GW: 200 OK {access_token: "..."}
    GW-->>Client: 200 OK {access_token: "..."}

    Client->>GW: POST /api/v1/sales/transactions (Authorization: Bearer + Idempotency-Key)
    GW->>Sales: POST http://sales_service:8000/transactions
    Note over Sales: shared/security validates token<br/>shared/idempotency checks Redis
    Sales-->>GW: 201 Created {invoice_no: "INV-..."}
    GW-->>Client: 201 Created {invoice_no: "INV-..."}
```

### 6.1 Gateway Configuration Details
- **Routing Rules**: Mapped under `/api/v1/*`. Internal Docker DNS names (`http://auth_service:8000`, `http://inventory_service:8000`, etc.) are resolved statically by KrakenD.
- **Allowed Headers**: `["Authorization", "Content-Type", "Idempotency-Key", "X-Forwarded-For", "Accept"]` ([`krakend.json:9`](file:///d:/POS/motorcycle-shop-management-system/krakend/krakend.json#L9)).
- **Query String Forwarding**: `input_query_strings: ["*"]` enables dynamic client-side filtering on logs and users without rigid gateway route redeployments.

---

## 7. API Rate Limiting & Abuse Prevention

### 7.1 Current Rate Limiting Posture
- **Edge Gateway (KrakenD)**: KrakenD contains built-in rate-limiting modules (`krakend-ratelimit`). In the current configuration file ([`krakend.json`](file:///d:/POS/motorcycle-shop-management-system/krakend/krakend.json)), explicit rate-limiting stanzas are currently **omitted** for local development flexibility.
  > ⚠️ *Documented as Security Gap GAP-01 in Section 13.13.*
- **Backend Service Throttling**: Microservice route handlers rely on asynchronous non-blocking I/O.
- **Client IP Attribution**: Extracted in [`backend/shared/security.py:16`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/security.py#L16) via `get_client_ip(request)`, inspecting `X-Forwarded-For` and falling back to `request.client.host`.

---

## 8. Idempotency Strategy & Execution

### 8.1 Write Operations Requiring Idempotency
- `POST /api/v1/sales/transactions`: Prevents double billing when a cashier clicks "Record Payment" twice or experiences a network timeout.
- `POST /api/v1/sales/transactions/{id}/void`: Prevents double inventory rollback or redundant void events.
- `POST /api/v1/inventory/items`: Prevents duplicate part SKU creation.
- `POST /api/v1/repairs/jobs`: Prevents creating multiple job cards for the same customer bike check-in.

### 8.2 Execution Mechanism ([`backend/shared/idempotency.py`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/idempotency.py))
1. **Header**: The client generates a unique UUIDv4 and attaches it as `Idempotency-Key` ([`frontend/src/lib/api-client.ts:24`](file:///d:/POS/motorcycle-shop-management-system/frontend/src/lib/api-client.ts#L24)).
2. **Lookup**: The `@idempotent` decorator checks Redis for the key `idemp:{idempotency_key}`.
3. **Cache Hit**: If found, it immediately short-circuits the endpoint and returns the cached HTTP status code and response payload.
4. **Cache Miss**: If absent, the endpoint executes. Upon returning an HTTP status code between 200 and 299, the response status and body are serialized and saved to Redis with a TTL of **86,400 seconds (24 hours)**.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Cashier POS Terminal
    participant Decorator as @idempotent Decorator
    participant Redis as Redis 7 Cache
    participant Handler as FastAPI Route Handler
    participant DB as PostgreSQL DB

    Client->>Decorator: POST /sales/transactions (Idempotency-Key: "550e8400...")
    Decorator->>Redis: GET idemp:550e8400...
    alt Key Found in Redis (Duplicate Submission)
        Redis-->>Decorator: Cached JSON {status: 201, body: {...}}
        Decorator-->>Client: 201 Created (Instant Replay, No DB Mutation)
    else Key Not in Redis (First Request)
        Redis-->>Decorator: null
        Decorator->>Handler: Execute Endpoint Logic
        Handler->>DB: INSERT into sales.transactions
        DB-->>Handler: Committed
        Handler-->>Decorator: JSONResponse(201, body)
        Decorator->>Redis: SET idemp:550e8400... (TTL 24h)
        Decorator-->>Client: 201 Created
    end
```

---

## 9. Backend Architecture

### 9.1 Pattern & Folder Structure
The backend follows a **Modular Clean Microservices Pattern** sharing a common infrastructure core located in `backend/shared/`.

```
backend/
├── auth_service/               # Authentication & User Management
│   ├── Dockerfile
│   ├── main.py                # FastAPI routes & lifespan
│   ├── models.py              # SQLAlchemy models (schema: auth)
│   └── schemas.py             # Pydantic v2 DTOs
├── inventory_service/          # Catalog & Stock Movements
│   ├── Dockerfile
│   ├── main.py                # REST endpoints & RabbitMQ consumer
│   ├── models.py              # SQLAlchemy models (schema: inventory)
│   └── schemas.py             # Pydantic v2 DTOs
├── sales_service/              # Counter POS & Transactions
│   ├── Dockerfile
│   ├── main.py                # Invoice issuance & Saga consumer
│   ├── models.py              # SQLAlchemy models (schema: sales)
│   └── schemas.py             # Pydantic v2 DTOs
├── repairs_service/            # Workshop Job Cards & Mechanics
│   ├── Dockerfile
│   ├── main.py                # Kanban board & commission logic
│   ├── models.py              # SQLAlchemy models (schema: repairs)
│   └── schemas.py             # Pydantic v2 DTOs
├── shared/                     # Cross-Cutting Infrastructure Library
│   ├── audit.py               # Immutable audit log models & helpers
│   ├── database.py            # Async engine & session factories
│   ├── idempotency.py         # Redis-backed @idempotent decorator
│   ├── logger.py              # Structured console & file loggers
│   ├── logging_middleware.py  # X-Correlation-ID & latency tracing
│   └── security.py            # JWT verification & RBAC dependencies
├── requirements.txt           # Unified dependency manifest
└── docker-compose.yml          # Container configuration
```

### 9.2 Request Middleware Chain
Every request entering any microservice traverses:
1. `RequestLoggingMiddleware` ([`shared/logging_middleware.py`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/logging_middleware.py)): Generates or extracts `X-Correlation-ID`, logs latency in milliseconds, client IP, and HTTP verb/path.
2. `get_current_user` ([`shared/security.py:22`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/security.py#L22)): Decodes JWT token, queries database for active user existence, and verifies `token_version`.
3. `require_roles` ([`shared/security.py:79`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/security.py#L79)): Compares user's database role against endpoint requirements. Automatically creates an `ACCESS_DENIED` entry in `audit.logs` if forbidden.
4. `@idempotent` ([`shared/idempotency.py:23`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/idempotency.py#L23)): Evaluates idempotency key against Redis before invoking endpoint logic.

---

## 10. Database Design

### 10.1 Engine Rationale
Versiklo uses **PostgreSQL 16**. The shop environment requires relational integrity: sales receipts must link immutably to items and mechanics, stock movements must balance down to the integer unit, and audit logs require database-enforced immutability via procedural triggers.

### 10.2 Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    %% Auth Schema
    auth_users ||--o{ repairs_job_orders : "mechanic assigned"
    auth_users ||--o{ repairs_commissions : "earns commission"
    auth_users ||--o{ audit_logs : "initiates action"

    %% Inventory Schema
    inventory_items ||--o{ inventory_stock_movements : "tracks changes"
    inventory_items ||--o{ repairs_repair_cart_items : "referenced in cart"

    %% Sales Schema
    sales_transactions ||--o{ sales_transaction_items : "contains"
    sales_transactions ||--o{ sales_payments : "settled with"

    %% Repairs Schema
    repairs_job_orders ||--o{ repairs_repair_cart_items : "composed of"
    repairs_job_orders ||--o{ repairs_commissions : "generates"

    %% Schemas definitions
    auth_users {
        uuid id PK
        varchar email UK
        varchar password_hash
        varchar role
        int token_version
        numeric commission_rate
        numeric base_wage
        timestamp created_at
    }

    inventory_items {
        uuid id PK
        varchar sku UK
        varchar name
        varchar brand
        item_type item_type
        int current_stock
        int reorder_level
        numeric cost_price
        numeric selling_price
        bool is_active
    }

    inventory_stock_movements {
        uuid id PK
        uuid item_id FK
        movement_type type
        int quantity_changed
        int new_quantity
        uuid reference_id
        timestamp created_at
    }

    sales_transactions {
        uuid id PK
        varchar invoice_no UK
        uuid customer_id
        varchar cashier_name
        varchar mechanic_name
        uuid job_order_id
        numeric subtotal
        numeric discount_amount
        numeric total
        numeric amount_paid
        transaction_status status
        timestamp created_at
    }

    sales_transaction_items {
        uuid id PK
        uuid transaction_id FK
        varchar item_id
        int qty
        numeric price
    }

    repairs_motorcycles {
        uuid id PK
        varchar plate_number UK
        varchar brand
        varchar model
        int year
        varchar customer_name
        varchar customer_contact
    }

    repairs_job_orders {
        uuid id PK
        varchar jo_number UK
        varchar customer_name
        varchar motorcycle_id
        uuid mechanic_id FK
        numeric labor_charge
        numeric parts_charge
        bool is_paid
        job_status status
        timestamp created_at
    }

    repairs_repair_cart_items {
        uuid id PK
        uuid job_order_id FK
        uuid item_id
        varchar item_name
        varchar item_type
        int qty
        numeric unit_price
        numeric total_price
    }

    repairs_commissions {
        uuid id PK
        uuid job_order_id FK
        uuid mechanic_id FK
        numeric labor_base
        numeric rate_percentage
        numeric amount_earned
        timestamp created_at
    }

    audit_logs {
        uuid id PK
        timestamp timestamp
        uuid user_id FK
        varchar user_role
        varchar action
        varchar resource
        jsonb details
        varchar ip_address
    }
```

### 10.3 Immutability Trigger Protection ([`init.sql:183-218`](file:///d:/POS/motorcycle-shop-management-system/init.sql#L183-L218))
The `audit.logs` table features a PL/pgSQL trigger function that unconditionally raises an exception on any attempt to `DELETE` or `UPDATE` audit log rows:
```sql
CREATE OR REPLACE FUNCTION audit.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Audit log entries are immutable and cannot be deleted.';
    ELSIF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit.logs
FOR EACH ROW EXECUTE FUNCTION audit.prevent_audit_log_modification();
```

---

## 11. Frontend Architecture

### 11.1 Component Hierarchy & Route Map
The frontend application is built on Next.js 16 with React 19, structured around the Shop Floor Mental Model:

```
frontend/src/
├── app/
│   ├── layout.tsx                # Root layout, theme pre-hydration script
│   ├── globals.css               # Tailwind CSS v4 variables & theme overrides
│   ├── login/page.tsx            # Staff authentication entrypoint
│   └── (dashboard)/              # Protected Shop Floor Workspace
│       ├── layout.tsx            # ProtectedRoute wrapper & fluid shell
│       ├── dashboard/page.tsx    # Executive overview & revenue metrics
│       ├── pos/                  # Showroom Counter (POS)
│       │   ├── page.tsx          # Barcode scan, quick services, cart
│       │   └── checkout/page.tsx # Payment method, discount, cash change
│       ├── repairs/
│       │   ├── board/page.tsx    # Workshop Job Cards (Kanban board)
│       │   └── history/page.tsx  # Customer Records & past repair logs
│       ├── inventory/page.tsx    # Parts & Stock management
│       ├── motorcycles/page.tsx  # Bike Registry (master catalog)
│       ├── sales/
│       │   ├── page.tsx          # Invoices & Receipts management
│       │   └── receipt/page.tsx  # Dedicated full-page printable receipt
│       ├── payroll/page.tsx      # Staff payroll & mechanic commissions
│       ├── settings/page.tsx     # Store Preferences, Role Access, My Profile
│       └── audit-logs/page.tsx   # Dedicated immutable change history
├── components/
│   ├── audit/ContextualAuditDrawer.tsx # Slide-over audit inspect drawer
│   ├── auth/ProtectedRoute.tsx         # Route authorization guard & auto-fallback
│   ├── auth/ChangePasswordModal.tsx     # Secure modal for self-credential updates
│   └── layout/Sidebar.tsx              # Collapsible 6-zone navigation bar
├── lib/
│   ├── api-client.ts             # Axios instance, Bearer & Idempotency headers
│   ├── permissions.ts            # RBAC route permissions & friendly names
│   ├── settings.ts               # Local currency & timezone storage
│   └── theme.ts                  # 4 dynamic theme definitions & state
```

### 11.2 State Management
- **`usePosStore` (Zustand)**: Encapsulates active POS cart state, customer linking, parts selections, and reactive price calculations.
- **`ProtectedRoute` (Client Guard)**: Evaluates user credentials and dynamically redirects unauthorized roles to their allowed fallback landing pages with a countdown visual alert.

---

## 12. Frontend ↔ Backend Communication

### 12.1 Low-Level Wire Anatomy

#### Sample Client Request: Checkout Creation
```http
POST /api/v1/sales/transactions HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDRhNzg0LTU3MzRhNDQwMDAwMCIsInJvbGUiOiJjYXNoaWVyIiwiZW1haWwiOiJjYXNoaWVyQG1vdG9zaG9wLmNvbSIsInRva2VuX3ZlcnNpb24iOjEsImV4cCI6MTc1NzE2OTAwMH0...
Content-Type: application/json
Idempotency-Key: b4a1c6e2-9d3f-4e8a-8a12-fc7e42d87e1a
X-Forwarded-For: 192.168.1.105
Accept: application/json

{
  "customer_id": "8fa3c011-4f1b-419b-a37a-8f9218d61001",
  "cashier_name": "Main Cashier",
  "mechanic_name": "Mike Smith",
  "subtotal": 1250.00,
  "discount_percentage": 10.0,
  "discount_amount": 125.00,
  "total": 1125.00,
  "amount_paid": 1125.00,
  "cash_received": 1200.00,
  "cash_change": 75.00,
  "payment_method": "CASH",
  "items": [
    {
      "item_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "qty": 1,
      "price": 450.00
    },
    {
      "item_id": "7ca12f94-8117-4921-a1fb-2c963f66cba2",
      "qty": 1,
      "price": 800.00
    }
  ]
}
```

#### Sample Gateway & Backend Response
```http
HTTP/1.1 200 OK
Content-Type: application/json
X-Correlation-ID: corr-3fa85f64
X-Process-Time-Ms: 14.82
Date: Sat, 05 Sep 2026 14:32:00 GMT

{
  "id": "e6f9a0c1-2f3b-4819-9a2c-9a28b0f61001",
  "invoice_no": "INV-72D9A1BF",
  "customer_id": "8fa3c011-4f1b-419b-a37a-8f9218d61001",
  "cashier_name": "Main Cashier",
  "mechanic_name": "Mike Smith",
  "subtotal": 1250.00,
  "total": 1125.00,
  "amount_paid": 1125.00,
  "status": "PENDING",
  "created_at": "2026-09-05T14:32:00.123456Z"
}
```

### 12.2 Standard Error Response Contract
FastAPI produces structured JSON errors when validation or authorization fails:
```json
{
  "detail": "Access denied: Role 'cashier' is not authorized for this resource"
}
```
Validation errors automatically list parameter violations:
```json
{
  "detail": [
    {
      "loc": ["body", "selling_price"],
      "msg": "Input should be greater than or equal to 0",
      "type": "greater_than_equal"
    }
  ]
}
```

### 12.3 Sequence Diagram 1: Staff Login & Invalidation Token Life
```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff Member
    participant Client as Next.js Web Client
    participant GW as KrakenD (8080)
    participant Auth as Auth Service (8001)
    participant DB as PostgreSQL (auth.users)

    Staff->>Client: Enter Email & Password
    Client->>GW: POST /api/v1/auth/login
    GW->>Auth: POST http://auth_service:8000/login
    Auth->>DB: SELECT * FROM auth.users WHERE email = ?
    DB-->>Auth: User Record (password_hash, token_version=1)
    Note over Auth: bcrypt.checkpw(entered, hash)
    Auth->>DB: INSERT into audit.logs (action='LOGIN_SUCCESS')
    Auth-->>GW: 200 OK {access_token: "JWT(sub=id, role=role, token_version=1)"}
    GW-->>Client: 200 OK
    Client->>Client: Store in localStorage ('auth_token', 'user_role')
    Client->>Staff: Redirect to Role Landing Page
```

### 12.4 Sequence Diagram 2: Authenticated Request & Live Role Invalidation Check
```mermaid
sequenceDiagram
    autonumber
    actor Staff as Staff Member
    participant Client as Next.js Web Client
    participant GW as KrakenD
    participant Service as Inventory Service
    participant Sec as shared/security.py
    participant DB as PostgreSQL (auth.users)

    Staff->>Client: Navigate to /inventory
    Client->>GW: GET /api/v1/inventory/items (Authorization: Bearer <token>)
    GW->>Service: GET http://inventory_service:8000/items
    Service->>Sec: get_current_user(request)
    Note over Sec: jwt.decode(token) -> extracts sub & token_version
    Sec->>DB: SELECT role, token_version FROM auth.users WHERE id = sub
    alt token_version Matches Database
        DB-->>Sec: {role: 'cashier', token_version: 1}
        Sec-->>Service: Validated User Context
        Service-->>GW: 200 OK [Items List]
        GW-->>Client: 200 OK [Items List]
    else Admin Changed Role (token_version Incremented)
        DB-->>Sec: {role: 'manager', token_version: 2}
        Sec-->>Service: Raise HTTP 401: "Session invalidated due to role update"
        Service-->>GW: 401 Unauthorized
        GW-->>Client: 401 Unauthorized
        Client->>Client: Purge localStorage & redirect to /login
    end
```

### 12.5 Sequence Diagram 3: Distributed Saga Execution & Event Delivery
```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier
    participant Sales as Sales Service
    participant DB as PostgreSQL DB
    participant Poller as Outbox Poller Worker
    participant Rabbit as RabbitMQ (pos_events)
    participant Inv as Inventory Service

    Cashier->>Sales: Checkout Order
    activate Sales
    Sales->>DB: INSERT into sales.transactions (status='PENDING')
    Sales->>DB: INSERT into sales.outbox_events (event_type='SaleCreated')
    Sales-->>Cashier: 201 Created (Pending Settlement)
    deactivate Sales

    loop Every 1 Second
        Poller->>DB: SELECT * FROM sales.outbox_events WHERE status='PENDING' FOR UPDATE SKIP LOCKED
        DB-->>Poller: [SaleCreated Event]
        Poller->>Rabbit: Publish SaleCreated to Exchange pos_events
        Poller->>DB: UPDATE sales.outbox_events SET status='PROCESSED'
    end

    Rabbit->>Inv: Deliver SaleCreated Event
    activate Inv
    Note over Inv: Check item stock levels in DB
    alt Sufficient Stock Available
        Inv->>DB: Deduct current_stock & Insert stock_movements
        Inv->>DB: INSERT into inventory.outbox_events (event_type='StockDeducted')
    else Out of Stock
        Inv->>DB: INSERT into inventory.outbox_events (event_type='StockDeductionFailed')
    end
    deactivate Inv

    loop Outbox Worker (Inventory)
        Poller->>Rabbit: Publish StockDeducted or Failed
    end

    Rabbit->>Sales: Deliver Stock Status Event
    activate Sales
    alt StockDeducted Received
        Sales->>DB: UPDATE sales.transactions SET status='COMPLETED'
    else StockDeductionFailed Received
        Sales->>DB: UPDATE sales.transactions SET status='VOIDED' (Compensating Rollback)
    end
    deactivate Sales
```

---

## 13. Security Architecture & Strategy

### 13.1 Threat Model & Trust Boundaries

```mermaid
flowchart TD
    subgraph Untrusted["Untrusted Public Network"]
        Attacker["Potential Threat Actor / Internet"]
        ClientBrowser["Staff Browser / POS Client"]
    end

    subgraph Perimeter["Trust Boundary 1: Edge Perimeter"]
        KGateway["KrakenD Gateway (Port 8080)\nCORS & Reverse Proxy"]
    end

    subgraph PrivateNet["Trust Boundary 2: Internal Microservice Network"]
        AuthSvc["Auth Service (8001/8000)"]
        InvSvc["Inventory Service (8002/8000)"]
        SalesSvc["Sales Service (8003/8000)"]
        RepairSvc["Repairs Service (8004/8000)"]
    end

    subgraph DataCore["Trust Boundary 3: Secure Data Core"]
        PostgresDB[("PostgreSQL 16 Engine\nLogical Schema Barriers")]
        RedisCache[("Redis 7 Cache")]
        RabbitBroker{{"RabbitMQ Message Broker"}}
    end

    ClientBrowser -->|Encrypted HTTPS (Prod) / HTTP (Dev)| KGateway
    Attacker -.->|Port Scanning / Injection| KGateway

    KGateway -->|Internal Plain HTTP| AuthSvc
    KGateway -->|Internal Plain HTTP| InvSvc
    KGateway -->|Internal Plain HTTP| SalesSvc
    KGateway -->|Internal Plain HTTP| RepairSvc

    AuthSvc -->|Direct Asyncpg Socket| PostgresDB
    InvSvc -->|Direct Asyncpg Socket| PostgresDB
    SalesSvc -->|Direct Asyncpg Socket| PostgresDB
    RepairSvc -->|Direct Asyncpg Socket| PostgresDB

    InvSvc <-->|Redis Protocol| RedisCache
    SalesSvc <-->|Redis Protocol| RedisCache
    RepairSvc <-->|Redis Protocol| RedisCache

    SalesSvc <-->|AMQP 0-9-1| RabbitBroker
    InvSvc <-->|AMQP 0-9-1| RabbitBroker
```

#### STRIDE Threat Classification Table

| STRIDE Threat Category | Targeted Component | Existing Mitigation in Versiklo | Residual Risk & Gap Reference |
|---|---|---|---|
| **Spoofing** | Staff Identity & Login | Cryptographic JWT signed with HS256; passwords hashed with `bcrypt.gensalt()` ([`auth_service/main.py:33`](file:///d:/POS/motorcycle-shop-management-system/backend/auth_service/main.py#L33)). | Hardcoded fallback `JWT_SECRET_KEY` in source code. (See GAP-02). |
| **Tampering** | Historical Audit Records | PL/pgSQL database trigger `trg_audit_logs_immutable` raises exception on `UPDATE` or `DELETE` ([`init.sql:215`](file:///d:/POS/motorcycle-shop-management-system/init.sql#L215)). | Database administrator with superuser privileges can drop the trigger. |
| **Repudiation** | Cashier Checkout & Voids | Every financial transaction logs cashier identity, IP address, and timestamp into `sales.transactions` and `audit.logs`. | Audit logs do not currently store cryptographic hash chains. |
| **Information Disclosure** | Authentication Errors | Login failures return a generic `"Incorrect email or password"` error regardless of whether the email exists ([`auth_service/main.py:67`](file:///d:/POS/motorcycle-shop-management-system/backend/auth_service/main.py#L67)). | JWT tokens are stored in browser `localStorage`, making them accessible to XSS. (See GAP-03). |
| **Denial of Service** | API Gateway Endpoints | Gateway timeout caps requests at 3000ms ([`krakend.json:6`](file:///d:/POS/motorcycle-shop-management-system/krakend/krakend.json#L6)). | Rate limiting is not currently configured on KrakenD endpoints. (See GAP-01). |
| **Elevation of Privilege** | Administrative Endpoints | `require_roles(["admin"])` dependency verifies role against live database on every call ([`shared/security.py:79`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/security.py#L79)). | Microservice ports 8001-8004 are mapped directly to host in compose file. (See GAP-04). |

---

### 13.2 Authentication Security
- **Algorithm**: HMAC-SHA256 (`HS256`) via `python-jose` ([`backend/shared/security.py:14`](file:///d:/POS/motorcycle-shop-management-system/backend/shared/security.py#L14)).
- **Password Hashing**: `bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())` ([`backend/auth_service/main.py:33`](file:///d:/POS/motorcycle-shop-management-system/backend/auth_service/main.py#L33)).
- **Token Claims**:
  - `sub`: User UUID string.
  - `role`: Staff role (`admin`, `manager`, `cashier`, `mechanic`).
  - `email`: User login email.
  - `token_version`: Monotonically increasing integer tracking security updates.
  - `exp`: Expiration timestamp (24 hours = 1440 minutes).
- **Token Invalidation on Role Demotion**: In [`backend/auth_service/main.py:359`](file:///d:/POS/motorcycle-shop-management-system/backend/auth_service/main.py#L359), when an administrator alters a user's role, `db_user.token_version += 1` is committed to PostgreSQL. On the very next request, `shared/security.py` detects that the token's `token_version` does not match the database and rejects the token with HTTP 401.

---

### 13.3 Authorization & Access Control (RBAC)

Versiklo strictly enforces **Role-Based Access Control (RBAC)** across four operational tiers:
1. **Admin**: Unrestricted management; manages staff accounts, role matrices, model profiles, and store preferences.
2. **Manager**: Full operational oversight; manages jobs, stock, inventory, and views business reports. Cannot modify user accounts or store configuration.
3. **Cashier**: Point of Sale operation, customer check-in, payment collection, and viewing parts catalog. Forbidden from voiding transactions without management oversight.
4. **Mechanic**: Workshop Job Card bench management, diagnostic notes, repair timer updates, and viewing bike service records. Forbidden from accessing POS cart or store settings.

#### Roles × Permissions Matrix

| Functional Resource / Route | Admin | Manager | Cashier | Mechanic | Backend Enforcement Citation |
|---|:---:|:---:|:---:|:---:|---|
| **View Dashboard & Reports** | ✅ | ✅ | ❌ | ❌ | `require_roles(["admin", "manager"])` |
| **Showroom Counter (POS Sales)** | ✅ | ✅ | ✅ | ❌ | `require_roles(["admin", "manager", "cashier"])` in `sales_service/main.py` |
| **Void Sales Invoice** | ✅ | ✅ | ❌ | ❌ | `require_roles(["admin", "manager"])` in `sales_service/main.py:109` |
| **View Parts & Stock Catalog** | ✅ | ✅ | ✅ | ✅ | `require_roles(["admin", "cashier", "manager"])` in `inventory_service/main.py:120` |
| **Add / Edit / Deactivate Stock** | ✅ | ✅ | ❌ | ❌ | `require_roles(["admin", "manager"])` in `inventory_service/main.py` |
| **Workshop Job Cards (Kanban)** | ✅ | ✅ | ✅ | ✅ | `require_roles(["admin", "manager", "mechanic", "cashier"])` in `repairs_service/main.py` |
| **Bike Registry Management** | ✅ | ✅ | ❌ | ✅ | `require_roles(["admin", "manager", "mechanic"])` in `repairs_service/main.py:92` |
| **Delete / Archive Bike Model** | ✅ | ❌ | ❌ | ❌ | `require_roles(["admin"])` in `repairs_service/main.py:127` |
| **Payroll & Commission Payouts** | ✅ | ✅ | ❌ | ❌ | UI Role Guard (`payroll/page.tsx:280`) & Admin API |
| **Staff & User Management** | ✅ | ❌ | ❌ | ❌ | `require_roles(["admin"])` in `auth_service/main.py:196` |
| **Change Own Password** | ✅ | ✅ | ✅ | ✅ | `get_current_user` in `auth_service/main.py:119` |
| **View Immutable Audit Logs** | ✅ | ❌ | ❌ | ❌ | `require_roles(["admin"])` in `auth_service/main.py:452` |

---

### 13.4 Input Validation & Injection Prevention
- **SQL Injection**: Prevented by parameterized queries in SQLAlchemy 2.0. Dynamic statements use bound parameters (`SELECT ... WHERE id = :user_id`, `{"user_id": user_id}`). Raw string interpolations into SQL queries are strictly prohibited across all services.
- **Data Transfer Object (DTO) Validation**: Every incoming payload is validated against strict Pydantic v2 schemas:
  - String trimming and email validation (`EmailStr`).
  - Strict numeric constraints (`gt=0`, `ge=0`).
  - Enum constraint enforcement (`item_type in ['PRODUCT', 'SERVICE']`).
- **Mass Assignment Protection**: Pydantic schemas explicitly whitelist allowed input attributes. Administrative fields (`token_version`, `id`, `created_at`) are omitted from creation schemas (`UserRegisterRequest`, `UserUpdateRequest`), preventing clients from injecting privileged state flags.

---

### 13.5 Web & API Layer Security

#### Security Headers
- In production, security headers must be injected at the reverse proxy (KrakenD / Nginx).
- Current headers configured in KrakenD:
  - `Content-Type: application/json`
  - `X-Correlation-ID` tracing header.

#### Cross-Origin Resource Sharing (CORS) Configuration
Located in [`krakend/krakend.json:17-21`](file:///d:/POS/motorcycle-shop-management-system/krakend/krakend.json#L17-L21):
```json
"security/cors": {
  "allow_origins": ["*"],
  "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  "allow_headers": ["Origin", "Authorization", "Content-Type", "Idempotency-Key"]
}
```
> ⚠️ **Security Audit Finding**: KrakenD currently specifies `"allow_origins": ["*"]`. In production, this must be restricted to the verified frontend domain (e.g. `https://shop.versiklo.com`). Documented as GAP-05.

---

### 13.6 Data Security & Privacy (PII)

| Data Entity | Classification | Storage Location | In-Transit Encryption | At-Rest Encryption | Access Restriction |
|---|---|---|---|---|---|
| **User Passwords** | Highly Confidential | `auth.users.password_hash` | TLS / HTTPS (in prod) | One-way salted Bcrypt hash | Inaccessible to all users including Admins |
| **Customer Name & Phone** | PII | `repairs.motorcycles`, `sales.transactions` | TLS / HTTPS (in prod) | Database Volume Encryption | Authenticated Staff only |
| **Mechanic Earnings & Rates** | Confidential | `auth.users.commission_rate`, `repairs.commissions` | TLS / HTTPS (in prod) | Database Volume Encryption | Admin, Manager, Assigned Mechanic |
| **Audit Logs** | Internal / Compliance | `audit.logs` | TLS / HTTPS (in prod) | Database Volume Encryption | Admin Only (Immutable Trigger) |

---

### 13.7 Secrets Management

| Secret Variable Name | Consuming Services | Default Value in Repo | Production Risk & Blast Radius |
|---|---|---|---|
| `JWT_SECRET_KEY` | `auth_service`, `shared/security.py` | `"your-super-secret-key-for-local-dev"` | **High**: Attacker can forge arbitrary admin JWTs if unchanged in production. |
| `POSTGRES_PASSWORD` | `db`, all microservices | `"123"` | **Critical**: Database takeover if PostgreSQL port 5432 is exposed. |
| `RABBITMQ_DEFAULT_PASS` | `rabbitmq`, all microservices | `"guest"` | **Medium**: Unauthorized queue snooping or event injection. |

---

### 13.8 Frontend Security
- **Token Storage**: Tokens are currently stored in browser `localStorage.getItem("auth_token")` ([`frontend/src/lib/api-client.ts:16`](file:///d:/POS/motorcycle-shop-management-system/frontend/src/lib/api-client.ts#L16)).
  - *Tradeoff Analysis*: `localStorage` allows instant client-side retrieval and zero-config SSR compatibility in local environments, but exposes the token to Cross-Site Scripting (XSS) if malicious scripts execute. In high-security production deployments, tokens should be transitioned to HttpOnly, Secure SameSite cookies.
- **Client-Side Route Guards**: `ProtectedRoute.tsx` prevents navigation to unauthorized sections. However, client-side guards are strictly UX affordances; every backend API request independently validates the JWT and verifies live DB role permissions.

---

### 13.9 Container & Infrastructure Security
- **Docker Network Isolation**: All services reside on the default Docker bridge network.
- **Port Exposure Reality**: In [`docker-compose.yml`](file:///d:/POS/motorcycle-shop-management-system/docker-compose.yml), microservice ports (`8001`, `8002`, `8003`, `8004`), PostgreSQL (`5432`), and RabbitMQ (`5672`, `15672`) are published to the host for local development. In production, only KrakenD (`8080`) and the Next.js frontend (`3000`) should publish ports.

---

### 13.10 Audit Logging & Security Monitoring

The `audit.logs` table acts as the cryptographic source of truth for all operational events:

| Event Name | Trigger Condition | Captured Fields | Logged Location |
|---|---|---|---|
| **`LOGIN_SUCCESS`** | Valid credentials supplied | User ID, Role, Email, IP Address | `audit.logs` |
| **`LOGIN_FAILURE`** | Invalid email or password | Attempted Email, Reason, IP Address | `audit.logs` |
| **`ACCESS_DENIED`** | Unauthorized role attempted route | User ID, Role, Required Roles, Path, Method, IP | `audit.logs` |
| **`CREATE_USER`** | Admin provisions new staff user | Created User ID, Email, Assigned Role, IP | `audit.logs` |
| **`CHANGE_ROLE`** | Admin changes staff role | Target User ID, Old Role, New Role, IP | `audit.logs` |
| **`DELETE_USER`** | Admin deletes staff user | Target User ID, Deleted Email, Role, IP | `audit.logs` |
| **`PASSWORD_CHANGED`** | User updates own password | User ID, Role, Email, IP | `audit.logs` |
| **`MOTORCYCLE_MODEL_*`** | Model profile created/updated/deleted | Model ID, Brand, Model Name, Soft Delete Flag | `audit.logs` |

---

### 13.11 Supply Chain & Dependency Security
- **Lockfile Enforcement**: Frontend dependencies are locked via `package-lock.json`.
- **Python Dependencies**: Pinned with exact versions in `backend/requirements.txt` (`fastapi==0.111.0`, `pydantic==2.7.4`, `SQLAlchemy==2.0.31`).

---

### 13.12 Security Configuration Reference

| Environment Variable | Purpose | Default Value in Local Dev | Recommended Production Setting |
|---|---|---|---|
| `JWT_SECRET_KEY` | HMAC-SHA256 signature key | `your-super-secret-key-for-local-dev` | 64-char random hex string from Secret Manager |
| `DATABASE_URL` | Async PostgreSQL connection | `postgresql+asyncpg://postgres:123@db:5432/motorcycle_shop` | Managed Cloud SQL / Aurora connection with TLS |
| `REDIS_URL` | Redis cache & idempotency | `redis://redis:6379` | Managed Redis cluster with password auth |
| `RABBITMQ_URL` | AMQP broker connection | `amqp://guest:guest@rabbitmq:5672/` | Dedicated RabbitMQ user with vhost permissions |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access Token Lifetime | `1440` (24 hours) | `60` (1 hour) with refresh rotation |

---

### 13.13 Security Gaps & Prioritized Recommendations

| Gap ID | Severity | Description | Attack Vector / Impact | Concrete Remediation |
|---|:---:|---|---|---|
| **GAP-01** | **High** | Absence of rate limiting on API gateway | Attacker can launch brute-force password guessing against `/api/v1/auth/login` or overwhelm database queries. | Enable KrakenD `krakend-ratelimit` middleware capping `/login` at 5 req/min per IP. |
| **GAP-02** | **Critical** | Hardcoded default `JWT_SECRET_KEY` in source | If deployed without overriding `JWT_SECRET_KEY`, any attacker can forge arbitrary admin tokens and gain full system access. | Enforce startup failure in `security.py` if `JWT_SECRET_KEY` matches default when `ENVIRONMENT=production`. |
| **GAP-03** | **Medium** | Auth token stored in browser `localStorage` | If an XSS vulnerability exists on the frontend, an attacker can extract tokens and hijack sessions. | Migrate authentication tokens to `HttpOnly`, `Secure`, `SameSite=Strict` cookies. |
| **GAP-04** | **High** | Internal database & microservice ports exposed | Compose file maps ports `5432`, `6379`, and `8001-8004` to host interfaces (`0.0.0.0`). | Remove host port mappings for internal services; expose only KrakenD (`8080`) and Web (`3000`). |
| **GAP-05** | **Medium** | Wildcard CORS origin (`allow_origins: ["*"]`) | Malicious third-party websites visited by staff could make cross-origin requests through the gateway. | Configure explicit domain whitelist in `krakend.json` matching the production shop domain. |

---

## 14. UI/UX Design System

Versiklo adheres to modern dark-mode aesthetic standards inspired by Linear, Stripe, and Vercel:

- **Color Palette & Dynamic CSS Engine**: Tailored around high-contrast deep backgrounds (`bg-zinc-950`), semi-transparent surface cards (`bg-zinc-900/60`), and 4 runtime switchable accent themes:
  1. **Cyan Drift** (`cyan`): Electric Cyan (`#06b6d4`), Velocity Blue (`#3b82f6`).
  2. **Emerald Speed** (`emerald`): Neon Emerald (`#10b981`), Mint Teal (`#14b8a6`).
  3. **Violet Hyperdrive** (`violet`): Hyper Purple (`#a855f7`), Electric Indigo (`#6366f1`).
  4. **Amber Forge** (`amber`): Sunset Gold (`#f59e0b`), Warm Amber (`#f97316`).
- **Glassmorphism & Micro-animations**: Surfaces use `backdrop-blur-xl`, hairline borders (`border-white/10`), and interactive state transitions (`transition-all hover:scale-[1.02]`).
- **Universal Fluid Layout**: Pages expand fluidly across widescreen monitors (`w-full min-h-screen bg-zinc-950 p-8`), avoiding artificial container constraints on dense data tables.

---

## 15. Full Operational Workflow

```mermaid
flowchart TD
    CustomerArrival["Customer Brings Bike to Shop Floor"] --> JobCheckin["Service Manager creates Job Card (/repairs/board)\nStatus: NEW (PENDING)"]
    JobCheckin --> MechanicsWork["Mechanic picks up card, diagnoses bike\nStatus: IN PROGRESS (ONGOING)"]
    MechanicsWork --> PartsDeduction["Mechanic attaches parts & labor to Job Card\nCart synced in repairs.repair_cart_items"]
    PartsDeduction --> JobComplete["Mechanic completes repair on bench\nStatus: COMPLETED (Unbilled)"]
    JobComplete --> ShowroomCheckout["Customer visits Showroom Counter (/pos)\nCashier links Job Card to Cart"]
    ShowroomCheckout --> PaymentCapture["Cashier records payment (/pos/checkout)\nStatus transitions to RELEASED & is_paid=true"]
    PaymentCapture --> SagaExecution["Transactional Outbox triggers RabbitMQ\nInventory deducts stock; Sales completes invoice"]
    SagaExecution --> ReceiptPrint["Cashier prints Sales Receipt (/sales/receipt?id=...)\nCustomer departs with repaired bike"]
```

---

## 16. User Journeys

### 16.1 Journey 1: Customer Repair Check-in to Workshop Completion

```mermaid
flowchart LR
    Start([Customer Arrival]) --> SearchBike[Search Bike in Registry]
    SearchBike --> CreateJob[Create New Job Card]
    CreateJob --> AssignTech[Assign Lead Mechanic]
    AssignTech --> BenchRepair[Mechanic Repairs Bike]
    BenchRepair --> AddItems[Add Parts & Labor to Card]
    AddItems --> MarkDone[Drop Card into Completed]
    MarkDone --> ReadyPOS([Ready for Counter Payment])
```

#### Step-by-Step System Trace

| Step # | User Action | UI Screen Shown | Behind-the-Scenes Execution | Security Check | Data Mutated |
|---|---|---|---|---|---|
| **1** | Enter customer name & plate # | Bike Registry (`/motorcycles`) | `GET /api/v1/repairs/motorcycles?search=...` | `require_roles(["admin", "manager", "mechanic"])` | None (read-only) |
| **2** | Click "+ Add Bike Model" (if new) | Add Bike Model Modal | `POST /api/v1/repairs/motorcycle-models` | `require_roles(["admin", "manager", "mechanic"])` | `repairs.motorcycle_models` |
| **3** | Click "New Job Card" | Workshop Job Cards (`/repairs/board`) | `POST /api/v1/repairs/jobs` (Idempotency Key) | `require_roles(["admin", "manager", "mechanic", "cashier"])` | `repairs.job_orders` (Status: `PENDING`) |
| **4** | Drag card to "In Progress" | Kanban Board Column Drop | `PATCH /api/v1/repairs/jobs/{id}/status` | Validates JWT & Mechanic Role | `repairs.job_orders` (Status: `ONGOING`) |
| **5** | Add brake pads & oil to card | Job Card Detail Drawer | `POST /api/v1/repairs/jobs/{id}/cart-items` | Validates Job Order Existence | `repairs.repair_cart_items` |
| **6** | Drag card to "Completed" | Kanban Board Column Drop | `PATCH /api/v1/repairs/jobs/{id}/status` | Enforces `is_paid=false` isolation | `repairs.job_orders` (Status: `COMPLETED`) |

---

### 16.2 Journey 2: Showroom Counter Checkout & Inventory Deduction

```mermaid
flowchart LR
    StartPOS([Open Showroom Counter]) --> SelectCust[Select Active Customer / Job]
    SelectCust --> ReviewCart[Review Order & Apply Discount]
    ReviewCart --> PaymentScreen[Go to Payment Screen]
    PaymentScreen --> TenderCash[Enter Cash Received & Change]
    TenderCash --> CommitSale[Click Record Payment]
    CommitSale --> PrintSlip([Print Sales Receipt])
```

#### Step-by-Step System Trace

| Step # | User Action | UI Screen Shown | Behind-the-Scenes Execution | Security Check | Data Mutated |
|---|---|---|---|---|---|
| **1** | Click on customer job in counter list | Showroom Counter (`/pos`) | `GET /api/v1/repairs/jobs/active-carts` | `require_roles(["admin", "cashier", "manager"])` | POS Cart locked until customer selected |
| **2** | Review items & labor total | Counter Order View | `usePosStore.getState().items` | Client-side reactive total calculation | None |
| **3** | Click "Go to Payment" | POS Checkout (`/pos/checkout`) | Router navigates to `/pos/checkout` | Customer selection guard verified | None |
| **4** | Enter cash tender amount | Payment Method Form | Computes change in client state | Form validation (`cash_received >= total`) | None |
| **5** | Click "Record Payment" | Processing Button Spinner | `POST /api/v1/sales/transactions` | Idempotency Key verified in Redis | `sales.transactions`, `sales.outbox_events` |
| **6** | Auto-redirect to Receipt | Sales Receipt (`/sales/receipt`) | `GET /api/v1/sales/transactions/{id}` | Verified Token & Transaction Ownership | Store cart purged safely after snapshot |

---

## 17. Docker & Container Service Management

### 17.1 Container Inventory

| Container Name | Base Image | Dockerfile Context | Host Port | Network | Health Check Command |
|---|---|---|---|---|---|
| **`motorcycle-shop-db`** | `postgres:16-alpine` | Pre-built image | `5432:5432` | `motorcycle_shop_default` | `pg_isready -U postgres -d motorcycle_shop` |
| **`motorcycle-shop-redis`** | `redis:7-alpine` | Pre-built image | `6379:6379` | `motorcycle_shop_default` | `redis-cli ping` |
| **`motorcycle-shop-rabbitmq`** | `rabbitmq:3-management-alpine` | Pre-built image | `5672, 15672` | `motorcycle_shop_default` | `rabbitmq-diagnostics ping` |
| **`motorcycle-shop-krakend`** | `devopsfaith/krakend:2.6` | Pre-built image | `8080:8080` | `motorcycle_shop_default` | Gateway internal socket ping |
| **`motorcycle-shop-auth`** | `python:3.11-slim` | `./backend/auth_service/Dockerfile` | `8001:8000` | `motorcycle_shop_default` | Uvicorn ASGI port listener |
| **`motorcycle-shop-inventory`** | `python:3.11-slim` | `./backend/inventory_service/Dockerfile` | `8002:8000` | `motorcycle_shop_default` | Uvicorn ASGI port listener |
| **`motorcycle-shop-sales`** | `python:3.11-slim` | `./backend/sales_service/Dockerfile` | `8003:8000` | `motorcycle_shop_default` | Uvicorn ASGI port listener |
| **`motorcycle-shop-repairs`** | `python:3.11-slim` | `./backend/repairs_service/Dockerfile` | `8004:8000` | `motorcycle_shop_default` | Uvicorn ASGI port listener |

### 17.2 Everyday Operational Commands

#### Start the Full Stack
```bash
# Start all infrastructure and microservices in detached mode
docker compose up -d

# Verify all containers report 'healthy' or 'running'
docker compose ps
```

#### Tail Live Logs with Timestamps
```bash
# Tail all services simultaneously
docker compose logs -f -t

# Tail a specific service (e.g. sales service)
docker compose logs -f -t sales_service
```

#### Rebuilding a Single Service After Code Modifications
```bash
# Rebuild and recreate only the repairs service without restarting PostgreSQL
docker compose up -d --build --no-deps repairs_service
```

#### Executing Commands Inside Running Containers
```bash
# Open interactive PostgreSQL shell inside DB container
docker compose exec db psql -U postgres -d motorcycle_shop

# Inspect Redis idempotency keys
docker compose exec redis redis-cli keys "idemp:*"

# Check RabbitMQ queues
docker compose exec rabbitmq rabbitmqctl list_queues
```

---

## 18. Common Operational Scenarios & Incident Runbook

### 18.1 Scenario: Microservice Crash-Looping
- **Symptom**: KrakenD returns `502 Bad Gateway` or `500 Internal Server Error`; `docker compose ps` shows `auth_service` in `Restarting (1)`.
- **Diagnosis**:
  ```bash
  docker compose logs --tail=100 auth_service
  ```
- **Likely Cause**: Database connection refused or missing environment variable in container.
- **Resolution**:
  ```bash
  # Check database health
  docker compose exec db pg_isready -U postgres -d motorcycle_shop
  
  # Restart service with fresh environment variables
  docker compose restart auth_service
  ```

---

### 18.2 Scenario: Duplicate Submissions / Idempotency Cache Lock
- **Symptom**: User receives cached old response when trying to submit a new transaction.
- **Diagnosis**: Client is reusing an identical `Idempotency-Key` header across distinct requests.
- **Resolution**:
  ```bash
  # Search for the offending key in Redis
  docker compose exec redis redis-cli keys "idemp:*"
  
  # Purge the specific stale idempotency key
  docker compose exec redis redis-cli del "idemp:<OFFENDING-UUID>"
  ```
- **Prevention**: Ensure `frontend/src/lib/api-client.ts` generates a fresh `uuidv4()` for each distinct mutation.

---

### 18.3 Scenario: Secret Leak Incident Response (JWT Signing Key Leaked)
- **Symptom**: `JWT_SECRET_KEY` was accidentally committed to source control or exposed in logs.
- **Immediate Containment**:
  1. Generate a new cryptographically secure 64-character secret key:
     ```bash
     openssl rand -hex 32
     ```
  2. Update `JWT_SECRET_KEY` in production environment / secret manager.
  3. Increment `token_version` for all users in the database to instantly invalidate all previously issued tokens:
     ```bash
     docker compose exec db psql -U postgres -d motorcycle_shop -c "UPDATE auth.users SET token_version = token_version + 1;"
     ```
  4. Restart all microservices:
     ```bash
     docker compose restart auth_service inventory_service sales_service repairs_service
     ```
  5. All staff will be automatically redirected to `/login` to authenticate against the new secret key.

---

### 18.4 On-Call Quick Reference Table

| Alert / Symptom | First Check | Likely Root Cause | Immediate Fast Mitigation |
|---|---|---|---|
| **502 Bad Gateway across all routes** | `docker compose ps krakend` | KrakenD container down or port 8080 conflict | `docker compose restart krakend` |
| **Sales succeed but stock doesn't deduct** | `docker compose logs -f inventory_service` | RabbitMQ broker connection lost or Saga queue consumer stalled | `docker compose restart rabbitmq inventory_service` |
| **401 Unauthorized for all users** | Inspect `JWT_SECRET_KEY` across services | Mismatch between Auth Service signing key and Security validation key | Ensure all microservices share identical `JWT_SECRET_KEY` |
| **Disk space critical on host** | `docker system df` | Large accumulated Docker build cache or growing DB container logs | `docker system prune -f --volumes` (Careful: backup DB volume first) |

---

## 19. Developer Onboarding Guide

### 19.1 Prerequisites
- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v10.x` or higher (`npm -v`)
- **Python**: `3.11.x` (`python --version`)
- **Docker Engine & Docker Compose**: Compose v2 (`docker compose version`)
- **Git**: (`git --version`)

### 19.2 Step-by-Step Local Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/versiklo/motorcycle-shop-management-system.git
   cd motorcycle-shop-management-system
   ```

2. **Launch Infrastructure Containers**:
   ```bash
   # Starts Postgres, Redis, RabbitMQ, KrakenD, and microservices
   docker compose up -d
   ```

3. **Verify Service Health**:
   ```bash
   docker compose ps
   # Ensure db, redis, rabbitmq, and krakend are all 'healthy' or 'running'
   ```

4. **Seed Initial Shop Staff & Demo Data**:
   ```bash
   # Seed default staff roles (Admin, Manager, Cashier, Mechanic)
   curl -X POST http://localhost:8080/api/v1/auth/seed-admin
   
   # Or directly seed full operational catalog from root script
   docker compose exec -T db psql -U postgres -d motorcycle_shop < backend/seed_operational_data.sql
   ```

5. **Start the Frontend Development Server**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. **Access the Application**:
   - Web Application: `http://localhost:3000`
   - API Gateway: `http://localhost:8080`
   - RabbitMQ Management Console: `http://localhost:15672` (User: `guest` / Pass: `guest`)

7. **Default Seed Credentials**:
   - **Admin**: `admin@motoshop.com` / `admin123`
   - **Manager**: `manager@motoshop.com` / `manager123`
   - **Cashier**: `cashier@motoshop.com` / `cashier123`
   - **Mechanic**: `mechanic@motoshop.com` / `mechanic123`
   > ⚠️ **Warning**: Never use default seed credentials in any publicly accessible environment.

---

## 20. End-User Onboarding Guide

### 20.1 Getting Started on the Shop Floor
1. **Signing In**: Navigate to `http://localhost:3000/login`. Enter your assigned staff email and password.
2. **Your Dedicated Workspace**:
   - **Cashiers**: Automatically land at the **Showroom Counter** (`/pos`) ready to scan parts and bill walk-in customers.
   - **Mechanics**: Automatically land at **Workshop Job Cards** (`/repairs/board`) displaying active bench bikes.
   - **Managers & Owners**: Land at **Shop Reports** (`/reports`) and **Dashboard** (`/dashboard`).

### 20.2 Feature-by-Feature Guide in Shop Language
- **Workshop Job Cards (`/repairs/board`)**:
  - Click **New Job Card** when a customer brings in a motorcycle.
  - Fill in the bike model, plate number, customer name, and problem diagnosis.
  - Move the card along the bench columns as work progresses: *New* → *In Progress* → *Completed*.
- **Showroom Counter (`/pos`)**:
  - Select the customer's active repair or start a walk-in counter sale.
  - Select parts and service labor from the catalog.
  - Click **Go to Payment**, input cash received, and click **Record Payment**.
  - Click **Print Receipt** to give the customer their official printed copy.
- **Parts & Stock (`/inventory`)**:
  - Keep track of parts on hand, reorder warnings, and counter pricing.
  - Click **+ New Part** to register newly delivered parts.
- **Bike Registry (`/motorcycles`)**:
  - Master catalog of motorcycle makes, models, and service maintenance frequencies.

---

## 21. Appendices

### 21.1 Complete API Endpoint Reference

| Method | Gateway Endpoint (`/api/v1/...`) | Internal Service & Port | Description | Required Role | Idempotent |
|---|---|---|---|---|:---:|
| `POST` | `/auth/login` | `auth_service:8000` | Authenticate staff member & return JWT | Public | ❌ |
| `POST` | `/auth/logout` | `auth_service:8000` | Log out and log audit event | Any Authenticated | ❌ |
| `POST` | `/auth/change-password` | `auth_service:8000` | Update user password | Any Authenticated | ❌ |
| `GET` | `/auth/users` | `auth_service:8000` | List staff members with role filter | `admin`, `manager`, `cashier` | ❌ |
| `POST` | `/auth/users/register` | `auth_service:8000` | Provision new staff account | `admin` | ❌ |
| `PUT` | `/auth/users/{id}` | `auth_service:8000` | Update staff details, role, or wage | `admin` | ❌ |
| `DELETE`| `/auth/users/{id}` | `auth_service:8000` | Remove staff user account | `admin` | ❌ |
| `GET` | `/audit-logs` | `auth_service:8000` | Query immutable audit log records | `admin` | ❌ |
| `GET` | `/audit-logs/export` | `auth_service:8000` | Stream audit logs as CSV file | `admin` | ❌ |
| `GET` | `/inventory/items` | `inventory_service:8000` | List active parts & repair services | `admin`, `cashier`, `manager` | ❌ |
| `POST` | `/inventory/items` | `inventory_service:8000` | Register new part or service item | `admin`, `manager` | ✅ |
| `PUT` | `/inventory/items/{id}` | `inventory_service:8000` | Update item price or stock levels | `admin`, `manager` | ✅ |
| `DELETE`| `/inventory/items/{id}` | `inventory_service:8000` | Soft-delete inventory item | `admin`, `manager` | ✅ |
| `GET` | `/sales/transactions` | `sales_service:8000` | List sales invoices & checkout history | `admin`, `cashier`, `manager` | ❌ |
| `POST` | `/sales/transactions` | `sales_service:8000` | Execute checkout & trigger Saga outbox | `admin`, `cashier`, `manager` | ✅ |
| `GET` | `/sales/transactions/{id}` | `sales_service:8000` | Get single invoice receipt details | `admin`, `cashier`, `manager` | ❌ |
| `POST` | `/sales/transactions/{id}/void` | `sales_service:8000` | Void invoice & trigger rollback | `admin`, `manager` | ✅ |
| `GET` | `/repairs/jobs` | `repairs_service:8000` | List Workshop Job Cards | `admin`, `manager`, `mechanic`, `cashier` | ❌ |
| `POST` | `/repairs/jobs` | `repairs_service:8000` | Create new Workshop Job Card | `admin`, `manager`, `mechanic`, `cashier` | ✅ |
| `PATCH`| `/repairs/jobs/{id}/status` | `repairs_service:8000` | Update Kanban status of repair job | `admin`, `manager`, `mechanic` | ✅ |
| `GET` | `/repairs/jobs/active-carts` | `repairs_service:8000` | Query active repair carts for POS | `admin`, `cashier`, `manager`, `mechanic` | ❌ |
| `GET` | `/repairs/motorcycle-models` | `repairs_service:8000` | List Bike Registry catalog | `admin`, `manager`, `mechanic`, `cashier` | ❌ |
| `POST` | `/repairs/motorcycle-models` | `repairs_service:8000` | Add new model profile to registry | `admin`, `manager`, `mechanic` | ✅ |
| `PUT` | `/repairs/motorcycle-models/{id}` | `repairs_service:8000`| Modify bike specifications | `admin` | ✅ |
| `DELETE`| `/repairs/motorcycle-models/{id}`| `repairs_service:8000`| Soft-delete bike model profile | `admin` | ✅ |

### 21.2 Domain Glossary
- **Job Card**: The physical or digital record tracking a customer motorcycle on the workshop bench through diagnosis, repair, parts addition, completion, and payment.
- **Part**: A tangible physical inventory product (e.g. spark plug, brake pad, engine oil) with a SKU, stock count, and cost/selling price.
- **Service**: A labor-based shop operation (e.g. oil change labor, carburetor tuning) billed by mechanics without physical stock decrements.
- **Showroom Counter**: The primary retail POS area where cashiers ring up walk-in sales, select finished repair jobs, and collect customer payments.
- **Bike Registry**: The master catalog of motorcycle makes, models, model years, and categories used to recommend service intervals and track repairs.
- **Transactional Outbox**: An enterprise design pattern where microservice events are stored in a dedicated database table within the same ACID transaction as the business entity, ensuring guaranteed at-least-once message delivery to RabbitMQ.
