"""
Router: /api/v1/inventory — CRUD endpoints for inventory management.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import (
    BulkStatusUpdate,
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
    QuantityUpdate,
    StatusUpdate,
)
from services import db_crud

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


def _to_response(item) -> dict:
    data = item.data or {}
    return {
        "id": item.id,
        "batchId": data.get("batchId") or data.get("malo_nguyenlieu") or item.id,
        "source": data.get("source"),
        "name": item.name,
        "type": item.type,
        "length": item.length,
        "width": item.width,
        "thickness": item.thickness,
        "quantity": item.quantity,
        "volume": float(item.volume) if item.volume is not None else None,
        "status": item.status,
        "source_lot_id": item.source_lot_id,
        "wood_type": item.wood_type,
        "stock_category": data.get("stock_category"),
        "stock_status": data.get("stock_status"),
        "source_detail_id": data.get("source_detail_id"),
        "product_id": data.get("product_id"),
        "data": data,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("")
async def list_inventory(
    type: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    items = await db_crud.get_inventory(db, inv_type=type, status=status)
    return [_to_response(i) for i in items]


@router.get("/search")
async def search_inventory(
    q: str = Query(""),
    db: AsyncSession = Depends(get_db),
):
    items = await db_crud.search_inventory(db, q)
    return [_to_response(i) for i in items]


@router.get("/stats")
async def inventory_stats(db: AsyncSession = Depends(get_db)):
    return await db_crud.get_inventory_stats(db)


@router.get("/{item_id}")
async def get_inventory_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    item = await db_crud.get_inventory_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _to_response(item)


@router.post("", status_code=201)
async def create_inventory_item(
    payload: InventoryCreate,
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    if "id" not in data or not data["id"]:
        import time, random
        data["id"] = f"INV-{str(int(time.time()))[-5:]}-{random.randint(10, 99)}"
    # Merge extra fields into data JSONB (not separate DB columns)
    extra_keys = ["stock_category", "stock_status", "source_detail_id", "product_id"]
    item_data = dict(data.pop("data", None) or {})
    for key in extra_keys:
        val = data.pop(key, None)
        if val is not None:
            item_data[key] = val
    if item_data:
        data["data"] = item_data
    item = await db_crud.create_inventory_item(db, **data)
    return _to_response(item)


@router.put("/{item_id}")
async def update_inventory_item(
    item_id: str,
    payload: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    item = await db_crud.update_inventory_item(db, item_id, **data)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _to_response(item)


@router.delete("/{item_id}")
async def delete_inventory_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
):
    ok = await db_crud.delete_inventory_item(db, item_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"deleted": True}


@router.patch("/{item_id}/status")
async def update_inventory_status(
    item_id: str,
    payload: StatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    item = await db_crud.update_inventory_item(db, item_id, status=payload.status)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _to_response(item)


@router.patch("/{item_id}/quantity")
async def update_inventory_quantity(
    item_id: str,
    payload: QuantityUpdate,
    db: AsyncSession = Depends(get_db),
):
    item = await db_crud.update_inventory_item(db, item_id, quantity=payload.quantity)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return _to_response(item)


@router.post("/bulk-update-status")
async def bulk_update_status(
    payload: BulkStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    count = await db_crud.bulk_update_inventory_status(db, payload.ids, payload.status)
    return {"updated": count}
