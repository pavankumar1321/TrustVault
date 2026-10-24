from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.permission import DocumentPermission
from backend.app.core.exceptions import ForbiddenError, NotFoundError, ConflictError

class PermissionService:
    @staticmethod
    def get_document_by_id_or_uuid(db: Session, doc_identifier: str | int) -> Optional[Document]:
        """Lookup document by integer ID or UUID string."""
        if isinstance(doc_identifier, int) or (isinstance(doc_identifier, str) and doc_identifier.isdigit()):
            return db.query(Document).filter(Document.id == int(doc_identifier)).first()
        return db.query(Document).filter(Document.uuid == str(doc_identifier)).first()

    @staticmethod
    def check_access(
        db: Session,
        user: User,
        document: Document,
        required_level: str = "read"  # 'read' or 'edit'
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Evaluate access permission against live database state.
        Returns: (has_access: bool, effective_role: str, denial_reason: Optional[str])
        """
        # 1. Owner always has full access
        if document.owner_id == user.id:
            return True, "owner", None

        # 2. Check DocumentPermission table for named grant
        perm = db.query(DocumentPermission).filter(
            DocumentPermission.document_id == document.id,
            DocumentPermission.user_id == user.id
        ).first()

        if perm:
            if required_level == "read":
                return True, perm.permission_level, None
            elif required_level == "edit":
                if perm.permission_level == "edit":
                    return True, "edit", None
                else:
                    return False, perm.permission_level, "Requires 'edit' permission; currently granted 'read' only."

        # 3. Administrator Policy:
        # Administrator does NOT have automatic read/download access to private documents
        # Admin can only inspect metadata on administrative audit views.
        if user.role == "admin":
            return False, "admin_restricted", "Administrator access to private document contents is blocked by default policy."

        return False, "none", "User does not possess an active permission grant for this document."

    @staticmethod
    def grant_permission(
        db: Session,
        granter: User,
        document: Document,
        recipient_user: User,
        permission_level: str
    ) -> DocumentPermission:
        # Only owner or authorized owner workflow can grant permissions
        if document.owner_id != granter.id:
            raise ForbiddenError("Only the document owner can grant permissions.")

        if recipient_user.id == granter.id:
            raise ConflictError("Owner already possesses full ownership permissions.")

        # Check existing permission
        existing = db.query(DocumentPermission).filter(
            DocumentPermission.document_id == document.id,
            DocumentPermission.user_id == recipient_user.id
        ).first()

        if existing:
            existing.permission_level = permission_level
            db.commit()
            db.refresh(existing)
            return existing

        new_perm = DocumentPermission(
            document_id=document.id,
            user_id=recipient_user.id,
            permission_level=permission_level,
            granted_by_id=granter.id
        )
        db.add(new_perm)
        db.commit()
        db.refresh(new_perm)
        return new_perm

    @staticmethod
    def revoke_permission(
        db: Session,
        granter: User,
        document: Document,
        permission_id: int
    ) -> DocumentPermission:
        if document.owner_id != granter.id:
            raise ForbiddenError("Only the document owner can revoke permissions.")

        perm = db.query(DocumentPermission).filter(
            DocumentPermission.id == permission_id,
            DocumentPermission.document_id == document.id
        ).first()

        if not perm:
            raise NotFoundError("Permission grant record not found.")

        db.delete(perm)
        db.commit()
        return perm

permission_service = PermissionService()
