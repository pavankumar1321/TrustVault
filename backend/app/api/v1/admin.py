from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, Request, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from backend.app.core.exceptions import ForbiddenError, NotFoundError, ConflictError
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.role_request import RoleRequest
from backend.app.models.audit_log import AuditLog
from backend.app.models.session import SessionModel
from backend.app.schemas.user import UserResponse, UserRoleUpdate, UserStatusUpdate, RoleRequestAction
from backend.app.schemas.role_request import RoleRequestResponse
from backend.app.schemas.audit import AuditLogResponse, SecurityStatsResponse
from backend.app.schemas.common import DataResponse, PaginatedResponse, PaginatedMeta, ResponseBase
from backend.app.services.audit_service import audit_service
from backend.app.api.deps import require_admin

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/stats", response_model=DataResponse[SecurityStatsResponse])
def get_security_statistics(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve system-wide security overview and threat metrics.
    """
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_documents = db.query(func.count(Document.id)).scalar() or 0
    total_events = db.query(func.count(AuditLog.id)).scalar() or 0
    failed_logins = db.query(func.count(AuditLog.id)).filter(
        AuditLog.action == "LOGIN_FAILURE"
    ).scalar() or 0
    denied_access_events = db.query(func.count(AuditLog.id)).filter(
        AuditLog.outcome == "DENIED"
    ).scalar() or 0
    pending_role_requests = db.query(func.count(RoleRequest.id)).filter(
        RoleRequest.status == "pending"
    ).scalar() or 0

    stats = SecurityStatsResponse(
        total_users=total_users,
        total_documents=total_documents,
        total_events=total_events,
        failed_logins=failed_logins,
        denied_access_events=denied_access_events,
        pending_role_requests=pending_role_requests
    )

    return DataResponse(success=True, message="Security statistics retrieved.", data=stats)

@router.get("/users", response_model=PaginatedResponse[UserResponse])
def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List registered users with role and status filtering.
    """
    query = db.query(User)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_filter),
                User.email.ilike(search_filter)
            )
        )

    if role and role != "all":
        query = query.filter(User.role == role.lower().strip())

    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    users = query.order_by(desc(User.created_at)).offset((page - 1) * limit).limit(limit).all()
    results = [UserResponse.model_validate(u) for u in users]

    return PaginatedResponse(
        success=True,
        message="Users retrieved successfully.",
        data=results,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages)
    )

@router.put("/users/{user_id}/role", response_model=DataResponse[UserResponse])
def update_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Promote or change a user's role.
    Prevents administrator from demoting themselves if they are the sole admin.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found.")

    if user.id == current_admin.id and payload.role != "admin":
        admin_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar()
        if admin_count <= 1:
            raise ConflictError("Cannot remove admin role: at least one administrator must remain.")

    old_role = user.role
    user.role = payload.role
    db.commit()
    db.refresh(user)

    audit_service.record_event(
        action="ROLE_CHANGED",
        outcome="SUCCESS",
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        resource_type="user",
        resource_id=str(user.id),
        reason=f"Administrator changed role for {user.email} from '{old_role}' to '{payload.role}'.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message=f"User role updated to '{payload.role}'.",
        data=UserResponse.model_validate(user)
    )

@router.put("/users/{user_id}/status", response_model=DataResponse[UserResponse])
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Activate or deactivate user account. Deactivating also terminates active sessions.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User not found.")

    if user.id == current_admin.id and not payload.is_active:
        raise ConflictError("You cannot deactivate your own administrative account.")

    user.is_active = payload.is_active

    if not payload.is_active:
        # Invalidate active sessions immediately
        db.query(SessionModel).filter(SessionModel.user_id == user.id).update({"is_active": False})

    db.commit()
    db.refresh(user)

    action_label = "ACCOUNT_ACTIVATED" if payload.is_active else "ACCOUNT_DEACTIVATED"
    audit_service.record_event(
        action=action_label,
        outcome="SUCCESS",
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        resource_type="user",
        resource_id=str(user.id),
        reason=f"Administrator set account status for {user.email} to active={payload.is_active}.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message=f"User account {'activated' if payload.is_active else 'deactivated'} successfully.",
        data=UserResponse.model_validate(user)
    )

@router.get("/role-requests", response_model=PaginatedResponse[RoleRequestResponse])
def list_role_requests(
    status_filter: Optional[str] = Query("pending"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List owner-role requests submitted by viewers.
    """
    query = db.query(RoleRequest)
    if status_filter and status_filter != "all":
        query = query.filter(RoleRequest.status == status_filter.lower())

    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    requests = query.order_by(desc(RoleRequest.requested_at)).offset((page - 1) * limit).limit(limit).all()

    results: List[RoleRequestResponse] = []
    for r in requests:
        user_name = r.user.full_name if r.user else "Unknown"
        user_email = r.user.email if r.user else "Unknown"
        results.append(
            RoleRequestResponse(
                id=r.id,
                user_id=r.user_id,
                user_name=user_name,
                user_email=user_email,
                requested_role=r.requested_role,
                reason=r.reason,
                status=r.status,
                requested_at=r.requested_at,
                reviewed_at=r.reviewed_at,
                admin_notes=r.admin_notes
            )
        )

    return PaginatedResponse(
        success=True,
        message="Role requests retrieved.",
        data=results,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages)
    )

@router.post("/role-requests/{req_id}/action", response_model=DataResponse[RoleRequestResponse])
def handle_role_request(
    req_id: int,
    payload: RoleRequestAction,
    request: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Approve or reject a pending role request.
    If approved, the user's role is safely upgraded to 'owner'.
    """
    role_req = db.query(RoleRequest).filter(RoleRequest.id == req_id).first()
    if not role_req:
        raise NotFoundError("Role request not found.")

    if role_req.status != "pending":
        raise ConflictError(f"Role request has already been {role_req.status}.")

    role_req.status = payload.status
    role_req.reviewed_by_id = current_admin.id
    role_req.reviewed_at = datetime.now(timezone.utc)
    role_req.admin_notes = payload.admin_notes

    target_user = db.query(User).filter(User.id == role_req.user_id).first()
    if payload.status == "approved" and target_user:
        target_user.role = role_req.requested_role

    db.commit()
    db.refresh(role_req)

    audit_service.record_event(
        action=f"ROLE_REQUEST_{payload.status.upper()}",
        outcome="SUCCESS",
        actor_id=current_admin.id,
        actor_email=current_admin.email,
        resource_type="role_request",
        resource_id=str(role_req.id),
        reason=f"Admin {payload.status} role request for {target_user.email if target_user else 'user'} to '{role_req.requested_role}'.",
        request=request,
        db=db
    )

    resp = RoleRequestResponse(
        id=role_req.id,
        user_id=role_req.user_id,
        user_name=target_user.full_name if target_user else None,
        user_email=target_user.email if target_user else None,
        requested_role=role_req.requested_role,
        reason=role_req.reason,
        status=role_req.status,
        requested_at=role_req.requested_at,
        reviewed_at=role_req.reviewed_at,
        admin_notes=role_req.admin_notes
    )

    return DataResponse(
        success=True,
        message=f"Role request {payload.status} successfully.",
        data=resp
    )

@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    actor_email: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Search and filter immutable system-wide audit logs.
    Includes successful actions, failed attempts, and denied access logs.
    """
    query = db.query(AuditLog)

    if action and action != "all":
        query = query.filter(AuditLog.action.ilike(f"%{action.strip()}%"))

    if outcome and outcome != "all":
        query = query.filter(AuditLog.outcome == outcome.upper().strip())

    if actor_email:
        query = query.filter(AuditLog.actor_email.ilike(f"%{actor_email.strip()}%"))

    if resource_type and resource_type != "all":
        query = query.filter(AuditLog.resource_type == resource_type.strip())

    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    logs = query.order_by(desc(AuditLog.timestamp)).offset((page - 1) * limit).limit(limit).all()
    results = [AuditLogResponse.model_validate(l) for l in logs]

    return PaginatedResponse(
        success=True,
        message="Audit logs retrieved.",
        data=results,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages)
    )
