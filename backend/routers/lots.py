"""
Router: /api/v1/lots — CRUD + consume/release materials endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import (
    ConsumeMaterialItem,
    LotCreate,
    LotInputResponse,
    LotOutputCreate,
    LotUpdate,
    ReleaseMaterialItem,
)
from services import db_crud

router = APIRouter(prefix="/api/v1/lots", tags=["lots"])


def _lot_to_dict(lot) -> dict:
    return {
        "id": lot.id,
        "name": lot.name,
        "status": lot.status,
        "created_date": lot.created_date.isoformat() if lot.created_date else None,
        "slip_type": lot.slip_type,
        "description": lot.description,
        "created_by": lot.created_by,
        "updated_at": lot.updated_at.isoformat() if lot.updated_at else None,
        "data": lot.data,
    }


def _input_to_dict(inp) -> dict:
    return {
        "lot_id": inp.lot_id,
        "inventory_id": inp.inventory_id,
        "quantity_used": inp.quantity_used,
        "volume_used": float(inp.volume_used) if inp.volume_used is not None else None,
        "created_at": inp.created_at.isoformat() if inp.created_at else None,
    }


def _output_to_dict(out) -> dict:
    return {
        "id": out.id,
        "lot_id": out.lot_id,
        "name": out.name,
        "length": out.length,
        "width": out.width,
        "thickness": out.thickness,
        "quantity": out.quantity,
        "volume": float(out.volume) if out.volume is not None else None,
        "status": out.status,
        "created_at": out.created_at.isoformat() if out.created_at else None,
    }


@router.get("")
async def list_lots(
    slip_type: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    lots = await db_crud.get_lots(db, slip_type=slip_type, status=status)
    return [_lot_to_dict(l) for l in lots]


@router.get("/{lot_id}")
async def get_lot(lot_id: str, db: AsyncSession = Depends(get_db)):
    lot = await db_crud.get_lot(db, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return _lot_to_dict(lot)


@router.post("", status_code=201)
async def create_lot(
    payload: LotCreate,
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    if "id" not in data or not data["id"]:
        import time
        data["id"] = f"LOT-{str(int(time.time()))[-8:]}"
    lot = await db_crud.create_lot(db, **data)
    return _lot_to_dict(lot)


@router.put("/{lot_id}")
async def update_lot(
    lot_id: str,
    payload: LotUpdate,
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    lot = await db_crud.update_lot(db, lot_id, **data)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")
    return _lot_to_dict(lot)


@router.delete("/{lot_id}")
async def delete_lot(lot_id: str, db: AsyncSession = Depends(get_db)):
    ok = await db_crud.delete_lot(db, lot_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Lot not found")
    return {"deleted": True}


@router.get("/{lot_id}/inputs")
async def get_lot_inputs(lot_id: str, db: AsyncSession = Depends(get_db)):
    inputs = await db_crud.get_lot_inputs(db, lot_id)
    return [_input_to_dict(i) for i in inputs]


@router.get("/{lot_id}/outputs")
async def get_lot_outputs(lot_id: str, db: AsyncSession = Depends(get_db)):
    outputs = await db_crud.get_lot_outputs(db, lot_id)
    return [_output_to_dict(o) for o in outputs]


@router.post("/{lot_id}/consume-materials")
async def consume_materials_for_lot(
    lot_id: str,
    materials: list[ConsumeMaterialItem],
    db: AsyncSession = Depends(get_db),
):
    lot = await db_crud.get_lot(db, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    consumed = []
    for mat in materials:
        inv = await db_crud.get_inventory_item(db, mat.inventory_id)
        if not inv:
            continue
        remaining = (inv.quantity or 0) - mat.quantity_used
        new_status = "USED" if remaining <= 0 else "RESERVED"
        await db_crud.update_inventory_item(
            db, mat.inventory_id, status=new_status, quantity=max(0, remaining)
        )
        inp = await db_crud.add_lot_input(
            db, lot_id, mat.inventory_id, mat.quantity_used, mat.volume_used
        )
        consumed.append(_input_to_dict(inp))

    return {"lot_id": lot_id, "consumed": consumed}


@router.post("/{lot_id}/release-materials")
async def release_materials_from_lot(
    lot_id: str,
    materials: list[ReleaseMaterialItem],
    db: AsyncSession = Depends(get_db),
):
    lot = await db_crud.get_lot(db, lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot not found")

    released = []
    for mat in materials:
        inv = await db_crud.get_inventory_item(db, mat.inventory_id)
        if not inv:
            continue
        restored_qty = (inv.quantity or 0) + mat.quantity_used
        await db_crud.update_inventory_item(
            db, mat.inventory_id, status="AVAILABLE", quantity=restored_qty
        )
        await db_crud.remove_lot_input(db, lot_id, mat.inventory_id)
        released.append({"inventory_id": mat.inventory_id, "quantity_restored": mat.quantity_used})

    return {"lot_id": lot_id, "released": released}


@router.get("/{lot_id}/material-usage")
async def get_lot_material_usage(lot_id: str, db: AsyncSession = Depends(get_db)):
    inputs = await db_crud.get_lot_inputs(db, lot_id)
    usage = []
    for inp in inputs:
        inv = await db_crud.get_inventory_item(db, inp.inventory_id)
        usage.append({
            "inventory_id": inp.inventory_id,
            "inventory_name": inv.name if inv else None,
            "quantity_used": inp.quantity_used,
            "volume_used": float(inp.volume_used) if inp.volume_used is not None else None,
        })
    return usage
