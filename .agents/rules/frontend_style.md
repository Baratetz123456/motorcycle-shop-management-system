# MotoShop Frontend Style & UI Preferences

When generating or modifying React components in this project, you MUST adhere to the following style rules:

## 1. Tech Stack
- Next.js 15 (App Router).
- Tailwind CSS v4.
- `lucide-react` for iconography.
- Custom styled components with Tailwind utilities.

## 2. Navigation & Layout Guidelines
- **Collapsable Sidebar**: Main layout uses a collapsable sidebar with smooth width transitions (`w-64` expanded, `w-20` collapsed) and state persistence via `localStorage.getItem("sidebar_collapsed")`.
- **Icon Tooltips**: When the sidebar is collapsed, display centered icons with `title` attributes for clear tooltips.
- **Concise Navigation**: Avoid cluttering the top-level sidebar with primary action pages. Place contextual creation/registration buttons as header actions directly on management pages.
- **Primary Data Table Columns**: For user lists, use **Email Address** as the primary column with a styled `(YOU)` tag for the logged-in user account.

## 3. State Management & Lifecycle Safety
- Use **Zustand** for local, client-side state (like POS Cart or UI toggles).
- **Snapshot Before Store Reset**: When completing multi-step operations like checkout or order creation, always snapshot transaction data into a local component state (`receiptSummary`) before clearing the global store (`clearCart()`). Wiping the store resets reactive calculations to zero.
- Use `apiClient` (`axios` instance with token interceptors) for microservice API communication.

## 4. Transaction & Receipt UX Patterns
- **Dedicated Pages vs Modals**: Complex receipts, invoice inspections, and transaction details must open in dedicated full-page routes (e.g., `/sales/receipt?id=...`), not modal popups.
- **Standard Receipt Utilities**: Provide **Print Official Receipt** (`window.print()`), **Copy Invoice #**, staff attribution badges (Cashier & Mechanic), and linked navigation to audit logs.
- **Suspense Boundaries**: Any page utilizing `useSearchParams()` must be wrapped in a `<Suspense>` boundary to ensure clean Next.js static and dynamic prerendering.

## 5. Design Aesthetics (The "WOW" Factor)
- Always use a Dark Mode default (`bg-zinc-950`).
- **Glassmorphism**: Utilize `bg-zinc-900/60 backdrop-blur-xl` and subtle borders (`border-white/10`) for cards, tables, and headers.
- **Gradients**: Use vibrant text gradients for primary headers (e.g., `bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500`).
- **Micro-animations**: Elements should respond to interaction. Use `transition-all`, `hover:scale-105`, `hover:border-cyan-500/50`, and subtle box shadows (`shadow-lg shadow-cyan-500/20`).
- Avoid generic plain colors; use curated Tailwind hues like `cyan-400`, `blue-500`, `zinc-900`, `zinc-950`.
