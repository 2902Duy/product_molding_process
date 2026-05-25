"""
Router chat AI: /chat
Proxy câu hỏi từ frontend qua Gemini (hoặc Hermes nếu cấu hình).
"""
from fastapi import APIRouter, UploadFile, File, HTTPException

from models.schemas import ChatRequest, ChatResponse
from services.chat_service import call_gemini, upload_file_to_anythingllm

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat với Gemini AI sử dụng dữ liệu ứng dụng do frontend gửi lên.

    Context bị lọc ở backend để đảm bảo AI chỉ đọc dữ liệu, không ghi file.
    """
    return call_gemini(request.message, request.context)


@router.post("/chat/upload")
async def upload_file(file: UploadFile = File(...)):
    """Tải lên tệp tin và đẩy vào AnythingLLM Workspace."""
    try:
        content = await file.read()
        res = upload_file_to_anythingllm(content, file.filename)
        return res
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
