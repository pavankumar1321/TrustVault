# TrustVault — Threat Model

This document describes the security threats considered during design and the mitigations implemented.

---

## System Overview

TrustVault is a web application for secure document sharing between named users. It stores files on a private filesystem, enforces role-based access control, and maintains an immutable audit trail of every security-relevant event.

**Assets to protect:**
- Document files (confidential business documents)
- User credentials (email + bcrypt password hashes)
- Session tokens (HTTP-only cookies)
- Permission records (who can access what)
- Audit logs (tamper-evidence of security events)

**Trust boundary:**
- The backend server is fully trusted
- The frontend browser is **not** trusted — all authorization decisions are made on the backend
- The database is trusted (inside the server network)
- The filesystem (storage/) is trusted and never publicly served

---

## Threat Analysis (STRIDE)

### S — Spoofing Identity

| # | Threat | Mitigation |
|---|--------|-----------|
| S1 | Attacker submits forged session cookie | HTTP-only cookie prevents JavaScript read; Secure flag enforces HTTPS in production; server-side session DB validates on every request |
| S2 | Attacker guesses another user's session ID | Session IDs are cryptographically random UUIDs (Python `secrets.token_urlsafe`) |
| S3 | Attacker reuses an old session after logout | Logout deletes the session row from the DB immediately |
| S4 | Credential stuffing / brute force | bcrypt with cost factor 12 makes each check ~250 ms; failed logins are logged; rate limiting can be added at reverse-proxy level |

### T — Tampering

| # | Threat | Mitigation |
|---|--------|-----------|
| T1 | CSRF: malicious site triggers state-changing request | Double-submit cookie: every mutating request requires `X-CSRF-Token` header matching the `csrf_token` cookie; cookie is SameSite=Lax so cross-origin POSTs are rejected before the header check |
| T2 | User modifies their own role in the request body | Role is **never read from the request body** during registration or profile update; set only by trusted server-side code or admin action |
| T3 | Viewer guesses a document ID and downloads directly | Every download checks: (a) is the user authenticated? (b) do they own this document, or have an active permission record? The check is live — no cached decisions |
| T4 | User tampers with JWT or cookie value | No JWTs used; sessions are opaque UUIDs validated against the DB |
| T5 | Audit log tampering | Audit log table has no UPDATE or DELETE endpoints; only INSERT (via `audit_service.log_event`). Even admins cannot delete audit rows through the API |

### R — Repudiation

| # | Threat | Mitigation |
|---|--------|-----------|
| R1 | User denies uploading a document | Every upload creates an audit record with actor ID, timestamp, document ID, and IP address |
| R2 | Admin denies changing a user's role | Role changes are logged in the audit trail with the admin's ID, the target user's ID, old role, and new role |
| R3 | Owner denies revoking a viewer's permission | Permission grants and revocations are separately logged events |

### I — Information Disclosure

| # | Threat | Mitigation |
|---|--------|-----------|
| I1 | Unauthenticated user lists all documents | `/api/v1/documents` requires authentication; returns only documents the caller owns or has a permission record for |
| I2 | Viewer accesses document metadata they have no permission for | Document list query filters by ownership + permission; a non-permitted document returns 404 (not 403) to prevent ID enumeration |
| I3 | Attacker downloads file by guessing storage path | Files are stored with UUID names under a private directory that is never served by the web server |
| I4 | Password hash leakage | Password hash is never included in any API response schema |
| I5 | Sensitive data in error messages | Generic `"An error occurred"` messages returned to clients; full details logged server-side only |
| I6 | Admin reads all documents | Admin role does not automatically grant document download access; explicit permission record required (policy enforced in `permission_service.py`) |

### D — Denial of Service

| # | Threat | Mitigation |
|---|--------|-----------|
| D1 | Attacker uploads 10 GB files | File size limit enforced server-side (configurable, default 50 MB) |
| D2 | Attacker uploads many files quickly | Rate limiting recommended at reverse-proxy (nginx/Caddy) |
| D3 | Attacker fills disk with files | Storage quota per user not yet implemented — recommended for production |

### E — Elevation of Privilege

| # | Threat | Mitigation |
|---|--------|-----------|
| E1 | Viewer changes own role via API | Role field rejected from request body; role only changed via admin endpoint with RBAC check |
| E2 | Owner accesses admin endpoints | Every admin endpoint checks `current_user.role == 'admin'`; returns 403 otherwise |
| E3 | Public registration creates admin account | Registration sets role to `viewer` unconditionally; requested role in the form is informational only for a role-request flow |
| E4 | User elevates role by replaying an old request | CSRF token is tied to the session; session is destroyed on logout |
| E5 | Viewer edits document by sending PUT request | Document update endpoint checks: caller must own the document, or have an `edit` permission |

---

## Security Controls Summary

| Control | Implementation |
|---------|---------------|
| Authentication | HTTP-only session cookie; `bcrypt` password hashing |
| Authorization | RBAC enforced on every backend endpoint via `deps.py` |
| CSRF | Double-submit cookie (`X-CSRF-Token` + `csrf_token` cookie) |
| Input validation | Pydantic schemas on all request bodies; FastAPI auto-rejects invalid input |
| File upload safety | Extension allowlist + magic-byte signature check + UUID storage names |
| Audit trail | Append-only `audit_logs` table; every security event recorded |
| Session management | Server-side sessions in DB; logout deletes session row |
| Error handling | Generic client errors; full detail only in server logs |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Content-Security-Policy` (pure ASGI middleware, no BaseHTTPMiddleware) |
| Transport security | HTTPS required in production (Secure cookie flag) |

---

## Out of Scope (Recommended for Production)

- Multi-factor authentication (TOTP/WebAuthn)
- Rate limiting per IP (add at nginx/Caddy layer)
- File encryption at rest
- Virus/malware scanning of uploads (ClamAV)
- Document watermarking
- Fine-grained field-level audit (what metadata was changed)
- Content Security Policy nonce-based inline script control
- HSTS header
- Encrypted database connection (TLS to Postgres)
