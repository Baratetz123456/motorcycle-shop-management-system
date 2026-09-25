---
name: agent-reviewer
description: Operational lifecycle skill for the Review Agent. Audits security, RBAC access control, session lifecycle, datatype parity, and architectural compliance, spawning specialized review subagents.
---

# Agent Skill: Code Review & Quality Assurance

This skill defines the operational workflow, audit checklists, and runtime subagent delegation rules for the **Review Agent (Phase 3)** in MotoShop.

## 1. Role Objective
Inspect all modified and newly created files to verify security posture, RBAC access control, session management, database/ORM parity, distributed saga compliance, and CSS styling boundaries before verification testing begins.

## 2. Runtime Subagent Spawning Directives
The Review Agent is authorized to spawn two specialized child reviewer subagents:

### A. `reviewer-security-rbac`
- **Focus**: Authentication, authorization, session integrity, and destructive action safeguards.
- **Audit Checklist**:
  - **RBAC Enforcement**: Verify Cashier vs Manager/Admin privilege boundaries. Confirm destructive actions (e.g. voiding sales, deleting records) require manager/admin roles and an irreversible `ConfirmModal` (`confirmVariant="danger"`).
  - **Session Architecture**: Ephemeral access tokens in `tokenStore` (in-memory, never in `localStorage`), true browser session cookies for refresh tokens (no `Max-Age`/`Expires`), and dual-timeout sliding idle window in Redis.
  - **Public Route Silent Refresh Guard**: Verify `/login` and public routes check session existence before dispatching `/auth/refresh` to avoid noisy 401 errors.
  - **Injection & Secret Leaks**: Parameterized SQL queries, no raw string interpolation, and no hardcoded secrets or API tokens.

### B. `reviewer-architecture-parity`
- **Focus**: Datatype alignment, distributed transactions, routing, and styling isolation.
- **Audit Checklist**:
  - **Database & ORM Datatype Parity**: Verify SQLAlchemy column types match PostgreSQL `init.sql` (`Boolean` matches `BOOLEAN`, schema-qualified enums with `name`, `schema`, `inherit_schema=True`, explicit `text` imports).
  - **Distributed Saga & Idempotency**: State-altering endpoints have `@idempotent` decorators; inter-service communication uses Transactional Outbox (`outbox_events`).
  - **KrakenD Route Synchronization**: Frontend API calls match routes declared in `krakend/krakend.json` under `/api/v1/*`.
  - **Frontend State Snapshots**: Verify `clearCart()` is never called prior to taking an immutable snapshot of checkout totals.
  - **Strict Light & Dark CSS Scoping**: Ensure light mode overrides are scoped under `html:not(.dark)` and dark mode rules under `html.dark`. Verify BIR receipt white canvas exclusion selectors are intact.

## 3. Subagent Contract & Report Synthesis
1. **Input Brief**: Parent Reviewer constructs a structured brief containing:
   - **Role**: `reviewer-security-rbac` or `reviewer-architecture-parity`
   - **Objective**: Target review focus and audit deliverables
   - **File Scope**: Diffs and files to inspect
   - **Required Skills**: Listed skills from the Domain Skills Capability Matrix
   - **Inlined Skill Instructions & Constraints**: Distilled audit checklists, security invariants, and schema rules from relevant `SKILL.md` files
   - **Active Invariants**: Architecture, security, styling, or session rules
2. **Return Report**: Child subagents return findings categorized by severity:
   - `CRITICAL`: Immediate blocking defect (data corruption risk, security bypass, unhandled crash).
   - `WARNING`: Sub-optimal pattern, styling leak, or missing safeguard.
   - `NOTE`: Informational observation or cleanup opportunity.
3. **Review Synthesis**: Parent Reviewer compiles all findings into a unified review verdict. If critical issues exist, the review requests changes (`Phase 2: Implementer`). If clean, it approves the build for `Phase 4: Testing`.

## 4. Domain Skills Capability Mapping & Inlining Directives
The Review Agent must consult the following skills when preparing child subagent briefs:

| Child Subagent | Relevant Domain Skills | Inlined Instructions & Constraints |
| :--- | :--- | :--- |
| `reviewer-security-rbac` | [`user-management`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) | Extract RBAC role matrices (Cashier vs Manager/Admin), ephemeral token store rules, session expiration policies, and destructive action safeguards (`ConfirmModal`). |
| `reviewer-architecture-parity` | [`pos-checkout-and-receipts`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/pos-checkout-and-receipts/SKILL.md)<br>[`db-migrate`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/db-migrate/SKILL.md)<br>[`frontend-design`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md) | Extract PostgreSQL-SQLAlchemy type parity checks, Transactional Outbox saga rules, cart snapshotting before `clearCart()`, and strict light/dark mode CSS separation invariants. |

- **Inlining Invariant**: The Review Agent distills key checklists and invariants directly into the `- **Inlined Skill Instructions & Constraints**` section of the child brief.
- **Hybrid Secondary Discovery**: Reviewer subagents may inspect additional `SKILL.md` files in `.agents/skills/` via `view_file` if an audit requires deeper context, and immediately escalate if an architectural defect requires re-planning.

