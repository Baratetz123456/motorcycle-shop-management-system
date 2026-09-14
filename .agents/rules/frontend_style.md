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

## 2.3. Mobile Board & Profile Navigation Invariants
- **No Mobile Kanban Boards**: Interactive multi-column Kanban boards with touch drag-and-drop are prohibited on mobile screens (`< md`). On mobile, replace Kanban grids with **Tabbed Status Navigation** (`Pending`, `Ongoing`, `Completed`, `Invoiced`) with active count badges and direct 1-tap action buttons.
- **Top Filter Deduplication**: When a floating filter button (`FloatingFilterButton`) is anchored at the bottom right, do NOT duplicate search fields or filter buttons at the top of the mobile viewport. All mobile search and filter controls belong consolidated inside `MobileFilterSheet`.
- **Stage Movement Confirmation & Revert Options**: Mobile job cards must provide dual forward (advance) and backward (revert) stage action buttons, and MUST prompt an explicit `ConfirmModal` before modifying job stage to prevent accidental taps.
- **Card-Free Profile Canvas**: Mobile detail and profile views (`/repairs/jobs/[id]`) must never use heavy boxed card containers (`rounded-3xl border p-6 bg-zinc-900/60`). Standardize on an edge-to-edge canvas with clean borderless list rows, subtle dividers (`border-b border-white/5`), high-contrast typography, and a sticky horizontal tab menu (`Overview`, `Diagnosis`, `Parts & Services`, `History`).

## 3. State Management & Lifecycle Safety
- Use **Zustand** for local, client-side state (like POS Cart or UI toggles).
- **Snapshot Before Store Reset**: When completing multi-step operations like checkout or order creation, always snapshot transaction data into a local component state (`receiptSummary`) before clearing the global store (`clearCart()`). Wiping the store resets reactive calculations to zero.
- Use `apiClient` (`axios` instance with token interceptors) for microservice API communication.
- **Strict Hook Ordering**: All React hooks (`useRef`, `useState`, `useMemo`, `useCallback`, `useEffect`) must appear unconditionally above any role checks, hydration gates, or early returns (`if (!role) return null`).
- **Optimistic Drag-and-Drop Operations**: For interactive Kanban boards, always apply instant optimistic UI updates on card drops; do not await async network roundtrips to move cards between columns.
- **Touch Gesture Performance**: Never feed 60Hz-120Hz pointer/touch coordinates into React state during drag. Use direct `translate3d` transforms on ref elements with `requestAnimationFrame` and `willChange: "transform"`.

## 4. Transaction & Receipt UX Patterns
- **Dedicated Pages vs Modals**: Complex receipts, invoice inspections, and transaction details must open in dedicated full-page routes (e.g., `/sales/receipt?id=...`), not modal popups.
- **10-Section Official Commercial Invoice Standard**: Official invoice receipts (`/sales/receipt`) must capture all 10 core sections:
  1. Official Store Header & TIN (`491-002-884-000 NV`).
  2. Invoice & Order Metadata (Invoice No, Linked Job Order No, Timestamp, Status Pill).
  3. Customer & Bike Profile (Name, Phone, Bike Model, Plate / VIN).
  4. Staff Attribution (Cashier, Mechanic, Labor Commission Rate).
  5. Itemized Table with Category tags (`[PART]` vs `[SERVICE]`).
  6. BIR Tax Breakdown (12% VATable Sales, 12% VAT Amount, VAT-Exempt, Zero-Rated).
  7. Financial Settlement (Gross Subtotal, Discount, Net Due, Tendered, Change).
  8. Workshop Labor Commission Settlement (Gross Labor, Mechanic Commission, Net Shop Retained).
  9. Warranty & Statutory Terms (30-day labor, 7-day parts, RA 10173 notice).
  10. Dual Physical Signature Lines (Customer Received By & Authorized Cashier).
- **Print Cutoff Prevention Invariant**: In `@media print`, all ancestor containers (`html`, `body`, `#__next`, `div`, `main`, `section`, `article`) must enforce `height: auto !important; max-height: none !important; overflow: visible !important; position: static !important;` to eliminate page truncation across multi-page receipts. Dynamically set `document.title = "Invoice-" + invoice_no` before `window.print()`.
- **Structured CSV Export**: Provide a `Download CSV` action that exports identical financial, tax, itemized ledger, and signatory data.
- **Single Top Back Button & Void Safeguard**: Keep a single `< Back to Invoices` button at the top (no redundant bottom back button), and require an irreversible danger `ConfirmModal` (`confirmVariant="danger"`) before voiding transactions.
- **Suspense Boundaries**: Any page utilizing `useSearchParams()` must be wrapped in a `<Suspense>` boundary to ensure clean Next.js static and dynamic prerendering.

## 4.1. Card-Free Split-Screen Login Invariant
- The login page must **never use a boxed card container** (`bg-zinc-900/70 border border-white/10 rounded-2xl shadow-2xl p-6`).
- Standardize on a modern split-screen layout:
  - **Desktop Showcase Banner (`hidden lg:flex lg:w-1/2`)**: Workshop platform identity with Versiklo badge, workshop capability badges (Repair Kanban, Fast POS, Commission Ledgers), and a live microservice status indicator.
  - **Seamless Form Panel (`w-full lg:w-1/2`)**: Borderless, frameless inputs (`bg-zinc-900/80 border border-white/10 focus:border-cyan-500 rounded-xl`), high-contrast Cyan submit button, and streamlined quick-demo role chips (`Admin`, `Cashier`, `Mechanic`, `Manager`) sitting directly on the canvas without card enclosure boxes.
  - **Mobile Responsive**: Adapts naturally to a full-screen borderless layout on mobile viewports without cramped card padding.

## 5. Design Aesthetics: High-Octane Minimalist Light Theme (Kawasaki Lime Green)
- **Primary Aesthetic**: MotoShop standardizes on a **High-Octane Minimalist Light Theme** inspired by motorcycle racing engineering:
  - **Pure White Canvas**: Crisp white background (`#ffffff`), seamless cards (`#ffffff`), and subtle off-canvas backdrops (`#f8fafc`).
  - **Metallic Hairline Dividers**: Sleek hairline borders (`#e2e8f0` and `#cbd5e1`) replacing heavy card enclosures and dark borders.
  - **Deep Carbon Typography**: High-contrast text in `#18181b` and `#0f172a` with `#000000` accents.
  - **Electric Kawasaki Racing Lime Green (`#84cc16` / `#65a30d` / `#4d7c0f`)**: Used for primary action buttons, active navigation pills, and focus glow rings.
- **WCAG AAA Button Text Contrast Invariant**:
  - Solid lime green action buttons (`bg-lime-500`, `bg-cyan-500`, `bg-lime-400`) MUST strictly use bold carbon black text (`#09090b`) to maintain contrast ratios exceeding 12:1. White text on lime green is strictly prohibited.
  - Solid dark action buttons (e.g., red destructive/void, purple diagnostic) preserve pure white text (`#ffffff`).
- **Card-Free Modern Workshop**: Prohibit boxed card enclosures on management pages; use open canvas layouts with hairline dividers and borderless list rows.
- **Glassmorphism & Gradients**: Utilize subtle backdrop blurs and clean metallic borders. Header titles use clean deep carbon typography (`text-zinc-900 font-extrabold`).
- **Micro-animations**: Elements should respond to interaction. Use `transition-all`, `hover:scale-[1.02]`, `hover:border-lime-500/50`, and subtle box shadows (`shadow-sm hover:shadow-md`).
- **High-Contrast Light Mode Invariants**:
  - Sign Out & Destructive buttons: Must use explicit high-contrast red styling (`text-red-700 bg-red-100 border-red-300`).
  - Disabled buttons: Prohibit white text on light backgrounds. Use muted high-contrast slate tokens (`text-slate-600 bg-slate-100 border-slate-300`).
  - Clean Content Canvas: Prohibit ambient blur blobs and noisy inner gradients behind text to maintain pristine readability.
- **Universal Touch Scrolling & Scrollbar Sizing**:
  - Top-level scrollable viewports must support touch panning (`touch-pan-y`, `touch-pan-x`) and `overscroll-contain`.
  - Use slim 6px theme-adaptive scrollbars on main viewports and 4px compact scrollbars (`.scrollbar-compact`) on modal dialogs and Kanban column card decks.

## 5.1. Strict Light & Dark Mode CSS Separation & Theme Persistence Invariants
- **No Unmount / Tab Mode Reversion**: Page and drawer components (particularly `/settings` and user profiles) must NEVER rollback or revert appearance mode (`dark`, `light`, `system`) on component unmount (`useEffect` return cleanup) or tab switches. Mode selection must apply and persist immediately across page transitions.
- **Strict CSS Scoping in Global Stylesheets (`globals.css`)**:
  - Every light-mode rule (especially text remappings like `.text-white` to dark carbon `#0f172a`, card surfaces, hairline borders, and status pills) MUST be strictly scoped under `html:not(.dark)` or `html.light`. Never apply unscoped global `.text-white` remapping which turns dark mode text into invisible dark slate.
  - Form controls (`input`, `select`, `textarea`) and tables (`table`, `th`, `td`) MUST provide explicit scoped rules for both light mode (`html:not(.dark)`) and dark mode (`html.dark`):
    - Dark mode inputs: `#18181b` surface, `#3f3f46` hairline border, bold `#ffffff` text, `#71717a` placeholder, and `#84cc16` lime focus ring.
    - Dark mode tables: `#18181b` headers, `#121215` rows, `#1c1c22` hover state, `#27272a` dividers, and `#f4f4f5` text.
- **Zero-Specificity Receipt Canvas Exclusions**:
  - The official commercial receipt (`/sales/receipt`) MUST strictly maintain the BIR White Canvas invariant (`#ffffff` canvas, subtle `#f8fafc` sub-cards, `#0f172a` typography) even when `html.dark` is active.
  - Dark mode card, divide, border, and table rules must use `:not(:where(.printable-receipt, .printable-receipt *, [data-invoice-canvas="true"], [data-invoice-canvas="true"] *))` exclusion selectors. Because `:where()` has zero specificity `(0, 0, 0)`, it protects descendants without inflating selector specificity.
- **Multi-Key Theme Storage & Pre-Hydration**:
  - `saveAppMode` must synchronize across user-keyed storage (`motoshop_app_mode_${userId}`), global mode (`motoshop_app_mode`), and legacy key (`motoshop_theme_mode`), dispatching both `mode_updated` and `motoshop_theme_changed` events.
  - The blocking `<head>` script in `layout.tsx` must inspect user-keyed mode first, then global mode, setting `document.documentElement.classList` (`dark` vs `light`) and `data-mode` prior to render to eliminate hydration theme flash.

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
