"""
Backend API cho dự đoán hao hụt gỗ
Sử dụng FastAPI + mô hình Random Forest đã train từ notebook Kaggle

Chạy: uvicorn main:app --reload --port 8000
"""
import sys
import io
import json
import shlex
import subprocess
import urllib.error
import urllib.request

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, List, Optional
import joblib
import numpy as np
import os
import pandas as pd
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "").strip()
    if not origins:
        return ["*"]
    return [origin.strip() for origin in origins.split(",") if origin.strip()]

# =============================================================================
# KHỞI TẠO APP
# =============================================================================

app = FastAPI(
    title="Wood Loss Prediction API",
    description="API dự đoán tỷ lệ hao hụt gỗ dựa trên mô hình Random Forest",
    version="1.0.0"
)

# CORS để frontend có thể gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ĐỊNH NGHĨA MÔ HÌNH VÀ CONFIG
# =============================================================================

# Định mức hao hụt theo loại gỗ (từ notebook)
LOSS_RANGES = {
    'THÔNG': (35, 40),
    'DẺ GAI': (30, 40),
    'HỒ ĐÀO': (40, 50),
}

# Giá trị mặc định
DEFAULT_LOSS_RANGE = (35, 40)

# Đường dẫn model
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "mo_hinh_hao_hut_final.pkl")

# Load model (khởi tạo khi server start)
ml_model = None
ml_config = None

def load_model():
    """Load model từ file pkl"""
    global ml_model, ml_config
    
    if os.path.exists(MODEL_PATH):
        try:
            package = joblib.load(MODEL_PATH)
            ml_model = package['model']
            ml_config = package.get('loss_ranges', LOSS_RANGES)
            print("[OK] Da load model thanh cong tu:", MODEL_PATH)
            return True
        except Exception as e:
            print("[WARN] Loi khi load model:", str(e))
    
    print("[INFO] Model khong tim thay. Su dung logic du phong.")
    ml_model = None
    ml_config = None
    return False

# Load model khi server khởi động
@app.on_event("startup")
async def startup_event():
    load_model()

# =============================================================================
# MODELS - Request/Response
# =============================================================================

class PredictionInput(BaseModel):
    """Input cho việc dự đoán"""
    wood_type: str = Field(..., description="Loại gỗ (VD: THÔNG, DẺ GAI, HỒ ĐÀO)")
    total_input_volume: float = Field(..., gt=0, description="Tổng khối lượng đầu vào (m³)")

class BatchPredictionInput(BaseModel):
    """Input cho dự đoán nhiều loại gỗ"""
    inputs: List[PredictionInput]

class PredictionResult(BaseModel):
    """Kết quả dự đoán cho một loại gỗ"""
    wood_type: str
    input_volume: float
    loss_percent: float = Field(..., description="Tỷ lệ hao hụt dự đoán (%)")
    min_loss: float
    max_loss: float
    estimated_output: float = Field(..., description="Khối ra ước tính (m³)")
    estimated_loss_volume: float = Field(..., description="Khối hao hụt ước tính (m³)")
    confidence: str = Field(..., description="Độ tin cậy: high, medium, low")
    model_used: bool = Field(..., description="Có sử dụng model thật không")

class BatchPredictionResult(BaseModel):
    """Kết quả dự đoán tổng hợp"""
    total_input_volume: float
    total_loss_percent: float
    estimated_total_output: float
    estimated_total_loss: float
    by_wood_type: List[PredictionResult]
    confidence: str
    model_used: bool

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    config: Optional[dict] = None

class ChatRequest(BaseModel):
    """Request chat gửi sang Hermes Agent"""
    message: str = Field(..., min_length=1)
    context: dict[str, Any] = Field(default_factory=dict)

class ChatResponse(BaseModel):
    """Response chat trả về frontend"""
    answer: str
    actions: List[dict[str, Any]] = Field(default_factory=list)
    source: str = "backend"

class McpRunTemplateRequest(BaseModel):
    """Request run MCP template."""
    name: str = Field(..., min_length=1)
    args: dict[str, Any] = Field(default_factory=dict)

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_loss_range(wood_type: str) -> tuple:
    """Lấy định mức hao hụt theo loại gỗ"""
    normalized = wood_type.upper().strip()
    # Ưu tiên dùng ml_config từ model, fallback sang LOSS_RANGES cứng
    if ml_config is not None:
        result = ml_config.get(normalized)
        if result:
            return result
    return LOSS_RANGES.get(normalized, DEFAULT_LOSS_RANGE)

def normalize_wood_type(wood_type: str) -> str:
    """Chuẩn hóa tên loại gỗ"""
    if not wood_type:
        return ""
    wood_type = wood_type.upper().strip()
    
    # Map các tên gọi khác nhau về tên chuẩn
    if "THONG" in wood_type:
        return "THÔNG"
    elif "DE GAI" in wood_type or "DEGAI" in wood_type:
        return "DẺ GAI"
    elif "HO DAO" in wood_type or "HODAO" in wood_type:
        return "HỒ ĐÀO"
    
    return wood_type

def predict_with_model(wood_type: str, total_volume: float) -> float:
    """Dự đoán sử dụng model thật"""
    if ml_model is None:
        return None
    
    try:
        # Chuẩn hóa tên gỗ
        normalized = normalize_wood_type(wood_type)
        
        # Lấy định mức
        min_loss, max_loss = get_loss_range(normalized)
        
        # Tạo input cho model dưới dạng DataFrame
        input_data = pd.DataFrame({
            'Nguyen_Lieu': [normalized],
            'Tong_Khoi_Vao': [total_volume],
            'Std_Min': [min_loss],
            'Std_Max': [max_loss]
        })
        
        # Dự đoán
        prediction = ml_model.predict(input_data)[0]
        
        return prediction * 100  # Chuyển về % (giữ nguyên kết quả model)
    
    except Exception as e:
        print(f"[ERROR] Loi khi du doan: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def predict_with_formula(wood_type: str, total_volume: float) -> float:
    """Dự đoán sử dụng công thức (fallback khi không có model)"""
    normalized = normalize_wood_type(wood_type)
    min_loss, max_loss = get_loss_range(normalized)
    
    # Random Forest logic approximation
    # Với khối lượng nhỏ: hao hụt gần max
    # Với khối lượng lớn: hao hụt gần min
    volume_factor = min(total_volume / 2, 1)
    
    # Tính base loss (không có noise để kết quả ổn định)
    base_loss = max_loss - (max_loss - min_loss) * volume_factor * 0.7
    
    return base_loss

def get_confidence(volume: float) -> str:
    """Tính độ tin cậy dựa trên khối lượng"""
    if volume >= 1:
        return "high"
    elif volume >= 0.5:
        return "medium"
    return "low"

def _parse_mcp_sse(raw: str) -> dict[str, Any]:
    """Parse JSON-RPC payload from MCP SSE response."""
    for line in raw.splitlines():
        if line.startswith("data:"):
            return json.loads(line[5:].strip())
    return json.loads(raw)

def run_mcp_template(name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Proxy db-mcp template call so the frontend does not hold the token."""
    token = os.getenv("MCP_TOKEN", "").strip()
    if not token:
        raise HTTPException(status_code=500, detail="Missing MCP_TOKEN in backend environment")

    endpoint = os.getenv("MCP_URL", "https://tool.vfmgroup.vn/db-mcp/mcp").strip()
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "run_template",
            "arguments": {"name": name, "args": args or {}},
        },
    }
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json, text/event-stream",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read().decode("utf-8")
            envelope = _parse_mcp_sse(raw)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(status_code=502, detail=f"MCP HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Cannot connect to MCP: {exc.reason}")
    except TimeoutError:
        raise HTTPException(status_code=504, detail="MCP response timed out.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="MCP returned invalid JSON.")

    if envelope.get("error"):
        raise HTTPException(status_code=502, detail=envelope["error"])

    result = envelope.get("result") or {}
    if result.get("isError"):
        content = result.get("content") or []
        message = content[0].get("text") if content else "MCP tool error"
        raise HTTPException(status_code=502, detail=message)

    content = result.get("content") or []
    text = content[0].get("text") if content else "{}"
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {"text": text}

def predict_single(input_data: PredictionInput) -> PredictionResult:
    """Dự đoán cho một loại gỗ"""
    normalized = normalize_wood_type(input_data.wood_type)

    # Thử dùng model, nếu không được thì dùng công thức
    loss_percent = predict_with_model(normalized, input_data.total_input_volume)
    model_used = loss_percent is not None

    if not model_used:
        loss_percent = predict_with_formula(normalized, input_data.total_input_volume)

    min_loss, max_loss = get_loss_range(normalized)
    if not model_used:
        loss_percent = max(min_loss, min(max_loss, loss_percent))
    estimated_output = input_data.total_input_volume * (1 - loss_percent / 100)
    estimated_loss = input_data.total_input_volume - estimated_output

    return PredictionResult(
        wood_type=normalized,
        input_volume=input_data.total_input_volume,
        loss_percent=round(loss_percent, 2),
        min_loss=min_loss,
        max_loss=max_loss,
        estimated_output=round(estimated_output, 4),
        estimated_loss_volume=round(estimated_loss, 4),
        confidence=get_confidence(input_data.total_input_volume),
        model_used=model_used
    )

def _safe_chat_context(context: dict[str, Any]) -> dict[str, Any]:
    """Giữ context chat ở dạng đọc dữ liệu, tránh gửi payload quá lớn hoặc quyền ghi file."""
    allowed_keys = {"inventory", "lots", "orders", "customRequests", "currentView", "currentLotId"}
    safe_context = {key: context.get(key) for key in allowed_keys if key in context}
    safe_context["policy"] = {
        "readonly_by_default": True,
        "workspace": os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
        "allowed_write_dirs": ["frontend/src", "backend", "generated"],
        "deny": [".env", ".git", "node_modules", "backend/venv_sklearn16"],
        "note": "Do not write files directly. Return proposed actions only."
    }
    return safe_context

def _normalize_hermes_response(data: Any) -> ChatResponse:
    """Chuẩn hóa các kiểu response phổ biến của Hermes về format frontend dùng."""
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

def _build_app_context_prompt(message: str, context: dict[str, Any]) -> str:
    """Build the data-grounded chat prompt."""
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

def call_gemini(message: str, context: dict[str, Any]) -> ChatResponse:
    """Gọi Gemini API bằng API key."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return ChatResponse(
            answer="Chưa cấu hình GEMINI_API_KEY cho backend. Hãy đặt GEMINI_API_KEY rồi khởi động lại backend.",
            actions=[],
            source="backend"
        )

    model = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite-preview").strip()
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": _build_app_context_prompt(message, context)}]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "topP": 0.9,
            "maxOutputTokens": 1200
        }
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key
        },
        method="POST"
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
                ((error_data.get("error") or {}).get("details") or [{}])[-1]
                .get("retryDelay")
            )
            if isinstance(retry_delay, str) and retry_delay.endswith("s"):
                retry_seconds = int(float(retry_delay[:-1]))
        except Exception:
            retry_seconds = None

        if exc.code == 429:
            message = "Chat AI đang bị giới hạn quota Gemini tạm thời."
            if retry_seconds:
                message += f" Thử lại sau khoảng {retry_seconds} giây."
            raise HTTPException(status_code=429, detail=message)

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

def _call_hermes_cli(message: str, context: dict[str, Any]) -> ChatResponse:
    """Gọi Hermes CLI one-shot khi không có HTTP endpoint."""
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
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
            errors="replace"
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
    """Gọi Hermes Agent local qua HTTP. Cấu hình bằng biến môi trường HERMES_URL."""
    hermes_url = os.getenv("HERMES_URL", "").strip()
    if not hermes_url:
        if os.getenv("HERMES_CLI_ENABLED", "").strip() == "1":
            return _call_hermes_cli(message, context)

        return ChatResponse(
            answer="Hermes trên máy này đang là CLI. Hãy đặt HERMES_CLI_ENABLED=1 để backend gọi `hermes -z`, hoặc đặt HERMES_URL nếu bạn chạy Hermes ở chế độ HTTP server.",
            actions=[],
            source="backend"
        )

    payload = {
        "message": message,
        "context": _safe_chat_context(context)
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        hermes_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST"
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

# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.get("/", response_model=dict)
async def root():
    """Root endpoint"""
    return {
        "message": "Wood Loss Prediction API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Kiểm tra trạng thái API và model"""
    return HealthResponse(
        status="healthy",
        model_loaded=ml_model is not None,
        config=ml_config
    )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat với Gemini bằng dữ liệu app do frontend gửi lên."""
    return call_gemini(request.message, request.context)

@app.post("/mcp/run-template")
async def mcp_run_template(request: McpRunTemplateRequest):
    """Run MCP template through backend proxy."""
    return run_mcp_template(request.name, request.args)

@app.post("/predict", response_model=PredictionResult)
async def predict(input_data: PredictionInput):
    """
    Dự đoán hao hụt cho một loại gỗ
    
    - **wood_type**: Loại gỗ (VD: THÔNG, DẺ GAI, HỒ ĐÀO)
    - **total_input_volume**: Tổng khối lượng đầu vào (m³)
    """
    if input_data.total_input_volume <= 0:
        raise HTTPException(status_code=400, detail="total_input_volume phải lớn hơn 0")
    
    result = predict_single(input_data)
    return result

@app.post("/predict/batch", response_model=BatchPredictionResult)
async def predict_batch(input_data: BatchPredictionInput):
    """
    Dự đoán hao hụt cho nhiều loại gỗ

    Trả về kết quả tổng hợp và chi tiết theo từng loại gỗ
    """
    if not input_data.inputs:
        raise HTTPException(status_code=400, detail="inputs khong duoc rong")

    # Dự đoán cho từng loại gỗ
    results = [predict_single(inp) for inp in input_data.inputs]

    print(f"[DEBUG] Results:")
    for r in results:
        print(f"  - {r.wood_type}: {r.loss_percent}% (input: {r.input_volume} m³)")

    # Tính tổng
    total_input = sum(r.input_volume for r in results)
    total_output = sum(r.estimated_output for r in results)
    total_loss = sum(r.estimated_loss_volume for r in results)

    # Tính tỷ lệ hao hụt tổng (theo trọng số khối lượng)
    if total_input > 0:
        weighted_loss = sum(
            r.loss_percent * (r.input_volume / total_input)
            for r in results
        )
    else:
        weighted_loss = 0

    # Độ tin cậy tổng
    confidences = [r.confidence for r in results]
    if all(c == "high" for c in confidences):
        overall_confidence = "high"
    elif any(c == "high" for c in confidences):
        overall_confidence = "medium"
    else:
        overall_confidence = "low"

    # Có sử dụng model không
    model_used = any(r.model_used for r in results)

    return BatchPredictionResult(
        total_input_volume=round(total_input, 4),
        total_loss_percent=round(weighted_loss, 2),
        estimated_total_output=round(total_output, 4),
        estimated_total_loss=round(total_loss, 4),
        by_wood_type=results,
        confidence=overall_confidence,
        model_used=model_used
    )

@app.get("/wood-types")
async def get_wood_types():
    """Lấy danh sách các loại gỗ được hỗ trợ"""
    return {
        "wood_types": list(LOSS_RANGES.keys()),
        "loss_ranges": {k: {"min": v[0], "max": v[1]} for k, v in LOSS_RANGES.items()}
    }


# =============================================================================
# CHẠY SERVER
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
