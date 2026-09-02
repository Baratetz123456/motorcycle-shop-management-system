---
name: db-migrate
description: Generates and applies database migrations using SQLAlchemy Alembic and the Supabase CLI.
---

# Database Migration Skill

Use this skill when the user needs to alter the database schema (add tables, add columns, etc.).

## Workflow

1.  **Identify Changes**: Determine which SQLAlchemy `models.py` files were changed.
2.  **Generate Alembic Revision**:
    *   Instruct the user to run (or run it for them if configured):
        ```bash
        cd backend
        alembic revision --autogenerate -m "Description of change"
        ```
    *   *Note: If Alembic isn't initialized yet, run `alembic init alembic` and configure `alembic.ini` to use the async Postgres driver first.*
3.  **Apply Alembic Locally**:
    ```bash
    alembic upgrade head
    ```
4.  **Supabase CLI Mapping (For Production)**:
    *   Since the remote is Supabase, instruct the user to generate a Supabase migration file that matches the Alembic SQL.
    *   ```bash
        supabase migration new description_of_change
        ```
    *   Copy the raw SQL from the Alembic upgrade script into the newly generated `supabase/migrations/<timestamp>_description_of_change.sql` file.
5.  **Apply to Supabase**:
    *   ```bash
        supabase db push
        ```
