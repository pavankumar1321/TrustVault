from typing import List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from backend.app.core.exceptions import ForbiddenError, NotFoundError, ConflictError
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.permission import DocumentPermission
from backend.app.schemas.permission import PermissionGrant, PermissionUpdate, PermissionResponse
from backend.app.schemas.common import DataResponse, ResponseBase
from backend.app.services.permission_service import permission_service
from backend.app.services.audit_service import audit_service
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/documents/{doc_id}/permissions", tags=["Permissions"])

def _build_perm_response(perm: DocumentPermission) -> PermissionResponse:
    user_name = perm.user.full_name if perm.user else None
    user_email = perm.user.email if perm.user else None
    granter_name = perm.granter.full_name if perm.granter else None

    return PermissionResponse(
        id=perm.id,
        document_id=perm.document_id,
        user_id=perm.user_id,
        user_name=user_name,
        user_email=user_email,
        permission_level=perm.permission_level,
        granted_by_id=perm.granted_by_id,
        granted_by_name=granter_name,
        created_at=perm.created_at,
        updated_at=perm.updated_at
    )

@router.get("", response_model=DataResponse[List[PermissionResponse]])
def get_document_permissions(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all active permissions for a document.
    Only the document owner can inspect the permissions list.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise NotFoundError("Document not found.")

    if doc.owner_id != current_user.id:
        audit_service.record_event(
            action="PERMISSIONS_VIEW_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc.id),
            reason=f"User attempted to view permissions list for document '{doc.title}' owned by another user.",
            request=request,
            db=db
        )
        raise ForbiddenError("Only the document owner can view permissions for this document.")

    perms = db.query(DocumentPermission).filter(DocumentPermission.document_id == doc.id).all()
    results = [_build_perm_response(p) for p in perms]

    return DataResponse(
        success=True,
        message="Document permissions retrieved.",
        data=results
    )

@router.post("", response_model=DataResponse[PermissionResponse], status_code=status.HTTP_201_CREATED)
def grant_document_permission(
    doc_id: int,
    payload: PermissionGrant,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Grant named user 'read' or 'edit' access.
    Strict Security Rules:
    - Only the document owner can grant permissions.
    - Viewers cannot grant permissions to themselves or anyone else.
    - Recipient must be a valid registered user.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise NotFoundError("Document not found.")

    if doc.owner_id != current_user.id:
        audit_service.record_event(
            action="PERMISSION_GRANT_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc.id),
            reason=f"Non-owner attempted to grant permissions on document '{doc.title}'.",
            request=request,
            db=db
        )
        raise ForbiddenError("Only the document owner can grant permissions.")

    # Find recipient user
    recipient = db.query(User).filter(User.email == payload.user_email.lower().strip()).first()
    if not recipient:
        raise NotFoundError(f"User with email '{payload.user_email}' does not exist.")

    if recipient.id == current_user.id:
        raise ConflictError("You are already the owner of this document.")

    perm = permission_service.grant_permission(
        db=db,
        granter=current_user,
        document=doc,
        recipient_user=recipient,
        permission_level=payload.permission_level
    )

    audit_service.record_event(
        action="PERMISSION_GRANTED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="permission",
        resource_id=str(perm.id),
        reason=f"Granted '{payload.permission_level}' access on '{doc.title}' to {recipient.email}.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message=f"Granted '{payload.permission_level}' access to {recipient.email}.",
        data=_build_perm_response(perm)
    )

@router.put("/{perm_id}", response_model=DataResponse[PermissionResponse])
def update_document_permission(
    doc_id: int,
    perm_id: int,
    payload: PermissionUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Modify an existing permission level (e.g. read -> edit, or edit -> read).
    Only document owner can perform this action.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise NotFoundError("Document not found.")

    if doc.owner_id != current_user.id:
        audit_service.record_event(
            action="PERMISSION_UPDATE_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="permission",
            resource_id=str(perm_id),
            reason="Non-owner attempted to modify permissions.",
            request=request,
            db=db
        )
        raise ForbiddenError("Only the document owner can update permissions.")

    perm = db.query(DocumentPermission).filter(
        DocumentPermission.id == perm_id,
        DocumentPermission.document_id == doc.id
    ).first()

    if not perm:
        raise NotFoundError("Permission record not found.")

    old_level = perm.permission_level
    perm.permission_level = payload.permission_level
    db.commit()
    db.refresh(perm)

    audit_service.record_event(
        action="PERMISSION_MODIFIED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="permission",
        resource_id=str(perm.id),
        reason=f"Updated access on '{doc.title}' for user {perm.user.email} from '{old_level}' to '{payload.permission_level}'.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message=f"Permission updated to '{payload.permission_level}'.",
        data=_build_perm_response(perm)
    )

@router.delete("/{perm_id}", response_model=ResponseBase)
def revoke_document_permission(
    doc_id: int,
    perm_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a user's permission to a document.
    IMMEDIATE REVOCATION:
    This deletion immediately revokes access. The very next request from the recipient
    is rejected live with 403 Forbidden.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise NotFoundError("Document not found.")

    if doc.owner_id != current_user.id:
        audit_service.record_event(
            action="PERMISSION_REVOKE_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="permission",
            resource_id=str(perm_id),
            reason="Non-owner attempted to revoke permission.",
            request=request,
            db=db
        )
        raise ForbiddenError("Only the document owner can revoke permissions.")

    perm = db.query(DocumentPermission).filter(
        DocumentPermission.id == perm_id,
        DocumentPermission.document_id == doc.id
    ).first()

    if not perm:
        raise NotFoundError("Permission record not found.")

    revoked_user_email = perm.user.email if perm.user else f"User ID {perm.user_id}"

    db.delete(perm)
    db.commit()

    audit_service.record_event(
        action="PERMISSION_REVOKED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="permission",
        resource_id=str(perm_id),
        reason=f"Revoked access on '{doc.title}' from {revoked_user_email}.",
        request=request,
        db=db
    )

    return ResponseBase(
        success=True,
        message=f"Access revoked immediately for {revoked_user_email}."
    )
