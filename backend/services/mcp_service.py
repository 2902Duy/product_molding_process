"""
MCP (Model Context Protocol) proxy service.
Backend làm trung gian để frontend không cần giữ MCP_TOKEN.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from dotenv import load_dotenv
from fastapi import HTTPException

from models.schemas import McpSyncRequest

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


# =============================================================================
# INTERNAL HELPERS
# =============================================================================

def _parse_mcp_sse(raw: str) -> dict[str, Any]:
    """Parse JSON-RPC payload từ MCP SSE response."""
    for line in raw.splitlines():
        if line.startswith("data:"):
            return json.loads(line[5:].strip())
    return json.loads(raw)


def _build_mcp_request(endpoint: str, token: str, payload: dict[str, Any]) -> urllib.request.Request:
    return urllib.request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )


def _mcp_endpoint_candidates(endpoint: str) -> list[str]:
    endpoint = endpoint.strip()
    candidates = [endpoint]
    if endpoint.endswith("/"):
        candidates.append(endpoint.rstrip("/"))
    else:
        candidates.append(f"{endpoint}/")
    return list(dict.fromkeys(c for c in candidates if c))


# =============================================================================
# PUBLIC FUNCTIONS
# =============================================================================

def inspect_mcp_endpoints() -> list[dict[str, Any]]:
    """Kiểm tra kết nối MCP mà không lộ MCP_TOKEN."""
    token = os.getenv("MCP_TOKEN", "").strip()
    endpoint = os.getenv("MCP_URL", "https://tool.vfmgroup.vn/db-mcp/mcp/").strip()
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {},
    }
    results = []

    for candidate in _mcp_endpoint_candidates(endpoint):
        request = _build_mcp_request(candidate, token or "missing", payload)
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read().decode("utf-8", errors="replace")
                results.append({
                    "url": candidate,
                    "status": response.status,
                    "content_type": response.headers.get("Content-Type"),
                    "body_preview": raw[:200],
                })
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            results.append({
                "url": candidate,
                "status": exc.code,
                "location": exc.headers.get("Location"),
                "content_type": exc.headers.get("Content-Type"),
                "body_preview": detail[:200],
            })
        except urllib.error.URLError as exc:
            results.append({"url": candidate, "error": str(exc.reason)})
        except TimeoutError:
            results.append({"url": candidate, "error": "timeout"})

    return results


def run_mcp_template(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Proxy gọi db-mcp template — giữ MCP_TOKEN ở backend."""
    token = os.getenv("MCP_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=500, detail="Missing MCP_TOKEN in backend environment")

    endpoint = os.getenv("MCP_URL", "https://tool.vfmgroup.vn/db-mcp/mcp/").strip()
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "run_template",
            "arguments": {"name": name, "args": args or {}},
        },
    }

    try:
        envelope = None
        visited_endpoints: set[str] = set()

        for candidate in _mcp_endpoint_candidates(endpoint):
            current_endpoint = candidate
            for _ in range(3):
                if current_endpoint in visited_endpoints:
                    break
                visited_endpoints.add(current_endpoint)
                request = _build_mcp_request(current_endpoint, token, payload)
                try:
                    with urllib.request.urlopen(request, timeout=60) as response:
                        raw = response.read().decode("utf-8")
                        envelope = _parse_mcp_sse(raw)
                    break
                except urllib.error.HTTPError as exc:
                    if exc.code in (301, 302, 303, 307, 308):
                        location = exc.headers.get("Location")
                        if location:
                            redirected = urllib.parse.urljoin(current_endpoint, location)
                            print(f"[MCP_REDIRECT] template={name} status={exc.code} location={redirected}")
                            if redirected not in visited_endpoints:
                                current_endpoint = redirected
                                continue
                        break
                    raise
            if envelope is not None:
                break

        if envelope is None:
            raise HTTPException(status_code=502, detail="MCP redirect loop.")

    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"[MCP_ERROR] template={name} http_status={exc.code} detail={detail[:1000]}")
        raise HTTPException(status_code=502, detail=f"MCP HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        print(f"[MCP_ERROR] template={name} connection_error={exc.reason}")
        raise HTTPException(status_code=502, detail=f"Cannot connect to MCP: {exc.reason}")
    except TimeoutError:
        print(f"[MCP_ERROR] template={name} timeout")
        raise HTTPException(status_code=504, detail="MCP response timed out.")
    except json.JSONDecodeError:
        print(f"[MCP_ERROR] template={name} invalid_json")
        raise HTTPException(status_code=502, detail="MCP returned invalid JSON.")

    if envelope.get("error"):
        print(f"[MCP_ERROR] template={name} rpc_error={str(envelope['error'])[:1000]}")
        raise HTTPException(status_code=502, detail=envelope["error"])

    result = envelope.get("result") or {}

# =============================================================================
# INTERNAL HELPERS
# =============================================================================

def _parse_mcp_sse(raw: str) -> dict[str, Any]:
    """Parse JSON-RPC payload từ MCP SSE response."""
    for line in raw.splitlines():
        if line.startswith("data:"):
            return json.loads(line[5:].strip())
    return json.loads(raw)


def _build_mcp_request(endpoint: str, token: str, payload: dict[str, Any]) -> urllib.request.Request:
    return urllib.request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )


def _mcp_endpoint_candidates(endpoint: str) -> list[str]:
    endpoint = endpoint.strip()
    candidates = [endpoint]
    if endpoint.endswith("/"):
        candidates.append(endpoint.rstrip("/"))
    else:
        candidates.append(f"{endpoint}/")
    return list(dict.fromkeys(c for c in candidates if c))


# =============================================================================
# PUBLIC FUNCTIONS
# =============================================================================

def inspect_mcp_endpoints() -> list[dict[str, Any]]:
    """Kiểm tra kết nối MCP mà không lộ MCP_TOKEN."""
    token = os.getenv("MCP_TOKEN", "").strip()
    endpoint = os.getenv("MCP_URL", "https://tool.vfmgroup.vn/db-mcp/mcp/").strip()
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/list",
        "params": {},
    }
    results = []

    for candidate in _mcp_endpoint_candidates(endpoint):
        request = _build_mcp_request(candidate, token or "missing", payload)
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                raw = response.read().decode("utf-8", errors="replace")
                results.append({
                    "url": candidate,
                    "status": response.status,
                    "content_type": response.headers.get("Content-Type"),
                    "body_preview": raw[:200],
                })
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            results.append({
                "url": candidate,
                "status": exc.code,
                "location": exc.headers.get("Location"),
                "content_type": exc.headers.get("Content-Type"),
                "body_preview": detail[:200],
            })
        except urllib.error.URLError as exc:
            results.append({"url": candidate, "error": str(exc.reason)})
        except TimeoutError:
            results.append({"url": candidate, "error": "timeout"})

    return results


def run_mcp_template(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Proxy gọi db-mcp template — giữ MCP_TOKEN ở backend."""
    token = os.getenv("MCP_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=500, detail="Missing MCP_TOKEN in backend environment")

    endpoint = os.getenv("MCP_URL", "https://tool.vfmgroup.vn/db-mcp/mcp/").strip()
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "run_template",
            "arguments": {"name": name, "args": args or {}},
        },
    }

    try:
        envelope = None
        visited_endpoints: set[str] = set()

        for candidate in _mcp_endpoint_candidates(endpoint):
            current_endpoint = candidate
            for _ in range(3):
                if current_endpoint in visited_endpoints:
                    break
                visited_endpoints.add(current_endpoint)
                request = _build_mcp_request(current_endpoint, token, payload)
                try:
                    with urllib.request.urlopen(request, timeout=60) as response:
                        raw = response.read().decode("utf-8")
                        envelope = _parse_mcp_sse(raw)
                    break
                except urllib.error.HTTPError as exc:
                    if exc.code in (301, 302, 303, 307, 308):
                        location = exc.headers.get("Location")
                        if location:
                            redirected = urllib.parse.urljoin(current_endpoint, location)
                            print(f"[MCP_REDIRECT] template={name} status={exc.code} location={redirected}")
                            if redirected not in visited_endpoints:
                                current_endpoint = redirected
                                continue
                        break
                    raise
            if envelope is not None:
                break

        if envelope is None:
            raise HTTPException(status_code=502, detail="MCP redirect loop.")

    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        print(f"[MCP_ERROR] template={name} http_status={exc.code} detail={detail[:1000]}")
        raise HTTPException(status_code=502, detail=f"MCP HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        print(f"[MCP_ERROR] template={name} connection_error={exc.reason}")
        raise HTTPException(status_code=502, detail=f"Cannot connect to MCP: {exc.reason}")
    except TimeoutError:
        print(f"[MCP_ERROR] template={name} timeout")
        raise HTTPException(status_code=504, detail="MCP response timed out.")
    except json.JSONDecodeError:
        print(f"[MCP_ERROR] template={name} invalid_json")
        raise HTTPException(status_code=502, detail="MCP returned invalid JSON.")

    if envelope.get("error"):
        print(f"[MCP_ERROR] template={name} rpc_error={str(envelope['error'])[:1000]}")
        raise HTTPException(status_code=502, detail=envelope["error"])

    result = envelope.get("result") or {}
    if result.get("isError"):
        content = result.get("content") or []
        message = content[0].get("text") if content else "MCP tool error"
        print(f"[MCP_ERROR] template={name} tool_error={str(message)[:1000]}")
        raise HTTPException(status_code=502, detail=message)

    content = result.get("content") or []
    text = content[0].get("text") if content else "{}"
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"text": text}


# =============================================================================
# MCP MAPPING & SYNC DATA HELPERS (Refactored from Routers)
# =============================================================================

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


def fetch_mcp_order_products(order_id: str, include_bom: bool = False) -> list[dict]:
    """Lấy danh sách sản phẩm và định mức chi tiết (BOM) của một đơn hàng từ MCP."""
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


def fetch_mcp_sync_data(payload: McpSyncRequest) -> tuple[list[dict], list[dict], list[str]]:
    """Lấy dữ liệu đơn hàng và tồn kho từ MCP để chuẩn bị đồng bộ."""
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
