"""
Router: /api/v1/orders — CRUD endpoints for orders.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import OrderCreate
from services import db_crud

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


def _order_to_dict(order) -> dict:
    return {
        "id": order.id,
        "name": order.name,
        "status": order.status,
        "created_date": order.created_date.isoformat() if order.created_date else None,
        "customer_name": order.customer_name,
        "notes": order.notes,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


@router.get("")
async def list_orders(db: AsyncSession = Depends(get_db)):
    orders = await db_crud.get_orders(db)
    return [_order_to_dict(o) for o in orders]


@router.get("/search")
async def search_orders(q: str = Query(""), db: AsyncSession = Depends(get_db)):
    orders = await db_crud.search_orders(db, q)
    return [_order_to_dict(o) for o in orders]


@router.get("/{order_id}")
async def get_order(order_id: str, db: AsyncSession = Depends(get_db)):
    order = await db_crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_to_dict(order)


@router.post("", status_code=201)
async def create_order(
    payload: OrderCreate,
    db: AsyncSession = Depends(get_db),
):
    data = payload.model_dump(exclude_none=True)
    if "id" not in data or not data["id"]:
        import time
        data["id"] = f"ORD-{str(int(time.time()))[-8:]}"
    order = await db_crud.create_order(db, **data)
    return _order_to_dict(order)
