"""
Router: /api/v1/custom-requests
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from database import get_db
from models.schemas import CustomRequestCreate, CustomRequestResponse
from services import db_crud

router = APIRouter(prefix="/api/v1/custom-requests", tags=["custom-requests"])


@router.get("", response_model=List[CustomRequestResponse])
async def list_custom_requests(db: AsyncSession = Depends(get_db)):
    """Lấy danh sách tất cả các yêu cầu phôi bổ sung."""
    items = await db_crud.get_custom_requests(db)
    return items


@router.post("", response_model=List[CustomRequestResponse])
async def save_custom_requests(
    requests: List[CustomRequestCreate],
    db: AsyncSession = Depends(get_db)
):
    """Lưu danh sách các yêu cầu phôi bổ sung (thêm mới hoặc cập nhật)."""
    try:
        req_dicts = [req.model_dump() for req in requests]
        saved = await db_crud.bulk_upsert_custom_requests(db, req_dicts)
        return saved
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
