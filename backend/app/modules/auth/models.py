from sqlalchemy import Column, String, DateTime, Integer, Numeric, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'auth'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    first_name = Column(String(100), nullable=False, default="")
    last_name = Column(String(100), nullable=False, default="")
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='cashier')
    token_version = Column(Integer, nullable=False, default=1)
    commission_rate = Column(Numeric(5, 2), nullable=True, default=40.0)
    base_wage = Column(Numeric(10, 2), nullable=True, default=650.0)
    avatar = Column(String(50), nullable=False, default='avatar-1')
    theme = Column(String(50), nullable=False, default='cyan')
    display_mode = Column(String(20), nullable=False, default='dark')
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"
    __table_args__ = {'schema': 'auth'}

    session_id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"))
    role = Column(String(50), nullable=False)
    email = Column(String(255), nullable=False)
    current_jti = Column(String(255), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_active_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    absolute_expiry = Column(DateTime(timezone=True), nullable=False)
    user_agent = Column(String(500))
    ip = Column(String(45))

class RevokedToken(Base):
    __tablename__ = "revoked_tokens"
    __table_args__ = {'schema': 'auth'}

    token_jti = Column(String(255), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id", ondelete="CASCADE"))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), default=datetime.utcnow)
