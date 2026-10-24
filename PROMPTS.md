# TrustVault — AI Prompt Log (PROMPTS.md)

This document records the key AI prompts used to design, build, and test TrustVault. It is part of the hackathon submission to demonstrate transparent use of AI assistance.

---

## Entry 1 — Initial Architecture Design

**Prompt:**
> "I am building a secure document sharing web application called TrustVault for a hackathon. The stack is React + Vite on the frontend and FastAPI + Python on the backend with SQLite for development and PostgreSQL for production. I need a clean, maintainable project structure with separate frontend and backend folders. What folder structure should I use, and what are the key design decisions for authentication?"

**AI Response Summary:**
The AI suggested separating concerns into `app/api/`, `app/core/`, `app/models/`, `app/schemas/`, `app/services/`, and `app/repositories/` on the backend. It recommended HTTP-only session cookies over localStorage JWTs to prevent XSS-based token theft, and suggested bcrypt for password hashing rather than MD5 or SHA-1. It warned against accepting role from the request body during registration.

**Decision Made:** Adopted the layered folder structure. Chose HTTP-only cookies + CSRF double-submit pattern.

---

## Entry 2 — Security Middleware Design

**Prompt:**
> "I am using FastAPI with a middleware that adds security headers. I initially used `BaseHTTPMiddleware` but my pytest tests using `TestClient` are hanging and never completing. What is causing this and how do I fix it?"

**AI Response Summary:**
The AI explained that `BaseHTTPMiddleware` wraps the ASGI lifecycle in a thread-blocking way that conflicts with `anyio` and Starlette's `TestClient` when running synchronous tests. It recommended implementing a **pure ASGI middleware class** (`__call__` receiving `scope`, `receive`, `send`) to avoid the deadlock.

**Decision Made:** Replaced `BaseHTTPMiddleware` with a raw ASGI middleware class in `backend/app/middleware/security_headers.py`. All 15 tests subsequently passed.

---

## Entry 3 — CSRF Protection Design

**Prompt:**
> "Explain the double-submit cookie CSRF protection pattern and how to implement it correctly in FastAPI. My frontend is a separate React SPA running on a different port."

**AI Response Summary:**
The AI explained the double-submit pattern: set a JS-readable `csrf_token` cookie alongside the HTTP-only `session` cookie. On every state-changing request, the frontend reads the `csrf_token` cookie and sends it in the `X-CSRF-Token` header. The server compares the header value to the cookie value. Because cross-origin requests cannot read cookies (due to Same-Origin Policy), an attacker cannot replicate the header value even if they trigger a cross-origin request.

**Implementation:** `verify_csrf()` in `backend/app/api/deps.py` compares `request.cookies.get('csrf_token')` with `request.headers.get('X-CSRF-Token')` and raises 403 if they do not match.

---

## Entry 4 — Privilege Escalation Prevention

**Prompt:**
> "In my registration endpoint, the user submits a `requested_role` field. I want to support role upgrade requests but must prevent anyone from directly registering as an admin. How should I design this securely?"

**AI Response Summary:**
The AI recommended a two-phase approach:
1. **Always create the user with `role = 'viewer'`** regardless of what the request body contains.
2. If `requested_role` is elevated (e.g., `owner`), create a separate `role_requests` record with status `pending`.
3. Admins review and approve/deny requests through a separate, protected endpoint.
4. **Never** promote a user simply because they asked for it in the API body.

**Implementation:** `auth_service.py` creates users with `role = 'viewer'` unconditionally. If `requested_role` is `owner`, a `RoleRequest` record is created with `status = 'pending'`. Admins use `POST /api/v1/admin/role-requests/{id}/action`.

---

## Entry 5 — Immediate Permission Revocation

**Prompt:**
> "One of the core features of TrustVault is demonstrating immediate permission revocation — if an owner revokes a viewer's access, the next download request by that viewer must be denied, even if the viewer still has the download URL. How should I implement this?"

**AI Response Summary:**
The AI recommended against signed URLs or any caching mechanism for permission decisions. Instead, every `GET /documents/{id}/download` request should:
1. Re-query the `permissions` table live (not from a cache)
2. Check if a `Permission` record exists with `document_id = X` and `grantee_id = current_user.id` and `is_active = True`
3. If not found → return 403 immediately, regardless of any previous access

This means the window between revocation and enforcement is zero — the next HTTP request after revocation will be denied.

**Implementation:** `permission_service.check_document_access()` performs a fresh DB query on every call. No in-memory caching or session-level permission state.

---

## Entry 6 — File Upload Security

**Prompt:**
> "What are the security risks of accepting file uploads in a web application, and how should I mitigate them in FastAPI?"

**AI Response Summary:**
The AI identified the key risks:
- **Path traversal:** Use a UUID for the storage filename, never the user-supplied name
- **Extension spoofing:** Check magic bytes (file signature) in addition to the extension
- **MIME type spoofing:** The browser-provided Content-Type is untrusted; re-detect from file content
- **Executable upload:** Allowlist only document types (PDF, DOCX, etc.); never allow .exe, .sh, .php
- **Disk exhaustion:** Enforce a max file size (50 MB) checked before writing to disk
- **Web root exposure:** Store files in a directory that is never served by the HTTP server

**Implementation:** `storage_service.py` generates a UUID storage name, validates magic bytes, checks against an allowlist, and stores to `storage/documents/` which has no web server route.

---

## Entry 7 — Test Design

**Prompt:**
> "Write a comprehensive pytest security test suite for TrustVault's FastAPI backend. Include tests for: unauthenticated access, CSRF bypass attempts, role-based access control, IDOR (insecure direct object reference), immediate revocation, and privilege escalation."

**AI Response Summary:**
The AI produced a structured test file with 15 security-focused test cases. It used `TestClient` from Starlette with an in-memory SQLite database (separate from the development DB). Key patterns:
- Helper methods (`login_as()`) to reuse session cookies across tests
- Sequential tests that prove the state machine (grant → access → revoke → deny)
- Explicit assertions on HTTP status codes (403 vs 401 vs 404 as appropriate)

**Implementation:** `backend/tests/test_security_suite.py` — all 15 tests pass.
