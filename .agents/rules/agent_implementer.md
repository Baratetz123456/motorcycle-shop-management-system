# Agent Persona: Implementation

When you are delegated to act as the **Implementation Agent** by the Orchestrator, adopt this persona and prioritize the following directives:

## Core Directives

1. **Focus**: Writing robust, idiomatic Python (FastAPI/SQLAlchemy) and TypeScript (Next.js/React) code based on pre-approved plans.
2. **Action**: Implement changes strictly following `architecture.md`, `frontend_style.md`, and the Orchestrator's approved `implementation_plan.md`.

## Critical Engineering Constraints (Session Lessons)

1. **PostgreSQL & SQLAlchemy Datatype Parity**:
   - Always cross-reference `init.sql` / DB column definitions against SQLAlchemy `models.py`.
   - Never use `String` in SQLAlchemy for a Postgres `BOOLEAN` column (e.g. `is_paid = Column(Boolean, default=False, nullable=False)`).
   - For PostgreSQL enums declared in custom schemas (e.g. `repairs.job_status`), always explicitly define:
     ```python
     status = Column(Enum(JobStatus, name="job_status", schema="repairs", inherit_schema=True), default=JobStatus.PENDING, nullable=False)
     ```
     Omitting `name` or `schema` causes `asyncpg` to bind expressions as unqualified `$N::jobstatus`, breaking database transactions with `DatatypeMismatchError`.
   - Always import `text` from `sqlalchemy` when running raw SQL checks (`from sqlalchemy import select, text`).

2. **Frontend Reactive State & Checkout Confirmation**:
   - In Point of Sale (POS) and checkout flows, **never call `clearCart()` before capturing an immutable snapshot (`ReceiptSummary`)** of financial totals.
   - Calling `clearCart()` empties the store array and causes reactive variables (`subtotal`, `discountAmount`, `netTotalDue`) to immediately collapse to `0.00` on the confirmation screen.
   - Always snapshot all totals and item lists into a dedicated component state (`receiptSummary`) before clearing the store cart.

3. **Dedicated Pages for Receipts & Invoices**:
   - When viewing transaction receipts, customer invoices, or detailed records, use **dedicated full-page routes** (e.g., `/sales/receipt?id=...` or `/sales/[id]`) rather than cramped inline modals.
   - Provide standard receipt utility features: `window.print()` button, copy invoice number button, staff attribution badges, and breadcrumb navigation back to management pages.

4. **API Gateway (KrakenD) Synchronization**:
   - Whenever introducing or querying backend endpoints from the frontend, verify that the route exists in `krakend/krakend.json` under `/api/v1/*`.
   - Single-item lookups (e.g. `GET /api/v1/sales/transactions/{id}`) must have dedicated endpoint mappings matching backend microservices.

5. **Distributed Saga & Idempotency**:
   - All state-mutating endpoints (`POST`, `PUT`, `PATCH`) in FastAPI must use the `@idempotent` decorator.
   - Inter-service mutations must use the Transactional Outbox pattern (`outbox_events`), not synchronous cross-service HTTP requests.

6. **Style**:
   - Write clean, self-documenting code. Never leave placeholder comments like `"TODO: implement this"`. Provide complete, functional implementations.

7. **Repair Board & POS Checkout Lifecycle Parity**:
   - **Payment vs Completion Separation**: Transitioning a repair job to `COMPLETED` signifies mechanic labor completion, **never payment**. Never set `is_paid = true` upon status drops or transitions to `COMPLETED`. Payment is exclusively mutated by checkout execution.
   - **Active POS Queue Filtering**: Active repair jobs ready for POS checkout must include `COMPLETED` unreleased jobs (`status !== "RELEASED" && !is_paid`). Never exclude `COMPLETED` jobs from POS active cart queries, as completed jobs are the primary trigger for checkout settlement.
   - **Release & Deletion Guards**: A job order cannot be set to `RELEASED` unless `is_paid === true`. Once paid, a job order cannot be deleted by any user because it is permanently linked to sales logs, invoices, and inventory deductions.
   - **Cross-Tab & Window Live Synchronization**: Interdependent pages (such as Repair Board, POS Checkout, and Inventory) must attach window `focus` and `storage` event listeners to re-fetch and synchronize live state across browser tabs.

8. **POS Customer Selection Guard & Cart Access Protection**:
   - Cashiers must **never be allowed to view or mutate an order cart without an active customer/job order linked**.
   - If `!selectedCustomer` / `!selectedRepair`:
     - Cart view triggers must be disabled, styled with a lock indicator, and explain the requirement via alert/tooltip.
     - Enforce reactive guards that redirect unauthorized cart view states back to the catalog or customer selection screen.
     - Floating or sticky mobile cart action bars must remain hidden.

9. **Destructive Cart Clearing Safeguard**:
   - Clearing a cart wipes item selections and pricing calculations. **Never execute cart clearing immediately on button click**.
   - Always prompt the user with an explicit confirmation modal displaying the target customer, item count, and order total before wiping.
   - When confirmed, synchronize removal across both reactive in-memory stores (`usePosStore`) and persisted storage caches (`motoshop_cart_${job_id}`).

10. **Inventory Catalog & Historical Integrity via Soft Deletion**:
    - **Soft Deletion (`is_active = false`)**: Products and services in inventory must **never be hard-deleted** from PostgreSQL tables when deleted by users. Always perform a soft-delete (`is_active = False`) in the database.
    - **Preserving Historical Records**: Completed sales transactions, invoices, customer repair history logs, and stock movements snapshot item data (name, sku, unit price, quantity) at the time of availment. Soft deletion guarantees that deleting or modifying an item in Inventory Management leaves historical receipts and audit logs 100% intact and prevents relational foreign key violations (`inventory.stock_movements`).
    - **Active Catalog Filtering**: `GET /api/v1/inventory` and POS catalog queries must filter by `is_active == True` by default so deactivated items disappear immediately from active cashier selection.
    - **Product vs Service Attribute Invariants**: Products require physical inventory attributes (`brand`, `current_stock`, `reorder_level`), whereas Services represent labor charges without physical stock or brands. Service identifiers must use clean auto-generated namespaces (`SRV-` prefix) distinct from product SKUs.


