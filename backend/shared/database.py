import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://postgres:123@localhost:5432/motorcycle_shop"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

from sqlalchemy import text

Base = declarative_base()

async def init_db_schemas(target_engine, base_metadata=None):
    """
    Ensures all PostgreSQL database schemas and core tables exist.
    """
    for schema_name in ["repairs", "sales", "inventory", "audit", "auth"]:
        try:
            async with target_engine.begin() as conn:
                await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name};"))
        except Exception:
            pass

    if base_metadata is not None:
        try:
            async with target_engine.begin() as conn:
                await conn.run_sync(base_metadata.create_all)
        except Exception:
            pass

    try:
        async with target_engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS repairs.motorcycle_models (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    brand VARCHAR(100) NOT NULL,
                    model VARCHAR(100) NOT NULL,
                    year INTEGER NOT NULL,
                    category VARCHAR(50) DEFAULT 'General',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
    except Exception:
        pass

    column_migrations = [
        "ALTER TABLE IF EXISTS repairs.motorcycle_models ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;",
        "ALTER TABLE IF EXISTS repairs.job_orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);",
        "ALTER TABLE IF EXISTS repairs.job_orders ADD COLUMN IF NOT EXISTS mechanic_name VARCHAR(255);",
        "ALTER TABLE IF EXISTS repairs.job_orders ADD COLUMN IF NOT EXISTS mechanic_notes TEXT;",
        "ALTER TABLE IF EXISTS repairs.job_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'UNPAID';",
        "ALTER TABLE IF EXISTS repairs.job_orders ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE IF EXISTS repairs.job_orders ADD COLUMN IF NOT EXISTS labor_charge NUMERIC(10, 2) DEFAULT 0;",
        "ALTER TABLE IF EXISTS repairs.job_orders ADD COLUMN IF NOT EXISTS parts_charge NUMERIC(10, 2) DEFAULT 0;",
        "ALTER TABLE IF EXISTS repairs.motorcycles ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);",
        "ALTER TABLE IF EXISTS repairs.motorcycles ADD COLUMN IF NOT EXISTS customer_contact VARCHAR(50);",
        "ALTER TABLE IF EXISTS repairs.motorcycles ADD COLUMN IF NOT EXISTS notes TEXT;",
        "ALTER TABLE IF EXISTS auth.users ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5, 2) DEFAULT 40.0;",
        "ALTER TABLE IF EXISTS auth.users ADD COLUMN IF NOT EXISTS base_wage NUMERIC(10, 2) DEFAULT 650.0;",
    ]

    for stmt in column_migrations:
        try:
            async with target_engine.begin() as conn:
                await conn.execute(text(stmt))
        except Exception:
            pass

    try:
        async with target_engine.begin() as conn:
            await conn.execute(text("""
                INSERT INTO repairs.job_orders (jo_number, customer_name, motorcycle_id, mechanic_name, mechanic_notes, labor_charge, parts_charge, status, is_paid, payment_status)
                VALUES
                ('JO-A1B2', 'John Doe', 'Yamaha MT-07 (2023)', 'Mike Smith', 'Engine oil change & front brake pad replacement.', 150.00, 65.00, 'ONGOING', FALSE, 'UNPAID'),
                ('JO-C3D4', 'Jane Roe', 'Honda Click 125i (2022)', 'Mike Smith', 'CVT belt inspection and cleaning.', 80.00, 0.00, 'PENDING', FALSE, 'UNPAID'),
                ('JO-E5F6', 'Bob Lee', 'Kawasaki Ninja 400 (2023)', 'Alex Rivera', 'Front fork oil replacement and seal inspection.', 120.00, 35.00, 'COMPLETED', TRUE, 'PAID')
                ON CONFLICT (jo_number) DO NOTHING;
            """))
    except Exception:
        pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
