import sys
import os
import csv
import io
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID
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
from shared.logger import get_logger
from shared.logging_middleware import RequestLoggingMiddleware
from auth_service import models, schemas

logger = get_logger("auth_service")

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-for-local-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

app = FastAPI(title="Auth Service")
app.add_middleware(RequestLoggingMiddleware, service_name="auth_service")

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
        data={
            "sub": str(user.id), 
            "role": user.role, 
            "email": user.email,
            "token_version": user.token_version
        }, 
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
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name
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

@app.post("/change-password")
async def change_password(
    request: Request,
    body: schemas.ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long")

    user_id = current_user.get("user_id")
    stmt = select(models.User).where(models.User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if verify_password(body.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from current password")

    user.password_hash = get_password_hash(body.new_password)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="PASSWORD_CHANGED",
        resource="/api/v1/auth/change-password",
        user_id=user.id,
        user_role=user.role,
        details={"email": user.email},
        ip_address=client_ip
    )

    await session.commit()
    return {"msg": "Password updated successfully"}

@app.post("/seed-admin", status_code=201)
async def seed_admin(session: AsyncSession = Depends(get_db)):
    users_to_seed = [
        {"email": "admin@motoshop.com", "password": "admin123", "role": "admin", "first_name": "System", "last_name": "Admin"},
        {"email": "manager@motoshop.com", "password": "manager123", "role": "manager", "first_name": "Shop", "last_name": "Manager"},
        {"email": "cashier@motoshop.com", "password": "cashier123", "role": "cashier", "first_name": "Main", "last_name": "Cashier"},
        {"email": "mechanic@motoshop.com", "password": "mechanic123", "role": "mechanic", "first_name": "Lead", "last_name": "Mechanic"},
    ]
    
    created_users = []
    for u in users_to_seed:
        stmt = select(models.User).where(models.User.email == u["email"])
        res = await session.execute(stmt)
        db_user = res.scalar_one_or_none()
        if not db_user:
            hashed_pw = get_password_hash(u["password"])
            db_u = models.User(
                email=u["email"], 
                password_hash=hashed_pw, 
                role=u["role"],
                first_name=u["first_name"],
                last_name=u["last_name"]
            )
            session.add(db_u)
            created_users.append(u["email"])
        else:
            db_user.first_name = u["first_name"]
            db_user.last_name = u["last_name"]
            
    await session.commit()
    return {"msg": "Seeding complete", "created": created_users}

# --- User Management Endpoints (Admin-Only) ---

@app.post("/users/register", response_model=schemas.UserResponse, status_code=201)
async def register_user(
    request: Request,
    user_data: schemas.UserRegisterRequest,
    current_user: dict = Depends(require_roles(["admin"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.User).where(models.User.email == user_data.email)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    hashed_pw = get_password_hash(user_data.password)
    new_user = models.User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        password_hash=hashed_pw,
        role=user_data.role,
        commission_rate=user_data.commission_rate if user_data.commission_rate is not None else 40.0,
        base_wage=user_data.base_wage if user_data.base_wage is not None else 650.0
    )
    session.add(new_user)
    await session.flush()

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="CREATE_USER",
        resource="/api/v1/auth/users/register",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "created_user_id": str(new_user.id),
            "created_email": new_user.email,
            "assigned_role": new_user.role,
            "name": f"{new_user.first_name} {new_user.last_name}"
        },
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(new_user)
    return new_user

@app.get("/users")
async def get_users(
    request: Request,
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    current_user: dict = Depends(require_roles(["admin", "manager", "cashier"])),
    session: AsyncSession = Depends(get_db)
):
    query = select(models.User)
    
    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                models.User.email.ilike(pattern),
                models.User.first_name.ilike(pattern),
                models.User.last_name.ilike(pattern),
                models.User.role.ilike(pattern)
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_res = await session.execute(count_query)
    total_count = total_res.scalar_one()

    offset = (page - 1) * page_size
    query = query.order_by(desc(models.User.created_at)).offset(offset).limit(page_size)
    
    result = await session.execute(query)
    users = result.scalars().all()

    items = [
        {
            "id": str(u.id),
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "role": u.role,
            "commission_rate": float(u.commission_rate) if u.commission_rate is not None else (40.0 if u.role == "mechanic" else None),
            "base_wage": float(u.base_wage) if u.base_wage is not None else (650.0 if u.role == "cashier" else None),
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size
    }

@app.put("/users/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    request: Request,
    user_id: UUID,
    update_data: schemas.UserUpdateRequest,
    current_user: dict = Depends(require_roles(["admin"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.User).where(models.User.id == user_id)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Rule: Admin cannot change their own role
    is_self = str(user_id) == str(current_user.get("user_id"))
    if is_self and update_data.role != db_user.role:
        raise HTTPException(status_code=400, detail="Admin cannot change their own role")

    # Check email uniqueness if email changed
    if update_data.email != db_user.email:
        email_check = select(models.User).where(models.User.email == update_data.email)
        check_res = await session.execute(email_check)
        if check_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email is already in use by another account.")

    role_changed = update_data.role != db_user.role
    old_role = db_user.role

    db_user.first_name = update_data.first_name
    db_user.last_name = update_data.last_name
    db_user.email = update_data.email
    db_user.role = update_data.role
    if update_data.commission_rate is not None:
        db_user.commission_rate = update_data.commission_rate
    if update_data.base_wage is not None:
        db_user.base_wage = update_data.base_wage

    if role_changed:
        db_user.token_version += 1 # Invalidate active user tokens immediately!

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="UPDATE_USER",
        resource=f"/api/v1/auth/users/{user_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "target_user_id": str(user_id),
            "updated_email": update_data.email,
            "role": update_data.role,
            "commission_rate": float(db_user.commission_rate) if db_user.commission_rate is not None else None,
            "base_wage": float(db_user.base_wage) if db_user.base_wage is not None else None
        },
        ip_address=client_ip
    )

    if role_changed:
        await log_audit_event(
            session=session,
            action="CHANGE_ROLE",
            resource=f"/api/v1/auth/users/{user_id}",
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            details={
                "target_user_id": str(user_id),
                "old_role": old_role,
                "new_role": update_data.role
            },
            ip_address=client_ip
        )

    await session.commit()
    await session.refresh(db_user)
    return db_user

@app.delete("/users/{user_id}")
async def delete_user(
    request: Request,
    user_id: UUID,
    current_user: dict = Depends(require_roles(["admin"])),
    session: AsyncSession = Depends(get_db)
):
    # Rule: Admin cannot delete their own account
    is_self = str(user_id) == str(current_user.get("user_id"))
    if is_self:
        raise HTTPException(status_code=400, detail="Admin cannot delete their own account")

    stmt = select(models.User).where(models.User.id == user_id)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    target_email = db_user.email
    target_role = db_user.role

    await session.delete(db_user)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="DELETE_USER",
        resource=f"/api/v1/auth/users/{user_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "deleted_user_id": str(user_id),
            "deleted_email": target_email,
            "deleted_role": target_role
        },
        ip_address=client_ip
    )

    await session.commit()
    return {"msg": f"User {target_email} deleted successfully"}

# --- Audit Logs Endpoints ---

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
        
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await session.execute(count_query)
    total_count = total_res.scalar_one()

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
