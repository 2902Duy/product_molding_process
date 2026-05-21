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


def _first_positive_number(row: dict, keys: list[str], fallback: float = 0) -> float:
    for key in keys:
        value = row.get(key)
        if value in (None, ""):
            continue
        if isinstance(value, str):
            value = value.replace(",", ".")
        try:
            number = float(value)
        except (TypeError, ValueError):
            continue
        if number > 0:
            return number
    return fallback


def _map_mcp_inventory(rows: list[dict]) -> list[dict]:
    return [
        {
            "id": f"MCP-INV-{row.get('id')}",
            "name": row.get("nguyenlieu") or "Khong ro",
            "type": "RAW",
            "length": int(float(row.get("dai_sc") or 0)),
            "width": int(float(row.get("rong_sc") or 0)),
            "thickness": int(float(row.get("day_sc") or 0)),
            "quantity": int(_first_positive_number(row, [
                "soluong_conlai", "soluongton", "soluong_ton", "sl_conlai",
                "sl_ton", "sl", "soluong", "qty", "quantity",
            ])),
            "volume": _first_positive_number(row, [
                "sokhoi_conlai", "sokhoiton", "sokhoi_ton", "m3_conlai",
                "m3_ton", "sokhoi", "m3", "volume",
            ]),
            "status": "AVAILABLE",
            "source_lot_id": None,
            "wood_type": row.get("nguyenlieu"),
            "data": {
                "source": "mcp",
                "mcp_id": row.get("id"),
                "batchId": row.get("malo_nguyenlieu") or row.get("p_id") or f"MCP-{row.get('id')}",
                "malo_nguyenlieu": row.get("malo_nguyenlieu"),
                "p_id": row.get("p_id"),
                "orderId": row.get("madonhang"),
                "orderName": row.get("donhang"),
                "origin": row.get("nguongoc"),
                "fsc_name": row.get("fsc_name"),
            },
        }
        for row in rows
        if row.get("id") is not None
    ]


def _map_mcp_bom_items(rows: list[dict], order_id: str, product_id: str, product_code: str) -> list[dict]:
    items = []
    for row in rows:
        if not row or not row.get("chitiet") or str(row.get("nguyenlieu") or "0") == "0":
            continue
        raw_detail_id = row.get("mact") or row.get("id") or row.get("chitiet")
        detail_row_id = f"{order_id}__{product_id}__{raw_detail_id}"
        items.append({
            "id": detail_row_id,
            "detailRowId": detail_row_id,
            "mcp_id": row.get("id"),
            "mact": row.get("mact"),
            "productId": product_id,
            "productCode": product_code,
            "orderId": order_id,
            "name": row.get("chitiet"),
            "materialType": row.get("nguyenlieu"),
            "length": int(float(row.get("dai_tc") or 0)),
            "width": int(float(row.get("rong_tc") or 0)),
            "thickness": int(float(row.get("dayy_tc") or 0)),
            "base_quantity": float(row.get("soluong_tc") or 1),
            "m3_tc": float(row.get("m3_tc") or 0),
            "source": "mcp",
        })
    return items


def _map_mcp_product(row: dict, order_id: str, items: list[dict] | None = None) -> dict:
    product_code = row.get("masp") or f"MCP-PROD-{row.get('id')}"
    product_id = f"MCP-PROD-LINE-{row.get('id')}" if row.get("id") else f"MCP-PROD-{order_id}-{product_code}"
    return {
        "id": product_id,
        "productId": product_id,
        "orderId": order_id,
        "orderLineId": row.get("id"),
        "productCode": product_code,
        "code": product_code,
        "detailCode": row.get("chitiet"),
        "name": row.get("tenchitiet") or row.get("mota") or product_code,
        "quantity": int(float(row.get("soluong") or 0)),
        "length": _first_positive_number(row, ["dai", "dai_sp", "dai_tp", "length"]),
        "width": _first_positive_number(row, ["rong", "rong_sp", "rong_tp", "width"]),
        "thickness": _first_positive_number(row, ["dayy", "day", "cao", "thickness"]),
        "height": _first_positive_number(row, ["dayy", "day", "cao", "thickness"]),
        "volume": _first_positive_number(row, ["m3", "m3_sp", "sokhoi", "volume"]),
        "items": items or [],
        "source": "mcp",
        "deliveryDate": row.get("ngaycangiao"),
        "color": row.get("mausac"),
    }


def _fetch_mcp_order_products(order_id: str, include_bom: bool = False) -> list[dict]:
    detail = run_mcp_template("exec_tr_dondathang_chitiet_getall", {"maddh": order_id})
    products = []
    for product in detail.get("rows") or []:
        product_code = product.get("masp") or f"MCP-PROD-{product.get('id')}"
        product_id = f"MCP-PROD-LINE-{product.get('id')}" if product.get("id") else f"MCP-PROD-{order_id}-{product_code}"
        items = []
        if include_bom and product_code:
            bom = run_mcp_template("exec_dqt_dinhmuc_govan_get", {
                "masp": product_code,
                "soluong": int(float(product.get("soluong") or 1)),
                "nguyenlieu": "all",
            })
            items = _map_mcp_bom_items(bom.get("rows") or [], order_id, product_id, product_code)
        products.append(_map_mcp_product(product, order_id, items))
    return products


def _map_mcp_orders(rows: list[dict]) -> list[dict]:
    return [
        {
            "id": row.get("maddh"),
            "name": row.get("donhang") or row.get("maddh") or "",
            "status": row.get("trangthai"),
            "customer_name": row.get("tenncc"),
            "notes": None,
            "data": {
                "source": "mcp",
                "supplierId": row.get("mancc"),
                "supplierName": row.get("tenncc"),
                "orderDate": row.get("ngaydat"),
                "products": [],
            },
        }
        for row in rows
        if row.get("maddh")
    ]


def _fetch_mcp_sync_data(payload: McpSyncRequest) -> tuple[list[dict], list[dict], list[str]]:
    errors: list[str] = []
    orders = payload.orders
    inventory = payload.inventory

    if orders is None:
        try:
            data = run_mcp_template("exec_tr_dondathang_getlisthtr", {"trangthai": "all"})
            orders = _map_mcp_orders(data.get("rows") or [])
        except Exception as exc:
            errors.append(f"MCP orders fetch: {exc}")

    if inventory is None:
        try:
            data = run_mcp_template("exec_dqt_thongke_phoi_getall", {})
            inventory = _map_mcp_inventory(data.get("rows") or [])
        except Exception as exc:
            errors.append(f"MCP inventory fetch: {exc}")

    return orders or [], inventory or [], errors


@sync_router.post("/sync", response_model=McpSyncResponse)
async def mcp_sync(
    payload: McpSyncRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive MCP data (orders + inventory) from frontend periodic sync
    and upsert into Supabase.
    """
    orders, inventory, errors = _fetch_mcp_sync_data(payload)
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
    Fetch products and BOM details for one MCP order, then cache them in orders.data.
    """
    order = await db_crud.get_order(db, order_id)
    if not order:
        return {"updated": False, "error": "Order not found", "order_id": order_id}

    products = _fetch_mcp_order_products(order_id, include_bom=include_bom)
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
