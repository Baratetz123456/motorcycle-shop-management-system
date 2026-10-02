import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from shared.database import Base
from datetime import datetime
import enum

class TransactionStatus(enum.Enum):
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
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    items = relationship("TransactionItem", back_populates="transaction")

class TransactionItem(Base):
    __tablename__ = "transaction_items"
    __table_args__ = {'schema': 'sales'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("sales.transactions.id"))
    item_id = Column(String(100), nullable=False)
    qty = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    
    transaction = relationship("Transaction", back_populates="items")

class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {'schema': 'sales'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    transaction_id = Column(UUID(as_uuid=True), ForeignKey("sales.transactions.id"))
    amount = Column(Numeric(10, 2), nullable=False)
    method = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    __table_args__ = {'schema': 'sales'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    event_type = Column(String(100), nullable=False)
    payload = Column(JSONB, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
