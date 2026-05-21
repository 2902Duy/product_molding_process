"""
CRUD operations for Supabase PostgreSQL via SQLAlchemy async.
"""
from datetime import date, datetime
"""
CRUD operations for Supabase PostgreSQL via SQLAlchemy async.
"""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import select, delete, func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from models.orm import (
    Inventory,
    LotInput,
    LotOutput,
    LotTarget,
    Order,
    ProductionLot,
    User,
    CustomRequest,
)


# =============================================================================
# PRODUCTION LOTS
# =============================================================================

async def get_lots(
    db: AsyncSession,
    slip_type: Optional[str] = None,
    status: Optional[str] = None,
) -> list[ProductionLot]:
    stmt = select(ProductionLot).order_by(ProductionLot.created_date.desc())
    if slip_type:
        stmt = stmt.where(ProductionLot.slip_type == slip_type)
    if status:
        stmt = stmt.where(ProductionLot.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_lot(db: AsyncSession, lot_id: str) -> Optional[ProductionLot]:
    result = await db.execute(
        select(ProductionLot).where(ProductionLot.id == lot_id)
    )
    return result.scalar_one_or_none()


async def create_lot(db: AsyncSession, **kwargs) -> ProductionLot:
    if "created_date" not in kwargs or kwargs["created_date"] is None:
        kwargs["created_date"] = date.today()
    elif isinstance(kwargs["created_date"], str):
        kwargs["created_date"] = date.fromisoformat(kwargs["created_date"])
    lot = ProductionLot(**kwargs)
    db.add(lot)
    await db.commit()
    await db.refresh(lot)
    return lot


async def update_lot(db: AsyncSession, lot_id: str, **kwargs) -> Optional[ProductionLot]:
    lot = await get_lot(db, lot_id)
    if not lot:
        return None
    for key, value in kwargs.items():
        if value is not None:
            setattr(lot, key, value)
    lot.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(lot)
    return lot


async def delete_lot(db: AsyncSession, lot_id: str) -> bool:
    lot = await get_lot(db, lot_id)
    if not lot:
        return False
    await db.delete(lot)
    await db.commit()
    return True


# =============================================================================
# INVENTORY
# =============================================================================

async def get_inventory(
    db: AsyncSession,
    inv_type: Optional[str] = None,
    status: Optional[str] = None,
) -> list[Inventory]:
    stmt = select(Inventory).order_by(Inventory.created_at.desc())
    if inv_type:
        stmt = stmt.where(Inventory.type == inv_type)
    if status:
        stmt = stmt.where(Inventory.status == status)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_inventory_item(db: AsyncSession, item_id: str) -> Optional[Inventory]:
    result = await db.execute(
        select(Inventory).where(Inventory.id == item_id)
    )
    return result.scalar_one_or_none()


async def create_inventory_item(db: AsyncSession, **kwargs) -> Inventory:
    item = Inventory(**kwargs)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def update_inventory_item(db: AsyncSession, item_id: str, **kwargs) -> Optional[Inventory]:
    item = await get_inventory_item(db, item_id)
    if not item:
        return None
    for key, value in kwargs.items():
        if value is not None:
            setattr(item, key, value)
    item.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(item)
    return item


async def delete_inventory_item(db: AsyncSession, item_id: str) -> bool:
    item = await get_inventory_item(db, item_id)
    if not item:
        return False
    await db.delete(item)
    await db.commit()
    return True


async def search_inventory(db: AsyncSession, query: str) -> list[Inventory]:
    stmt = select(Inventory).where(
        Inventory.name.ilike(f"%{query}%")
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_inventory_stats(db: AsyncSession) -> dict:
    total_result = await db.execute(select(func.count(Inventory.id)))
    total = total_result.scalar() or 0

    available_result = await db.execute(
        select(func.count(Inventory.id)).where(Inventory.status == "AVAILABLE")
    )
    available = available_result.scalar() or 0

    reserved_result = await db.execute(
        select(func.count(Inventory.id)).where(Inventory.status == "RESERVED")
    )
    reserved = reserved_result.scalar() or 0

    used_result = await db.execute(
        select(func.count(Inventory.id)).where(Inventory.status == "USED")
    )
    used = used_result.scalar() or 0

    return {
        "total": total,
        "available": available,
        "reserved": reserved,
        "used": used,
    }


async def bulk_update_inventory_status(
    db: AsyncSession, ids: list[str], status: str
) -> int:
    count = 0
    for item_id in ids:
        item = await get_inventory_item(db, item_id)
        if item:
            item.status = status
            item.updated_at = datetime.utcnow()
            count += 1
    await db.commit()
    return count


# =============================================================================
# LOT INPUTS
# =============================================================================

async def get_lot_inputs(db: AsyncSession, lot_id: str) -> list[LotInput]:
    result = await db.execute(
        select(LotInput).where(LotInput.lot_id == lot_id)
    )
    return list(result.scalars().all())


async def add_lot_input(
    db: AsyncSession,
    lot_id: str,
    inventory_id: str,
    quantity_used: int,
    volume_used: Optional[float] = None,
) -> LotInput:
    existing = await db.execute(
        select(LotInput).where(
            LotInput.lot_id == lot_id,
            LotInput.inventory_id == inventory_id,
        )
    )
    row = existing.scalar_one_or_none()
    if row:
        row.quantity_used = quantity_used
        if volume_used is not None:
            row.volume_used = volume_used
    else:
        row = LotInput(
            lot_id=lot_id,
            inventory_id=inventory_id,
            quantity_used=quantity_used,
            volume_used=volume_used,
        )
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def remove_lot_input(db: AsyncSession, lot_id: str, inventory_id: str) -> bool:
    result = await db.execute(
        delete(LotInput).where(
            LotInput.lot_id == lot_id,
            LotInput.inventory_id == inventory_id,
        )
    )
    await db.commit()
    return result.rowcount > 0


# =============================================================================
# LOT OUTPUTS
# =============================================================================

async def get_lot_outputs(db: AsyncSession, lot_id: str) -> list[LotOutput]:
    result = await db.execute(
        select(LotOutput).where(LotOutput.lot_id == lot_id)
    )
    return list(result.scalars().all())


async def add_lot_output(db: AsyncSession, lot_id: str, **kwargs) -> LotOutput:
    output = LotOutput(lot_id=lot_id, **kwargs)
    db.add(output)
    await db.commit()
    await db.refresh(output)
    return output


# =============================================================================
# ORDERS
# =============================================================================

async def get_orders(db: AsyncSession) -> list[Order]:
    result = await db.execute(select(Order).order_by(Order.created_at.desc()))
    return list(result.scalars().all())


async def get_order(db: AsyncSession, order_id: str) -> Optional[Order]:
    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )
    return result.scalar_one_or_none()


async def create_order(db: AsyncSession, **kwargs) -> Order:
    order = Order(**kwargs)
    db.add(order)
    await db.commit()
    await db.refresh(order)
    return order


async def search_orders(db: AsyncSession, query: str) -> list[Order]:
    stmt = select(Order).where(Order.name.ilike(f"%{query}%"))
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def upsert_order(db: AsyncSession, order_data: dict) -> Order:
    order_id = order_data.get("id")
    if not order_id:
        return await create_order(db, **order_data)
    existing = await get_order(db, order_id)
    if existing:
        for key, value in order_data.items():
            if key != "id" and value is not None:
                setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        return existing
    return await create_order(db, **order_data)


async def upsert_inventory(db: AsyncSession, inv_data: dict) -> Inventory:
    item_id = inv_data.get("id")
    if not item_id:
        return await create_inventory_item(db, **inv_data)
    existing = await get_inventory_item(db, item_id)
    if existing:
        for key, value in inv_data.items():
            if key != "id" and value is not None:
                setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        return existing
    return await create_inventory_item(db, **inv_data)


def _chunks(items: list[dict], size: int = 500):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def _trim(value, max_length: int):
    if value is None:
        return None
    return str(value)[:max_length]


def _number(value, fallback: float = 0) -> float:
    try:
        if value is None or value == "":
            return fallback
        return float(value)
    except (TypeError, ValueError):
        return fallback


async def bulk_upsert_orders(db: AsyncSession, orders: list[dict]) -> int:
    rows = [
        {
            "id": _trim(order.get("id"), 50),
            "name": _trim(order.get("name") or order.get("id") or "", 255),
            "status": _trim(order.get("status"), 50),
            "customer_name": _trim(order.get("customer_name"), 255),
            "notes": order.get("notes"),
            "data": order.get("data") or {},
        }
        for order in orders
        if order.get("id")
    ]
    if not rows:
        return 0

    for chunk in _chunks(rows):
        stmt = pg_insert(Order).values(chunk)
        update_values = {
            "name": stmt.excluded.name,
            "status": stmt.excluded.status,
            "customer_name": stmt.excluded.customer_name,
            "notes": stmt.excluded.notes,
            "data": stmt.excluded.data,
            "updated_at": datetime.utcnow(),
        }
        await db.execute(stmt.on_conflict_do_update(
            index_elements=[Order.id],
            set_=update_values,
        ))
    await db.commit()
    return len(rows)


async def bulk_upsert_inventory(db: AsyncSession, inventory: list[dict]) -> int:
    incoming_ids = [_trim(item.get("id"), 50) for item in inventory if item.get("id")]
    existing_by_id = {}
    if incoming_ids:
        result = await db.execute(select(Inventory).where(Inventory.id.in_(incoming_ids)))
        existing_by_id = {item.id: item for item in result.scalars().all()}

    rows = [
        _normalize_inventory_upsert_row(item, existing_by_id)
        for item in inventory
        if item.get("id")
    ]
    if not rows:
        return 0

    for chunk in _chunks(rows):
        stmt = pg_insert(Inventory).values(chunk)
        update_values = {
            "name": stmt.excluded.name,
            "type": stmt.excluded.type,
            "length": stmt.excluded.length,
            "width": stmt.excluded.width,
            "thickness": stmt.excluded.thickness,
            "quantity": stmt.excluded.quantity,
            "volume": stmt.excluded.volume,
            "status": stmt.excluded.status,
            "source_lot_id": stmt.excluded.source_lot_id,
            "wood_type": stmt.excluded.wood_type,
            "data": stmt.excluded.data,
            "updated_at": datetime.utcnow(),
        }
        await db.execute(stmt.on_conflict_do_update(
            index_elements=[Inventory.id],
            set_=update_values,
        ))
    await db.commit()
    return len(rows)


def _normalize_inventory_upsert_row(item: dict, existing_by_id: dict[str, Inventory]) -> dict:
    item_id = _trim(item.get("id"), 50)
    data = dict(item.get("data") or {})
    existing_data = {}
    existing = existing_by_id.get(item_id)
    if existing and existing.data:
        existing_data = dict(existing.data)

    incoming_quantity = _number(item.get("quantity"), 0)
    incoming_volume = _number(item.get("volume"), 0)
    consumed_quantity = _number(existing_data.get("local_consumed_quantity"), 0)
    consumed_volume = _number(existing_data.get("local_consumed_volume"), 0)

    quantity = max(0, int(incoming_quantity - consumed_quantity))
    volume = max(0, incoming_volume - consumed_volume) if item.get("volume") is not None else None
    status = "USED" if quantity <= 0 and incoming_quantity > 0 else _trim(item.get("status") or "AVAILABLE", 100)

    merged_data = {
        **data,
        "mcp_quantity": incoming_quantity,
        "mcp_volume": incoming_volume,
        "local_consumed_quantity": consumed_quantity,
        "local_consumed_volume": consumed_volume,
    }

    return {
        "id": item_id,
        "name": _trim(item.get("name") or item.get("id") or "", 255),
        "type": _trim(item.get("type") or "RAW", 20),
        "length": item.get("length"),
        "width": item.get("width"),
        "thickness": item.get("thickness"),
        "quantity": quantity,
        "volume": volume,
        "status": status,
        "source_lot_id": _trim(item.get("source_lot_id"), 50),
        "wood_type": _trim(item.get("wood_type"), 50),
        "data": merged_data,
    }


# =============================================================================
# LOT TARGETS
# =============================================================================

async def set_lot_target(
    db: AsyncSession,
    lot_id: str,
    order_id: Optional[str],
    quantity_produce: int,
) -> LotTarget:
    existing = await db.execute(
        select(LotTarget).where(LotTarget.lot_id == lot_id)
    )
    target = existing.scalar_one_or_none()
    if target:
        target.order_id = order_id
        target.quantity_produce = quantity_produce
    else:
        target = LotTarget(
            lot_id=lot_id,
            order_id=order_id,
            quantity_produce=quantity_produce,
        )
        db.add(target)
    await db.commit()
    await db.refresh(target)
    return target


# =============================================================================
# USERS
# =============================================================================

async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, user_data: dict) -> User:
    user = User(
        username=user_data["username"],
        password=user_data["password"],
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# =============================================================================
# CUSTOM REQUESTS
# =============================================================================

async def get_custom_requests(db: AsyncSession) -> list[CustomRequest]:
    result = await db.execute(
        select(CustomRequest).order_by(CustomRequest.created_at.desc())
    )
    return list(result.scalars().all())


async def bulk_upsert_custom_requests(db: AsyncSession, requests: list[dict]) -> list[CustomRequest]:
    saved = []
    for req in requests:
        req_id = req.get("id") or f"REQ-{int(datetime.utcnow().timestamp() * 1000)}"
        
        # Check if already exists
        existing = await db.execute(select(CustomRequest).where(CustomRequest.id == req_id))
        item = existing.scalar_one_or_none()
        
        if item:
            item.wood_type = req.get("wood_type") or req.get("woodType") or item.wood_type
            item.thickness = req.get("thickness") if req.get("thickness") is not None else item.thickness
            item.width = req.get("width") if req.get("width") is not None else item.width
            item.length = req.get("length") if req.get("length") is not None else item.length
            item.quantity = req.get("quantity") if req.get("quantity") is not None else item.quantity
            item.reason = req.get("reason") if req.get("reason") is not None else item.reason
            item.status = req.get("status") or item.status
            item.source_molding_lot_id = req.get("source_molding_lot_id") or req.get("source_molding_lot_id") or item.source_molding_lot_id
            item.supplemental_lot_id = req.get("supplemental_lot_id") or req.get("supplemental_lot_id") or item.supplemental_lot_id
        else:
            item = CustomRequest(
                id=req_id,
                wood_type=req.get("wood_type") or req.get("woodType"),
                thickness=req.get("thickness"),
                width=req.get("width"),
                length=req.get("length"),
                quantity=req.get("quantity"),
                reason=req.get("reason"),
                status=req.get("status", "pending"),
                source_molding_lot_id=req.get("source_molding_lot_id"),
                supplemental_lot_id=req.get("supplemental_lot_id")
            )
            db.add(item)
        saved.append(item)
    await db.commit()
    for item in saved:
        await db.refresh(item)
    return saved
