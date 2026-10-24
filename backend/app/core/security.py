import bcrypt
import re
import secrets
import hashlib
from typing import Tuple

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with automatic salt."""
    salt = bcrypt.gensalt(rounds=12)
    pwd_bytes = password.encode('utf-8')
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash in constant time."""
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validate password complexity:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one digit."
    return True, ""

def generate_session_token() -> str:
    """Generate a high-entropy cryptographically secure session token (256 bits)."""
    return secrets.token_urlsafe(32)

def hash_session_token(token: str) -> str:
    """Hash the session token for secure database storage using SHA-256."""
    return hashlib.sha256(token.encode('utf-8')).hexdigest()

def generate_csrf_token() -> str:
    """Generate a cryptographically secure random CSRF token."""
    return secrets.token_hex(16)
