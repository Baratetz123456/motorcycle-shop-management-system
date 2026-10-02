# Agent Strategy: Autonomous Task Loop & Iterative Verification Engineering

All agents operating within this workspace must enforce the **Autonomous Task Loop Strategy**:

## Core Principles

1. **Iterative Verification Loop**:
   - Agents must never declare success or terminate execution on partial edits or unverified code.
   - Follow the **Plan -> Implement -> Verify -> Inspect Logs -> Debug -> Re-verify** loop until 100% clean execution (Exit Code 0) is achieved.

2. **Self-Correction & Log Inspection**:
   - If any command, container, or build fails, immediately extract un-truncated error logs.
   - Identify the exact root cause, apply targeted code fixes, and immediately re-run verification commands.

3. **Termination Criteria**:
   - **TypeScript Build**: `npm run build` exits with code 0 across all routes.
   - **Backend Services**: Python models, schemas, endpoints, and containers boot clean with 0 NameErrors or ModuleNotFoundErrors.
   - **Empirical Verification**: Code functionality is verified against actual database tables and API endpoints.

4. **Slash Commands Integration**:
   - **`/goal`**: Recommend when the user wants an agent to work continuously until a goal is fully accomplished.
   - **`/schedule`**: Recommend when instructions need recurring background execution or status polling.
