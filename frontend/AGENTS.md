<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MotoShop Frontend Subagent Operating Directives

All agents and subagents operating within the `frontend/` directory (including `implementer-frontend`, `tester-build-lint`, and `tester-visual-browser`) must adhere strictly to these directives:

## 1. Subagent Runtime Invariants
- **File Scope Boundary**: Frontend subagents are strictly constrained to `frontend/src`, `frontend/public`, and `frontend/package.json`. Do not modify backend services, KrakenD configs, or root Docker manifests from a frontend subagent.
- **Autonomous Self-Correction Loop**: When encountering TypeScript compile errors, lint failures, or module resolution errors, subagents must autonomously diagnose and iterate up to 3 times to achieve a clean build before escalating.
- **Return Report Requirement**: Every subagent invocation must culminate in a structured report returning: Status (`SUCCESS` | `FAILURE`), Touched Files, Local Verification (`npm run build` output), and Residual Risks.

## 2. Architecture & Styling Invariants
- **Strict Light & Dark Mode Scoping**:
  - Light mode styles must be scoped under `html:not(.dark)` or `html.light`. Never apply unscoped global `.text-white` remapping.
  - Dark mode styles must be scoped under `html.dark`. Form controls (`input`, `select`, `textarea`) and data tables must have explicit `#18181b` / `#121215` backgrounds, `#ffffff` text, and `#71717a` placeholders.
  - Zero-specificity exclusion for official commercial receipts: BIR receipts must use `:not(:where(.printable-receipt, .printable-receipt *, [data-invoice-canvas="true"], [data-invoice-canvas="true"] *))` to stay on an authentic white canvas in dark mode.
- **React Rules of Hooks**:
  - Never declare hooks (`useState`, `useEffect`, `useRef`, `useCallback`, `useMemo`) after hydration or authentication guard early returns (`if (!isHydrated) return null;`). All hooks must be declared unconditionally at the very top of each component.
- **Shop Floor Mental Model & Canonical Content**:
  - Adhere to `frontend_style.md` Section 6 (*Showroom Counter*, *Workshop Job Cards*, *Parts & Stock*, *Customer Records*, *Bike Registry*, *Invoices & Receipts*, *Shop Reports*, *Payroll*, *Shop Settings*).
  - Button text: Verb-first, max 3 words.
  - WCAG AAA Button Contrast: Solid lime green buttons (`bg-lime-500`, `bg-cyan-500`) must use bold carbon black text (`#09090b`), never white text.
- **State Snapshots Prior to `clearCart()`**:
  - In checkout/POS flows, always snapshot financial totals to dedicated state before calling `clearCart()`.
