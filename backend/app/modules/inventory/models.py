from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, Enum, text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class ItemType(str, enum.Enum):
    PRODUCT = "PRODUCT"
    SERVICE = "SERVICE"

class MovementType(str, enum.Enum):
    IN = "IN"
    OUT = "OUT"
    SALE = "SALE"
    REPAIR = "REPAIR"

class Item(Base):
    __tablename__ = "items"
    __table_args__ = {'schema': 'inventory'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    sku = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    brand = Column(String(100), nullable=True)
    item_type = Column(Enum(ItemType, name="item_type", schema="inventory", inherit_schema=True), default=ItemType.PRODUCT, nullable=False)
    category = Column(String(100))
    current_stock = Column(Integer, default=0, nullable=False)
    reorder_level = Column(Integer, default=5, nullable=False)
    cost_price = Column(Numeric(10, 2), nullable=False)
    selling_price = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = {'schema': 'inventory'}

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    item_id = Column(UUID(as_uuid=True), ForeignKey("inventory.items.id"))
    type = Column(Enum(MovementType, name="movement_type", schema="inventory", inherit_schema=True), nullable=False)
    quantity_changed = Column(Integer, nullable=False)
    new_quantity = Column(Integer, nullable=False)
    reference_id = Column(UUID(as_uuid=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
