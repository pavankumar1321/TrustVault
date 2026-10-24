import sys
from backend.app.core.config import settings
from backend.app.core.security import hash_password
from backend.app.db.session import SessionLocal
from backend.app.db.init_db import init_db
from backend.app.models.user import User
from backend.app.services.audit_service import audit_service

def bootstrap_admin(
    email: str = settings.BOOTSTRAP_ADMIN_EMAIL,
    password: str = settings.BOOTSTRAP_ADMIN_PASSWORD,
    full_name: str = settings.BOOTSTRAP_ADMIN_NAME
):
    """
    Safely bootstrap initial system administrator from environment variables.
    Idempotent: will not overwrite or duplicate existing administrator.
    """
    init_db()
    db = SessionLocal()
    try:
        norm_email = email.lower().strip()
        existing = db.query(User).filter(User.email == norm_email).first()

        if existing:
            if existing.role != "admin":
                existing.role = "admin"
                db.commit()
                print(f"Existing user '{norm_email}' promoted to administrator.")
            else:
                print(f"Administrator account '{norm_email}' already exists.")
            return

        admin_user = User(
            email=norm_email,
            full_name=full_name.strip(),
            hashed_password=hash_password(password),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        audit_service.record_event(
            action="ADMIN_BOOTSTRAP",
            outcome="SUCCESS",
            actor_id=admin_user.id,
            actor_email=admin_user.email,
            resource_type="user",
            resource_id=str(admin_user.id),
            reason="Initial administrator account created via server bootstrap process.",
            db=db
        )
        print(f"System administrator '{norm_email}' bootstrapped successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    email_arg = sys.argv[1] if len(sys.argv) > 1 else settings.BOOTSTRAP_ADMIN_EMAIL
    pass_arg = sys.argv[2] if len(sys.argv) > 2 else settings.BOOTSTRAP_ADMIN_PASSWORD
    bootstrap_admin(email=email_arg, password=pass_arg)
