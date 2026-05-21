"""
Router MCP proxy và đồng bộ dữ liệu MCP: /mcp/run-template, /mcp/debug, /api/v1/mcp/sync
"""
import os

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import McpRunTemplateRequest, McpSyncRequest, McpSyncResponse
from services.mcp_service import (
    inspect_mcp_endpoints,
    run_mcp_template,
    fetch_mcp_order_products,
    fetch_mcp_sync_data,
)
from services import db_crud

router = APIRouter(prefix="/mcp", tags=["mcp"])


@router.post("/run-template")
async def mcp_run_template_endpoint(request: McpRunTemplateRequest):
    """
    Gọi MCP template qua backend proxy.
    Frontend không cần và không thấy MCP_TOKEN.
    """
    return run_mcp_template(request.name, request.args)


@router.get("/debug")
async def mcp_debug():
    """
    Kiểm tra kết nối MCP mà không lộ MCP_TOKEN ra client.
    Hữu ích để debug cấu hình MCP_URL / MCP_TOKEN.
    """
    return {
        "mcp_url_configured": bool(os.getenv("MCP_URL", "").strip()),
        "mcp_token_configured": bool(os.getenv("MCP_TOKEN", "").strip()),
        "checks": inspect_mcp_endpoints(),
    }


# =============================================================================
# MCP SYNC — upsert orders & inventory from MCP into Supabase
# =============================================================================

sync_router = APIRouter(prefix="/api/v1/mcp", tags=["mcp-sync"])


@sync_router.post("/sync", response_model=McpSyncResponse)
async def mcp_sync(
    payload: McpSyncRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Nhận dữ liệu MCP (đơn hàng + kho) và cập nhật/thêm mới vào Supabase.
    """
    orders, inventory, errors = fetch_mcp_sync_data(payload)
    orders_count = 0
    inventory_count = 0

    if orders:
        try:
            orders_count = await db_crud.bulk_upsert_orders(db, [
                {
                    "id": order_data.get("id"),
                    "name": order_data.get("name", ""),
                    "status": order_data.get("status"),
                    "customer_name": order_data.get("supplierName") or order_data.get("customer_name"),
                    "notes": order_data.get("notes"),
                    "data": {
                        **(order_data.get("data") or {}),
                        "source": order_data.get("source") or (order_data.get("data") or {}).get("source"),
                        "supplierId": order_data.get("supplierId") or (order_data.get("data") or {}).get("supplierId"),
                        "supplierName": order_data.get("supplierName") or (order_data.get("data") or {}).get("supplierName"),
                        "orderDate": order_data.get("orderDate") or (order_data.get("data") or {}).get("orderDate"),
                        "products": order_data.get("products") or (order_data.get("data") or {}).get("products") or [],
                    },
                }
                for order_data in orders
            ])
        except Exception as exc:
            await db.rollback()
            errors.append(f"Orders bulk upsert: {exc}")

    if inventory:
        try:
            inventory_count = await db_crud.bulk_upsert_inventory(db, [
                {
                    "id": inv_data.get("id"),
                    "name": inv_data.get("name", ""),
                    "type": inv_data.get("type", "RAW"),
                    "length": inv_data.get("length"),
                    "width": inv_data.get("width"),
                    "thickness": inv_data.get("thickness"),
                    "quantity": inv_data.get("quantity", 0),
                    "volume": inv_data.get("volume"),
                    "status": inv_data.get("status", "AVAILABLE"),
                    "source_lot_id": None if inv_data.get("source") == "mcp" else inv_data.get("source_lot_id"),
                    "wood_type": inv_data.get("wood_type"),
                    "data": {
                        **(inv_data.get("data") or {}),
                        "source": inv_data.get("source") or (inv_data.get("data") or {}).get("source"),
                        "mcp_id": inv_data.get("mcp_id") or (inv_data.get("data") or {}).get("mcp_id"),
                        "batchId": inv_data.get("batchId") or (inv_data.get("data") or {}).get("batchId"),
                        "malo_nguyenlieu": inv_data.get("malo_nguyenlieu") or (inv_data.get("data") or {}).get("malo_nguyenlieu"),
                        "orderName": inv_data.get("orderName") or (inv_data.get("data") or {}).get("orderName"),
                        "origin": inv_data.get("origin") or (inv_data.get("data") or {}).get("origin"),
                        "fsc_name": inv_data.get("fsc_name") or (inv_data.get("data") or {}).get("fsc_name"),
                    },
                }
                for inv_data in inventory
            ])
        except Exception as exc:
            await db.rollback()
            errors.append(f"Inventory bulk upsert: {exc}")

    return McpSyncResponse(
        orders_upserted=orders_count,
        inventory_upserted=inventory_count,
        errors=errors,
    )


@sync_router.post("/sync-order-details/{order_id:path}")
async def sync_order_details(
    order_id: str,
    include_bom: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy thông tin chi tiết sản phẩm và BOM của một đơn hàng từ MCP và lưu vào db cache.
    """
    order = await db_crud.get_order(db, order_id)
    if not order:
        return {"updated": False, "error": "Order not found", "order_id": order_id}

    products = fetch_mcp_order_products(order_id, include_bom=include_bom)
    data = {
        **(order.data or {}),
        "source": "mcp",
        "products": products,
    }
    await db_crud.upsert_order(db, {
        "id": order.id,
        "name": order.name,
        "status": order.status,
        "customer_name": order.customer_name,
        "notes": order.notes,
        "data": data,
    })
    return {
        "updated": True,
        "order_id": order_id,
        "products": len(products),
        "details": sum(len(product.get("items") or []) for product in products),
    }
