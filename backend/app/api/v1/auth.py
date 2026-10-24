from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import hash_password, validate_password_strength
from backend.app.core.exceptions import ConflictError, AuthenticationError, ForbiddenError, TrustVaultException
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.role_request import RoleRequest
from backend.app.schemas.user import UserRegister, UserLogin, UserResponse
from backend.app.schemas.role_request import RoleRequestCreate, RoleRequestResponse
from backend.app.schemas.common import DataResponse, ResponseBase
from backend.app.services.auth_service import auth_service
from backend.app.services.audit_service import audit_service
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=DataResponse[UserResponse], status_code=status.HTTP_201_CREATED)
def register_user(
    payload: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Public registration endpoint.
    Strict Role Security Policy:
    - Public registration ALWAYS assigns role='viewer'.
    - If user requests 'owner', a pending RoleRequest is created for Administrator approval.
    - Public attempts to register 'admin' are strictly prohibited and audited.
    """
    # 1. Password confirmation check
    if payload.password != payload.confirm_password:
        raise TrustVaultException(status_code=400, detail="Passwords do not match.", error_code="PASSWORDS_MISMATCH")

    # 2. Password complexity validation
    is_valid, msg = validate_password_strength(payload.password)
    if not is_valid:
        raise TrustVaultException(status_code=400, detail=msg, error_code="WEAK_PASSWORD")

    # 3. Email uniqueness check
    normalized_email = payload.email.lower().strip()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        audit_service.record_event(
            action="REGISTRATION_FAILED",
            outcome="DENIED",
            actor_email=normalized_email,
            reason="Attempted registration with existing email.",
            request=request,
            db=db
        )
        raise ConflictError("An account with this email address already exists.")

    # 4. Strict Role Policy Enforcement
    # Public registration can NEVER directly grant owner or admin
    assigned_role = "viewer"

    # Create user
    new_user = User(
        email=normalized_email,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password),
        role=assigned_role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 5. If user requested 'owner', create pending role request
    if payload.requested_role == "owner":
        role_req = RoleRequest(
            user_id=new_user.id,
            requested_role="owner",
            reason=payload.role_reason or "Requested owner role during account registration.",
            status="pending"
        )
        db.add(role_req)
        db.commit()

        audit_service.record_event(
            action="ROLE_REQUESTED",
            outcome="SUCCESS",
            actor_id=new_user.id,
            actor_email=new_user.email,
            resource_type="role_request",
            resource_id=str(new_user.id),
            reason="User registered with pending Owner role request requiring Admin approval.",
            request=request,
            db=db
        )

    # Log successful registration
    audit_service.record_event(
        action="USER_REGISTERED",
        outcome="SUCCESS",
        actor_id=new_user.id,
        actor_email=new_user.email,
        resource_type="user",
        resource_id=str(new_user.id),
        reason=f"Account created with role '{assigned_role}'.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message="Registration successful. You can now sign in.",
        data=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=DataResponse[UserResponse])
def login(
    payload: UserLogin,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and issue secure HTTP-only session cookie.
    """
    normalized_email = payload.email.lower().strip()
    user = auth_service.authenticate_user(db, normalized_email, payload.password)

    if not user:
        audit_service.record_event(
            action="LOGIN_FAILURE",
            outcome="DENIED",
            actor_email=normalized_email,
            reason="Invalid credentials or inactive account.",
            request=request,
            db=db
        )
        raise AuthenticationError("Invalid email or password.")

    # Create server session
    raw_token, csrf_token, _ = auth_service.create_session(
        db=db,
        user=user,
        request=request,
        remember_me=payload.remember_me
    )

    # Set secure cookies
    auth_service.set_auth_cookies(
        response=response,
        raw_session_token=raw_token,
        csrf_token=csrf_token,
        remember_me=payload.remember_me
    )

    audit_service.record_event(
        action="LOGIN_SUCCESS",
        outcome="SUCCESS",
        actor_id=user.id,
        actor_email=user.email,
        resource_type="session",
        reason=f"User signed in successfully with role '{user.role}'.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message="Signed in successfully.",
        data=UserResponse.model_validate(user)
    )

@router.post("/logout", response_model=ResponseBase)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Revoke server session and clear HTTP-only cookies.
    """
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    user = auth_service.get_user_from_session(db, session_token) if session_token else None

    if session_token:
        auth_service.revoke_session(db, session_token)

    auth_service.clear_auth_cookies(response)

    if user:
        audit_service.record_event(
            action="LOGOUT",
            outcome="SUCCESS",
            actor_id=user.id,
            actor_email=user.email,
            reason="User signed out and session invalidated.",
            request=request,
            db=db
        )

    return ResponseBase(success=True, message="Successfully logged out.")

@router.get("/me", response_model=DataResponse[UserResponse])
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve current authenticated user details.
    """
    return DataResponse(
        success=True,
        message="User profile retrieved.",
        data=UserResponse.model_validate(current_user)
    )

@router.post("/request-owner-role", response_model=DataResponse[RoleRequestResponse])
def request_owner_role(
    payload: RoleRequestCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a request to be promoted to document 'owner'.
    Requires approval by an administrator.
    """
    if current_user.role == "owner":
        raise ConflictError("You already have the 'owner' role.")
    if current_user.role == "admin":
        raise ConflictError("Administrators already possess elevated system privileges.")

    # Check for existing pending request
    existing = db.query(RoleRequest).filter(
        RoleRequest.user_id == current_user.id,
        RoleRequest.status == "pending"
    ).first()

    if existing:
        raise ConflictError("You already have a pending owner-role request awaiting administrator review.")

    role_req = RoleRequest(
        user_id=current_user.id,
        requested_role="owner",
        reason=payload.reason or "Requested owner role from user dashboard.",
        status="pending"
    )
    db.add(role_req)
    db.commit()
    db.refresh(role_req)

    audit_service.record_event(
        action="ROLE_REQUESTED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="role_request",
        resource_id=str(role_req.id),
        reason="User requested elevation to owner role.",
        request=request,
        db=db
    )

    resp = RoleRequestResponse(
        id=role_req.id,
        user_id=role_req.user_id,
        user_name=current_user.full_name,
        user_email=current_user.email,
        requested_role=role_req.requested_role,
        reason=role_req.reason,
        status=role_req.status,
        requested_at=role_req.requested_at,
        reviewed_at=role_req.reviewed_at,
        admin_notes=role_req.admin_notes
    )

    return DataResponse(
        success=True,
        message="Owner role request submitted successfully. An administrator will review it.",
        data=resp
    )
