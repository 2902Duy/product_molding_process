"""
Backend API cho dự đoán hao hụt gỗ
Sử dụng FastAPI + mô hình Random Forest đã train từ notebook Kaggle

Chạy: uvicorn main:app --reload --port 8000
"""
import sys
import io

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import joblib
import numpy as np
import os
import pandas as pd

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
    allow_origins=["*"],  # Trong production nên giới hạn domain cụ thể
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

def predict_single(input_data: PredictionInput) -> PredictionResult:
    """Dự đoán cho một loại gỗ"""
    normalized = normalize_wood_type(input_data.wood_type)

    # Thử dùng model, nếu không được thì dùng công thức
    loss_percent = predict_with_model(normalized, input_data.total_input_volume)
    model_used = loss_percent is not None

    if not model_used:
        loss_percent = predict_with_formula(normalized, input_data.total_input_volume)

    min_loss, max_loss = get_loss_range(normalized)
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
