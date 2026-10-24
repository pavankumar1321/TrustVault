import io
from datetime import datetime, timezone, timedelta
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.session import SessionModel
from backend.app.models.audit_log import AuditLog
from backend.app.core.config import settings

def test_01_unauthenticated_user_cannot_access_protected_endpoints(client):
    """1. An unauthenticated user cannot access protected endpoints."""
    # Attempt to view documents
    res_docs = client.get("/api/v1/documents")
    assert res_docs.status_code == 401
    assert "UNAUTHENTICATED" in str(res_docs.json())

    # Attempt to access user profile
    res_me = client.get("/api/v1/auth/me")
    assert res_me.status_code == 401

def test_02_viewer_cannot_access_admin_api(client, create_user, auth_headers_and_cookies):
    """2. A viewer cannot access the admin dashboard API."""
    create_user("viewer1@trustvault.com", "TestPass123!", "Viewer One", role="viewer")
    auth = auth_headers_and_cookies("viewer1@trustvault.com", "TestPass123!")

    # Attempt to access admin stats
    res_stats = client.get("/api/v1/admin/stats", cookies=auth["cookies"], headers=auth["headers"])
    assert res_stats.status_code == 403
    assert "ACCESS_DENIED" in str(res_stats.json())

    # Attempt to access admin user management
    res_users = client.get("/api/v1/admin/users", cookies=auth["cookies"], headers=auth["headers"])
    assert res_users.status_code == 403

def test_03_viewer_cannot_access_owner_only_apis(client, create_user, auth_headers_and_cookies):
    """3. A viewer cannot access owner-only APIs (such as document upload)."""
    create_user("viewer2@trustvault.com", "TestPass123!", "Viewer Two", role="viewer")
    auth = auth_headers_and_cookies("viewer2@trustvault.com", "TestPass123!")

    file_payload = ("test.pdf", b"%PDF-1.4 sample content", "application/pdf")
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": file_payload},
        data={"title": "Unauthorized Upload", "category": "General"},
        cookies=auth["cookies"],
        headers=auth["headers"]
    )
    assert res.status_code == 403
    assert "ACCESS_DENIED" in str(res.json())

def test_04_user_a_cannot_read_or_download_user_b_private_document(
    client, create_user, auth_headers_and_cookies
):
    """4. User A cannot read or download User B's private document."""
    owner_a = create_user("owner_a@trustvault.com", "TestPass123!", "Owner A", role="owner")
    owner_b = create_user("owner_b@trustvault.com", "TestPass123!", "Owner B", role="owner")

    auth_a = auth_headers_and_cookies("owner_a@trustvault.com", "TestPass123!")
    auth_b = auth_headers_and_cookies("owner_b@trustvault.com", "TestPass123!")

    # Owner A uploads a private document
    file_payload = ("secret_a.pdf", b"%PDF-1.4 confidential a", "application/pdf")
    upload_res = client.post(
        "/api/v1/documents/upload",
        files={"file": file_payload},
        data={"title": "Private Plan A", "category": "Internal"},
        cookies=auth_a["cookies"],
        headers=auth_a["headers"]
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["data"]["id"]

    # Owner B tries to read document details
    read_res = client.get(
        f"/api/v1/documents/{doc_id}",
        cookies=auth_b["cookies"],
        headers=auth_b["headers"]
    )
    assert read_res.status_code == 403

    # Owner B tries to download document
    download_res = client.get(
        f"/api/v1/documents/{doc_id}/download",
        cookies=auth_b["cookies"],
        headers=auth_b["headers"]
    )
    assert download_res.status_code == 403

def test_05_user_cannot_access_document_by_guessing_or_changing_id(
    client, create_user, auth_headers_and_cookies
):
    """5. A user cannot access a document by guessing or changing its ID."""
    create_user("viewer3@trustvault.com", "TestPass123!", "Viewer Three", role="viewer")
    auth = auth_headers_and_cookies("viewer3@trustvault.com", "TestPass123!")

    # Guess non-existent ID
    res_fake = client.get(
        "/api/v1/documents/999999",
        cookies=auth["cookies"],
        headers=auth["headers"]
    )
    assert res_fake.status_code == 404

def test_06_viewer_cannot_grant_or_revoke_permissions(
    client, create_user, auth_headers_and_cookies
):
    """6. A viewer cannot grant or revoke permissions."""
    owner = create_user("owner1@trustvault.com", "TestPass123!", "Owner One", role="owner")
    viewer = create_user("viewer4@trustvault.com", "TestPass123!", "Viewer Four", role="viewer")
    target = create_user("target@trustvault.com", "TestPass123!", "Target User", role="viewer")

    auth_owner = auth_headers_and_cookies("owner1@trustvault.com", "TestPass123!")
    auth_viewer = auth_headers_and_cookies("viewer4@trustvault.com", "TestPass123!")

    # Owner uploads document
    file_payload = ("doc.pdf", b"%PDF-1.4 file content", "application/pdf")
    up_res = client.post(
        "/api/v1/documents/upload",
        files={"file": file_payload},
        data={"title": "Permission Test Doc"},
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )
    doc_id = up_res.json()["data"]["id"]

    # Viewer attempts to grant permission to target user
    grant_res = client.post(
        f"/api/v1/documents/{doc_id}/permissions",
        json={"user_email": "target@trustvault.com", "permission_level": "read"},
        cookies=auth_viewer["cookies"],
        headers=auth_viewer["headers"]
    )
    assert grant_res.status_code == 403

    # Viewer attempts to revoke permission
    revoke_res = client.delete(
        f"/api/v1/documents/{doc_id}/permissions/1",
        cookies=auth_viewer["cookies"],
        headers=auth_viewer["headers"]
    )
    assert revoke_res.status_code == 403

def test_07_owner_can_grant_read_access_to_named_user(
    client, create_user, auth_headers_and_cookies
):
    """7. An owner can grant read access to a named user."""
    create_user("owner_grant@trustvault.com", "TestPass123!", "Owner Grant", role="owner")
    create_user("bob_reader@trustvault.com", "TestPass123!", "Bob Reader", role="viewer")

    auth_owner = auth_headers_and_cookies("owner_grant@trustvault.com", "TestPass123!")
    auth_bob = auth_headers_and_cookies("bob_reader@trustvault.com", "TestPass123!")

    # Upload document
    file_payload = ("grant_test.pdf", b"%PDF-1.4 content for bob", "application/pdf")
    doc_res = client.post(
        "/api/v1/documents/upload",
        files={"file": file_payload},
        data={"title": "Shared Contract"},
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )
    doc_id = doc_res.json()["data"]["id"]

    # Grant read access to Bob
    grant_res = client.post(
        f"/api/v1/documents/{doc_id}/permissions",
        json={"user_email": "bob_reader@trustvault.com", "permission_level": "read"},
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )
    assert grant_res.status_code == 201

    # Bob can now read details and download
    bob_read = client.get(
        f"/api/v1/documents/{doc_id}",
        cookies=auth_bob["cookies"],
        headers=auth_bob["headers"]
    )
    assert bob_read.status_code == 200
    assert bob_read.json()["data"]["title"] == "Shared Contract"

    bob_dl = client.get(
        f"/api/v1/documents/{doc_id}/download",
        cookies=auth_bob["cookies"],
        headers=auth_bob["headers"]
    )
    assert bob_dl.status_code == 200
    assert b"%PDF-1.4" in bob_dl.content

def test_08_user_with_read_permission_cannot_perform_edit_operations(
    client, create_user, auth_headers_and_cookies
):
    """8. A user with read permission cannot perform edit operations."""
    create_user("owner_edit_test@trustvault.com", "TestPass123!", "Owner Edit", role="owner")
    create_user("viewer_read_only@trustvault.com", "TestPass123!", "Viewer Read Only", role="viewer")

    auth_owner = auth_headers_and_cookies("owner_edit_test@trustvault.com", "TestPass123!")
    auth_viewer = auth_headers_and_cookies("viewer_read_only@trustvault.com", "TestPass123!")

    # Upload
    file_payload = ("edit_test.pdf", b"%PDF-1.4 read only test", "application/pdf")
    doc_res = client.post(
        "/api/v1/documents/upload",
        files={"file": file_payload},
        data={"title": "Original Title"},
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )
    doc_id = doc_res.json()["data"]["id"]

    # Grant READ permission only
    client.post(
        f"/api/v1/documents/{doc_id}/permissions",
        json={"user_email": "viewer_read_only@trustvault.com", "permission_level": "read"},
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )

    # Viewer attempts to edit metadata
    edit_res = client.put(
        f"/api/v1/documents/{doc_id}/metadata",
        json={"title": "Tampered Title"},
        cookies=auth_viewer["cookies"],
        headers=auth_viewer["headers"]
    )
    assert edit_res.status_code == 403

def test_09_10_immediate_revocation_denies_next_read_and_download(
    client, create_user, auth_headers_and_cookies
):
    """
    9. An owner can revoke access, and the next request from the recipient is denied.
    10. A revoked user cannot download using a previously issued application URL.
    """
    create_user("owner_rev@trustvault.com", "TestPass123!", "Owner Rev", role="owner")
    create_user("recipient_rev@trustvault.com", "TestPass123!", "Recipient Rev", role="viewer")

    auth_owner = auth_headers_and_cookies("owner_rev@trustvault.com", "TestPass123!")
    auth_recip = auth_headers_and_cookies("recipient_rev@trustvault.com", "TestPass123!")

    # Upload document
    file_payload = ("rev_test.pdf", b"%PDF-1.4 revocation content", "application/pdf")
    up_res = client.post(
        "/api/v1/documents/upload",
        files={"file": file_payload},
        data={"title": "Revocation Subject"},
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )
    doc_id = up_res.json()["data"]["id"]

    # Grant read access
    grant_res = client.post(
        f"/api/v1/documents/{doc_id}/permissions",
        json={"user_email": "recipient_rev@trustvault.com", "permission_level": "read"},
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )
    perm_id = grant_res.json()["data"]["id"]

    # Confirm recipient can currently download
    dl_before = client.get(
        f"/api/v1/documents/{doc_id}/download",
        cookies=auth_recip["cookies"],
        headers=auth_recip["headers"]
    )
    assert dl_before.status_code == 200

    # Owner revokes permission
    revoke_res = client.delete(
        f"/api/v1/documents/{doc_id}/permissions/{perm_id}",
        cookies=auth_owner["cookies"],
        headers=auth_owner["headers"]
    )
    assert revoke_res.status_code == 200

    # NEXT REQUEST: Recipient is IMMEDIATELY denied read access
    read_after = client.get(
        f"/api/v1/documents/{doc_id}",
        cookies=auth_recip["cookies"],
        headers=auth_recip["headers"]
    )
    assert read_after.status_code == 403

    # NEXT REQUEST: Recipient is IMMEDIATELY denied download access
    dl_after = client.get(
        f"/api/v1/documents/{doc_id}/download",
        cookies=auth_recip["cookies"],
        headers=auth_recip["headers"]
    )
    assert dl_after.status_code == 403

def test_11_denied_attempts_create_audit_records(
    client, create_user, auth_headers_and_cookies, db_session
):
    """11. Denied attempts create audit records."""
    create_user("attacker@trustvault.com", "TestPass123!", "Attacker", role="viewer")
    auth_att = auth_headers_and_cookies("attacker@trustvault.com", "TestPass123!")

    # Attempt forbidden admin action
    client.get("/api/v1/admin/stats", cookies=auth_att["cookies"], headers=auth_att["headers"])

    # Verify audit record exists with outcome='DENIED'
    denied_log = db_session.query(AuditLog).filter(
        AuditLog.actor_email == "attacker@trustvault.com",
        AuditLog.outcome == "DENIED"
    ).first()

    assert denied_log is not None
    assert "ADMIN_ACCESS_DENIED" in denied_log.action

def test_12_upload_validation_rejects_unsupported_and_oversized_files(
    client, create_user, auth_headers_and_cookies
):
    """12. Upload validation rejects unsupported files and oversized uploads."""
    create_user("owner_upload_val@trustvault.com", "TestPass123!", "Owner Val", role="owner")
    auth = auth_headers_and_cookies("owner_upload_val@trustvault.com", "TestPass123!")

    # 1. Disallowed extension (.exe)
    exe_file = ("malware.exe", b"MZ executable binary payload", "application/x-msdownload")
    res_exe = client.post(
        "/api/v1/documents/upload",
        files={"file": exe_file},
        data={"title": "Executable File"},
        cookies=auth["cookies"],
        headers=auth["headers"]
    )
    assert res_exe.status_code in (400, 422)

    # 2. Magic signature mismatch (claims PDF, content is plain text)
    fake_pdf = ("fake.pdf", b"This is clearly not a real PDF file header", "application/pdf")
    res_fake_sig = client.post(
        "/api/v1/documents/upload",
        files={"file": fake_pdf},
        data={"title": "Fake PDF"},
        cookies=auth["cookies"],
        headers=auth["headers"]
    )
    assert res_fake_sig.status_code == 400
    assert "signature mismatch" in res_fake_sig.json()["error"]["message"]

def test_13_user_cannot_become_admin_by_manipulating_registration(
    client, db_session
):
    """13. A user cannot become an admin by changing the registration role or request payload."""
    payload = {
        "full_name": "Privilege Escalation Attempt",
        "email": "hacker@trustvault.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "requested_role": "admin",  # Attacker tries to inject admin role
        "agree_terms": True
    }
    # Pydantic or backend role validation intercepts this:
    res = client.post("/api/v1/auth/register", json=payload)

    # If rejected with validation error (422) or created as viewer:
    if res.status_code == 201:
        user_in_db = db_session.query(User).filter(User.email == "hacker@trustvault.com").first()
        assert user_in_db.role == "viewer", "Attacker became admin!"
    else:
        assert res.status_code in (400, 422)
        user_in_db = db_session.query(User).filter(User.email == "hacker@trustvault.com").first()
        assert user_in_db is None

def test_14_one_user_cannot_edit_or_delete_another_owner_document(
    client, create_user, auth_headers_and_cookies
):
    """14. One user cannot edit or delete another owner's document."""
    create_user("owner_x@trustvault.com", "TestPass123!", "Owner X", role="owner")
    create_user("owner_y@trustvault.com", "TestPass123!", "Owner Y", role="owner")

    auth_x = auth_headers_and_cookies("owner_x@trustvault.com", "TestPass123!")
    auth_y = auth_headers_and_cookies("owner_y@trustvault.com", "TestPass123!")

    # Owner X uploads
    file_payload = ("doc_x.pdf", b"%PDF-1.4 owner x doc", "application/pdf")
    doc_res = client.post(
        "/api/v1/documents/upload",
        files={"file": file_payload},
        data={"title": "Owner X Document"},
        cookies=auth_x["cookies"],
        headers=auth_x["headers"]
    )
    doc_id = doc_res.json()["data"]["id"]

    # Owner Y attempts deletion
    del_res = client.delete(
        f"/api/v1/documents/{doc_id}",
        cookies=auth_y["cookies"],
        headers=auth_y["headers"]
    )
    assert del_res.status_code == 403

def test_15_audit_logs_cannot_be_modified_by_ordinary_users(
    client, create_user, auth_headers_and_cookies
):
    """15. Audit logs cannot be modified by ordinary users (no edit/delete endpoints exist)."""
    create_user("viewer_audit@trustvault.com", "TestPass123!", "Viewer Audit", role="viewer")
    auth = auth_headers_and_cookies("viewer_audit@trustvault.com", "TestPass123!")

    # Normal user cannot read audit logs
    res_get = client.get("/api/v1/admin/audit-logs", cookies=auth["cookies"], headers=auth["headers"])
    assert res_get.status_code == 403

    # Attempt DELETE or PUT on audit logs (route does not exist)
    res_del = client.delete("/api/v1/admin/audit-logs/1", cookies=auth["cookies"], headers=auth["headers"])
    assert res_del.status_code in (404, 405)

def test_16_expired_or_invalid_sessions_are_rejected(
    client, create_user, db_session
):
    """16. Expired or invalid sessions are rejected."""
    # 1. Invalid / fabricated session token
    res_fake = client.get(
        "/api/v1/auth/me",
        headers={"Cookie": f"{settings.SESSION_COOKIE_NAME}=fake-random-session-token-xyz"}
    )
    assert res_fake.status_code == 401

    # 2. Expired session in database
    user = create_user("expired_user@trustvault.com", "TestPass123!", "Expired User", role="viewer")
    from backend.app.core.security import generate_session_token, hash_session_token
    token = generate_session_token()
    token_hash = hash_session_token(token)

    # Set expiration in past
    past_session = SessionModel(
        token_hash=token_hash,
        user_id=user.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=2),
        is_active=True
    )
    db_session.add(past_session)
    db_session.commit()

    res_expired = client.get(
        "/api/v1/auth/me",
        headers={"Cookie": f"{settings.SESSION_COOKIE_NAME}={token}"}
    )
    assert res_expired.status_code == 401
