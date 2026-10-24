import os
from pathlib import Path
from typing import List

# Determine base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROOT_DIR = BASE_DIR.parent
STORAGE_PATH = ROOT_DIR / "storage" / "documents"

# Ensure storage path exists
STORAGE_PATH.mkdir(parents=True, exist_ok=True)

# Helper to automatically load .env if present
def _load_env_files():
    for env_path in [ROOT_DIR / ".env", BASE_DIR / ".env"]:
        if env_path.exists():
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip('"').strip("'")
                        if k not in os.environ:
                            os.environ[k] = v
            except Exception:
                pass

_load_env_files()

def _resolve_database_url() -> str:
    raw_url = os.getenv("DATABASE_URL")
    if not raw_url:
        # Default to canonical database file in backend directory
        canonical_db = BASE_DIR / "trustvault.db"
        return f"sqlite:///{canonical_db.as_posix()}"

    # If relative SQLite path like sqlite:///./trustvault.db, resolve to ROOT_DIR or BASE_DIR
    if raw_url.startswith("sqlite:///./") or raw_url.startswith("sqlite:////./"):
        filename = raw_url.split("sqlite:///./")[-1]
        # Prefer existing file in BASE_DIR or ROOT_DIR
        if (BASE_DIR / filename).exists():
            resolved = BASE_DIR / filename
        else:
            resolved = ROOT_DIR / filename
        return f"sqlite:///{resolved.as_posix()}"

    return raw_url

class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "TrustVault")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("1", "true", "yes")

    DATABASE_URL: str = _resolve_database_url()

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "trustvault-super-secure-dev-secret-change-in-production-32bytes"
    )
    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "trustvault_session")
    CSRF_COOKIE_NAME: str = os.getenv("CSRF_COOKIE_NAME", "trustvault_csrf")
    SESSION_EXPIRE_HOURS: int = int(os.getenv("SESSION_EXPIRE_HOURS", "24"))
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() in ("1", "true", "yes")
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")

    STORAGE_DIR: Path = STORAGE_PATH
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "15"))
    MAX_UPLOAD_SIZE_BYTES: int = MAX_UPLOAD_SIZE_MB * 1024 * 1024

    BOOTSTRAP_ADMIN_EMAIL: str = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@trustvault.com")
    BOOTSTRAP_ADMIN_PASSWORD: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "AdminPass123!")
    BOOTSTRAP_ADMIN_NAME: str = os.getenv("BOOTSTRAP_ADMIN_NAME", "System Administrator")

    ALLOWED_ORIGINS: List[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175,http://localhost:3000,http://127.0.0.1:3000"
        ).split(",")
        if origin.strip()
    ]

    # File types allowed for upload and their signature magic bytes
    # Mime type -> tuple of valid magic byte prefixes (or empty tuple if text/open)
    ALLOWED_MIME_TYPES = {
        "application/pdf": (b"%PDF-",),
        "image/png": (b"\x89PNG\r\n\x1a\n",),
        "image/jpeg": (b"\xff\xd8\xff",),
        "text/plain": (),
        "text/markdown": (),
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b"PK\x03\x04",),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (b"PK\x03\x04",),
    }

    ALLOWED_EXTENSIONS = {
        ".pdf", ".png", ".jpg", ".jpeg", ".txt", ".md", ".docx", ".xlsx"
    }

settings = Settings()
