"""
Router xác thực người dùng: /auth/login, /auth/logout
"""
from fastapi import APIRouter
from config import USERS
from models.schemas import LoginRequest, LoginResponse, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Đăng nhập người dùng.

    - **username**: Tên đăng nhập
    - **password**: Mật khẩu
    """
    stored_password = USERS.get(request.username)

    if stored_password is None:
        return LoginResponse(success=False, message="Tài khoản không tồn tại")

    if stored_password != request.password:
        return LoginResponse(success=False, message="Mật khẩu không đúng")

    return LoginResponse(
        success=True,
        message="Đăng nhập thành công",
        user={"username": request.username},
    )


@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest):
    """Đăng ký tài khoản demo."""
    username = request.username.strip()

    if username in USERS:
        return LoginResponse(success=False, message="Tên đăng nhập đã tồn tại")

    USERS[username] = request.password

    return LoginResponse(
        success=True,
        message="Đăng ký thành công",
        user={"username": username},
    )


@router.post("/logout")
async def logout():
    """Đăng xuất người dùng."""
    return {"success": True, "message": "Đăng xuất thành công"}
