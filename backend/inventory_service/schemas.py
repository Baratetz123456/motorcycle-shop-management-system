from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from typing import Optional, List
from .models import MovementType
from datetime import datetime

class ItemBase(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    reorder_level: int = 5
    cost_price: float
    selling_price: float

class ItemCreate(ItemBase):
    pass

class ItemResponse(ItemBase):
    id: UUID
    current_stock: int
    
    model_config = ConfigDict(from_attributes=True)

class StockMovementCreate(BaseModel):
    item_id: UUID
    type: MovementType
    quantity_changed: int
    reference_id: Optional[UUID] = None
