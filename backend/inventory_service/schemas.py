from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Optional, List
from .models import MovementType, ItemType
from datetime import datetime

class ItemBase(BaseModel):
    sku: str
    name: str
    item_type: ItemType = ItemType.PRODUCT
    category: Optional[str] = None
    reorder_level: int = 5
    cost_price: float
    selling_price: float

class ItemCreate(ItemBase):
    current_stock: int = 0

class ItemUpdate(BaseModel):
    sku: Optional[str] = None
    name: Optional[str] = None
    item_type: Optional[ItemType] = None
    category: Optional[str] = None
    reorder_level: Optional[int] = None
    cost_price: Optional[float] = None
    selling_price: Optional[float] = None
    current_stock: Optional[int] = None

class ItemResponse(ItemBase):
    id: UUID
    current_stock: int
    
    model_config = ConfigDict(from_attributes=True)

class StockMovementCreate(BaseModel):
    item_id: UUID
    type: MovementType
    quantity_changed: int
    reference_id: Optional[UUID] = None
