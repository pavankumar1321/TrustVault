import os
from pathlib import Path
from backend.app.core.security import hash_password
from backend.app.db.session import SessionLocal
from backend.app.db.init_db import init_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.permission import DocumentPermission
from backend.app.models.role_request import RoleRequest
from backend.app.services.storage_service import storage_service
from backend.app.services.audit_service import audit_service

def seed_demo_data():
    """
    Seed initial demonstration accounts and documents for local hackathon demo.
    Credentials:
    - Admin:  admin@trustvault.com       / AdminPass123!
    - Owner:  alice.owner@trustvault.com  / AlicePass123!
    - Viewer: bob.viewer@trustvault.com   / BobPass123!
    - Viewer: carol.viewer@trustvault.com / CarolPass123!
    """
    init_db()
    db = SessionLocal()
    try:
        print("Seeding TrustVault demo database...")

        # 1. Demo Users
        users_data = [
            ("admin@trustvault.com", "AdminPass123!", "System Administrator", "admin"),
            ("alice.owner@trustvault.com", "AlicePass123!", "Alice Johnson (Document Owner)", "owner"),
            ("bob.viewer@trustvault.com", "BobPass123!", "Bob Smith (Auditor / Viewer)", "viewer"),
            ("carol.viewer@trustvault.com", "CarolPass123!", "Carol Davis (Viewer)", "viewer"),
        ]

        created_users = {}
        for email, pwd, name, role in users_data:
            existing = db.query(User).filter(User.email == email).first()
            if not existing:
                u = User(
                    email=email,
                    full_name=name,
                    hashed_password=hash_password(pwd),
                    role=role,
                    is_active=True
                )
                db.add(u)
                db.commit()
                db.refresh(u)
                created_users[email] = u
                print(f"Created demo user: {email} ({role})")
            else:
                created_users[email] = existing

        alice = created_users["alice.owner@trustvault.com"]
        bob = created_users["bob.viewer@trustvault.com"]
        carol = created_users["carol.viewer@trustvault.com"]

        # 2. Demo Documents for Alice
        sample_pdf_bytes = (
            b"%PDF-1.4\n1 0 obj\n<< /Title (TrustVault Q3 Financial & Security Audit) /Creator (TrustVault) >>\n"
            b"endobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n"
        )
        sample_docx_bytes = (
            b"PK\x03\x04\x14\x00\x00\x00\x08\x00TrustVault Security Architecture Specification Document content"
        )
        sample_txt_bytes = (
            b"TrustVault Compliance Checklist 2026\n1. End-to-end audit logging\n2. Immediate permission revocation\n3. Zero public admin registration\n"
        )

        docs_to_create = [
            (
                "Q3 2026 Security & Financial Audit",
                "Confidential internal audit review including vulnerability assessment and risk register.",
                "Compliance",
                "Q3_Financial_Security_Audit.pdf",
                sample_pdf_bytes,
                "application/pdf"
            ),
            (
                "System Architecture Blueprint",
                "Technical architecture diagram, data boundary models, and authorization flows.",
                "Engineering",
                "System_Architecture_Blueprint.docx",
                sample_docx_bytes,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ),
            (
                "Access Control & Compliance Checklist",
                "Checklist for zero-trust document sharing and verification.",
                "Operations",
                "Compliance_Checklist.txt",
                sample_txt_bytes,
                "text/plain"
            )
        ]

        created_docs = []
        for title, desc, cat, fname, content, mime in docs_to_create:
            existing_doc = db.query(Document).filter(Document.title == title, Document.owner_id == alice.id).first()
            if not existing_doc:
                stored_name, checksum, size = storage_service.save(
                    file_content=content,
                    original_filename=fname,
                    mime_type=mime
                )
                doc = Document(
                    title=title,
                    description=desc,
                    category=cat,
                    original_filename=fname,
                    stored_filename=stored_name,
                    mime_type=mime,
                    file_size=size,
                    checksum=checksum,
                    owner_id=alice.id
                )
                db.add(doc)
                db.commit()
                db.refresh(doc)
                created_docs.append(doc)
                print(f"Created demo document: '{title}' for Alice.")

                audit_service.record_event(
                    action="DOCUMENT_UPLOADED",
                    outcome="SUCCESS",
                    actor_id=alice.id,
                    actor_email=alice.email,
                    resource_type="document",
                    resource_id=str(doc.id),
                    reason=f"Uploaded '{title}'.",
                    db=db
                )
            else:
                created_docs.append(existing_doc)

        # 3. Share permissions:
        # Give Bob READ permission to doc 0 (PDF)
        if len(created_docs) > 0:
            doc0 = created_docs[0]
            existing_perm0 = db.query(DocumentPermission).filter(
                DocumentPermission.document_id == doc0.id,
                DocumentPermission.user_id == bob.id
            ).first()
            if not existing_perm0:
                p0 = DocumentPermission(
                    document_id=doc0.id,
                    user_id=bob.id,
                    permission_level="read",
                    granted_by_id=alice.id
                )
                db.add(p0)
                db.commit()
                print(f"Granted Bob 'read' access to '{doc0.title}'.")
                audit_service.record_event(
                    action="PERMISSION_GRANTED",
                    outcome="SUCCESS",
                    actor_id=alice.id,
                    actor_email=alice.email,
                    resource_type="permission",
                    resource_id=str(p0.id),
                    reason=f"Granted 'read' access to {bob.email}.",
                    db=db
                )

        # Give Bob EDIT permission to doc 1 (Architecture Doc)
        if len(created_docs) > 1:
            doc1 = created_docs[1]
            existing_perm1 = db.query(DocumentPermission).filter(
                DocumentPermission.document_id == doc1.id,
                DocumentPermission.user_id == bob.id
            ).first()
            if not existing_perm1:
                p1 = DocumentPermission(
                    document_id=doc1.id,
                    user_id=bob.id,
                    permission_level="edit",
                    granted_by_id=alice.id
                )
                db.add(p1)
                db.commit()
                print(f"Granted Bob 'edit' access to '{doc1.title}'.")
                audit_service.record_event(
                    action="PERMISSION_GRANTED",
                    outcome="SUCCESS",
                    actor_id=alice.id,
                    actor_email=alice.email,
                    resource_type="permission",
                    resource_id=str(p1.id),
                    reason=f"Granted 'edit' access to {bob.email}.",
                    db=db
                )

        # 4. Pending role request for Carol
        existing_req = db.query(RoleRequest).filter(RoleRequest.user_id == carol.id).first()
        if not existing_req:
            req = RoleRequest(
                user_id=carol.id,
                requested_role="owner",
                reason="Need to manage and upload project documentation for the upcoming external audit.",
                status="pending"
            )
            db.add(req)
            db.commit()
            print("Created pending owner role request for Carol.")
            audit_service.record_event(
                action="ROLE_REQUESTED",
                outcome="SUCCESS",
                actor_id=carol.id,
                actor_email=carol.email,
                resource_type="role_request",
                resource_id=str(req.id),
                reason="Carol requested Owner role.",
                db=db
            )

        print("TrustVault demo data seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
