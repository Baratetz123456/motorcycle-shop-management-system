import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import DATABASE_URL

engine = create_async_engine(DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine, class_=AsyncSession, expire_on_commit=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db_schemas(target_engine, base_metadata=None):
    """
    Ensures all PostgreSQL database schemas, zero-cost state tables,
    and seed tables exist.
    """
    for schema_name in ["auth", "inventory", "sales", "repairs", "audit"]:
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

    # Ensure PostgreSQL-native session, revocation, and idempotency tables exist
    zero_cost_statements = [
        """
        CREATE TABLE IF NOT EXISTS auth.revoked_tokens (
            token_jti VARCHAR(255) PRIMARY KEY,
            user_id UUID,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires ON auth.revoked_tokens(expires_at);",
        """
        CREATE TABLE IF NOT EXISTS auth.user_sessions (
            session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID,
            role VARCHAR(50) NOT NULL,
            email VARCHAR(255) NOT NULL,
            current_jti VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            absolute_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
            user_agent VARCHAR(500),
            ip VARCHAR(45)
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_jti ON auth.user_sessions(current_jti);",
        """
        CREATE TABLE IF NOT EXISTS auth.idempotency_keys (
            key VARCHAR(128) PRIMARY KEY,
            user_id UUID,
            endpoint VARCHAR(255) NOT NULL,
            request_hash VARCHAR(64) NOT NULL,
            response_code INT NOT NULL,
            response_body JSONB NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL
        );
        """,
        "CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON auth.idempotency_keys(expires_at);",
        """
        CREATE TABLE IF NOT EXISTS audit.logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            user_id UUID,
            user_role VARCHAR(50),
            action VARCHAR(100) NOT NULL,
            resource VARCHAR(255) NOT NULL,
            details JSONB,
            ip_address VARCHAR(45)
        );
        """
    ]

    for stmt in zero_cost_statements:
        try:
            async with target_engine.begin() as conn:
                await conn.execute(text(stmt))
        except Exception:
            pass

