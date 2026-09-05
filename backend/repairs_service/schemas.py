from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import Optional, List
from .models import JobStatus
from datetime import datetime

class MotorcycleModelBase(BaseModel):
    brand: str
    model: str
    year: int
    category: Optional[str] = "General"

class MotorcycleModelCreate(MotorcycleModelBase):
    pass

class MotorcycleModelUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    category: Optional[str] = None

class MotorcycleModelResponse(MotorcycleModelBase):
    id: UUID
    is_active: bool = True
    service_frequency: int = 0
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class RepairCartItemBase(BaseModel):
    item_id: Optional[UUID] = None
    item_name: str
    item_type: str = "PRODUCT"
    qty: int = 1
    unit_price: float
    total_price: float

class RepairCartItemCreate(RepairCartItemBase):
    pass

class RepairCartItemResponse(RepairCartItemBase):
    id: UUID
    job_order_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ActiveCustomerRepairCartResponse(BaseModel):
    job_id: UUID
    jo_number: str
    customer_name: str
    motorcycle_name: str
    status: JobStatus
    is_paid: bool = False
    labor_charge: float
    parts_charge: float
    total_amount: float
    cart_items: List[RepairCartItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class MotorcycleBase(BaseModel):
    plate_number: str
    brand: str
    model: str
    year: Optional[int] = None
    color: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    customer_name: str
    customer_contact: Optional[str] = None
    notes: Optional[str] = None

class MotorcycleCreate(MotorcycleBase):
    pass

class MotorcycleUpdate(BaseModel):
    plate_number: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    color: Optional[str] = None
    engine_number: Optional[str] = None
    chassis_number: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    notes: Optional[str] = None

class MotorcycleResponse(MotorcycleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RepairLogEntry(BaseModel):
    job_id: UUID
    jo_number: str
    motorcycle_id: Optional[str] = None
    motorcycle_model: str
    date_repaired: datetime
    status: JobStatus
    customer_name: str
    mechanic_id: Optional[UUID] = None
    mechanic_name: Optional[str] = None
    labor_charge: float
    parts_charge: float

    model_config = ConfigDict(from_attributes=True)

class JobOrderCreate(BaseModel):
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    motorcycle_id: Optional[str] = "General Motorcycle"
    mechanic_id: Optional[UUID] = None
    mechanic_name: Optional[str] = None
    mechanic_notes: Optional[str] = None
    labor_charge: Optional[float] = 100.0
    parts_charge: Optional[float] = 0.0
    is_paid: Optional[bool] = False
    payment_status: Optional[str] = "UNPAID"
    status: Optional[JobStatus] = JobStatus.PENDING

class JobOrderStatusUpdate(BaseModel):
    status: JobStatus

class JobOrderUpdate(BaseModel):
    status: Optional[JobStatus] = None
    mechanic_id: Optional[UUID] = None
    mechanic_name: Optional[str] = None
    mechanic_notes: Optional[str] = None
    customer_name: Optional[str] = None
    labor_charge: Optional[float] = None
    parts_charge: Optional[float] = None
    is_paid: Optional[bool] = None
    payment_status: Optional[str] = None

class JobOrderResponse(BaseModel):
    id: UUID
    jo_number: str
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    motorcycle_id: str
    mechanic_id: Optional[UUID] = None
    mechanic_name: Optional[str] = None
    mechanic_notes: Optional[str] = None
    labor_charge: float
    parts_charge: float
    status: JobStatus
    is_paid: bool = False
    payment_status: Optional[str] = "UNPAID"
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class CommissionResponse(BaseModel):
    id: UUID
    mechanic_id: UUID
    amount_earned: float
    
    model_config = ConfigDict(from_attributes=True)

class CustomerHistoryItemUsed(BaseModel):
    name: str
    qty: int
    price: float

class CustomerHistoryPastJob(BaseModel):
    job_id: str
    jo_number: str
    date_repaired: str
    status: str
    mechanic_name: str
    mechanic_notes: Optional[str] = ""
    labor_charge: float
    parts_charge: float
    items_used: List[CustomerHistoryItemUsed] = []

class CustomerHistoryRecordResponse(BaseModel):
    customer_id: str
    customer_name: str
    contact_number: str
    motorcycle_model: str
    total_repair_sessions: int
    last_service_date: str
    active_status: str
    past_jobs: List[CustomerHistoryPastJob] = []

