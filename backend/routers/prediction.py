"""
Router dự đoán hao hụt gỗ: /predict, /predict/batch, /wood-types
"""
from fastapi import APIRouter, HTTPException

from config import LOSS_RANGES
from models.schemas import (
    BatchPredictionInput,
    BatchPredictionResult,
    PredictionInput,
    PredictionResult,
)
from services.ml_service import predict_single

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResult)
async def predict(input_data: PredictionInput):
    """
    Dự đoán hao hụt cho một loại gỗ.

    - **wood_type**: Loại gỗ (VD: THÔNG, DẺ GAI, HỒ ĐÀO)
    - **total_input_volume**: Tổng khối lượng đầu vào (m³)
    """
    if input_data.total_input_volume <= 0:
        raise HTTPException(status_code=400, detail="total_input_volume phải lớn hơn 0")
    return predict_single(input_data)


@router.post("/predict/batch", response_model=BatchPredictionResult)
async def predict_batch(input_data: BatchPredictionInput):
    """
    Dự đoán hao hụt cho nhiều loại gỗ.

    Trả về kết quả tổng hợp và chi tiết theo từng loại gỗ.
    """
    if not input_data.inputs:
        raise HTTPException(status_code=400, detail="inputs khong duoc rong")

    results = [predict_single(inp) for inp in input_data.inputs]

    print("[DEBUG] Batch prediction results:")
    for r in results:
        print(f"  - {r.wood_type}: {r.loss_percent}% (input: {r.input_volume} m³)")

    total_input = sum(r.input_volume for r in results)
    total_output = sum(r.estimated_output for r in results)
    total_loss = sum(r.estimated_loss_volume for r in results)

    weighted_loss = (
        sum(r.loss_percent * (r.input_volume / total_input) for r in results)
        if total_input > 0
        else 0
    )

    confidences = [r.confidence for r in results]
    if all(c == "high" for c in confidences):
        overall_confidence = "high"
    elif any(c == "high" for c in confidences):
        overall_confidence = "medium"
    else:
        overall_confidence = "low"

    return BatchPredictionResult(
        total_input_volume=round(total_input, 4),
        total_loss_percent=round(weighted_loss, 2),
        estimated_total_output=round(total_output, 4),
        estimated_total_loss=round(total_loss, 4),
        by_wood_type=results,
        confidence=overall_confidence,
        model_used=any(r.model_used for r in results),
    )


@router.get("/wood-types")
async def get_wood_types():
    """Lấy danh sách các loại gỗ và định mức hao hụt được hỗ trợ."""
    return {
        "wood_types": list(LOSS_RANGES.keys()),
        "loss_ranges": {k: {"min": v[0], "max": v[1]} for k, v in LOSS_RANGES.items()},
    }
