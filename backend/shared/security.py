import os
import sys
from typing import List, Dict, Any, Optional
from uuid import UUID
from fastapi import Request, HTTPException, status, Depends
from jose import jwt, JWTError
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from shared.audit import log_audit_event
from shared.database import get_db, AsyncSessionLocal

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
        token_version: Optional[int] = payload.get("token_version")
        
        if not user_id_str or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
            
        user_id = UUID(user_id_str)

        # Database session check for token_version and user existence
        async with AsyncSessionLocal() as session:
            # Inline text/query to check token_version & existence
            result = await session.execute(
                select(text("role, token_version")).select_from(text("auth.users")).where(text("id = :user_id")),
                {"user_id": user_id}
            )
            row = result.first()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User account no longer exists",
                )
            
            db_role, db_token_version = row
            if token_version is not None and db_token_version != token_version:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session has been invalidated due to role or security update",
                )

        return {
            "user_id": user_id,
            "role": db_role, # Always return live db role
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
