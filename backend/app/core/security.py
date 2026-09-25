import os
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone
from fastapi import Request, HTTPException, status, Depends, Response
from jose import jwt, JWTError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt

from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM, COOKIE_SECURE, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.database import get_db, AsyncSessionLocal
from app.core.audit import log_audit_event

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def set_refresh_cookie(response: Response, cookie_val: str):
    """
    CRITICAL INVARIANT: Omit max_age and expires to create a true browser SESSION COOKIE.
    When the browser is closed, this cookie is automatically discarded.
    """
    response.set_cookie(
        key="refresh_token",
        value=cookie_val,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/api/v1/auth"
    )

def clear_refresh_cookie(response: Response):
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax"
    )

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
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id_str: str = payload.get("sub")
        role: str = payload.get("role")
        token_version: Optional[int] = payload.get("token_version")
        jti: Optional[str] = payload.get("jti")
        
        if not user_id_str or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
            )
            
        user_id = UUID(user_id_str)

        # Database session check for token_version and user existence
        async with AsyncSessionLocal() as session:
            # Check if token JTI is in revoked_tokens table
            if jti:
                revoked_check = await session.execute(
                    text("SELECT 1 FROM auth.revoked_tokens WHERE token_jti = :jti AND expires_at > NOW()"),
                    {"jti": jti}
                )
                if revoked_check.first():
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token has been revoked",
                    )

            result = await session.execute(
                text("SELECT role, token_version FROM auth.users WHERE id = :user_id"),
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
            "role": db_role,
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
