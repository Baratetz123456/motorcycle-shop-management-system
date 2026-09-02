from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List
from .models import TransactionStatus
from datetime import datetime

class TransactionItemCreate(BaseModel):
    item_id: UUID
    qty: int
    price: float

class CheckoutRequest(BaseModel):
    customer_id: Optional[UUID] = None
    items: List[TransactionItemCreate]
    amount_paid: float
    payment_method: str

class TransactionResponse(BaseModel):
    id: UUID
    invoice_no: str
    status: TransactionStatus
    total: float
    
    model_config = ConfigDict(from_attributes=True)
