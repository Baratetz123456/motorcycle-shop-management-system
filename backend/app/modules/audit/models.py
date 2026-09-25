from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "logs"
    __table_args__ = {'schema': 'audit'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow, server_default=text("CURRENT_TIMESTAMP"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="SET NULL"), nullable=True)
    user_role = Column(String(50))
    action = Column(String(100), nullable=False)
    resource = Column(String(255), nullable=False)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
