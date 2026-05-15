"""
Chat service — gọi Gemini API hoặc Hermes Agent để trả lời câu hỏi từ frontend.
"""
import json
import os
import shlex
import subprocess
import urllib.error
import urllib.request
from typing import Any

from fastapi import HTTPException

from models.schemas import ChatResponse


# =============================================================================
# CONTEXT HELPERS
# =============================================================================

def _safe_chat_context(context: dict[str, Any]) -> dict[str, Any]:
    """
    Lọc context: chỉ giữ các key đọc dữ liệu, thêm policy chặn ghi file.
    Tránh gửi payload quá lớn hoặc quyền ghi file lên AI.
    """
    allowed_keys = {"inventory", "lots", "orders", "customRequests", "currentView", "currentLotId"}
    safe_context = {key: context.get(key) for key in allowed_keys if key in context}
    safe_context["policy"] = {
        "readonly_by_default": True,
        "workspace": os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")),
        "allowed_write_dirs": ["frontend/src", "backend", "generated"],
        "deny": [".env", ".git", "node_modules", "backend/venv_sklearn16"],
        "note": "Do not write files directly. Return proposed actions only.",
    }
    return safe_context


def _build_app_context_prompt(message: str, context: dict[str, Any]) -> str:
    """Build system prompt gắn dữ liệu ứng dụng vào câu hỏi."""
    safe_context = _safe_chat_context(context)
    return (
        "Ban la tro ly san xuat go trong mot ung dung quan ly xuong.\n"
        "Cac khai niem chinh:\n"
        "- orders: don hang, moi don co products va items/chi tiet can san xuat.\n"
        "- lots: phieu san xuat. slip_type='PHOI_GO' la phieu san xuat phoi, "
        "slip_type='DINH_HINH' la phieu dinh hinh.\n"
        "- inventory: kho, type='RAW' la nguyen lieu, 'SURPLUS' la phoi du, "
        "'SEMIFINISHED' la phoi/ban thanh pham co kich thuoc.\n"
        "- Trong phieu dinh hinh, targetProducts la san pham duoc chon; details la cac chi tiet/phoi; "
        "stages la cac cong doan ap dung cho tung chi tiet; quantity_completed la so luong hoan tat cuoi cung.\n\n"
        "Quy tac du lieu:\n"
        "- Chi dua vao JSON duoc cung cap, khong bia them du lieu.\n"
        "- Neu thieu du lieu de ket luan, noi ngan gon dang thieu gi.\n"
        "- Khong de xuat sua file, khong chay lenh, khong thay doi du lieu.\n\n"
        "Cach dien dat:\n"
        "- Tra loi bang tieng Viet co dau, tu nhien nhu dang noi voi nguoi van hanh xuong.\n"
        "- Neu cau hoi don gian, tra loi truc tiep bang 1-2 cau.\n"
        "- Khong mo dau bang 'Dua tren du lieu', 'Dua tren JSON', hoac 'Du lieu duoc cung cap'.\n"
        "- Co the dung Markdown nhe nhang cho cau tra loi de de doc: **in dam**, danh sach '- ...' "
        "hoac danh sach so '1. ...'. Khong dung bang Markdown hoac code block dai.\n"
        "- Neu co so lieu, dua so lieu len truoc roi them ngu canh ngan gon. "
        "Vi du: 'Hien co 87 lo trong kho, tat ca deu la nguyen lieu tho.'\n"
        "- Dung tu trong ung dung: kho, lo, nguyen lieu, phoi, don hang, phieu san xuat, cong doan.\n"
        "- Chi dung bullet khi nguoi dung hoi nhieu y hoac can so sanh.\n\n"
        f"Cau hoi nguoi dung: {message}\n\n"
        f"Du lieu ung dung JSON:\n{json.dumps(safe_context, ensure_ascii=False)}"
    )


def _normalize_hermes_response(data: Any) -> ChatResponse:
    """Chuẩn hóa nhiều kiểu response của Hermes về ChatResponse."""
    if isinstance(data, str):
        return ChatResponse(answer=data, actions=[], source="hermes")

    if isinstance(data, dict):
        answer = (
            data.get("answer")
            or data.get("message")
            or data.get("content")
            or data.get("text")
            or ""
        )
        actions = data.get("actions") if isinstance(data.get("actions"), list) else []
        return ChatResponse(answer=str(answer), actions=actions, source="hermes")

    return ChatResponse(answer=str(data), actions=[], source="hermes")


# =============================================================================
# GEMINI
# =============================================================================

def call_gemini(message: str, context: dict[str, Any]) -> ChatResponse:
    """Gọi Gemini API bằng GEMINI_API_KEY từ env."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return ChatResponse(
            answer="Chưa cấu hình GEMINI_API_KEY cho backend. Hãy đặt GEMINI_API_KEY rồi khởi động lại backend.",
            actions=[],
            source="backend",
        )

    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview").strip()
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": _build_app_context_prompt(message, context)}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.9,
            "maxOutputTokens": 1200,
        },
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        retry_seconds = None
        try:
            error_data = json.loads(detail)
            retry_delay = (
                ((error_data.get("error") or {}).get("details") or [{}])[-1].get("retryDelay")
            )
            if isinstance(retry_delay, str) and retry_delay.endswith("s"):
                retry_seconds = int(float(retry_delay[:-1]))
        except Exception:
            retry_seconds = None

        if exc.code == 429:
            msg = "Chat AI đang bị giới hạn quota Gemini tạm thời."
            if retry_seconds:
                msg += f" Thử lại sau khoảng {retry_seconds} giây."
            raise HTTPException(status_code=429, detail=msg)

        raise HTTPException(status_code=502, detail=f"Gemini HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Không kết nối được Gemini: {exc.reason}")
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Gemini phản hồi quá lâu.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini trả về dữ liệu không phải JSON.")

    candidates = data.get("candidates") or []
    parts = candidates[0].get("content", {}).get("parts", []) if candidates else []
    answer = "\n".join(part.get("text", "") for part in parts if part.get("text")).strip()
    if not answer:
        answer = "Gemini không trả về nội dung trả lời."

    return ChatResponse(answer=answer, actions=[], source="gemini")


# =============================================================================
# HERMES
# =============================================================================

def _call_hermes_cli(message: str, context: dict[str, Any]) -> ChatResponse:
    """Gọi Hermes CLI one-shot (dùng khi không có HTTP endpoint)."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    safe_context = _safe_chat_context(context)
    prompt = (
        "Bạn là trợ lý đọc dữ liệu sản xuất gỗ. "
        "Chỉ trả lời dựa trên dữ liệu JSON dưới đây. "
        "Không tạo file, không sửa file, không chạy lệnh, không thay đổi dữ liệu.\n\n"
        f"Câu hỏi: {message}\n\n"
        f"Dữ liệu JSON:\n{json.dumps(safe_context, ensure_ascii=False)}"
    )

    try:
        hermes_command = shlex.split(os.getenv("HERMES_COMMAND", "hermes"))
        result = subprocess.run(
            [*hermes_command, "--ignore-rules", "-z", prompt],
            cwd=project_root,
            text=True,
            capture_output=True,
            timeout=90,
            encoding="utf-8",
            errors="replace",
        )
    except FileNotFoundError:
        raise HTTPException(status_code=502, detail="Không tìm thấy lệnh hermes trong PATH.")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Hermes CLI phản hồi quá lâu.")

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise HTTPException(status_code=502, detail=f"Hermes CLI lỗi: {detail}")

    return ChatResponse(answer=result.stdout.strip(), actions=[], source="hermes-cli")


def call_hermes(message: str, context: dict[str, Any]) -> ChatResponse:
    """Gọi Hermes Agent qua HTTP (cấu hình bằng HERMES_URL) hoặc CLI."""
    hermes_url = os.getenv("HERMES_URL", "").strip()
    if not hermes_url:
        if os.getenv("HERMES_CLI_ENABLED", "").strip() == "1":
            return _call_hermes_cli(message, context)
        return ChatResponse(
            answer="Hermes trên máy này đang là CLI. Hãy đặt HERMES_CLI_ENABLED=1 để backend gọi `hermes -z`, "
                   "hoặc đặt HERMES_URL nếu bạn chạy Hermes ở chế độ HTTP server.",
            actions=[],
            source="backend",
        )

    payload = {"message": message, "context": _safe_chat_context(context)}
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        hermes_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw) if raw else {}
            return _normalize_hermes_response(data)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"Hermes HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Không kết nối được Hermes: {exc.reason}")
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Hermes phản hồi quá lâu.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Hermes trả về dữ liệu không phải JSON.")
