from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from fastapi import Request, Response
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import (
    verify_password,
    generate_session_token,
    hash_session_token,
    generate_csrf_token
)
from backend.app.models.user import User
from backend.app.models.session import SessionModel

class AuthService:
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        user = db.query(User).filter(User.email == email.lower().strip()).first()
        if not user:
            return None
        if not user.is_active:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    @staticmethod
    def create_session(
        db: Session,
        user: User,
        request: Optional[Request] = None,
        remember_me: bool = False
    ) -> Tuple[str, str, SessionModel]:
        """
        Creates a new server-side session and returns:
        (raw_session_token, csrf_token, session_record)
        """
        raw_token = generate_session_token()
        token_hash = hash_session_token(raw_token)
        csrf_token = generate_csrf_token()

        hours = settings.SESSION_EXPIRE_HOURS * (7 if remember_me else 1)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)

        client_ip = request.client.host if request and request.client else None
        user_agent = request.headers.get("user-agent", "")[:250] if request else None

        session_record = SessionModel(
            token_hash=token_hash,
            user_id=user.id,
            expires_at=expires_at,
            is_active=True,
            client_ip=client_ip,
            user_agent=user_agent
        )
        db.add(session_record)
        db.commit()
        db.refresh(session_record)

        return raw_token, csrf_token, session_record

    @staticmethod
    def get_user_from_session(db: Session, raw_token: Optional[str]) -> Optional[User]:
        if not raw_token:
            return None

        token_hash = hash_session_token(raw_token)
        session_record = db.query(SessionModel).filter(
            SessionModel.token_hash == token_hash,
            SessionModel.is_active == True
        ).first()

        if not session_record:
            return None

        # Check expiration safely handling both PostgreSQL and SQLite datetime parsing
        expires = session_record.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if expires < now:
            session_record.is_active = False
            db.commit()
            return None

        user = db.query(User).filter(User.id == session_record.user_id).first()
        if not user or not user.is_active:
            return None

        return user

    @staticmethod
    def revoke_session(db: Session, raw_token: Optional[str]) -> bool:
        if not raw_token:
            return False

        token_hash = hash_session_token(raw_token)
        session_record = db.query(SessionModel).filter(
            SessionModel.token_hash == token_hash
        ).first()

        if session_record:
            session_record.is_active = False
            db.commit()
            return True
        return False

    @staticmethod
    def set_auth_cookies(
        response: Response,
        raw_session_token: str,
        csrf_token: str,
        remember_me: bool = False
    ):
        max_age = settings.SESSION_EXPIRE_HOURS * 3600 * (7 if remember_me else 1)

        # 1. Server-managed HTTP-only session cookie
        response.set_cookie(
            key=settings.SESSION_COOKIE_NAME,
            value=raw_session_token,
            max_age=max_age,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/"
        )

        # 2. CSRF cookie readable by frontend to echo back in X-CSRF-Token header
        response.set_cookie(
            key=settings.CSRF_COOKIE_NAME,
            value=csrf_token,
            max_age=max_age,
            httponly=False,  # JavaScript reads this to set header
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path="/"
        )

    @staticmethod
    def clear_auth_cookies(response: Response):
        response.delete_cookie(
            key=settings.SESSION_COOKIE_NAME,
            path="/"
        )
        response.delete_cookie(
            key=settings.CSRF_COOKIE_NAME,
            path="/"
        )

auth_service = AuthService()
