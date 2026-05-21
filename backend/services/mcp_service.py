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
