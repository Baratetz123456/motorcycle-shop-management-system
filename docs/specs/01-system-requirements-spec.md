# MotoShop POS: System Requirements Specification (SRS)
## Document ID: SPEC-001 | Version: 1.0.0-PROD | Status: APPROVED

---

## 1. Problem Statement & Business Context
MotoShop operates as a physical motorcycle sales, maintenance, and repair shop. The shop operates with a dedicated team of **up to 5 concurrent internal staff members**:
1. **1 Shop Owner / Manager**: Oversees inventory, mechanic commissions, financial reports, user management, and audit logs.
2. **1–2 Cashiers**: Handle counter POS transactions, customer checkouts, invoice receipts, and cash register reconciliation.
3. **2–3 Mechanics**: Update diagnostic findings, repair job orders, parts requisition, and service status from workshop tablets/mobiles.

### Primary Constraint
The business requires an enterprise-grade, highly reliable, modern POS and shop management software with **$0.00 / month ongoing cloud hosting costs**, hosted on AWS using automated GitHub CI/CD pipelines.

---

## 2. Functional Requirements (FR)

### FR-1: Authentication, Session & User Role Management
- **FR-1.1**: The system must enforce Role-Based Access Control (RBAC) with three roles: `admin` (Owner/Manager), `cashier`, and `mechanic`.
- **FR-1.2**: User sessions must utilize ephemeral in-memory access tokens (short-lived JWT) paired with `HttpOnly; SameSite=Lax; Secure` refresh token cookies without client-side `localStorage` storage.
- **FR-1.3**: The system must support session idle timeouts (30-minute sliding window) and absolute session limits (8 hours).
- **FR-1.4**: Token revocation and logout must immediately invalidate refresh tokens in a PostgreSQL database revocation table (`auth.revoked_tokens`).
- **FR-1.5**: Password changes must increment `token_version` to invalidate all active sessions across all devices.

### FR-2: Inventory & Catalog Management
- **FR-2.1**: The system must maintain items categorized as `PRODUCT` (physical parts) and `SERVICE` (labor services).
- **FR-2.2**: The system must track real-time stock levels, reorder alerts, cost price, and retail selling price.
- **FR-2.3**: Stock movements must be recorded with movement types: `IN`, `OUT`, `SALE`, `REPAIR`.
- **FR-2.4**: Low-stock items must trigger visual alerts when `current_stock <= reorder_level`.
- **FR-2.5**: Master directory and registry tables (Bike Registry, Customer Records, Inventory, Users) must enforce behavioral parity: borderless edge-to-edge list rows with `divide-y divide-zinc-800/80` on mobile, sticky headers on desktop, clean sliding `ChevronRight` indicator without inline edit/delete icon buttons on rows, and modal-housed Delete button with irreversible danger `ConfirmModal` safeguards.

### FR-3: Point of Sale (POS) & Checkout Operations
- **FR-3.1**: POS interface must support active repair job selection (Step 1) and parts/services catalog selection (Step 2).
- **FR-3.2**: On mobile (< md), item selection must render in a 2-column grid with a floating filter action button (`FloatingFilterFab`).
- **FR-3.3**: Checkout must be strictly idempotent via client-generated `Idempotency-Key` headers stored in `auth.idempotency_keys`.
- **FR-3.4**: Checkout must snapshot cart items prior to store clearance, persisting invoice records, payments, and stock movements inside a single ACID database transaction.
- **FR-3.5**: Full receipts must adhere to the 10-Section Official Commercial Invoice Standard (TIN, order metadata, line items, 12% BIR VAT breakdown, settlement, commissions, and warranty terms).

### FR-4: Workshop Repairs & Job Orders
- **FR-4.1**: Mechanics and cashiers must create and update motorcycle job orders with statuses: `PENDING`, `ONGOING`, `COMPLETED`, `RELEASED`.
- **FR-4.2**: Mobile repair board must provide tabbed status navigation and dual forward/revert stage buttons with `ConfirmModal` safeguards.
- **FR-4.3**: Job orders must track parts used, labor charge, assigned mechanic, and mechanic commission calculation based on user commission rates.
- **FR-4.4**: Completed repair jobs must automatically synchronize with the POS checkout counter for billing settlement.

### FR-5: Immutable Audit Logging
- **FR-5.1**: All sensitive mutations (user role change, transaction voiding, manual inventory adjustment, login failure) must record an immutable audit entry in `audit.logs`.
- **FR-5.2**: Database triggers must prevent `UPDATE` and `DELETE` queries on `audit.logs`.
- **FR-5.3**: Audit logs must be accessible only to `admin` users via Settings (`/settings?tab=logs`).

### FR-6: Internationalization & Strict Character Encoding
- **FR-6.1**: All database records, API JSON responses, and frontend UI templates must strictly enforce UTF-8 character encoding without Windows CP437/1252 corruption. Philippine Peso currency must strictly render as `₱` (never `Γé▒`), em-dashes as `—` (never `ΓÇö`), and international characters properly preserved (e.g., `Akrapovič`).

---

## 3. Non-Functional Requirements (NFR)

### NFR-1: Cost Efficiency
- Total cloud infrastructure cost must remain **$0.00 / month** on AWS under normal shop operation for 5 users.

### NFR-2: Performance & Scalability
- **95th Percentile Response Time**: Sub-300ms for warm requests; cold-start latency under 3.5s for on-demand Lambda execution.
- **Traffic Envelope**: Shop operates 10 hours/day, processing 50–200 orders/day (~15,000–30,000 API requests/month), consuming < 3% of the AWS Lambda Always Free tier (1M requests/mo).

### NFR-3: Reliability & Data Integrity
- ACID transaction guarantees for all sales, stock adjustments, and job order state updates.
- Zero loss of financial records or audit trails.

### NFR-4: Browser Compatibility & Responsiveness
- High-Octane Minimalist Light Theme canvas with dark mode support.
- Fully responsive across desktop (POS counter terminal), tablet (mechanic workbench), and mobile (service advisor smartphone).
- Pure white canvas printing isolation (`printIsolatedDocument`) for official A4 receipts and payslips.
