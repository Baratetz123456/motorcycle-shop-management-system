from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    VOIDED = "VOIDED"

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = {'schema': 'sales'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    invoice_no = Column(String(100), unique=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True))
    cashier_name = Column(String(255))
    mechanic_name = Column(String(255))
    job_order_id = Column(UUID(as_uuid=True))
    subtotal = Column(Numeric(10, 2), default=0, nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0, nullable=False)
    discount_amount = Column(Numeric(10, 2), default=0, nullable=False)
    total = Column(Numeric(10, 2), default=0, nullable=False)
    amount_paid = Column(Numeric(10, 2), default=0, nullable=False)
    cash_received = Column(Numeric(10, 2), default=0, nullable=False)
    cash_change = Column(Numeric(10, 2), default=0, nullable=False)
    status = Column(Enum(TransactionStatus, name="transaction_status", schema="sales", inherit_schema=True), default=TransactionStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    items = relationship("TransactionItem", back_populates="transaction", cascade="all, delete-orphan")

class TransactionItem(Base):
    __tablename__ = "transaction_items"
    __table_args__ = {'schema': 'sales'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("sales.transactions.id", ondelete="CASCADE"))
    item_id = Column(String(100), nullable=False)
    qty = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    transaction = relationship("Transaction", back_populates="items")

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {'schema': 'sales'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("sales.transactions.id", ondelete="CASCADE"))
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
