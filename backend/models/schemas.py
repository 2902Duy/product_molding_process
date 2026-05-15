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
