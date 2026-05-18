"""
Cấu hình toàn cục và constants cho backend.
Load .env và định nghĩa các giá trị cứng dùng chung.
"""
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

# =============================================================================
# CORS
# =============================================================================

def get_cors_origins() -> list[str]:
    origins = os.getenv("CORS_ORIGINS", "").strip()
    if not origins:
        return ["*"]
    return [
        origin.strip().rstrip("/")
        for origin in origins.split(",")
        if origin.strip()
    ]

def get_cors_origin_regex(origins: list[str]) -> str | None:
    configured_regex = os.getenv("CORS_ORIGIN_REGEX", "").strip()
    if configured_regex:
        return configured_regex
    if "*" in origins:
        return ".*"
    if any(origin.endswith(".vercel.app") for origin in origins):
        return r"https://.*\.vercel\.app"
    return None

# =============================================================================
# BUSINESS CONSTANTS
# =============================================================================

# Định mức hao hụt theo loại gỗ (từ notebook Kaggle)
LOSS_RANGES: dict[str, tuple[int, int]] = {
    'THÔNG': (35, 40),
    'DẺ GAI': (30, 40),
    'HỒ ĐÀO': (40, 50),
}

# Giá trị mặc định khi không tìm thấy loại gỗ
DEFAULT_LOSS_RANGE: tuple[int, int] = (35, 40)

# Danh sách người dùng (demo — nên dùng DB thật trong production)
USERS: dict[str, str] = {
    'admin': '123456',
    'duytk': 'duy123123',
}

# =============================================================================
# PATHS
# =============================================================================

BACKEND_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BACKEND_DIR, "models", "mo_hinh_hao_hut_final.pkl")
