"""
Pydantic schemas (request/response models) cho toàn bộ API.
"""
from typing import Any, List, Optional
from pydantic import BaseModel, Field


# =============================================================================
# PREDICTION
# =============================================================================

class PredictionInput(BaseModel):
    """Input cho việc dự đoán một loại gỗ."""
    wood_type: str = Field(..., description="Loại gỗ (VD: THÔNG, DẺ GAI, HỒ ĐÀO)")
    total_input_volume: float = Field(..., gt=0, description="Tổng khối lượng đầu vào (m³)")


class BatchPredictionInput(BaseModel):
    """Input cho dự đoán nhiều loại gỗ."""
    inputs: List[PredictionInput]


class PredictionResult(BaseModel):
    """Kết quả dự đoán cho một loại gỗ."""
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
    """Kết quả dự đoán tổng hợp nhiều loại gỗ."""
    total_input_volume: float
    total_loss_percent: float
    estimated_total_output: float
    estimated_total_loss: float
    by_wood_type: List[PredictionResult]
    confidence: str
    model_used: bool


# =============================================================================
# HEALTH
# =============================================================================

class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    config: Optional[dict] = None


# =============================================================================
# CHAT
# =============================================================================

class ChatRequest(BaseModel):
    """Request chat gửi sang Gemini/Hermes Agent."""
    message: str = Field(..., min_length=1)
    context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    """Response chat trả về frontend."""
    answer: str
    actions: List[dict[str, Any]] = Field(default_factory=list)
    source: str = "backend"


# =============================================================================
# MCP
# =============================================================================

class McpRunTemplateRequest(BaseModel):
    """Request run MCP template."""
    name: str = Field(..., min_length=1)
    args: dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# AUTH
# =============================================================================

class LoginRequest(BaseModel):
    """Request đăng nhập."""
    username: str = Field(..., min_length=1, description="Tên đăng nhập")
    password: str = Field(..., min_length=1, description="Mật khẩu")


class LoginResponse(BaseModel):
    """Response đăng nhập."""
    success: bool
    message: str
    user: Optional[dict] = None


class RegisterRequest(BaseModel):
    """Request dang ky tai khoan."""
    username: str = Field(..., min_length=3, description="Ten dang nhap")
    password: str = Field(..., min_length=6, description="Mat khau")


# =============================================================================
# PRODUCTION LOTS
# =============================================================================

class LotCreate(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    status: str = "Đang sản xuất"
    created_date: Optional[str] = None
    slip_type: str = "PHOI_GO"
    description: Optional[str] = None
    created_by: Optional[str] = None
    data: Optional[dict] = None


class LotUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    data: Optional[dict] = None


class LotResponse(BaseModel):
    id: str
    name: Optional[str] = None
    status: str
    created_date: Optional[str] = None
    slip_type: str
    description: Optional[str] = None
    created_by: Optional[str] = None
    updated_at: Optional[str] = None
    data: Optional[dict] = None

    class Config:
        from_attributes = True


# =============================================================================
# INVENTORY
# =============================================================================

class InventoryCreate(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "RAW"
    length: Optional[int] = None
    width: Optional[int] = None
    thickness: Optional[int] = None
    quantity: int = 0
    volume: Optional[float] = None
    status: str = "AVAILABLE"
    source_lot_id: Optional[str] = None
    wood_type: Optional[str] = None


class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    length: Optional[int] = None
    width: Optional[int] = None
    thickness: Optional[int] = None
    quantity: Optional[int] = None
    volume: Optional[float] = None
    status: Optional[str] = None
    source_lot_id: Optional[str] = None
    wood_type: Optional[str] = None


class InventoryResponse(BaseModel):
    id: str
    name: str
    type: str
    length: Optional[int] = None
    width: Optional[int] = None
    thickness: Optional[int] = None
    quantity: int
    volume: Optional[float] = None
    status: Optional[str] = None
    source_lot_id: Optional[str] = None
    wood_type: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: str


class QuantityUpdate(BaseModel):
    quantity: int


class BulkStatusUpdate(BaseModel):
    ids: List[str]
    status: str


# =============================================================================
# LOT INPUTS / OUTPUTS
# =============================================================================

class LotInputCreate(BaseModel):
    inventory_id: str
    quantity_used: int
    volume_used: Optional[float] = None


class LotInputResponse(BaseModel):
    lot_id: str
    inventory_id: str
    quantity_used: int
    volume_used: Optional[float] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class LotOutputCreate(BaseModel):
    name: str
    length: Optional[int] = None
    width: Optional[int] = None
    thickness: Optional[int] = None
    quantity: Optional[int] = None
    volume: float
    status: Optional[str] = None


class LotOutputResponse(BaseModel):
    id: int
    lot_id: str
    name: str
    length: Optional[int] = None
    width: Optional[int] = None
    thickness: Optional[int] = None
    quantity: Optional[int] = None
    volume: float
    status: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ConsumeMaterialItem(BaseModel):
    inventory_id: str
    quantity_used: int
    volume_used: Optional[float] = None


class ReleaseMaterialItem(BaseModel):
    inventory_id: str
    quantity_used: int


# =============================================================================
# ORDERS
# =============================================================================

class OrderCreate(BaseModel):
    id: Optional[str] = None
    name: str
    status: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(BaseModel):
    id: str
    name: str
    status: Optional[str] = None
    created_date: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# =============================================================================
# MCP SYNC
# =============================================================================

class McpSyncRequest(BaseModel):
    orders: Optional[List[dict]] = None
    inventory: Optional[List[dict]] = None


class McpSyncResponse(BaseModel):
    orders_upserted: int = 0
    inventory_upserted: int = 0
    errors: List[str] = Field(default_factory=list)
