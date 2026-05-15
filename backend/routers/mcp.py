"""
Router MCP proxy: /mcp/run-template, /mcp/debug
"""
import os

from fastapi import APIRouter

from models.schemas import McpRunTemplateRequest
from services.mcp_service import inspect_mcp_endpoints, run_mcp_template

router = APIRouter(prefix="/mcp", tags=["mcp"])


@router.post("/run-template")
async def mcp_run_template(request: McpRunTemplateRequest):
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
