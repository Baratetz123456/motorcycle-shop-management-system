import os
import sys
from typing import Optional, Any, Dict
from datetime import datetime
from uuid import UUID

from sqlalchemy import Column, String, DateTime, text, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession
from shared.database import Base, AsyncSessionLocal

class AuditLog(Base):
    __tablename__ = "logs"
    __table_args__ = {'schema': 'audit'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    user_id = Column(PG_UUID(as_uuid=True), nullable=True)
    user_role = Column(String(50), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(255), nullable=False)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)

async def log_audit_event(
    session: Optional[AsyncSession],
    action: str,
    resource: str,
    user_id: Optional[UUID] = None,
    user_role: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """
    Logs an immutable audit event to the audit.logs table.
    Creates its own session if session is None.
    """
    event = AuditLog(
        user_id=user_id,
        user_role=user_role,
        action=action,
        resource=resource,
        details=details,
        ip_address=ip_address
    )

    if session is not None:
        session.add(event)
        await session.commit()
    else:
        async with AsyncSessionLocal() as isolated_session:
            isolated_session.add(event)
            await isolated_session.commit()
