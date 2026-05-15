"""
ML model service — load và sử dụng mô hình Random Forest dự đoán hao hụt gỗ.
"""
import os
import numpy as np
import pandas as pd
import joblib

from config import LOSS_RANGES, DEFAULT_LOSS_RANGE, MODEL_PATH
from models.schemas import PredictionInput, PredictionResult

# =============================================================================
# STATE (singleton — load 1 lần khi khởi động)
# =============================================================================

ml_model = None
ml_config = None  # loss_ranges từ model .pkl (có thể khác LOSS_RANGES cứng)


def load_model() -> bool:
    """Load model từ file .pkl. Trả về True nếu thành công."""
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


# =============================================================================
# HELPERS
# =============================================================================

def get_loss_range(wood_type: str) -> tuple:
    """Lấy định mức hao hụt theo loại gỗ (ưu tiên config từ model)."""
    normalized = wood_type.upper().strip()
    if ml_config is not None:
        result = ml_config.get(normalized)
        if result:
            return result
    return LOSS_RANGES.get(normalized, DEFAULT_LOSS_RANGE)


def normalize_wood_type(wood_type: str) -> str:
    """Chuẩn hóa tên loại gỗ về dạng chuẩn."""
    if not wood_type:
        return ""
    wood_type = wood_type.upper().strip()

    if "THONG" in wood_type:
        return "THÔNG"
    elif "DE GAI" in wood_type or "DEGAI" in wood_type:
        return "DẺ GAI"
    elif "HO DAO" in wood_type or "HODAO" in wood_type:
        return "HỒ ĐÀO"

    return wood_type


def get_confidence(volume: float) -> str:
    """Tính độ tin cậy dựa trên khối lượng đầu vào."""
    if volume >= 1:
        return "high"
    elif volume >= 0.5:
        return "medium"
    return "low"


# =============================================================================
# PREDICTION LOGIC
# =============================================================================

def _predict_with_model(wood_type: str, total_volume: float) -> float | None:
    """Dự đoán bằng Random Forest model. Trả về None nếu model chưa load."""
    if ml_model is None:
        return None

    try:
        normalized = normalize_wood_type(wood_type)
        min_loss, max_loss = get_loss_range(normalized)

        input_data = pd.DataFrame({
            'Nguyen_Lieu': [normalized],
            'Tong_Khoi_Vao': [total_volume],
            'Std_Min': [min_loss],
            'Std_Max': [max_loss],
        })

        prediction = ml_model.predict(input_data)[0]
        return prediction * 100  # Chuyển về %

    except Exception as e:
        print(f"[ERROR] Loi khi du doan: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def _predict_with_formula(wood_type: str, total_volume: float) -> float:
    """Dự đoán bằng công thức xấp xỉ (fallback khi không có model)."""
    normalized = normalize_wood_type(wood_type)
    min_loss, max_loss = get_loss_range(normalized)

    # Với khối lượng nhỏ → hao hụt gần max; lớn → gần min
    volume_factor = min(total_volume / 2, 1)
    base_loss = max_loss - (max_loss - min_loss) * volume_factor * 0.7
    return base_loss


def predict_single(input_data: PredictionInput) -> PredictionResult:
    """Dự đoán hao hụt cho một loại gỗ (dùng model thật nếu có, fallback nếu không)."""
    normalized = normalize_wood_type(input_data.wood_type)

    loss_percent = _predict_with_model(normalized, input_data.total_input_volume)
    model_used = loss_percent is not None

    if not model_used:
        loss_percent = _predict_with_formula(normalized, input_data.total_input_volume)

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
        model_used=model_used,
    )
