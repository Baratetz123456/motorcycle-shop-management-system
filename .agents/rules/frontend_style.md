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
- **Concise Navigation**: Avoid cluttering the top-level sidebar with administrative sub-pages (e.g., User Management and Audit Logs belong consolidated under Settings). Place contextual creation/registration buttons as header actions directly on management pages.
- **Consolidated Audit Logs Invariant**: Do NOT scatter individual "Audit Log", "Audit Trail", or "Stock Audit" buttons across operational shop pages (`/sales`, `/repairs/board`, `/pos`, `/payroll`, `/inventory`, `/sales/receipt`). System-wide audit logs belong strictly consolidated under the **Settings** page (`/settings?tab=logs`) and the dedicated `/audit-logs` route.
- **Primary Data Table Columns**: For user lists, use **Email Address** as the primary column with a styled `(YOU)` tag for the logged-in user account.
- **Universal Full-Width Fluid Layout**: All operational pages (POS terminal, checkout, active repair board, inventory, customer repair history, user management, audit logs, and settings) must expand fluidly across widescreen displays (`w-full min-h-screen bg-zinc-950 p-8`). Prohibit restrictive container caps (`max-w-7xl mx-auto` or `max-w-4xl mx-auto`).

## 2.1. Tailwind CSS v4 Dynamic Theming Engine
- **Theme Palette Invariant**: Tailwind CSS v4 resolves utility classes from CSS custom variables (`--color-cyan-*`, `--color-blue-*`, `--color-indigo-*`).
- To support runtime theme switching across existing codebases without rewriting utilities, override root color tokens under `html[data-theme="..."]` in `globals.css` with `!important`.
- **Pre-Hydration Flicker Guard**: Always include an inline blocking script in the `<head>` of `layout.tsx` reading `localStorage.getItem("motoshop_app_theme")` and setting `document.documentElement.setAttribute("data-theme", ...)` prior to paint.
- **Settings vs. Profile Separation**: Store-wide identity and theme selection belong in the Admin **General Preferences** tab. Inside the **Profile** tab, wrap theme controls with `{!isAdmin && renderThemeSelector()}` to prevent duplicate controls for administrators.

## 2.2. Mobile Floating Action Buttons (FAB) & Bottom Drawer Invariants
- **Root Document Body Portaling**: Floating Action Buttons (`FloatingFilterButton`) and slide-up bottom sheets/drawers (`MobileFilterSheet`, `Modal`, `CheckoutModal`) must mount directly into `document.body` via `createPortal(content, document.body)` with an SSR-safe `mounted` state guard (`const [mounted, setMounted] = useState(false)`). This guarantees elements are never trapped or displaced by parent overflow containers or CSS transform containing blocks (`will-change: transform`, animations).
- **Sticky Bottom & Safe Area Insets**:
  - FABs: Anchored with `fixed right-5 z-40 md:hidden` and `bottom: max(1.25rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))`.
  - Bottom Drawer Footers: Slide-up action buttons (e.g., "Apply & View Results") must be styled with `shrink-0 sticky bottom-0 z-20 bg-zinc-950` and bottom safe-area insets (`paddingBottom: max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))`).
- **Zero Horizontal Scrolling on Mobile**: Prohibit horizontal swipe pill rails (`overflow-x-auto no-scrollbar touch-pan-x`) on mobile viewports (`< md`). Use full-width vertical stacks, 2-to-3 column responsive grids, or mobile select dropdowns.

## 3. State Management & Lifecycle Safety
- Use **Zustand** for local, client-side state (like POS Cart or UI toggles).
- **Snapshot Before Store Reset**: When completing multi-step operations like checkout or order creation, always snapshot transaction data into a local component state (`receiptSummary`) before clearing the global store (`clearCart()`). Wiping the store resets reactive calculations to zero.
- Use `apiClient` (`axios` instance with token interceptors) for microservice API communication.
- **Strict Hook Ordering**: All React hooks (`useRef`, `useState`, `useMemo`, `useCallback`, `useEffect`) must appear unconditionally above any role checks, hydration gates, or early returns (`if (!role) return null`).
- **Optimistic Drag-and-Drop Operations**: For interactive Kanban boards, always apply instant optimistic UI updates on card drops; do not await async network roundtrips to move cards between columns.
- **Touch Gesture Performance**: Never feed 60Hz-120Hz pointer/touch coordinates into React state during drag. Use direct `translate3d` transforms on ref elements with `requestAnimationFrame` and `willChange: "transform"`.

## 4. Transaction & Receipt UX Patterns
- **Dedicated Pages vs Modals**: Complex receipts, invoice inspections, and transaction details must open in dedicated full-page routes (e.g., `/sales/receipt?id=...`), not modal popups.
- **Standard Receipt Utilities**: Provide **Print Receipt** (`window.print()`), **Copy Invoice #**, staff attribution badges (Cashier & Mechanic), and linked navigation to audit logs.
- **Suspense Boundaries**: Any page utilizing `useSearchParams()` must be wrapped in a `<Suspense>` boundary to ensure clean Next.js static and dynamic prerendering.

## 4.1. Card-Free Split-Screen Login Invariant
- The login page must **never use a boxed card container** (`bg-zinc-900/70 border border-white/10 rounded-2xl shadow-2xl p-6`).
- Standardize on a modern split-screen layout:
  - **Desktop Showcase Banner (`hidden lg:flex lg:w-1/2`)**: Workshop platform identity with Versiklo badge, workshop capability badges (Repair Kanban, Fast POS, Commission Ledgers), and a live microservice status indicator.
  - **Seamless Form Panel (`w-full lg:w-1/2`)**: Borderless, frameless inputs (`bg-zinc-900/80 border border-white/10 focus:border-cyan-500 rounded-xl`), high-contrast Cyan submit button, and streamlined quick-demo role chips (`Admin`, `Cashier`, `Mechanic`, `Manager`) sitting directly on the canvas without card enclosure boxes.
  - **Mobile Responsive**: Adapts naturally to a full-screen borderless layout on mobile viewports without cramped card padding.

## 5. Design Aesthetics (The "WOW" Factor)
- Always use a Dark Mode default (`bg-zinc-950`).
- **Glassmorphism**: Utilize `bg-zinc-900/60 backdrop-blur-xl` and subtle borders (`border-white/10`) for cards, tables, and headers.
- **Gradients**: Use vibrant text gradients for primary headers (e.g., `bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500`).
- **Micro-animations**: Elements should respond to interaction. Use `transition-all`, `hover:scale-105`, `hover:border-cyan-500/50`, and subtle box shadows (`shadow-lg shadow-cyan-500/20`).
- Avoid generic plain colors; use curated Tailwind hues like `cyan-400`, `blue-500`, `zinc-900`, `zinc-950`.
- **High-Contrast Light Mode Invariants**:
  - Sign Out & Destructive buttons: Must use explicit high-contrast red styling (`text-red-700 bg-red-100 border-red-300` in light mode; `text-red-400 bg-red-500/10 border-red-500/20` in dark mode).
  - Disabled buttons: Prohibit white text on light backgrounds. Use muted high-contrast slate tokens (`text-slate-600 bg-slate-100 border-slate-300` in light mode).
  - Clean Content Cards: Prohibit ambient blur blobs and noisy inner gradients behind card text in light mode to maintain pristine readability.
- **Universal Touch Scrolling & Scrollbar Sizing**:
  - Top-level scrollable viewports must support touch panning (`touch-pan-y`, `touch-pan-x`) and `overscroll-contain`.
  - Use slim 6px theme-adaptive scrollbars on main viewports and 4px compact scrollbars (`.scrollbar-compact`) on modal dialogs and Kanban column card decks.

## 6. Versiklo Canonical Content System & Shop Floor Copy

When writing or updating user-facing copy, titles, buttons, or badges, you MUST strictly follow the canonical content guidelines:

### 6.1. Product Identity & Jargon Invariants
- **Product Name**: **Versiklo — Motorcycle Shop Management**.
- **Audience**: Motorcycle shop owners, service managers, mechanics, and parts counter staff.
- **Strictly Prohibited Jargon**: Never use *"ERP"*, *"DMS"*, *"SMS"*, *"cloud-native"*, *"microservices"*, *"role-based POS"*, or technical infrastructure jargon in user-facing copy.

### 6.2. The Shop Floor Mental Model (6 Navigation Zones)
- **`DASHBOARD`**: `/dashboard` — Today's revenue, active jobs, counter volume, quick actions.
- **`SHOWROOM`**: `/pos` — Showroom Counter, counter sales, walk-in services, active cart.
- **`WORKSHOP`**: `/repairs/board` — Workshop Job Cards (Kanban: *New*, *In Progress*, *Completed*, *Invoiced*).
- **`PARTS`**: `/inventory` — Parts & Stock, inventory catalog, reorder levels, counter pricing.
- **`CUSTOMERS`**:
  - `/repairs/history` — Customer Records, returning customer repair logs, bikes on bench.
  - `/motorcycles` — Bike Registry, catalog of bike makes, models, and service intervals.
- **`BACK OFFICE`**:
  - `/sales` — Invoices & Receipts, completed sales receipts, voided transactions.
  - `/reports` — Shop Reports, revenue trends, mechanic commission reports.
  - `/payroll` — Payroll & Commissions, mechanic commission rates, cashier shift pay.
  - `/settings` — Shop Settings (Admin) / My Profile (Non-Admin), currency, timezone, appearance, staff accounts.

### 6.3. "One Concept = One Word" Canonical Glossary
Always enforce single canonical terms across every screen:
- **`Job Card`**: Never use *Job Order*, *Work Order*, *JO*, or *Repair Session*.
- **`Part`**: Never use *Product*, *SKU*, or *Merchandise* for inventory items.
- **`Bike` / `Bike Model`**: Never use *Motorcycle Profile*, *Machine*, or *Vehicle*.
- **`Mechanic`**: Never use *Technician*, *Tech*, or *Operator*.
- **`Receipt` / `Sales Receipt`**: Never use *Official Receipt*, *Invoice Slip*, or *Ticket*.
- **`Audit Log`**: Never use *Audit Trail*, *History Trail*, or *Change History Logs*.
- **`Shop Settings`**: Never use *System Settings & Configuration* or *Store Identity*.

### 6.4. Outcome-Based Action Buttons
- Buttons must be verb-first, action-oriented, and maximum 3 words.
- Examples: `New Job Card`, `Go to Payment`, `Record Payment`, `Print Receipt`, `Start Job`, `View History`, `Save`, `Reset Defaults`, `+ Add Staff`, `+ New Part`, `+ Add Bike Model`, `Export CSV`.

### 6.5. Backend-Frontend Separation Invariant
- Backend PostgreSQL enum types and SQLAlchemy models (`PENDING`, `ONGOING`, `COMPLETED`, `RELEASED`, `PRODUCT`, `SERVICE`) must never be renamed or broken.
- All canonical copy harmonization happens strictly at the UI presentation and gateway mapping layer.
