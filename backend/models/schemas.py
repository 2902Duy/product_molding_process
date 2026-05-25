"""
Pydantic schemas (request/response models) cho toàn bộ API.
"""
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ApiBaseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


# =============================================================================
# PREDICTION
# =============================================================================

class PredictionInput(ApiBaseModel):
    """Input cho việc dự đoán một loại gỗ."""
    wood_type: str = Field(..., description="Loại gỗ (VD: THÔNG, DẺ GAI, HỒ ĐÀO)")
    total_input_volume: float = Field(..., gt=0, description="Tổng khối lượng đầu vào (m³)")


class BatchPredictionInput(ApiBaseModel):
    """Input cho dự đoán nhiều loại gỗ."""
    inputs: List[PredictionInput]


class PredictionResult(ApiBaseModel):
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


class BatchPredictionResult(ApiBaseModel):
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

class HealthResponse(ApiBaseModel):
    """Health check response."""
    status: str
    model_loaded: bool
    config: Optional[dict] = None


# =============================================================================
# CHAT
# =============================================================================

class ChatRequest(ApiBaseModel):
    """Request chat gửi sang Gemini/Hermes Agent."""
    message: str = Field(..., min_length=1)
    context: dict[str, Any] = Field(default_factory=dict)


class ChatResponse(ApiBaseModel):
    """Response chat trả về frontend."""
    answer: str
    actions: List[dict[str, Any]] = Field(default_factory=list)
    sources: Optional[List[dict[str, Any]]] = Field(default_factory=list)
    source: str = "backend"


# =============================================================================
# MCP
# =============================================================================

class McpRunTemplateRequest(ApiBaseModel):
    """Request run MCP template."""
    name: str = Field(..., min_length=1)
    args: dict[str, Any] = Field(default_factory=dict)


# =============================================================================
# AUTH
# =============================================================================

class LoginRequest(ApiBaseModel):
    """Request đăng nhập."""
    username: str = Field(..., min_length=1, description="Tên đăng nhập")
    password: str = Field(..., min_length=1, description="Mật khẩu")


class LoginResponse(ApiBaseModel):
    """Response đăng nhập."""
    success: bool
    message: str
    user: Optional[dict] = None


class RegisterRequest(ApiBaseModel):
    """Request dang ky tai khoan."""
    username: str = Field(..., min_length=3, description="Ten dang nhap")
    password: str = Field(..., min_length=6, description="Mat khau")


# =============================================================================
# PRODUCTION LOTS
# =============================================================================

class LotCreate(ApiBaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    status: str = "Đang sản xuất"
    created_date: Optional[str] = None
    slip_type: str = "PHOI_GO"
    description: Optional[str] = None
    created_by: Optional[str] = None
    data: Optional[dict] = None


class LotUpdate(ApiBaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    data: Optional[dict] = None


class LotResponse(ApiBaseModel):
    id: str
    name: Optional[str] = None
    status: str
    created_date: Optional[str] = None
    slip_type: str
    description: Optional[str] = None
    created_by: Optional[str] = None
    updated_at: Optional[str] = None
    data: Optional[dict] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# =============================================================================
# INVENTORY
# =============================================================================

class InventoryCreate(ApiBaseModel):
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
    stock_category: Optional[str] = None
    stock_status: Optional[str] = None
    source_detail_id: Optional[str] = None
    product_id: Optional[str] = None
    data: Optional[dict] = None


class InventoryUpdate(ApiBaseModel):
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
    stock_category: Optional[str] = None
    stock_status: Optional[str] = None
    source_detail_id: Optional[str] = None
    product_id: Optional[str] = None
    data: Optional[dict] = None


class InventoryResponse(ApiBaseModel):
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
    batchId: Optional[str] = None
    source: Optional[str] = None
    stock_category: Optional[str] = None
    stock_status: Optional[str] = None
    source_detail_id: Optional[str] = None
    product_id: Optional[str] = None
    data: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class StatusUpdate(ApiBaseModel):
    status: str


class QuantityUpdate(ApiBaseModel):
    quantity: int


class BulkStatusUpdate(ApiBaseModel):
    ids: List[str]
    status: str


# =============================================================================
# LOT INPUTS / OUTPUTS
# =============================================================================

class LotInputCreate(ApiBaseModel):
    inventory_id: str
    quantity_used: int
    volume_used: Optional[float] = None


class LotInputResponse(ApiBaseModel):
    lot_id: str
    inventory_id: str
    quantity_used: int
    volume_used: Optional[float] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class LotOutputCreate(ApiBaseModel):
    name: str
    length: Optional[int] = None
    width: Optional[int] = None
    thickness: Optional[int] = None
    quantity: Optional[int] = None
    volume: float
    status: Optional[str] = None


class LotOutputResponse(ApiBaseModel):
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

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class ConsumeMaterialItem(ApiBaseModel):
    inventory_id: str
    quantity_used: int
    volume_used: Optional[float] = None


class ReleaseMaterialItem(ApiBaseModel):
    inventory_id: str
    quantity_used: int


# =============================================================================
# ORDERS
# =============================================================================

class OrderCreate(ApiBaseModel):
    id: Optional[str] = None
    name: str
    status: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    data: Optional[dict] = None


class OrderResponse(ApiBaseModel):
    id: str
    name: str
    status: Optional[str] = None
    created_date: Optional[str] = None
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    products: List[dict] = Field(default_factory=list)
    data: Optional[dict] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


# =============================================================================
# MCP SYNC
# =============================================================================

class McpSyncRequest(ApiBaseModel):
    orders: Optional[List[dict]] = None
    inventory: Optional[List[dict]] = None


class McpSyncResponse(ApiBaseModel):
    orders_upserted: int = 0
    inventory_upserted: int = 0
    errors: List[str] = Field(default_factory=list)


# =============================================================================
# CUSTOM REQUESTS
# =============================================================================

class CustomRequestCreate(ApiBaseModel):
    id: Optional[str] = None
    wood_type: str
    thickness: float
    width: float
    length: float
    quantity: int
    reason: Optional[str] = None
    status: str = "pending"
    source_molding_lot_id: Optional[str] = None
    supplemental_lot_id: Optional[str] = None


class CustomRequestResponse(ApiBaseModel):
    id: str
    wood_type: str
    thickness: float
    width: float
    length: float
    quantity: int
    reason: Optional[str] = None
    status: str
    source_molding_lot_id: Optional[str] = None
    supplemental_lot_id: Optional[str] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
