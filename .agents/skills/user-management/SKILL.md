---
name: user-management
description: >-
  Instructions and runbook for managing users, RBAC roles, audit logging, session invalidation,
  and change password workflows in MotoShop. Use when adding user endpoints, modifying roles,
  or updating authentication security.
---

# User Management & RBAC Skill

This skill provides step-by-step procedures for managing system users, role-based access control, session invalidation, and immutable audit logs.

## Core Workflows

### 1. Registering a New User (Admin-Only)
- Endpoint: `POST /api/v1/auth/users/register`
- Inputs: `first_name`, `last_name`, `email`, `role` (`admin`, `cashier`, `mechanic`, `manager`), `password` (default `Welcome123!`).
- Behavior: Hashes password with bcrypt, saves to `auth.users`, and logs `CREATE_USER` audit event.

### 2. Updating User Info & Role Changes
- Endpoint: `PUT /api/v1/auth/users/{user_id}`
- Admin Self-Protection: Reject if `user_id == current_user.id` and `role` is being modified.
- Session Invalidation: If `role` changes, increment `token_version` in `auth.users`. Any subsequent API call with an old token will return `401 Unauthorized`.
- Audit Logging: Log `UPDATE_USER` and `CHANGE_ROLE` audit events.

### 3. Deleting a User
- Endpoint: `DELETE /api/v1/auth/users/{user_id}`
- Admin Self-Protection: Reject if `user_id == current_user.id`.
- DB Constraint: `audit.logs.user_id` foreign key uses `ON DELETE SET NULL`.
- Audit Logging: Log `DELETE_USER` audit event.

### 4. Self-Service Change Password
- Endpoint: `POST /api/v1/auth/change-password`
- Validation: Current password match, new password length ≥ 6, new password ≠ current password.
- Audit Logging: Log `PASSWORD_CHANGED` audit event.

### 5. Immutability Verification
To verify PostgreSQL trigger blocks audit log updates/deletes:
```sql
UPDATE audit.logs SET action='MUTATED' WHERE action='LOGIN_SUCCESS';
-- Expect: ERROR: Audit log entries are immutable and cannot be updated.
```
