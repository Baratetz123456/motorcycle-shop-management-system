# MotoShop Architecture & System Rules

When generating code, analyzing bugs, or extending this project, you MUST adhere to these architectural rules.

## 1. Modular Monolith & Bounded Contexts
- The backend is structured as a **FastAPI Modular Monolith** located in `backend/app/`.
- Domain logic is isolated into clean modules: `auth`, `inventory`, `sales`, `repairs`, and `audit`.
- **Database Schema Isolation**: Each module maps strictly to its designated PostgreSQL schema (`auth`, `inventory`, `sales`, `repairs`, `audit`).
- **No Cross-Schema Foreign Keys**: Foreign keys across different schemas are prohibited (e.g., `sales.transactions` cannot have a foreign key to `inventory.items`). Cross-module references are stored as `UUID` identifiers and validated in application services.

## 2. In-Process ACID Transactions & Outbox Pattern
- Operations spanning multiple domains (such as POS checkout mutating sales transactions, line items, and stock inventory) execute as atomic, in-process database transactions via SQLAlchemy `AsyncSession` (`async with session.begin():`).
- **Transactional Outbox**: Audit and event records are written to schema-scoped `outbox_events` tables within the same database transaction that alters state, ensuring guaranteed delivery without distributed lock overhead.

## 3. Idempotency Invariant
- All state-altering endpoints (`POST`, `PUT`, `PATCH`) MUST apply the `@idempotent` decorator provided in `app.core.idempotency`.
- Clients (frontend) provide an `Idempotency-Key` UUID header.
- Cached results are stored in the `auth.idempotency_keys` table to prevent duplicate execution on network retry.

## 4. Unified Routing & Cookie Preservation
- All API routes are hosted under the prefix `/api/v1/*`.
- **Local Dev**: Serves directly on `http://localhost:8000/api/v1/*`.
- **Production**: Served via AWS CloudFront same-origin path pattern `/api/*` routed to an AWS Lambda function running `Mangum(app, lifespan="off")`.
- **CORS Credentials Configuration**:
  - `allow_credentials=True` requires explicit origins (e.g., `http://localhost:3000`, `http://127.0.0.1:3000`). Wildcard origins (`*`) are prohibited.
  - `expose_headers` includes `["Set-Cookie"]` and `allow_headers` includes `["Cookie", "Authorization", "Content-Type", "Idempotency-Key"]`.
- **Session Cookie Lifecycle**: Refresh tokens are stored strictly in HttpOnly session cookies without `Max-Age` or `Expires`, automatically expiring upon browser close.

## 5. Database Schema & ORM Datatype Parity
- SQLAlchemy model column types must strictly mirror PostgreSQL schema types in `init.sql`:
  - PostgreSQL `BOOLEAN` must use SQLAlchemy `Boolean(default=False)`. Never map to `String`.
  - Custom schema-scoped Enums (e.g. `repairs.job_status`) must be defined as `Enum(JobStatus, name="job_status", schema="repairs", inherit_schema=True)`.
  - When writing raw SQL queries or foreign key validation queries, always import `text` from `sqlalchemy` (`from sqlalchemy import text`).

## 6. Cloud Deployment: Zero-Cost Serverless & Dual-Parity Standard
- **Dual-Parity Operating Model**:
  - **Local Development**: Powered by a streamlined 2-container Docker Compose stack (`motoshop-db` on port 5432 and `motoshop-backend` on port 8000 with live reload) paired with Next.js on port 3000.
  - **Production Deployment**: 100% Static SPA on Amazon S3 + AWS CloudFront paired with AWS Lambda (FastAPI via Mangum) and AWS RDS PostgreSQL (`db.t4g.micro`, 20GB gp3 storage) within a private VPC at $0.00/month base cost under the AWS Free Tier.
- **Infrastructure as Code**: Cloud resources are managed strictly through `template.yaml` (AWS SAM). Never create ad-hoc AWS resources without recording them in the SAM template.

## 7. Resilient Identifier Typing & Data Snapshotting
- Route parameters for entity lookups must use `str` (not strict `UUID`), safely querying UUID, invoice/JO number, or string-cast ID to eliminate 422 Unprocessable Entity errors on slug or code lookups.
- On multi-step client workflows (e.g. POS checkout), always snapshot transaction state before invoking `clearCart()` to preserve receipt summaries.
