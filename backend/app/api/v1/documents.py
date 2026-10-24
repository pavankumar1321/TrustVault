from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, Request, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from backend.app.core.config import settings
from backend.app.core.exceptions import ForbiddenError, NotFoundError, PayloadTooLargeError, TrustVaultException
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.permission import DocumentPermission
from backend.app.schemas.document import DocumentResponse, DocumentMetadataUpdate, DocumentOwnerInfo
from backend.app.schemas.common import DataResponse, PaginatedResponse, PaginatedMeta, ResponseBase
from backend.app.services.storage_service import storage_service
from backend.app.services.permission_service import permission_service
from backend.app.services.audit_service import audit_service
from backend.app.api.deps import get_current_user, require_owner

router = APIRouter(prefix="/documents", tags=["Documents"])

def _build_doc_response(doc: Document, user_permission: str) -> DocumentResponse:
    owner_info = None
    if doc.owner:
        owner_info = DocumentOwnerInfo(
            id=doc.owner.id,
            full_name=doc.owner.full_name,
            email=doc.owner.email
        )
    return DocumentResponse(
        id=doc.id,
        uuid=doc.uuid,
        title=doc.title,
        description=doc.description,
        category=doc.category,
        original_filename=doc.original_filename,
        mime_type=doc.mime_type,
        file_size=doc.file_size,
        checksum=doc.checksum,
        owner_id=doc.owner_id,
        owner=owner_info,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
        user_permission=user_permission
    )

@router.post("/upload", response_model=DataResponse[DocumentResponse], status_code=status.HTTP_201_CREATED)
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: str = Form("General"),
    current_user: User = Depends(require_owner),
    db: Session = Depends(get_db)
):
    """
    Upload a new private document. Only authenticated users with the 'owner' role can upload.
    Validates file size, file extensions, and magic byte signatures.
    """
    content = await file.read()
    if len(content) == 0:
        raise TrustVaultException(status_code=400, detail="Cannot upload an empty file.", error_code="EMPTY_FILE")

    content_type = file.content_type or "application/octet-stream"
    original_name = file.filename or "uploaded_document.dat"

    # Save via storage service (handles validation, magic bytes, path traversal checks)
    stored_filename, checksum, file_size = storage_service.save(
        file_content=content,
        original_filename=original_name,
        mime_type=content_type
    )

    new_doc = Document(
        title=title.strip(),
        description=description.strip() if description else None,
        category=category.strip() if category else "General",
        original_filename=original_name,
        stored_filename=stored_filename,
        mime_type=content_type,
        file_size=file_size,
        checksum=checksum,
        owner_id=current_user.id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    audit_service.record_event(
        action="DOCUMENT_UPLOADED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="document",
        resource_id=str(new_doc.id),
        reason=f"Uploaded '{new_doc.title}' ({original_name}, {file_size} bytes).",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message="Document uploaded successfully.",
        data=_build_doc_response(new_doc, "owner")
    )

@router.get("", response_model=PaginatedResponse[DocumentResponse])
def list_documents(
    request: Request,
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    view_mode: Optional[str] = Query(None),  # 'my', 'shared', or None
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List documents strictly accessible to the authenticated user.
    - Owners see their uploaded documents (and can toggle shared documents).
    - Viewers see only documents explicitly shared with them.
    - Unauthorized document metadata is never leaked in search results.
    """
    query = db.query(Document)

    if current_user.role == "owner":
        if view_mode == "shared":
            # Documents shared with this owner by others
            query = query.join(DocumentPermission, Document.id == DocumentPermission.document_id).filter(
                DocumentPermission.user_id == current_user.id
            )
        else:
            # By default, owner's own documents
            query = query.filter(Document.owner_id == current_user.id)
    elif current_user.role == "viewer":
        # Viewer only sees documents where an explicit DocumentPermission exists
        query = query.join(DocumentPermission, Document.id == DocumentPermission.document_id).filter(
            DocumentPermission.user_id == current_user.id
        )
    elif current_user.role == "admin":
        # Admin sees metadata overview for system governance
        pass

    # Search filter
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Document.title.ilike(search_filter),
                Document.description.ilike(search_filter),
                Document.original_filename.ilike(search_filter)
            )
        )

    # Category filter
    if category and category != "all":
        query = query.filter(Document.category.ilike(category.strip()))

    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    docs = query.order_by(desc(Document.created_at)).offset((page - 1) * limit).limit(limit).all()

    # Determine user permission for each document
    results: List[DocumentResponse] = []
    for doc in docs:
        if doc.owner_id == current_user.id:
            perm_str = "owner"
        else:
            perm = db.query(DocumentPermission).filter(
                DocumentPermission.document_id == doc.id,
                DocumentPermission.user_id == current_user.id
            ).first()
            perm_str = perm.permission_level if perm else ("admin_view" if current_user.role == "admin" else "none")

        results.append(_build_doc_response(doc, perm_str))

    return PaginatedResponse(
        success=True,
        message="Documents retrieved successfully.",
        data=results,
        meta=PaginatedMeta(total=total, page=page, limit=limit, total_pages=total_pages)
    )

@router.get("/{doc_id}", response_model=DataResponse[DocumentResponse])
def get_document_details(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve document metadata. Enforces strict authorization:
    Raises 403 and records an audit log if user lacks permissions.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        audit_service.record_event(
            action="DOCUMENT_NOT_FOUND_ACCESS",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc_id),
            reason="User attempted to access non-existent document ID.",
            request=request,
            db=db
        )
        raise NotFoundError("Document not found.")

    has_access, role_or_perm, denial_reason = permission_service.check_access(
        db=db, user=current_user, document=doc, required_level="read"
    )

    if not has_access:
        audit_service.record_event(
            action="DOCUMENT_ACCESS_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc.id),
            reason=f"Denied read access to document '{doc.title}': {denial_reason}",
            request=request,
            db=db
        )
        raise ForbiddenError(denial_reason or "You do not have permission to view this document.")

    audit_service.record_event(
        action="DOCUMENT_VIEWED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="document",
        resource_id=str(doc.id),
        reason=f"Viewed metadata for '{doc.title}' with permission '{role_or_perm}'.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message="Document details retrieved.",
        data=_build_doc_response(doc, role_or_perm)
    )

@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Download document file.
    IMMEDIATE REVOCATION ENFORCEMENT:
    This endpoint verifies authorization live in the database on EVERY request.
    If permission was revoked even a moment ago, download is rejected with 403 Forbidden
    and a DENIED audit log is recorded.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        audit_service.record_event(
            action="DOCUMENT_DOWNLOAD_FAILED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc_id),
            reason="Attempted download of non-existent document.",
            request=request,
            db=db
        )
        raise NotFoundError("Document not found.")

    has_access, role_or_perm, denial_reason = permission_service.check_access(
        db=db, user=current_user, document=doc, required_level="read"
    )

    if not has_access:
        audit_service.record_event(
            action="DOCUMENT_DOWNLOAD_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc.id),
            reason=f"Denied download for '{doc.title}': {denial_reason}",
            request=request,
            db=db
        )
        raise ForbiddenError(denial_reason or "You do not have download permission for this document.")

    file_path = storage_service.get_path(doc.stored_filename)
    if not file_path.exists():
        raise NotFoundError("Physical document file is unavailable.")

    audit_service.record_event(
        action="DOCUMENT_DOWNLOADED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="document",
        resource_id=str(doc.id),
        reason=f"Downloaded '{doc.original_filename}' ({doc.file_size} bytes).",
        request=request,
        db=db
    )

    return FileResponse(
        path=file_path,
        media_type=doc.mime_type,
        filename=doc.original_filename
    )

@router.put("/{doc_id}/metadata", response_model=DataResponse[DocumentResponse])
def update_document_metadata(
    doc_id: int,
    payload: DocumentMetadataUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update document metadata (title, description, category).
    Requires ownership OR an explicit 'edit' permission grant.
    Users with only 'read' permission are rejected with 403 Forbidden.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise NotFoundError("Document not found.")

    has_access, role_or_perm, denial_reason = permission_service.check_access(
        db=db, user=current_user, document=doc, required_level="edit"
    )

    if not has_access:
        audit_service.record_event(
            action="METADATA_UPDATE_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc.id),
            reason=f"Unauthorized metadata update attempt: {denial_reason}",
            request=request,
            db=db
        )
        raise ForbiddenError(denial_reason or "You do not have 'edit' permission for this document.")

    # Apply updates
    if payload.title is not None and payload.title.strip():
        doc.title = payload.title.strip()
    if payload.description is not None:
        doc.description = payload.description.strip()
    if payload.category is not None and payload.category.strip():
        doc.category = payload.category.strip()

    db.commit()
    db.refresh(doc)

    audit_service.record_event(
        action="METADATA_UPDATED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="document",
        resource_id=str(doc.id),
        reason=f"Updated metadata for '{doc.title}'.",
        request=request,
        db=db
    )

    return DataResponse(
        success=True,
        message="Document metadata updated successfully.",
        data=_build_doc_response(doc, role_or_perm)
    )

@router.delete("/{doc_id}", response_model=ResponseBase)
def delete_document(
    doc_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete document and associated permissions.
    STRICT OWNERSHIP POLICY:
    Only the document owner can delete their document. Viewers (even with edit) cannot delete.
    """
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise NotFoundError("Document not found.")

    if doc.owner_id != current_user.id:
        audit_service.record_event(
            action="DOCUMENT_DELETION_DENIED",
            outcome="DENIED",
            actor_id=current_user.id,
            actor_email=current_user.email,
            resource_type="document",
            resource_id=str(doc.id),
            reason=f"Unauthorized deletion attempt on document '{doc.title}' owned by user ID {doc.owner_id}.",
            request=request,
            db=db
        )
        raise ForbiddenError("Only the document owner can delete this document.")

    title_snapshot = doc.title
    stored_name = doc.stored_filename

    # Delete storage file
    storage_service.delete(stored_name)

    # Delete database record (cascades permissions)
    db.delete(doc)
    db.commit()

    audit_service.record_event(
        action="DOCUMENT_DELETED",
        outcome="SUCCESS",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_type="document",
        resource_id=str(doc_id),
        reason=f"Owner deleted document '{title_snapshot}'.",
        request=request,
        db=db
    )

    return ResponseBase(success=True, message=f"Document '{title_snapshot}' deleted successfully.")
