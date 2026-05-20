"""
CRUD operations for Supabase PostgreSQL via SQLAlchemy async.
"""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.orm import (
    Inventory,
    LotInput,
    LotOutput,
    LotTarget,
    Order,
    ProductionLot,
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
