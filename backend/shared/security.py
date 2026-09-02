import os
import sys
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import Request, HTTPException, status, Depends
from jose import jwt, JWTError

from shared.audit import log_audit_event
from shared.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-for-local-dev")
ALGORITHM = "HS256"

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

async def get_current_user(request: Request) -> Dict[str, Any]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: str = payload.get("sub")
        role: str = payload.get("role")
        if not user_id_str or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
        return {
            "user_id": UUID(user_id_str),
            "role": role,
            "email": payload.get("email")
        }
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_roles(allowed_roles: List[str]):
    async def role_checker(
        request: Request,
        user: Dict[str, Any] = Depends(get_current_user),
        session: AsyncSession = Depends(get_db)
    ) -> Dict[str, Any]:
        user_role = user.get("role")
        if user_role not in allowed_roles:
            # Log ACCESS_DENIED security audit event
            ip = get_client_ip(request)
            await log_audit_event(
                session=session,
                action="ACCESS_DENIED",
                resource=request.url.path,
                user_id=user.get("user_id"),
                user_role=user_role,
                details={
                    "required_roles": allowed_roles,
                    "attempted_role": user_role,
                    "method": request.method
                },
                ip_address=ip
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{user_role}' is not authorized for this resource"
            )
        return user
    return role_checker
