from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.idempotency import idempotent
from app.core.audit import log_audit_event
from app.core.security import require_roles, get_client_ip
from app.modules.inventory import models, schemas

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("", response_model=List[schemas.ItemResponse])
@router.get("/", response_model=List[schemas.ItemResponse])
@router.get("/items", response_model=List[schemas.ItemResponse])
async def get_items(
    item_type: Optional[str] = None,
    include_inactive: bool = False,
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    query = select(models.Item)
    if not include_inactive:
        query = query.where(models.Item.is_active == True)
    if item_type:
        query = query.where(models.Item.item_type == item_type)
    result = await session.execute(query)
    return result.scalars().all()

@router.get("/{item_id}", response_model=schemas.ItemResponse)
@router.get("/items/{item_id}", response_model=schemas.ItemResponse)
async def get_item_by_id(
    item_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "cashier", "manager", "mechanic"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Item).where(models.Item.id == item_id)
    result = await session.execute(stmt)
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.post("", response_model=schemas.ItemResponse)
@router.post("/", response_model=schemas.ItemResponse)
@router.post("/items", response_model=schemas.ItemResponse)
@idempotent
async def create_item(
    request: Request,
    item: schemas.ItemCreate,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    item_data = item.model_dump()
    db_item = models.Item(**item_data)
    db_item.is_active = True
    session.add(db_item)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="ITEM_CREATED",
        resource="/api/v1/inventory/items",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"name": item.name, "sku": item.sku, "brand": item.brand, "item_type": str(item.item_type), "initial_stock": item.current_stock},
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=schemas.ItemResponse)
@router.put("/items/{item_id}", response_model=schemas.ItemResponse)
@idempotent
async def update_item(
    request: Request,
    item_id: UUID,
    item_update: schemas.ItemUpdate,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Item).where(models.Item.id == item_id)
    result = await session.execute(stmt)
    db_item = result.scalar_one_or_none()

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_data = item_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="ITEM_UPDATED",
        resource=f"/api/v1/inventory/items/{item_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"item_id": str(item_id), "updated_fields": list(update_data.keys())},
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
@router.delete("/items/{item_id}")
@idempotent
async def delete_item(
    request: Request,
    item_id: UUID,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Item).where(models.Item.id == item_id)
    result = await session.execute(stmt)
    db_item = result.scalar_one_or_none()

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db_item.is_active = False

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="ITEM_DELETED",
        resource=f"/api/v1/inventory/items/{item_id}",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={"item_id": str(item_id), "sku": db_item.sku, "name": db_item.name},
        ip_address=client_ip
    )

    await session.commit()
    return {"message": "Item deleted successfully", "id": str(item_id), "is_active": False}

@router.post("/items/{item_id}/stock", response_model=schemas.ItemResponse)
@idempotent
async def adjust_stock(
    request: Request,
    item_id: UUID,
    movement: schemas.StockMovementCreate,
    current_user: dict = Depends(require_roles(["admin", "manager"])),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(models.Item).where(models.Item.id == item_id).with_for_update()
    result = await session.execute(stmt)
    db_item = result.scalar_one_or_none()

    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    db_item.current_stock += movement.quantity_changed

    db_movement = models.StockMovement(
        item_id=item_id,
        type=movement.type,
        quantity_changed=movement.quantity_changed,
        new_quantity=db_item.current_stock,
        reference_id=movement.reference_id
    )
    session.add(db_movement)

    client_ip = get_client_ip(request)
    await log_audit_event(
        session=session,
        action="STOCK_UPDATE",
        resource=f"/api/v1/inventory/items/{item_id}/stock",
        user_id=current_user.get("user_id"),
        user_role=current_user.get("role"),
        details={
            "item_id": str(item_id),
            "quantity_changed": movement.quantity_changed,
            "new_stock": db_item.current_stock,
            "type": str(movement.type)
        },
        ip_address=client_ip
    )

    await session.commit()
    await session.refresh(db_item)
    return db_item
