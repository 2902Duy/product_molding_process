"""
Backend API cho hệ thống quản lý sản xuất gỗ.

Chạy: uvicorn main:app --reload --port 8000

Cấu trúc:
  config.py          ← constants, CORS helpers
  models/schemas.py  ← Pydantic request/response models
  services/
    ml_service.py    ← load model, predict_single()
    chat_service.py  ← call_gemini(), call_hermes()
    mcp_service.py   ← run_mcp_template(), inspect_mcp_endpoints()
  routers/
    auth.py          ← POST /auth/login, POST /auth/logout
    prediction.py    ← POST /predict, POST /predict/batch, GET /wood-types
    chat.py          ← POST /chat
    mcp.py           ← POST /mcp/run-template, GET /mcp/debug
"""
import sys
import io

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_cors_origins, get_cors_origin_regex
from services.ml_service import load_model
from routers import auth, prediction, chat, mcp
from models.schemas import HealthResponse
from services.ml_service import ml_model

# =============================================================================
# KHỞI TẠO APP
# =============================================================================

cors_origins = get_cors_origins()
cors_origin_regex = get_cors_origin_regex(cors_origins)

app = FastAPI(
    title="Wood Production Management API",
    description="API quản lý sản xuất gỗ: dự đoán hao hụt, chat AI, đồng bộ MCP",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[] if "*" in cors_origins else cors_origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def normalize_leading_slashes(request, call_next):
    """Chấp nhận path như //mcp/run-template từ client cấu hình sai URL."""
    path = request.scope.get("path", "")
    if path.startswith("//"):
        request.scope["path"] = "/" + path.lstrip("/")
    return await call_next(request)


# =============================================================================
# LIFECYCLE
# =============================================================================

@app.on_event("startup")
async def startup_event():
    load_model()


# =============================================================================
# ROUTERS
# =============================================================================

app.include_router(auth.router)
app.include_router(prediction.router)
app.include_router(chat.router)
app.include_router(mcp.router)


# =============================================================================
# ROOT & HEALTH
# =============================================================================

@app.get("/", response_model=dict)
async def root():
    """Root endpoint — thông tin cơ bản về API."""
    return {
        "message": "Wood Production Management API",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Kiểm tra trạng thái API và model ML."""
    from services.ml_service import ml_model, ml_config
    return HealthResponse(
        status="healthy",
        model_loaded=ml_model is not None,
        config=ml_config,
    )


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
