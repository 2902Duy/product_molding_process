"""
Router chat AI: /chat
Proxy câu hỏi từ frontend qua Gemini (hoặc Hermes nếu cấu hình).
"""
from fastapi import APIRouter

from models.schemas import ChatRequest, ChatResponse
from services.chat_service import call_gemini

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat với Gemini AI sử dụng dữ liệu ứng dụng do frontend gửi lên.

    Context bị lọc ở backend để đảm bảo AI chỉ đọc dữ liệu, không ghi file.
    """
    return call_gemini(request.message, request.context)
