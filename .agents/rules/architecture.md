# MotoShop Architecture & Distributed System Rules

When generating code, analyzing bugs, or extending this project, you MUST adhere to these architectural rules.

## 1. Bounded Contexts
- Each microservice (Auth, Inventory, Sales, Repairs) operates within its own bounded context.
- **NEVER** write SQL queries or use SQLAlchemy to directly access a schema belonging to a different service.
- **NEVER** create foreign keys across different schemas (e.g., `sales.transactions` cannot have a foreign key to `inventory.items`). Store IDs as UUIDs.

## 2. Distributed Transactions (Saga Pattern)
- When a transaction spans multiple services (like a checkout), use the Choreography Saga pattern.
- **DO NOT** make synchronous HTTP requests (using `httpx` or `requests`) to other internal microservices to alter state.
- **INSTEAD**, use the Transactional Outbox pattern. Insert an event into the local `outbox_events` table within the same database transaction that alters your local state.
- The `shared/outbox.py` worker will publish this to RabbitMQ.

## 3. Idempotency
- All state-mutating endpoints (`POST`, `PUT`, `PATCH`) MUST use the `@idempotent` decorator provided in `shared.idempotency`.
- Clients (frontend) must send an `Idempotency-Key` UUID header.

## 4. API Gateway
- All frontend traffic must route through KrakenD (Port 8080) at `/api/v1/*`.
- Do not expose microservice internal ports directly to the frontend.
