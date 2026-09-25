from datetime import timedelta
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_

from app.core.database import get_db
from app.core.audit import log_audit_event
from app.core.security import (
    get_current_user,
    require_roles,
    get_client_ip,
    verify_password,
    get_password_hash,
    create_access_token,
    set_refresh_cookie,
    clear_refresh_cookie,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.modules.auth import models, schemas
from app.modules.auth.service import PostgresSessionManager

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=schemas.TokenResponse)
async def login(
    credentials: schemas.LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db)
):
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

    # 1. Create server-side session in PostgreSQL (30m sliding idle TTL, 8h absolute ceiling)
    sess = await PostgresSessionManager.create_session(
        session=session,
        user_id=user.id,
        role=user.role,
        email=user.email,
        user_agent=request.headers.get("User-Agent", ""),
        ip=client_ip
    )

    # 2. Generate short-lived access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "email": user.email,
            "token_version": user.token_version,
            "session_id": sess["session_id"]
        },
        expires_delta=access_token_expires
    )

    # 3. Set Refresh Token as an HttpOnly Session Cookie (no Max-Age / Expires)
    set_refresh_cookie(response, f"{sess['session_id']}:{sess['refresh_jti']}")

    await log_audit_event(
        session=session,
        action="LOGIN_SUCCESS",
        resource="/api/v1/auth/login",
        user_id=user.id,
        user_role=user.role,
        details={"email": user.email, "session_id": sess["session_id"]},
        ip_address=client_ip
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "avatar": user.avatar or "avatar-1",
        "theme": getattr(user, "theme", "cyan") or "cyan",
        "display_mode": getattr(user, "display_mode", "dark") or "dark"
    }

@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db)
):
    raw_cookie = request.cookies.get("refresh_token")
    if not raw_cookie or ":" not in raw_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or missing. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    session_id, refresh_jti = raw_cookie.split(":", 1)
    client_ip = get_client_ip(request)

    rotated = await PostgresSessionManager.rotate_refresh_token(
        session=session,
        session_id_str=session_id,
        refresh_jti=refresh_jti,
        ip=client_ip
    )
    if not rotated:
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or token reused. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    stmt = select(models.User).where(models.User.id == UUID(rotated["user_id"]))
    res = await session.execute(stmt)
    db_user = res.scalar_one_or_none()
    if not db_user:
        await PostgresSessionManager.terminate_session(session, session_id)
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active",
            headers={"WWW-Authenticate": "Bearer"}
        )

    new_access_token = create_access_token(
        data={
            "sub": str(db_user.id),
            "role": db_user.role,
            "email": db_user.email,
            "token_version": db_user.token_version,
            "session_id": session_id
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    new_cookie_val = f"{session_id}:{rotated['new_jti']}"
    set_refresh_cookie(response, new_cookie_val)

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "user_id": db_user.id,
        "role": db_user.role,
        "first_name": db_user.first_name,
        "last_name": db_user.last_name,
        "avatar": db_user.avatar or "avatar-1"
    }

@router.post("/upgrade-session")
async def upgrade_session(
    request: Request,
    response: Response,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    user_id = current_user.get("user_id")
    user_role = current_user.get("role")
    user_email = current_user.get("email")
    client_ip = get_client_ip(request)

    sess = await PostgresSessionManager.create_session(
        session=session,
        user_id=user_id,
        role=user_role,
        email=user_email,
        ip=client_ip
    )

    stmt = select(models.User).where(models.User.id == user_id)
    res = await session.execute(stmt)
    db_user = res.scalar_one_or_none()

    new_access_token = create_access_token(
        data={
            "sub": str(user_id),
            "role": user_role,
            "email": user_email,
            "token_version": db_user.token_version if db_user else 1,
            "session_id": sess["session_id"]
        },
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    set_refresh_cookie(response, f"{sess['session_id']}:{sess['refresh_jti']}")

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "role": user_role,
        "first_name": db_user.first_name if db_user else "",
        "last_name": db_user.last_name if db_user else "",
        "avatar": db_user.avatar if db_user else "avatar-1"
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_db)
):
    client_ip = get_client_ip(request)
    raw_cookie = request.cookies.get("refresh_token")
    user_id = None
    user_role = None
    user_email = None

    if raw_cookie and ":" in raw_cookie:
        session_id = raw_cookie.split(":", 1)[0]
        await PostgresSessionManager.terminate_session(session, session_id)

    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from jose import jwt
            from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM
            token = auth_header.split(" ")[1]
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            user_role = payload.get("role")
            user_email = payload.get("email")
            sess_id_from_token = payload.get("session_id")
            if sess_id_from_token:
                await PostgresSessionManager.terminate_session(session, sess_id_from_token)
        except Exception:
            pass

    clear_refresh_cookie(response)

    await log_audit_event(
        session=session,
        action="LOGOUT",
        resource="/api/v1/auth/logout",
        user_id=UUID(user_id) if user_id else None,
        user_role=user_role,
        details={"email": user_email or "unknown"},
        ip_address=client_ip
    )

    return {"msg": "Successfully logged out and session terminated"}

@router.get("/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    user_id = current_user.get("user_id")
    stmt = select(models.User).where(models.User.id == user_id)
    res = await session.execute(stmt)
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "id": str(u.id),
        "first_name": u.first_name,
        "last_name": u.last_name,
        "email": u.email,
        "role": u.role,
        "avatar": u.avatar or "avatar-1",
        "theme": getattr(u, "theme", "cyan") or "cyan",
        "display_mode": getattr(u, "display_mode", "dark") or "dark",
        "commission_rate": float(u.commission_rate) if u.commission_rate is not None else None,
        "base_wage": float(u.base_wage) if u.base_wage is not None else None,
        "created_at": u.created_at.isoformat() if u.created_at else None
    }

@router.post("/change-password")
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
    user.token_version += 1 # Invalidate active tokens across all devices

    # Revoke all active sessions in DB
    await PostgresSessionManager.revoke_all_user_sessions(session, user.id)

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

@router.post("/seed-admin", status_code=201)
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

@router.get("/users")
async def get_users(
    request: Request,
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
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

    if role and role.strip() and role.upper() != "ALL":
        query = query.where(models.User.role == role.strip().lower())

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
            "avatar": u.avatar or "avatar-1",
            "theme": getattr(u, "theme", "cyan") or "cyan",
            "display_mode": getattr(u, "display_mode", "dark") or "dark",
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

@router.post("/users/register", response_model=schemas.UserResponse, status_code=201)
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
        avatar=user_data.avatar if user_data.avatar else "avatar-1",
        theme=user_data.theme if user_data.theme else "cyan",
        display_mode=user_data.display_mode if user_data.display_mode else "dark",
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

@router.put("/users/{user_id}", response_model=schemas.UserResponse)
async def update_user(
    request: Request,
    user_id: str,
    update_data: schemas.UserUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    try:
        user_uuid = UUID(str(user_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    stmt = select(models.User).where(models.User.id == user_uuid)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    caller_role = current_user.get("role")
    is_admin = caller_role == "admin"
    is_self = str(user_uuid) == str(current_user.get("user_id"))

    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Forbidden: You can only update your own profile")

    if is_admin and is_self and update_data.role != db_user.role:
        raise HTTPException(status_code=400, detail="Admin cannot change their own role")

    if not is_admin:
        if update_data.role != db_user.role:
            raise HTTPException(status_code=403, detail="Non-admin users cannot change their role")

    role_changed = is_admin and (update_data.role != db_user.role)
    db_user.first_name = update_data.first_name
    db_user.last_name = update_data.last_name
    db_user.email = update_data.email
    if is_admin:
        db_user.role = update_data.role
        if update_data.commission_rate is not None:
            db_user.commission_rate = update_data.commission_rate
        if update_data.base_wage is not None:
            db_user.base_wage = update_data.base_wage

    if update_data.avatar:
        db_user.avatar = update_data.avatar
    if update_data.theme:
        db_user.theme = update_data.theme
    if update_data.display_mode:
        db_user.display_mode = update_data.display_mode

    if role_changed:
        db_user.token_version += 1

    await session.commit()
    await session.refresh(db_user)
    return db_user

@router.patch("/users/{user_id}", response_model=schemas.UserResponse)
async def patch_user(
    request: Request,
    user_id: str,
    update_data: schemas.UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    try:
        user_uuid = UUID(str(user_id))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    stmt = select(models.User).where(models.User.id == user_uuid)
    result = await session.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    caller_role = current_user.get("role")
    is_admin = caller_role == "admin"
    is_self = str(user_uuid) == str(current_user.get("user_id"))

    if not is_admin and not is_self:
        ip = get_client_ip(request)
        await log_audit_event(
            session=session,
            action="ACCESS_DENIED",
            resource=f"/api/v1/auth/users/{user_id}",
            user_id=current_user.get("user_id"),
            user_role=caller_role,
            details={
                "target_user_id": str(user_id),
                "reason": "Forbidden: You can only update your own profile"
            },
            ip_address=ip
        )
        raise HTTPException(status_code=403, detail="Forbidden: You can only update your own profile")

    if update_data.email and update_data.email != db_user.email:
        email_check = select(models.User).where(models.User.email == update_data.email)
        check_res = await session.execute(email_check)
        if check_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email is already in use by another account.")
        db_user.email = update_data.email

    if update_data.first_name is not None:
        db_user.first_name = update_data.first_name
    if update_data.last_name is not None:
        db_user.last_name = update_data.last_name
    if update_data.avatar is not None:
        db_user.avatar = update_data.avatar
    if update_data.theme is not None:
        db_user.theme = update_data.theme
    if update_data.display_mode is not None:
        db_user.display_mode = update_data.display_mode

    await session.commit()
    await session.refresh(db_user)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="UPDATE_USER_PROFILE",
        resource=f"/api/v1/auth/users/{user_id}",
        user_id=current_user.get("user_id"),
        user_role=caller_role,
        details={
            "target_user_id": str(user_id),
            "updated_fields": {k: v for k, v in update_data.model_dump(exclude_unset=True).items()}
        },
        ip_address=client_ip
    )

    return db_user

