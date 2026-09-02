from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List
from .models import JobStatus
from datetime import datetime

class JobOrderCreate(BaseModel):
    customer_id: Optional[UUID] = None
    motorcycle_id: str
    mechanic_id: UUID
    labor_charge: float
    parts_charge: float

class JobOrderStatusUpdate(BaseModel):
    status: JobStatus

class JobOrderResponse(BaseModel):
    id: UUID
    jo_number: str
    customer_id: Optional[UUID] = None
    motorcycle_id: str
    mechanic_id: UUID
    labor_charge: float
    parts_charge: float
    status: JobStatus
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CommissionResponse(BaseModel):
    id: UUID
    mechanic_id: UUID
    amount_earned: float
    
    model_config = ConfigDict(from_attributes=True)
