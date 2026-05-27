import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} environment variable is required")
    return value


def _int_env(name: str, default: int, minimum: int = 1) -> int:
    raw = os.getenv(name, str(default))
    try:
        value = int(raw)
    except ValueError:
        raise RuntimeError(f"{name} must be an integer")
    if value < minimum:
        raise RuntimeError(f"{name} must be at least {minimum}")
    return value


def _bool_env(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


FILES_ROOT = Path(os.getenv("FILES_ROOT", "/files"))
DB_PATH = os.getenv("DB_PATH", "/db/filemanager.db")
SECRET_KEY = _required_env("SECRET_KEY")
if SECRET_KEY in {"insecure-default-change-me", "change-this-to-a-long-random-string"}:
    raise RuntimeError("SECRET_KEY must be changed from the example value")
if len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must be at least 32 characters")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = _int_env("ACCESS_TOKEN_EXPIRE_MINUTES", 60 * 24 * 7)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = _required_env("ADMIN_PASSWORD")
if len(ADMIN_PASSWORD.encode("utf-8")) > 72:
    raise RuntimeError("ADMIN_PASSWORD must be 72 bytes or fewer for bcrypt")

UPLOAD_FILE_SIZE_LIMIT_MB = _int_env("UPLOAD_FILE_SIZE_LIMIT_MB", 100)
MAX_UPLOAD_BYTES = UPLOAD_FILE_SIZE_LIMIT_MB * 1024 * 1024
COOKIE_SECURE = _bool_env("COOKIE_SECURE", False)
