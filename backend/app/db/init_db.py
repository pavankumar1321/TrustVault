import logging
from backend.app.db.session import engine, SessionLocal
from backend.app.models.base import Base
# Import all models to ensure they are registered with metadata
import backend.app.models
from backend.app.models.user import User

logger = logging.getLogger("trustvault.db")

def init_db():
    """
    Create all tables in the database if they do not exist and verify readiness.
    Ensures users, audit_logs, documents, permissions, and sessions tables are ready.
    """
    Base.metadata.create_all(bind=engine)

    # Ensure at least the initial administrator exists
    db = SessionLocal()
    try:
        admin_count = db.query(User).filter(User.role == "admin").count()
        if admin_count == 0:
            logger.info("No administrator found in database. Auto-bootstrapping default admin...")
            from backend.app.db.bootstrap import bootstrap_admin
            bootstrap_admin()
    except Exception as e:
        logger.warning(f"Database bootstrap check encountered notice: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    print("Database tables initialized successfully and ready to store accounts and logs.")
