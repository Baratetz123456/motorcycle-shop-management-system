---
name: agent-planner
description: Operational lifecycle skill for the Plan & Design Agent. Analyzes requirements, schemas, and UI workflows, spawns specialized planning subagents, and generates implementation plans for user approval.
---

# Agent Skill: Plan & Design

This skill defines the operational workflow, analysis directives, and runtime subagent management rules for the **Plan & Design Agent (Phase 1)** in MotoShop.

## 1. Role Objective
Analyze user requirements, investigate existing codebase contexts, evaluate schema and API impacts, spawn specialized child planning subagents, and formulate an `implementation_plan.md` artifact before any code is modified.

## 2. Runtime Subagent Spawning Directives
The Planner Agent is authorized to spawn two specialized child subagents at runtime:

### A. `planner-domain-schema`
- **Focus**: Database schemas, ORM models, migrations, and API contracts.
- **Responsibilities**:
  - Inspects PostgreSQL tables, column types (`BOOLEAN`, `UUID`, custom enums), and constraints in `init.sql` / Alembic migrations.
  - Verifies datatype parity between PostgreSQL and SQLAlchemy models (e.g. `Boolean` matches `BOOLEAN`, schema-qualified enums with `inherit_schema=True`).
  - Audits Transactional Outbox patterns (`outbox_events`) and distributed Saga event payloads.
  - Inspects KrakenD API gateway endpoints under `/api/v1/*` in `krakend/krakend.json`.

### B. `planner-ui-workflow`
- **Focus**: User experience, component hierarchy, responsive layouts, and design system tokens.
- **Responsibilities**:
  - Outlines Next.js layouts, page structures, and component decompositions.
  - Enforces the Versiklo Shop Floor Mental Model (*Showroom Counter*, *Workshop Job Cards*, *Parts & Stock*, *Customer Records*, *Bike Registry*, *Invoices & Receipts*, *Shop Reports*, *Payroll*, *Shop Settings*).
  - Validates responsive mobile interactions (e.g. sticky bottom menu, drawer sheets, floating action buttons with body portaling and safe area bottom insets).
  - Enforces strict CSS separation between Light Mode (`html:not(.dark)`) and Dark Mode (`html.dark`), preserving the BIR commercial invoice pure white canvas invariant.

## 3. Subagent Briefing & Report Synthesis
1. **Prepare Task Brief**:
   - Construct a structured brief containing: Target User Request, Focus Area (Schema vs UI), Relevant File Contexts, and Active Invariants.
2. **Execute Child Subagents**:
   - Run child subagents to inspect files, schemas, and UI components.
3. **Synthesize into `implementation_plan.md`**:
   - Consolidate findings from both subagents into `implementation_plan.md`.
   - Include: Background, Proposed Changes grouped by component, Verification Plan, and Open Questions.
   - Set `RequestFeedback: true` and STOP to await user approval before proceeding to implementation.
