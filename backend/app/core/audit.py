from typing import Optional, Dict, Any
from uuid import UUID
import json
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def log_audit_event(
    session: Any = None,
    action: str = "",
    resource: str = "",
    user_id: Optional[UUID] = None,
    user_role: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """
    Inserts an immutable audit event directly into audit.logs in an isolated session.
    """
    try:
        details_json = json.dumps(details, default=str) if details else "{}"
        async with AsyncSessionLocal() as isolated_session:
            stmt = text("""
                INSERT INTO audit.logs (user_id, user_role, action, resource, details, ip_address)
                VALUES (:user_id, :user_role, :action, :resource, :details::jsonb, :ip_address)
            """)
            await isolated_session.execute(
                stmt,
                {
                    "user_id": user_id,
                    "user_role": user_role,
                    "action": action,
                    "resource": resource,
                    "details": details_json,
                    "ip_address": ip_address
                }
            )
            await isolated_session.commit()
    except Exception:
        pass
