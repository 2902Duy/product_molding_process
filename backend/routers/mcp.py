"""
Router MCP proxy: /mcp/run-template, /mcp/debug, /api/v1/mcp/sync
"""
import os

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import McpRunTemplateRequest, McpSyncRequest, McpSyncResponse
from services.mcp_service import inspect_mcp_endpoints, run_mcp_template
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
    Receive MCP data (orders + inventory) from frontend periodic sync
    and upsert into Supabase.
    """
    errors: list[str] = []
    orders_count = 0
    inventory_count = 0

    if payload.orders:
        for order_data in payload.orders:
            try:
                await db_crud.upsert_order(db, {
                    "id": order_data.get("id"),
                    "name": order_data.get("name", ""),
                    "status": order_data.get("status"),
                    "customer_name": order_data.get("supplierName") or order_data.get("customer_name"),
                    "notes": order_data.get("notes"),
                })
                orders_count += 1
            except Exception as exc:
                errors.append(f"Order {order_data.get('id')}: {exc}")

    if payload.inventory:
        for inv_data in payload.inventory:
            try:
                await db_crud.upsert_inventory(db, {
                    "id": inv_data.get("id"),
                    "name": inv_data.get("name", ""),
                    "type": inv_data.get("type", "RAW"),
                    "length": inv_data.get("length"),
                    "width": inv_data.get("width"),
                    "thickness": inv_data.get("thickness"),
                    "quantity": inv_data.get("quantity", 0),
                    "volume": inv_data.get("volume"),
                    "status": inv_data.get("status", "AVAILABLE"),
                    "source_lot_id": inv_data.get("source_lot_id"),
                    "wood_type": inv_data.get("wood_type"),
                })
                inventory_count += 1
            except Exception as exc:
                errors.append(f"Inventory {inv_data.get('id')}: {exc}")

    return McpSyncResponse(
        orders_upserted=orders_count,
        inventory_upserted=inventory_count,
        errors=errors,
    )
