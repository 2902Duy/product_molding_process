"""
Router xác thực người dùng: /auth/login, /auth/logout, /auth/register
Lưu và kiểm tra thông tin từ database trên Supabase.
"""
import hashlib
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import LoginRequest, LoginResponse, RegisterRequest
from services import db_crud

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    """Mã hóa mật khẩu bằng SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


async def seed_default_users_if_needed(db: AsyncSession):
    """Seed tài khoản mặc định nếu chưa tồn tại trong Database."""
    admin = await db_crud.get_user_by_username(db, "admin")
    if not admin:
        await db_crud.create_user(db, {
            "username": "admin",
            "password": hash_password("123456")
        })
    duytk = await db_crud.get_user_by_username(db, "duytk")
    if not duytk:
        await db_crud.create_user(db, {
            "username": "duytk",
            "password": hash_password("duy123123")
        })


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Đăng nhập người dùng.

    - **username**: Tên đăng nhập
    - **password**: Mật khẩu
    """
    await seed_default_users_if_needed(db)
    
    user = await db_crud.get_user_by_username(db, request.username)

    if user is None:
        return LoginResponse(success=False, message="Tài khoản không tồn tại")

    if user.password != hash_password(request.password):
        return LoginResponse(success=False, message="Mật khẩu không đúng")

    return LoginResponse(
        success=True,
        message="Đăng nhập thành công",
        user={"username": request.username},
    )


@router.post("/register", response_model=LoginResponse)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Đăng ký tài khoản mới lưu vào Supabase."""
    await seed_default_users_if_needed(db)
    
    username = request.username.strip()

    user = await db_crud.get_user_by_username(db, username)
    if user is not None:
        return LoginResponse(success=False, message="Tên đăng nhập đã tồn tại")

    await db_crud.create_user(db, {
        "username": username,
        "password": hash_password(request.password)
    })

    return LoginResponse(
        success=True,
        message="Đăng ký thành công",
        user={"username": username},
    )


@router.post("/logout")
async def logout():
    """Đăng xuất người dùng."""
    return {"success": True, "message": "Đăng xuất thành công"}
