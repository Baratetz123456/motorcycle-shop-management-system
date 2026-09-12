---
name: subagent-delegation
description: Comprehensive delegation protocol for spawning specialized child subagents at runtime. Defines the 2-tier delegation architecture, standardized task briefs, return report schemas, disjoint file scope rules, and 3-iteration autonomous self-correction loops.
---

# Skill: Subagent Delegation Protocol

This skill provides the operational standards, communication contracts, and error handling protocols for spawning and supervising specialized child subagents at runtime across the MotoShop Multi-Agent Operating System.

## 1. 2-Tier Hierarchical Delegation Architecture

```mermaid
flowchart TD
    Task[Task Triggered] --> Orchestrator[Orchestrator Agent]
    
    subgraph Tier1["Tier 1: Phase Agents"]
        Orchestrator --> P1[Phase 1: Planner Agent]
        P1 --> P2[Phase 2: Implementer Agent]
        P2 --> P3[Phase 3: Reviewer Agent]
        P3 --> P4[Phase 4: Tester Agent]
    end
    
    subgraph Tier2["Tier 2: Specialized Child Subagents"]
        P1 -.-> Sub_Schema["planner-domain-schema"]
        P1 -.-> Sub_UI["planner-ui-workflow"]
        
        P2 -.-> Sub_BE["implementer-backend<br/>(/backend, /krakend)"]
        P2 -.-> Sub_FE["implementer-frontend<br/>(/frontend)"]
        
        P3 -.-> Sub_Sec["reviewer-security-rbac"]
        P3 -.-> Sub_Arch["reviewer-architecture-parity"]
        
        P4 -.-> Sub_Build["tester-build-lint"]
        P4 -.-> Sub_API["tester-gateway-integration"]
        P4 -.-> Sub_Vis["tester-visual-browser"]
    end
    
    subgraph Loop["Autonomous Self-Correction Protocol"]
        Sub_BE & Sub_FE & Sub_Build -->|Error Detected| Attempt{"Iteration < 3?"}
        Attempt -->|Yes| Fix[Analyze Traceback & Apply Targeted Fix]
        Fix --> Sub_BE
        Attempt -->|No| Escalate[Escalate to Parent Phase Agent with Full Logs]
    end
```

## 2. Standardized Subagent Contract Protocol

### A. Subagent Input Brief (Parent $\to$ Child)
Every subagent invocation must receive a structured brief with inlined skill instructions:
```markdown
### Subagent Task Brief: <subagent_id>
- **Role**: <role_name> (e.g. implementer-frontend, tester-build-lint)
- **Objective**: Exact single-responsibility deliverable
- **File Scope**: Explicit list of allowed file paths (strictly disjoint across concurrent subagents)
- **Required Skills**: [skill-name-1, skill-name-2] (e.g. `frontend-design`, `pos-checkout-and-receipts`)
- **Inlined Skill Instructions & Constraints**: Distilled steps, invariants, and checklists extracted from relevant SKILL.md by the parent agent
- **Active Invariants**: Relevant architectural, styling, or session rules from AGENTS.md
- **Reference Context**: Specific API schemas, models, or design tokens
- **Verification Command**: Exact command to run to validate deliverables
```

### B. Subagent Deliverable Report (Child $\to$ Parent)
Every subagent must return a structured completion report:
```markdown
### Subagent Deliverable Report: <subagent_id>
- **Status**: SUCCESS | ESCALATE
- **Modified Files**: List of touched files with concise diff summaries
- **Verification Performed**: Commands run, tests executed, and exit codes
- **Self-Correction Log**: Iterations attempted (if compile/lint errors occurred)
- **Identified Risks / Blockers**: Any unresolved issues requiring parent coordination
```

## 3. Disjoint File Scope Rule (Concurrent Implementers)
When multiple subagents operate concurrently:
- **`implementer-backend`**: Strictly constrained to `/backend`, `/krakend`, and Docker files.
- **`implementer-frontend`**: Strictly constrained to `/frontend/src`, `/frontend/public`, and `frontend/package.json`.
- Overlapping file modifications across concurrent subagents are strictly prohibited to prevent race conditions and merge conflicts.

## 4. Autonomous 3-Iteration Self-Correction Loop
- When a subagent encounters a compiler, linter, or test failure:
  1. Parse the exact error message and file line numbers.
  2. Perform targeted fixes.
  3. Re-run verification.
  4. Iterate up to **3 times** autonomously.
- If unresolved after 3 attempts, halt further modifications and return an `ESCALATE` report with tracebacks and diffs to the parent Phase Agent.

## 5. Hybrid Secondary Skill Discovery & Scope Invariant
- **Local Scope Discovery**: If a child subagent discovers an unexpected requirement during execution, it is authorized to directly view additional skills in `.agents/skills/<skill_name>/SKILL.md` using `view_file`, provided the required action remains strictly within its assigned file scope.
- **Cross-Scope Escalation**: If addressing the requirement requires modifying files outside the subagent's assigned file boundary (e.g. `implementer-frontend` discovering a missing backend database field or API route), the subagent must immediately halt and return an `ESCALATE` status report to its parent Phase Agent.

## 6. Domain Skills Capability Matrix
Parent Phase Agents must review this matrix and inline the corresponding skills when preparing subagent briefs:

| Phase Agent | Tier-2 Subagents | Primary Domain Skills to Inline / Access | Skill Path |
| :--- | :--- | :--- | :--- |
| **Phase 1: Planner** | `planner-domain-schema` | `db-migrate`, `create-microservice`, `user-management` | [.agents/skills/db-migrate](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/db-migrate/SKILL.md)<br/>[.agents/skills/create-microservice](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/create-microservice/SKILL.md)<br/>[.agents/skills/user-management](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) |
| | `planner-ui-workflow` | `frontend-design`, `theme-factory`, `pos-checkout-and-receipts` | [.agents/skills/frontend-design](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md)<br/>[.agents/skills/theme-factory](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/theme-factory/SKILL.md)<br/>[.agents/skills/pos-checkout-and-receipts](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/pos-checkout-and-receipts/SKILL.md) |
| **Phase 2: Implementer** | `implementer-backend` | `create-microservice`, `db-migrate`, `user-management`, `local-dev-setup`, `autonomous-task-loop` | [.agents/skills/create-microservice](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/create-microservice/SKILL.md)<br/>[.agents/skills/db-migrate](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/db-migrate/SKILL.md)<br/>[.agents/skills/user-management](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md)<br/>[.agents/skills/local-dev-setup](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/local-dev-setup/SKILL.md)<br/>[.agents/skills/autonomous-task-loop](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/autonomous-task-loop/SKILL.md) |
| | `implementer-frontend` | `frontend-design`, `theme-factory`, `pos-checkout-and-receipts`, `user-management`, `autonomous-task-loop` | [.agents/skills/frontend-design](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md)<br/>[.agents/skills/theme-factory](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/theme-factory/SKILL.md)<br/>[.agents/skills/pos-checkout-and-receipts](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/pos-checkout-and-receipts/SKILL.md)<br/>[.agents/skills/user-management](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md)<br/>[.agents/skills/autonomous-task-loop](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/autonomous-task-loop/SKILL.md) |
| **Phase 3: Reviewer** | `reviewer-security-rbac` | `user-management` | [.agents/skills/user-management](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) |
| | `reviewer-architecture-parity` | `pos-checkout-and-receipts`, `db-migrate`, `frontend-design` | [.agents/skills/pos-checkout-and-receipts](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/pos-checkout-and-receipts/SKILL.md)<br/>[.agents/skills/db-migrate](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/db-migrate/SKILL.md)<br/>[.agents/skills/frontend-design](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md) |
| **Phase 4: Tester** | `tester-build-lint` | `autonomous-task-loop` | [.agents/skills/autonomous-task-loop](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/autonomous-task-loop/SKILL.md) |
| | `tester-gateway-integration` | `local-dev-setup`, `user-management` | [.agents/skills/local-dev-setup](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/local-dev-setup/SKILL.md)<br/>[.agents/skills/user-management](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/user-management/SKILL.md) |
| | `tester-visual-browser` | `webapp-testing`, `frontend-design` | [.agents/skills/webapp-testing](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/webapp-testing/SKILL.md)<br/>[.agents/skills/frontend-design](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/frontend-design/SKILL.md) |
| **Phase 5: Orchestrator** | — | `subagent-delegation`, `autonomous-task-loop` | [.agents/skills/subagent-delegation](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/subagent-delegation/SKILL.md)<br/>[.agents/skills/autonomous-task-loop](file:///d:/POS/motorcycle-shop-management-system/.agents/skills/autonomous-task-loop/SKILL.md) |
