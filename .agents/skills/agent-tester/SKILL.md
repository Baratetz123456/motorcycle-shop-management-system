---
name: agent-tester
description: Operational lifecycle skill for the Testing & Verification Agent. Runs automated production builds, KrakenD gateway integration tests, database persistence tests, and visual browser verifications, spawning specialized testing subagents.
---

# Agent Skill: Testing & Verification

This skill defines the operational workflow, verification checklists, and runtime subagent delegation rules for the **Testing & Verification Agent (Phase 4)** in MotoShop.

## 1. Role Objective
Execute comprehensive automated builds, API gateway integration tests, database persistence validations, and visual UI inspections to ensure zero regressions across all 26 application routes before Phase 5 delivery.

## 2. Runtime Subagent Spawning Directives
The Testing Agent is authorized to spawn three specialized child testing subagents in parallel:

### A. `tester-build-lint`
- **Focus**: Production compilation, static type-safety, and linter compliance.
- **Verification Commands**:
  - Run `npm run build` in `frontend/`.
  - Assert **Exit Code 0** across all 26 static and dynamic routes.
  - Confirm zero TypeScript type errors and zero Next.js bundling/prerendering warnings.
  - Run backend unit tests or linters where configured (`pytest`, `flake8`).

### B. `tester-gateway-integration`
- **Focus**: Microservice API endpoints, Docker container health, and database persistence.
- **Verification Commands**:
  - Test endpoints via KrakenD API Gateway (`http://localhost:8080/api/v1/...`).
  - Test both happy paths and error edge cases (e.g. invalid UUIDs, unauthorized roles).
  - Inspect microservice Docker logs (`docker logs <service> --tail 50`) for unhandled tracebacks.
  - Directly query PostgreSQL tables to assert data integrity and persistence.

### C. `tester-visual-browser`
- **Focus**: User interaction flows, responsive viewports, theme persistence, and print layouts.
- **Verification Commands**:
  - Use Playwright / browser automation tools.
  - Verify responsive layouts: Fixed desktop sidebar ($\ge$ md) vs sticky bottom menu (< md).
  - Verify Theme Persistence: Toggle Dark Mode, navigate across routes, assert `document.documentElement.className` and `data-mode` remain intact without reverting.
  - Verify WCAG AAA button text contrast (> 12:1 bold black text on lime).
  - Verify Print CSS unconstrained layout on `/sales/receipt` with pure white paper canvas.

## 3. Autonomous Test Harness Self-Correction
- If a test script, harness, or browser script encounters syntax errors or environment timing glitches, the child tester subagent may iteratively tune the test harness up to **3 iterations** before reporting failure.

## 4. Subagent Contract & Verification Matrix Synthesis
1. **Input Brief**: Parent Tester constructs a structured brief containing:
   - **Role**: `tester-build-lint`, `tester-gateway-integration`, or `tester-visual-browser`
   - **Objective**: Quantitative verification target
   - **File Scope**: Files, endpoints, or routes under test
   - **Required Skills**: Listed skills from the Domain Skills Capability Matrix
   - **Inlined Skill Instructions & Constraints**: Distilled verification workflows, test scripts, and assertions from relevant `SKILL.md` files
   - **Active Invariants**: Architecture, security, styling, or session rules
   - **Verification Targets**: Build exit code, HTTP status codes, latency, or screenshots
2. **Return Report**: Child subagent returns: Status (`SUCCESS` | `FAILURE`), Quantitative Results (route counts, HTTP status codes, latency, screenshot paths), and Test Logs.
3. **Verification Matrix Synthesis**:
   - Parent Tester compiles all quantitative test outputs into a single verification table.
   - If all gates pass $\to$ Proceed to `Phase 5: Delivery & Walkthrough`.
   - If any gate fails $\to$ Escalate with full failure tracebacks to `Phase 2: Implementer`.

## 5. Domain Skills Capability Mapping & Inlining Directives
The Testing & Verification Agent must consult the following skills when preparing child subagent briefs:

| Child Subagent | Relevant Domain Skills | Inlined Instructions & Constraints |
| :--- | :--- | :--- |
| `tester-build-lint` | [`autonomous-task-loop`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/autonomous-task-loop/SKILL.md) | Extract 3-iteration self-correction loop rules, build debugging steps, and zero-warning compilation criteria (`npm run build`). |
| `tester-gateway-integration` | [`local-dev-setup`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/local-dev-setup/SKILL.md)<br>[`user-management`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) | Extract KrakenD endpoint URLs (`http://localhost:8080/api/v1/...`), Docker container log inspection patterns, and user role permission testing workflows. |
| `tester-visual-browser` | [`webapp-testing`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/webapp-testing/SKILL.md)<br>[`frontend-design`](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md) | Extract Playwright browser inspection workflows, viewport testing commands (desktop sidebar vs mobile bottom menu), WCAG AAA button text contrast assertions, and BIR white canvas receipt checks. |

- **Inlining Invariant**: The Tester Agent distills key test commands and verification criteria directly into the `- **Inlined Skill Instructions & Constraints**` section of the child brief.
- **Hybrid Secondary Discovery**: Tester subagents may view additional `SKILL.md` files via `view_file` if test harness configuration requires deeper context.

