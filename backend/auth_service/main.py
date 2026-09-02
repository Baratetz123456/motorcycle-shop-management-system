import sys
import os
import csv
import io
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_
from jose import jwt
import bcrypt

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.database import get_db
from shared.audit import log_audit_event, AuditLog
from shared.security import get_current_user, require_roles, get_client_ip
from auth_service import models, schemas

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-for-local-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

app = FastAPI(title="Auth Service")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/login", response_model=schemas.TokenResponse)
async def login(credentials: schemas.LoginRequest, request: Request, session: AsyncSession = Depends(get_db)):
    client_ip = get_client_ip(request)
    stmt = select(models.User).where(models.User.email == credentials.email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        await log_audit_event(
            session=session,
            action="LOGIN_FAILURE",
            resource="/api/v1/auth/login",
            user_id=None,
            user_role=None,
            details={"attempted_email": credentials.email, "reason": "Invalid credentials"},
            ip_address=client_ip
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "email": user.email}, 
        expires_delta=access_token_expires
    )
    
    await log_audit_event(
        session=session,
        action="LOGIN_SUCCESS",
        resource="/api/v1/auth/login",
        user_id=user.id,
        user_role=user.role,
        details={"email": user.email},
        ip_address=client_ip
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role
    }

@app.post("/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user), session: AsyncSession = Depends(get_db)):
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="LOGOUT",
        resource="/api/v1/auth/logout",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"email": current_user.get("email")},
        ip_address=client_ip
    )
    return {"msg": "Successfully logged out"}

@app.post("/seed-admin", status_code=201)
async def seed_admin(session: AsyncSession = Depends(get_db)):
    users_to_seed = [
        {"email": "admin@motoshop.com", "password": "admin123", "role": "admin"},
        {"email": "manager@motoshop.com", "password": "manager123", "role": "manager"},
        {"email": "cashier@motoshop.com", "password": "cashier123", "role": "cashier"},
        {"email": "mechanic@motoshop.com", "password": "mechanic123", "role": "mechanic"},
    ]
    
    created_users = []
    for u in users_to_seed:
        stmt = select(models.User).where(models.User.email == u["email"])
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            hashed_pw = get_password_hash(u["password"])
            db_u = models.User(email=u["email"], password_hash=hashed_pw, role=u["role"])
            session.add(db_u)
            created_users.append(u["email"])
            
    await session.commit()
    return {"msg": "Seeding complete", "created": created_users}

@app.get("/audit-logs")
async def get_audit_logs(
    request: Request,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_roles(["admin"])),
    session: AsyncSession = Depends(get_db)
):
    # Log that admin accessed audit log page
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="AUDIT_LOGS_VIEWED",
        resource="/api/v1/audit-logs",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"page": page, "search": search, "action_filter": action},
        ip_address=client_ip
    )

    query = select(AuditLog)
    
    if start_date:
        query = query.where(AuditLog.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.where(AuditLog.timestamp <= datetime.fromisoformat(end_date))
    if user_role:
        query = query.where(AuditLog.user_role == user_role)
    if action:
        query = query.where(AuditLog.action == action)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                AuditLog.action.ilike(search_pattern),
                AuditLog.resource.ilike(search_pattern),
                AuditLog.user_role.ilike(search_pattern),
                AuditLog.ip_address.ilike(search_pattern)
            )
        )
        
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await session.execute(count_query)
    total_count = total_res.scalar_one()

    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size)
    
    result = await session.execute(query)
    logs = result.scalars().all()
    
    items = [
        {
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_role": log.user_role,
            "action": log.action,
            "resource": log.resource,
            "details": log.details,
            "ip_address": log.ip_address,
        }
        for log in logs
    ]
    
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size
    }

@app.get("/audit-logs/export")
async def export_audit_logs(
    request: Request,
    current_user: dict = Depends(require_roles(["admin"])),
    session: AsyncSession = Depends(get_db)
):
    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="AUDIT_EXPORT",
        resource="/api/v1/audit-logs/export",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"exported_by": current_user.get("email")},
        ip_address=client_ip
    )
    
    query = select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(1000)
    result = await session.execute(query)
    logs = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "User ID", "User Role", "Action", "Resource", "IP Address", "Details"])

    for log in logs:
        writer.writerow([
            str(log.id),
            log.timestamp.isoformat() if log.timestamp else "",
            str(log.user_id) if log.user_id else "",
            log.user_role or "",
            log.action,
            log.resource,
            log.ip_address or "",
            str(log.details) if log.details else ""
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs_export.csv"}
    )
