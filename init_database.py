"""
TrustVault Database Initializer & Diagnostic Tool.
Run this script to set up, verify, or re-seed the TrustVault database.

Usage:
    python init_database.py
"""

import sys
import os
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.config import settings
from backend.app.db.session import engine, SessionLocal
from backend.app.db.init_db import init_db
from backend.app.db.seed import seed_demo_data
from backend.app.models.user import User
from backend.app.models.audit_log import AuditLog
from backend.app.models.document import Document
from backend.app.models.role_request import RoleRequest

def main():
    print("=" * 65)
    print("      TrustVault Database Setup & Verification Tool")
    print("=" * 65)
    print(f"[i] Target Database URL : {settings.DATABASE_URL}")
    print(f"[i] Storage Directory   : {settings.STORAGE_DIR}")

    # 1. Initialize tables
    print("\n[1/3] Initializing database schema...")
    init_db()
    print("  [OK] Tables created/verified (users, audit_logs, documents, etc.)")

    # 2. Seed default demo data if needed
    print("\n[2/3] Seeding demo accounts and audit trail...")
    seed_demo_data()
    print("  [OK] Seed data verified.")

    # 3. Summary of records
    db = SessionLocal()
    try:
        user_count = db.query(User).count()
        doc_count = db.query(Document).count()
        audit_count = db.query(AuditLog).count()
        role_req_count = db.query(RoleRequest).count()

        print("\n[3/3] Database Health Check:")
        print(f"  * Registered Users   : {user_count}")
        print(f"  * Stored Documents   : {doc_count}")
        print(f"  * Stored Audit Logs  : {audit_count}")
        print(f"  * Role Requests      : {role_req_count}")

        print("\n" + "=" * 65)
        print("  [OK] SUCCESS: TrustVault database is ready to store accounts and logs!")
        print("=" * 65)
        print("\nDefault Credentials:")
        print("  * Admin  : admin@trustvault.com       / AdminPass123!")
        print("  * Owner  : alice.owner@trustvault.com  / AlicePass123!")
        print("  * Viewer : bob.viewer@trustvault.com   / BobPass123!")
        print("  * Viewer : carol.viewer@trustvault.com / CarolPass123!")
        print("=" * 65)
    finally:
        db.close()

if __name__ == "__main__":
    main()
