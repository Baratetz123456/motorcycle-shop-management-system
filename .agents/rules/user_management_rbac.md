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

## 2. Session Invalidation & Token Versioning
- `auth.users` contains a `token_version` integer column.
- Whenever a user's role is updated or permissions change, increment `token_version` in the database.
- `get_current_user` in `shared/security.py` MUST verify live `token_version` against DB on every request. Any token with an outdated `token_version` MUST return `401 Unauthorized` ("Session invalidated").

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
