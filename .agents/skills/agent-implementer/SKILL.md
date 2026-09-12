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
1. **Input Brief**: Parent Implementer assigns: Objective, Allowed File Paths, Invariants to Uphold, and Verification Command.
2. **Return Report**: Child subagent returns: Status (`SUCCESS` | `ESCALATE`), Touched Files, Local Verification Result, and Residual Risks.
3. **Synthesis**: Parent Implementer validates that frontend client types align with backend DTOs before advancing to Phase 3: Review Agent.
