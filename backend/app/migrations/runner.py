import asyncio
import os
from sqlalchemy import text
from app.core.database import engine, Base, init_db_schemas, AsyncSessionLocal
from app.modules.auth import models
from app.modules.auth.security import get_password_hash

async def run_migrations_and_seeding():
    # 1. Initialize schemas, models, and zero-cost idempotency/session tables
    await init_db_schemas(engine, Base.metadata)

    # 2. Check if auth.users is empty
    seeded_users = False
    async with AsyncSessionLocal() as session:
        try:
            res = await session.execute(text("SELECT count(*) FROM auth.users;"))
            count = res.scalar() or 0
        except Exception:
            count = 0

        if count == 0:
            users_to_seed = [
                {"email": "admin@motoshop.com", "password": "admin123", "role": "admin", "first_name": "System", "last_name": "Admin"},
                {"email": "manager@motoshop.com", "password": "manager123", "role": "manager", "first_name": "Shop", "last_name": "Manager"},
                {"email": "cashier@motoshop.com", "password": "cashier123", "role": "cashier", "first_name": "Main", "last_name": "Cashier"},
                {"email": "mechanic@motoshop.com", "password": "mechanic123", "role": "mechanic", "first_name": "Lead", "last_name": "Mechanic"},
            ]
            for u in users_to_seed:
                hashed_pw = get_password_hash(u["password"])
                db_u = models.User(
                    email=u["email"],
                    password_hash=hashed_pw,
                    role=u["role"],
                    first_name=u["first_name"],
                    last_name=u["last_name"]
                )
                session.add(db_u)
            await session.commit()
            seeded_users = True

    # 3. Seed operational catalog, motorcycles, and job orders if users were seeded
    if seeded_users:
        possible_paths = [
            os.path.join(os.path.dirname(__file__), "..", "..", "seed_operational_data.sql"),
            os.path.join(os.getcwd(), "backend", "seed_operational_data.sql"),
            os.path.join(os.getcwd(), "seed_operational_data.sql"),
        ]
        for sql_path in possible_paths:
            if os.path.exists(sql_path):
                with open(sql_path, "r", encoding="utf-8") as f:
                    sql_content = f.read()
                try:
                    async with engine.connect() as conn:
                        raw_conn = await conn.get_raw_connection()
                        await raw_conn.driver_connection.execute(sql_content)
                except Exception as seed_err:
                    print(f"Notice: Operational data seed error: {seed_err}")
                break

    return {"seeded_initial_data": seeded_users}

def handler(event, context):
    """
    AWS Lambda Migration Handler invoked by GitHub Actions CI/CD.
    Executes schema migrations and table setup inside the private VPC.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    try:
        result = loop.run_until_complete(run_migrations_and_seeding())
        return {
            "statusCode": 200,
            "status": "SUCCESS",
            "message": "Database schemas, zero-cost state tables, and seed data initialized successfully.",
            "details": result
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "status": "ERROR",
            "error": str(e)
        }

