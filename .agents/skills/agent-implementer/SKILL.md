---
name: agent-implementer
description: Operational lifecycle skill for the Implementation Agent. Executes code changes across backend and frontend, spawns specialized implementation subagents with disjoint file boundaries, and runs autonomous self-correction loops.
---

# Agent Skill: Implementation

This skill defines the operational workflow, coding invariants, and runtime subagent delegation rules for the **Implementation Agent (Phase 2)** in MotoShop.

## 1. Role Objective
Execute concrete code modifications according to the approved `implementation_plan.md`, adhering to architectural invariants, session lessons, and engineering standards across Python (FastAPI/SQLAlchemy) and TypeScript (Next.js/React).

## 2. Runtime Subagent Spawning Directives
The Implementer Agent is authorized to spawn two specialized child subagents concurrently or sequentially:

### A. `implementer-backend`
- **File Scope Boundary**: Strictly constrained to `/backend`, `/krakend`, and root Docker files.
- **Responsibilities**:
  - FastAPI endpoints, Pydantic schemas, and dependency injection.
  - SQLAlchemy models with 1:1 datatype parity to PostgreSQL (e.g. `Boolean` matches `BOOLEAN`, schema-qualified enums with `name`, `schema`, `inherit_schema=True`).
  - Distributed Saga handlers with `@idempotent` decorators and Transactional Outbox pattern (`outbox_events`).
  - Soft-deletion logic (`is_active = False`) preserving historical receipt and inventory integrity.
  - KrakenD API gateway endpoint definitions in `krakend/krakend.json`.

### B. `implementer-frontend`
- **File Scope Boundary**: Strictly constrained to `/frontend/src`, `/frontend/public`, and `frontend/package.json`.
- **Responsibilities**:
  - Next.js App Router pages, layouts, and React components.
  - React Rules of Hooks: All hooks declared unconditionally at the very top of components before any hydration or auth guard returns.
  - Strict Light and Dark Mode CSS Separation in `globals.css` (`html:not(.dark)` vs `html.dark`), preserving the BIR invoice white canvas invariant (`[data-invoice-canvas="true"]`).
  - POS cart state snapshotting prior to `clearCart()` on checkout/confirmation screens.
  - WCAG AAA contrast for action buttons (e.g. bold black text `#09090b` on solid lime `#84cc16`).

## 3. Disjoint File Scope Invariant
When spawning `implementer-backend` and `implementer-frontend` concurrently:
- File paths assigned to each subagent must be **strictly disjoint**.
- Backend subagents must never write to `/frontend`, and frontend subagents must never write to `/backend` or `/krakend`.
- This eliminates file lock collisions, merge conflicts, and intermediate state corruption.

## 4. Autonomous 3-Iteration Self-Correction Loop
- If a child subagent encounters compilation errors, broken imports, TypeScript type errors, or lint failures, it must:
  1. Inspect the exact compiler/linter error message and line number.
  2. Perform targeted fixes on the affected files.
  3. Re-run local verification.
  4. Iterate up to **3 times** autonomously.
- If the error remains unresolved after 3 attempts, the subagent halts modifications and returns an `ESCALATE` report with tracebacks and diffs to the parent Implementer.

## 5. Subagent Contract & Hand-Off
1. **Input Brief**: Parent Implementer constructs a structured brief containing:
   - **Role**: `implementer-backend` or `implementer-frontend`
   - **Objective**: Concrete implementation deliverable
   - **File Scope**: Strictly disjoint allowed file paths
   - **Required Skills**: Listed skills from the Domain Skills Capability Matrix
   - **Inlined Skill Instructions & Constraints**: Distilled steps, invariants, and checklists extracted from relevant `SKILL.md` files
   - **Active Invariants**: Relevant architectural, styling, or session rules
   - **Verification Command**: Local build/typecheck command (e.g. `npm run build` or pytest)
2. **Return Report**: Child subagent returns: Status (`SUCCESS` | `ESCALATE`), Touched Files, Local Verification Result, Self-Correction Log, and Residual Risks.
3. **Synthesis**: Parent Implementer validates that frontend client types align with backend DTOs before advancing to Phase 3: Review Agent.

## 6. Domain Skills Capability Mapping & Inlining Directives
The Implementation Agent must consult the following skills when preparing child subagent briefs:

| Child Subagent | Relevant Domain Skills | Inlined Instructions & Constraints |
| :--- | :--- | :--- |
| `implementer-backend` | [`create-microservice`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/create-microservice/SKILL.md)<br>[`db-migrate`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/db-migrate/SKILL.md)<br>[`user-management`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md)<br>[`local-dev-setup`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/local-dev-setup/SKILL.md) | Extract microservice scaffolding patterns, Alembic migration commands (`alembic revision --autogenerate`), PostgreSQL enum definitions (`name`, `schema`, `inherit_schema=True`), user endpoints/RBAC roles, and Docker service configurations. |
| `implementer-frontend` | [`frontend-design`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md)<br>[`theme-factory`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/theme-factory/SKILL.md)<br>[`pos-checkout-and-receipts`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/pos-checkout-and-receipts/SKILL.md)<br>[`user-management`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) | Extract High-Octane Minimalist Light Theme design tokens, dark mode scoped styles, WCAG AAA button text contrast, state snapshotting before `clearCart()`, dedicated full-page receipt routes (`/sales/receipt`), and user settings tab components. |

- **Inlining Invariant**: The Implementer Agent reads the relevant `SKILL.md` files and distills concrete instructions and invariants directly into the `- **Inlined Skill Instructions & Constraints**` section of the child brief.
- **Hybrid Secondary Discovery Invariant**: Child subagents may view additional `SKILL.md` files in `.agents/skills/` via `view_file` if the task demands further domain context, provided all subsequent file edits remain strictly within the subagent's assigned disjoint file boundary. If an implementer subagent requires changes outside its file scope, it must halt and return an `ESCALATE` status report to the parent Implementer Agent.

