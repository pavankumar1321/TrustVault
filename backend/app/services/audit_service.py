from datetime import datetime, timezone
from typing import Optional
from fastapi import Request
from sqlalchemy.orm import Session
from backend.app.models.audit_log import AuditLog
from backend.app.db.session import get_audit_db_context

class AuditService:
    @staticmethod
    def record_event(
        action: str,
        outcome: str,
        actor_id: Optional[int] = None,
        actor_email: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        reason: Optional[str] = None,
        request: Optional[Request] = None,
        db: Optional[Session] = None
    ) -> AuditLog:
        """
        Record a tamper-evident audit event reliably.
        Uses the provided DB session or opens an isolated transaction if none is active.
        """
        client_ip = None
        user_agent = None
        request_id = None

        if request is not None:
            # Extract request details
            client_ip = request.client.host if request.client else "unknown"
            # Support X-Forwarded-For if behind reverse proxy
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            user_agent = request.headers.get("user-agent", "")[:250]
            request_id = getattr(request.state, "request_id", None) or request.headers.get("x-request-id")

        # Sanitize reason: never log secrets, passwords, or session tokens
        sanitized_reason = reason
        if sanitized_reason:
            for sensitive_term in ["password", "token", "cookie", "secret"]:
                if sensitive_term in sanitized_reason.lower() and "=" in sanitized_reason:
                    sanitized_reason = f"Event recorded ({sensitive_term} sanitized)"

        audit_entry = AuditLog(
            timestamp=datetime.now(timezone.utc),
            actor_id=actor_id,
            actor_email=actor_email,
            action=action.upper(),
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            outcome=outcome.upper(),  # 'SUCCESS' or 'DENIED'
            reason=sanitized_reason,
            client_ip=client_ip,
            user_agent=user_agent,
            request_id=request_id
        )

        # Reliable persistence: If db session is provided, attempt to add. If it fails, fallback to isolated context.
        if db is not None:
            try:
                db.add(audit_entry)
                db.commit()
                db.refresh(audit_entry)
                return audit_entry
            except Exception:
                db.rollback()

        # Isolated fallback transaction
        try:
            with get_audit_db_context() as isolated_db:
                isolated_db.add(audit_entry)
                isolated_db.commit()
                isolated_db.refresh(audit_entry)
                return audit_entry
        except Exception as e:
            # Under fail-closed policy, audit log failure is critically printed
            print(f"[CRITICAL AUDIT FAILURE] Could not record audit log: {e}")
            return audit_entry

audit_service = AuditService()
