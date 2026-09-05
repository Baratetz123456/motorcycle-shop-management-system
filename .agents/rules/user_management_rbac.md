# User Management, RBAC & Audit Logging Rules

When developing, modifying, or extending user authentication, authorization, role management, or audit logging in this project, you MUST adhere to the following rules:

## 1. Role-Based Access Control (RBAC) & Route Security
- **Supported Roles**: `admin`, `cashier`, `mechanic`, `manager`.
- **Role Home Landing Pages**:
  - `admin` → `/reports` (`/dashboard`)
  - `manager` → `/reports` (`/dashboard`)
  - `cashier` → `/pos`
  - `mechanic` → `/repairs/board` (`/repair-board`)
- **Dual Protection**: Enforce route access on BOTH frontend (`ProtectedRoute` & `permissions.ts`) AND backend (`require_roles` dependency in `shared/security.py`).
- **Forbidden Status Code**: Return HTTP `403 Forbidden` for unauthorized roles (never 200 with error payload). Automatically log an `ACCESS_DENIED` security audit event.
- **Graceful Login Fallback & URL Masking**: If a user's default role landing page is restricted in custom permissions, fall back to their first authorized accessible page. Display access notices using human-readable page titles (e.g. "Inventory Management"), never raw resource paths. If all routes are restricted, block login with an explicit authorization warning.
- **Sidebar Filtering**: Restricted routes must be completely hidden from the sidebar navigation for that user's active role.

## 2. Session Architecture, Token Lifetimes & Invalidation
- **Ephemeral In-Memory Access Tokens**:
  - **NEVER** store JWT access tokens in `localStorage` or `sessionStorage`.
  - Access tokens must reside strictly in ephemeral React application memory (`tokenStore`), expiring in **15 minutes**.
  - Upon closing the browser or tab, RAM is freed and the access token is instantly destroyed.
- **True Browser Session Cookies**:
  - `refresh_token` MUST be issued as an `HttpOnly`, `SameSite=Lax`, `Path=/api/v1/auth` cookie with **NO** `Max-Age` and **NO** `Expires` directives.
  - The omission of expiration directives designates it as a true browser session cookie, instructing the browser to discard it immediately upon complete browser closure.
- **Dual-Timeout Session Architecture (Redis)**:
  - **Idle Inactivity Window**: 30-minute sliding expiration in Redis (`session:{id}`), refreshed upon active request/token refresh.
  - **Absolute Shift Ceiling**: 8-hour hard maximum lifetime from initial session creation, preventing sessions from being kept alive indefinitely.
  - **Refresh Token Rotation (RTR)**: Each refresh generates a new unique JTI and deletes the previous JTI. Replay of an old JTI triggers immediate session invalidation (reuse detection).
- **Server-Side Logout Invalidation**:
  - `/auth/logout` MUST proactively terminate the session in Redis (`session:{id}`) and revoke the active `refresh_jti`, alongside clearing the browser cookie (`Max-Age=0`).
- **Live Token Versioning**:
  - `auth.users` maintains a `token_version` integer column.
  - Whenever a user's role or security state changes, increment `token_version`. Outdated token versions return HTTP `401 Unauthorized`.
- **Frontend 401 Mutex & Inactivity Tracking**:
  - Axios client must use an `isRefreshing` mutex and promise queue (`failedQueue`) to prevent concurrent refresh races on 401 responses.
  - Client-side `useIdleTimer` tracks user activity and triggers proactive `/logout` after 30 minutes of idle inactivity.

## 3. Admin Self-Protection Guards
- Admin users **MUST NOT** be allowed to change their own role (e.g. demote self from `admin`).
- Admin users **MUST NOT** be allowed to delete their own account.
- Enforce these checks on both the frontend UI (disable actions with notice) and the backend API (raise `400 Bad Request`).

## 4. Immutable Audit Logs & DB Triggers
- All system events (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGOUT`, `CREATE_USER`, `UPDATE_USER`, `CHANGE_ROLE`, `DELETE_USER`, `PASSWORD_CHANGED`, `POS_CHECKOUT`, `STOCK_UPDATE`, `REPAIR_JOB_UPDATE`, `ACCESS_DENIED`) must be inserted into `audit.logs`.
- The `audit.logs` table is **append-only**. The PostgreSQL trigger `audit.prevent_audit_log_modification()` MUST prevent `DELETE` operations and manual `UPDATE` operations.
- Foreign keys pointing to `auth.users(id)` (e.g., in `audit.logs`) MUST use `ON DELETE SET NULL` so deleting user accounts never breaks audit log integrity or violates immutability triggers.

## 5. UI Preferences for User Tables & Navigation
- In user tables, display **Email Address** as the primary identifying column with a `(YOU)` badge tag for the current logged-in user.
- Keep sidebar navigation concise; place creation/registration actions (like "Register New User") as contextual action buttons on their respective management pages rather than top-level sidebar tabs.
- Use a **collapsable sidebar** with smooth width transitions (`w-64` / `w-20`), icon tooltips, and state persistence in `localStorage`.

## 6. Settings Integration & Staff Directory Format
- **Sidebar Consolidation**: Do not include standalone top-level sidebar items for `User Management` or `Audit Logs`. Integrate them inside the `/settings` workspace (`/settings?tab=users` and `/settings?tab=logs`).
- **User Management Table**: Restrict staff directory table columns to: Staff Name (with initials avatar), Email Address, and Assigned Role badge.
- **Role Filter Pills**: Filter staff users using segmented pill buttons (`ALL`, `admin`, `manager`, `cashier`, `mechanic`).
- **2-Column Registration**: User registration and edit forms must employ a balanced two-column grid layout with top navigation back-links returning to `/settings?tab=users`.
