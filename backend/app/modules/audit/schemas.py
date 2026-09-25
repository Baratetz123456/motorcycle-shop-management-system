from pydantic import BaseModel
from typing import Optional, Dict, Any

class AuditLogCreate(BaseModel):
    action: str
    resource: str
    details: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    user_role: Optional[str] = None
