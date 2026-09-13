from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List
from .models import TransactionStatus
from datetime import datetime

class TransactionItemCreate(BaseModel):
    item_id: str
    qty: int
    price: float

class CheckoutRequest(BaseModel):
    customer_id: Optional[UUID] = None
    cashier_name: Optional[str] = None
    mechanic_name: Optional[str] = None
    job_order_id: Optional[UUID] = None
    items: List[TransactionItemCreate]
    amount_paid: float
    payment_method: str
    discount_percentage: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    cash_received: Optional[float] = 0.0
    cash_change: Optional[float] = 0.0

class TransactionResponse(BaseModel):
    id: UUID
    invoice_no: str
    customer_id: Optional[UUID] = None
    cashier_name: Optional[str] = None
    mechanic_name: Optional[str] = None
    job_order_id: Optional[UUID] = None
    status: TransactionStatus
    subtotal: Optional[float] = 0.0
    discount_percentage: Optional[float] = 0.0
    discount_amount: Optional[float] = 0.0
    total: float
    amount_paid: Optional[float] = 0.0
    cash_received: Optional[float] = 0.0
    cash_change: Optional[float] = 0.0
    created_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)
