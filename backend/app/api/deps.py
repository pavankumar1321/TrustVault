from typing import Generator, Optional
from fastapi import Depends, Request, Cookie, Header
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.exceptions import AuthenticationError, ForbiddenError
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.services.auth_service import auth_service
from backend.app.services.audit_service import audit_service

def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retrieve user from session cookie if present, without raising an exception."""
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_token:
        # Also check Authorization header for Bearer token fallback if needed (e.g. testing)
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]

    if not session_token:
        return None

    return auth_service.get_user_from_session(db, session_token)

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Retrieve authenticated user from session cookie. Raises 401 if missing or invalid."""
    user = get_current_user_optional(request, db)
    if not user:
        # Log unauthenticated attempt
        audit_service.record_event(
            action="UNAUTHORIZED_ACCESS",
            outcome="DENIED",
            resource_type="endpoint",
            resource_id=request.url.path,
            reason="Unauthenticated request: missing or expired session cookie.",
            request=request,
            db=db
        )
        raise AuthenticationError("Active session required. Please sign in.")

    if not user.is_active:
        audit_service.record_event(
            action="ACCOUNT_DISABLED_ACCESS",
            outcome="DENIED",
            actor_id=user.id,
            actor_email=user.email,
            reason="Access attempt with disabled account.",
            request=request,
            db=db
        )
        raise ForbiddenError("This account has been deactivated. Please contact an administrator.")

    return user

def require_admin(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Ensure the authenticated user has the 'admin' role."""
    if current_user.role != "admin":
        audit_service.record_event(
            action="ADMIN_ACCESS_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="admin_panel",
            reason=f"User with role '{current_user.role}' attempted to access admin-only resource.",
            request=request,
            db=db
        )
        raise ForbiddenError("Administrator privileges required.")
    return current_user

def require_owner(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Ensure the authenticated user has the 'owner' role."""
    if current_user.role != "owner":
        audit_service.record_event(
            action="OWNER_ACCESS_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="owner_panel",
            reason=f"User with role '{current_user.role}' attempted to perform owner-only action.",
            request=request,
            db=db
        )
        raise ForbiddenError("Owner role required to upload documents. You can request owner status from your dashboard.")
    return current_user

def verify_csrf(
    request: Request,
    x_csrf_token: Optional[str] = Header(None, alias="X-CSRF-Token")
):
    """
    Validate double-submit CSRF cookie on state-changing requests.
    Safe methods (GET, HEAD, OPTIONS) bypass CSRF checks.
    """
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return

    cookie_csrf = request.cookies.get(settings.CSRF_COOKIE_NAME)
    # If the request provides a valid session, ensure CSRF token matches
    session_cookie = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if session_cookie:
        if not cookie_csrf or not x_csrf_token or cookie_csrf != x_csrf_token:
            # We enforce CSRF validation
            raise ForbiddenError("CSRF validation failed. Missing or mismatched CSRF token.")
