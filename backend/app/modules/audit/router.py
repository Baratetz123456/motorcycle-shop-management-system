import csv
import io
from datetime import datetime
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Request, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_

from app.core.database import get_db
from app.core.audit import log_audit_event
from app.core.security import require_roles, get_client_ip
from app.modules.audit.models import AuditLog
from app.modules.auth.models import User
from app.modules.audit import schemas

router = APIRouter(tags=["Audit"])

@router.post("/audit-logs", status_code=status.HTTP_201_CREATED)
@router.post("/audit/logs", status_code=status.HTTP_201_CREATED)
async def create_audit_log(
    request: Request,
    payload: schemas.AuditLogCreate,
    session: AsyncSession = Depends(get_db)
):
    client_ip = get_client_ip(request)
    
    uid = None
    if payload.user_id:
        try:
            uid = UUID(str(payload.user_id))
        except (ValueError, TypeError):
            stmt = select(User.id).where(User.email == str(payload.user_id))
            res = await session.execute(stmt)
            uid = res.scalar_one_or_none()

    event = AuditLog(
        user_id=uid,
        user_role=payload.user_role or "cashier",
        action=payload.action,
        resource=payload.resource,
        details=payload.details,
        ip_address=client_ip
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)

    return {"status": "recorded", "id": str(event.id)}

@router.get("/audit-logs")
@router.get("/audit/logs")
async def get_audit_logs(
    request: Request,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    mutations_only: bool = Query(True),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_roles(["admin"])),
    session: AsyncSession = Depends(get_db)
):
    query = select(
        AuditLog,
        User.first_name,
        User.last_name,
        User.email
    ).outerjoin(User, AuditLog.user_id == User.id)

    NON_MUTATING_ACTIONS = [
        "AUDIT_LOGS_VIEWED",
        "LOGIN_SUCCESS",
        "LOGOUT",
        "LOGIN_FAILURE",
        "AUDIT_EXPORT"
    ]
    if mutations_only:
        query = query.where(AuditLog.action.notin_(NON_MUTATING_ACTIONS))

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
                AuditLog.ip_address.ilike(search_pattern),
                User.first_name.ilike(search_pattern),
                User.last_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total_res = await session.execute(count_query)
    total_count = total_res.scalar_one()

    offset = (page - 1) * page_size
    query = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size)

    result = await session.execute(query)
    rows = result.all()

    items = []
    for row in rows:
        log = row[0]
        fname = row[1] or ""
        lname = row[2] or ""
        uemail = row[3] or ""
        user_name = f"{fname} {lname}".strip() or (uemail.split('@')[0].capitalize() if uemail else "System / Automated")

        items.append({
            "id": str(log.id),
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "user_role": log.user_role,
            "user_name": user_name,
            "user_email": uemail,
            "action": log.action,
            "resource": log.resource,
            "details": log.details,
            "ip_address": log.ip_address,
        })

    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size
    }

@router.get("/audit-logs/export")
@router.get("/audit/logs/export")
async def export_audit_logs(
    request: Request,
    mutations_only: bool = Query(True),
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

    query = select(
        AuditLog,
        User.first_name,
        User.last_name,
        User.email
    ).outerjoin(User, AuditLog.user_id == User.id)

    if mutations_only:
        query = query.where(AuditLog.action.notin_([
            "AUDIT_LOGS_VIEWED", "LOGIN_SUCCESS", "LOGOUT", "LOGIN_FAILURE", "AUDIT_EXPORT"
        ]))

    query = query.order_by(desc(AuditLog.timestamp)).limit(1000)
    result = await session.execute(query)
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Timestamp", "Staff Name", "Email", "User Role", "Action", "Resource Target", "Details"])

    for row in rows:
        log = row[0]
        fname = row[1] or ""
        lname = row[2] or ""
        uemail = row[3] or ""
        user_name = f"{fname} {lname}".strip() or "System / Automated"

        writer.writerow([
            str(log.id),
            log.timestamp.isoformat() if log.timestamp else "",
            user_name,
            uemail,
            log.user_role or "",
            log.action,
            log.resource,
            str(log.details) if log.details else ""
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=system_history_logs_export.csv"}
    )
