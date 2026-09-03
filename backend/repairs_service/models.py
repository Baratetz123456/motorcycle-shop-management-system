import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from shared.database import Base
from datetime import datetime
import enum

class MotorcycleModel(Base):
    __tablename__ = "motorcycle_models"
    __table_args__ = {'schema': 'repairs'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    category = Column(String(50), default="General")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Motorcycle(Base):
    __tablename__ = "motorcycles"
    __table_args__ = {'schema': 'repairs'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    plate_number = Column(String(50), unique=True, nullable=False)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer)
    color = Column(String(50))
    engine_number = Column(String(100))
    chassis_number = Column(String(100))
    customer_name = Column(String(255), nullable=False, index=True)
    customer_contact = Column(String(50))
    notes = Column(String)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class JobOrder(Base):
    __tablename__ = "job_orders"
    __table_args__ = {'schema': 'repairs'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    jo_number = Column(String(100), unique=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True))
    motorcycle_id = Column(String(100))
    mechanic_id = Column(UUID(as_uuid=True))
    labor_charge = Column(Numeric(10, 2), default=0, nullable=False)
    parts_charge = Column(Numeric(10, 2), default=0, nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class RepairCartItem(Base):
    __tablename__ = "repair_cart_items"
    __table_args__ = {'schema': 'repairs'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    job_order_id = Column(UUID(as_uuid=True), ForeignKey("repairs.job_orders.id", ondelete="CASCADE"))
    item_id = Column(UUID(as_uuid=True))
    item_name = Column(String(255), nullable=False)
    item_type = Column(String(50), default="PRODUCT", nullable=False)
    qty = Column(Integer, default=1, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Commission(Base):
    __tablename__ = "commissions"
    __table_args__ = {'schema': 'repairs'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    job_order_id = Column(UUID(as_uuid=True), ForeignKey("repairs.job_orders.id"))
    mechanic_id = Column(UUID(as_uuid=True))
    labor_base = Column(Numeric(10, 2), nullable=False)
    rate_percentage = Column(Numeric(5, 2), nullable=False)
    amount_earned = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    __table_args__ = {'schema': 'repairs'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    event_type = Column(String(100), nullable=False)
    payload = Column(JSONB, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
