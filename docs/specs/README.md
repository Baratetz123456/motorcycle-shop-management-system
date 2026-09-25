# MotoShop POS: Spec-Driven Development (SDD) Master Index
## Complete Specification Suite for Zero-Cost AWS Serverless Architecture

---

## 1. Specification Index

| Document ID | Specification Title | File Reference | Status | Target Scope |
|---|---|---|---|---|
| **SPEC-001** | System Requirements Specification (SRS) | [01-system-requirements-spec.md](file:///d:/POS/motorcycle-shop-management-system/docs/specs/01-system-requirements-spec.md) | `APPROVED` | Functional & Non-Functional Business Requirements |
| **SPEC-002** | Database & State Specification | [02-database-and-state-spec.md](file:///d:/POS/motorcycle-shop-management-system/docs/specs/02-database-and-state-spec.md) | `APPROVED` | PostgreSQL Schemas, ACID Transactions, Idempotency |
| **SPEC-003** | Unified API Specification | [03-unified-api-spec.md](file:///d:/POS/motorcycle-shop-management-system/docs/specs/03-unified-api-spec.md) | `APPROVED` | Modular Monolith FastAPI Endpoints & Contracts |
| **SPEC-004** | Infrastructure & CI/CD Specification | [04-infrastructure-and-cicd-spec.md](file:///d:/POS/motorcycle-shop-management-system/docs/specs/04-infrastructure-and-cicd-spec.md) | `APPROVED` | AWS SAM CloudFormation, S3/CloudFront, OAC, RDS |
| **SPEC-005** | Frontend Client Architecture & Static SPA | [05-frontend-client-architecture-spec.md](file:///d:/POS/motorcycle-shop-management-system/docs/specs/05-frontend-client-architecture-spec.md) | `APPROVED` | Next.js 16 Static Export, Client Hydration, Theme |
| **SPEC-006** | Verification, Testing & QA Specification | [06-testing-and-verification-spec.md](file:///d:/POS/motorcycle-shop-management-system/docs/specs/06-testing-and-verification-spec.md) | `APPROVED` | 4-Tier Test Framework, Free-Tier Quota Ledger |
| **SPEC-007** | Operational Runbook & Disaster Recovery | [07-operational-runbook-and-disaster-recovery-spec.md](file:///d:/POS/motorcycle-shop-management-system/docs/specs/07-operational-runbook-and-disaster-recovery-spec.md) | `APPROVED` | Day-2 Operations, VPC Migrations, Recovery Plans |

---

## 2. Requirements Traceability Matrix (RTM)

### 2.1 Functional Requirements (FR) Traceability

| Req ID | Requirement Summary | DB Schema / Tables | API Endpoints | Frontend Pages / Components | Verification / Test Suite |
|---|---|---|---|---|---|
| **FR-1.1** | Role-Based Access Control (Admin, Cashier, Mechanic) | `auth.users` (`role`) | `/api/v1/auth/login`, `/api/v1/auth/me` | `/login`, `AuthGuard`, `RoleGuard` | `test_auth_seed_and_login` in `test_modular_monolith.py` |
| **FR-1.2** | In-Memory JWT + HttpOnly Cookie Sessions | `auth.users` | `/api/v1/auth/login`, `/api/v1/auth/refresh` | `frontend/src/lib/auth-token.ts`, `apiClient` | Cookie retention & session validation tests |
| **FR-1.3** | Dual-Timeout Session Lifecycle (30m / 8h) | `auth.users` | `/api/v1/auth/refresh` | `PostgresSessionManager` | Sliding expiration assertions |
| **FR-1.4** | Immediate Token Revocation & Logout | `auth.revoked_tokens` | `/api/v1/auth/logout` | `Header.tsx` (Logout button) | Revocation table existence & blacklist query |
| **FR-1.5** | Password Change Invalidation via `token_version` | `auth.users` (`token_version`) | `/api/v1/auth/change-password` | `/settings` (Security tab) | Multi-device session purge tests |
| **FR-2.1** | Parts vs Services Catalog Typing | `inventory.items` (`item_type`) | `/api/v1/inventory/items` | `/inventory`, `/pos` Step 2 catalog | Item filter and categorization tests |
| **FR-2.2** | Real-time Stock Tracking & Reorder Levels | `inventory.items` (`current_stock`) | `/api/v1/inventory/items` | `/inventory`, `/inventory/[id]` | `test_inventory_and_checkout_acid` |
| **FR-2.3** | Historical Stock Movements Logging | `inventory.stock_movements` | `/api/v1/inventory/movements` | `/inventory` (Movement history drawer) | Movement insertion on checkout tests |
| **FR-2.4** | Low Stock Visual Badging | `inventory.items` | `/api/v1/inventory/items` | `ItemBadge.tsx`, `/dashboard` alerts | Warning indicator UI test |
| **FR-2.5** | Master Directory Table Parity & Clean Row Actions | `inventory.items`, `repairs.motorcycles`, `auth.users` | `/api/v1/inventory/items`, `/api/v1/repairs/motorcycles` | `/motorcycles`, `/customers`, `/inventory`, `/users` | Clean row click + modal-housed Delete tests |
| **FR-3.1** | Multi-Step POS (Job Order $\to$ Catalog) | `repairs.job_orders`, `inventory.items` | `/api/v1/sales/checkout` | `/pos` (Step 1 repair, Step 2 parts) | End-to-end POS checkout test |
| **FR-3.2** | Mobile POS 2-Column Grid & Floating Filter FAB | N/A (UI Layout) | `/api/v1/inventory/items` | `FloatingFilterFab.tsx`, `MobilePosFilterSheet.tsx` | Viewport 390px Playwright layout test |
| **FR-3.3** | Idempotent Checkout (`Idempotency-Key`) | `auth.idempotency_keys` | `/api/v1/sales/checkout` | `apiClient` automatic UUID header injection | Double-submission idempotency test |
| **FR-3.4** | Atomic ACID Cart Checkout & Snapshotting | `sales.transactions`, `sales.transaction_items` | `/api/v1/sales/checkout` | `posStore.ts` checkout state snapshot | Transaction commit & rollback tests |
| **FR-3.5** | 10-Section Official Commercial Receipt | `sales.transactions`, `sales.payments` | `/api/v1/sales/transactions/{id}` | `/sales/receipt`, `PrintableInvoiceDocument.tsx` | Decoupled A4 sandbox print test |
| **FR-4.1** | Motorcycle Job Order Status Workflow | `repairs.job_orders` (`status`) | `/api/v1/repairs/jobs` | `/repairs/board`, `/repairs/jobs/[id]` | Status advancement transition tests |
| **FR-4.2** | Mobile Repair Board Tabbed Navigation | `repairs.job_orders` | `/api/v1/repairs/jobs` | `MobileRepairBoard.tsx`, `ConfirmModal.tsx` | Mobile tabbed status switch test |
| **FR-4.3** | Mechanic Commission Tracking & Attribution | `repairs.commissions` | `/api/v1/repairs/commissions` | `/payroll`, `/payroll/payslip` | Labor rate commission ledger tests |
| **FR-4.4** | Job Order Settlement Synchronization | `repairs.job_orders` (`is_paid`) | `/api/v1/sales/checkout` | `/pos` Step 1 job order selector | Status sync from `COMPLETED` to `RELEASED` |
| **FR-4.5** | Customer Repair History & Payment Status Sync | `repairs.job_orders`, `repairs.motorcycles` | `/api/v1/repairs/customer-history`, `/api/v1/repairs/jobs/{id}/payment-status` | `/repairs/jobs/[id]`, `/pos` | History lookup and payment sync tests |
| **FR-5.1** | Immutable Sensitive Mutation Logging | `audit.logs` | `/api/v1/audit/logs` | `/settings?tab=logs`, `/audit-logs` | Audit record insertion on login/void/adjust |
| **FR-5.2** | Database Level Immutability Triggers | `audit.prevent_audit_log_modification()` | N/A (DB Trigger) | N/A | SQL exception assertion on `UPDATE`/`DELETE` |
| **FR-5.3** | Admin-Only Audit Log Access Restriction | `audit.logs` | `/api/v1/audit/logs` | `/settings?tab=logs` | 403 Forbidden enforcement on cashier role |
| **FR-6.1** | Strict UTF-8 Encoding & Currency Standard (`₱`) | All database tables | All JSON response bodies | All UI templates, tables, receipts | Encoding assertion (`₱` never `Γé▒`) |

---

### 2.2 Non-Functional Requirements (NFR) Traceability

| Req ID | Requirement Summary | Implementation Mechanism | Infrastructure Provision | Verification Proof |
|---|---|---|---|---|
| **NFR-1** | $0.00 / Month Ongoing Cloud Cost | S3 + CloudFront + Lambda (256MB) + RDS t4g.micro | `template.yaml` (Free tier resources only) | SPEC-006 Free Tier Quota Ledger |
| **NFR-2** | Sub-300ms Warm Response & 3.5s Cold Start | Consolidated Modular Monolith (1 container cold start) | AWS Lambda HTTP API Gateway integration | ASGI In-Memory bench & synthetic tests |
| **NFR-3** | ACID Database Integrity & Zero Financial Loss | Single PostgreSQL session transaction (`session.begin()`) | AWS RDS PostgreSQL with automated 1-day backups | Checkout stock rollback assertions |
| **NFR-4** | High-Octane Responsive Theme & Decoupled A4 Print | Light theme canvas (`#ffffff`), dark mode (`html.dark`), iframe printing | Next.js SPA + Tailwind + `printIsolatedDocument` | Playwright viewport tests & print sandbox |

---

## 3. Spec-Driven Development (SDD) Workflow Rules

1. **Spec First, Code Second**: No database migration, backend route, or frontend component is modified without an approved specification reference.
2. **Dual-Parity Standard**:
   - **Local Development**: Streamlined 2-container Docker Compose setup (`motoshop-db` on port 5432 + `motoshop-backend` on port 8000) with hot-reloading Next.js dev server on port 3000.
   - **Zero-Cost Production**: S3 Static SPA + CloudFront CDN paired with on-demand AWS Lambda (FastAPI via Mangum) and AWS RDS PostgreSQL Free Tier (`db.t4g.micro`) at $0.00/month.
3. **Strict Invariant Adherence**:
   - Zero CORS latency via same-origin CloudFront `/api/v1` routing (or direct port 8000 in local dev).
   - Zero access token storage in browser `localStorage`.
   - Dynamic route export safety (`output: 'export'` scoped to `process.env.NODE_ENV === 'production'`).
   - Master Directory Table parity: clean rows with `ChevronRight` only, modal-housed Delete button with danger `ConfirmModal`.
   - Pure white canvas printing isolation (`printIsolatedDocument`) preventing dark theme bleeding.
   - 100% motorcycle-specific hardware imagery (strictly zero automotive parts or cars).
   - Strict UTF-8 encoding across all files (Philippine Peso `₱` and em-dash `—`).
   - Zero git repository pollution (temporary test artifacts strictly routed to temporary system directories).
