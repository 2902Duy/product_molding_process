"""
Backend API cho hệ thống quản lý sản xuất gỗ.

Chạy: uvicorn main:app --reload --port 8000

Cấu trúc:
  config.py          ← constants, CORS helpers
  database.py        ← SQLAlchemy async engine, Supabase connection
  models/
    schemas.py       ← Pydantic request/response models
    orm.py           ← SQLAlchemy ORM models
  services/
    ml_service.py    ← load model, predict_single()
    chat_service.py  ← call_gemini(), call_hermes()
    mcp_service.py   ← run_mcp_template(), inspect_mcp_endpoints()
    db_crud.py       ← CRUD operations for Supabase
  routers/
    auth.py          ← POST /auth/login, POST /auth/logout
    prediction.py    ← POST /predict, POST /predict/batch, GET /wood-types
    chat.py          ← POST /chat
    mcp.py           ← POST /mcp/run-template, GET /mcp/debug, POST /api/v1/mcp/sync
    lots.py          ← /api/v1/lots CRUD + consume/release
    inventory.py     ← /api/v1/inventory CRUD
    orders.py        ← /api/v1/orders CRUD
"""
import sys
import io
from contextlib import asynccontextmanager

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_cors_origins, get_cors_origin_regex
from services.ml_service import load_model
from routers import auth, prediction, chat, mcp
from routers import lots as lots_router
from routers import inventory as inventory_router
from routers import orders as orders_router
from routers import custom_requests as custom_requests_router
from routers.mcp import sync_router as mcp_sync_router
from models.schemas import HealthResponse
from database import init_db, close_db
# =============================================================================
# KHỞI TẠO APP
# =============================================================================

cors_origins = get_cors_origins()
cors_origin_regex = get_cors_origin_regex(cors_origins)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: init DB + ML model on startup, close DB on shutdown."""
    load_model()
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="Wood Production Management API",
    description="API quản lý sản xuất gỗ: dự đoán hao hụt, chat AI, đồng bộ MCP, Supabase DB",
    version="3.0.0",
    lifespan=lifespan,
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
# ROUTERS
# =============================================================================

app.include_router(auth.router)
app.include_router(prediction.router)
app.include_router(chat.router)
app.include_router(mcp.router)
app.include_router(mcp_sync_router)
app.include_router(lots_router.router)
app.include_router(inventory_router.router)
app.include_router(orders_router.router)
app.include_router(custom_requests_router.router)



# =============================================================================
# ROOT & HEALTH
# =============================================================================

@app.get("/", response_model=dict)
async def root():
    """Root endpoint — thông tin cơ bản về API."""
    return {
        "message": "Wood Production Management API",
        "version": "3.0.0",
        "docs": "/docs",
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Kiểm tra trạng thái API và model ML."""
    from services.ml_service import ml_model, ml_config
    db_ok = False
    try:
        from database import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            db_ok = True
    except Exception:
        pass
    return HealthResponse(
        status="healthy",
        model_loaded=ml_model is not None,
        config={**(ml_config or {}), "db_connected": db_ok},
    )


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
