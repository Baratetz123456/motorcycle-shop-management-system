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
   - Construct a structured brief containing:
     - **Role**: `planner-domain-schema` or `planner-ui-workflow`
     - **Objective**: Concrete research and planning deliverable
     - **File Scope**: Explicit allowed directories and files to inspect
     - **Required Skills**: Listed skills from the Domain Skills Capability Matrix
     - **Inlined Skill Instructions & Constraints**: Distilled steps and invariants extracted from relevant `SKILL.md` files
     - **Active Invariants**: Architecture, security, styling, or session rules
2. **Execute Child Subagents**:
   - Run child subagents to inspect files, schemas, and UI components.
3. **Synthesize into `implementation_plan.md`**:
   - Consolidate findings from both subagents into `implementation_plan.md`.
   - Include: Background, Proposed Changes grouped by component, Verification Plan, and Open Questions.
   - Set `RequestFeedback: true` and STOP to await user approval before proceeding to implementation.

## 4. Domain Skills Capability Mapping & Inlining Directives
The Plan & Design Agent must consult the following skills when preparing child subagent briefs:

| Child Subagent | Relevant Domain Skills | Inlined Instructions & Constraints |
| :--- | :--- | :--- |
| `planner-domain-schema` | [`db-migrate`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/db-migrate/SKILL.md)<br>[`create-microservice`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/create-microservice/SKILL.md)<br>[`user-management`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) | Extract migration conventions (schema-qualified enums, column datatypes), microservice directory patterns (`krakend.json` endpoints), and user role schemas/endpoints. |
| `planner-ui-workflow` | [`frontend-design`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md)<br>[`taste-skill`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/taste-skill/SKILL.md)<br>[`impeccable`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/impeccable/SKILL.md)<br>[`canvas-design`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/canvas-design/SKILL.md)<br>[`brand-guidelines`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/brand-guidelines/SKILL.md)<br>[`pos-checkout-and-receipts`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/pos-checkout-and-receipts/SKILL.md)<br>[`user-management`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) | Extract design tokens (High-Octane Minimalist Light Theme, anti-slop guidelines, impeccable finish criteria, dark mode palettes), mobile FAB portaling rules, POS cart flow invariants, and profile/role settings UX patterns. |

- **Inlining Invariant**: The Planner reads the relevant `SKILL.md` and distills key steps and invariants directly into the `- **Inlined Skill Instructions & Constraints**` section of the child brief so the child subagent is primed with exact domain guidelines.
- **Hybrid Secondary Discovery**: Child subagents may view additional `SKILL.md` files via `view_file` if within their allowed scope; any cross-boundary requirement triggers an immediate `ESCALATE` status report.

