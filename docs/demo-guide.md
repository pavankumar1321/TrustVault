# TrustVault — 5-Minute Demo Guide

This guide walks you through demonstrating TrustVault's core features in 5 minutes during a hackathon presentation. Focus on the security story — that is what makes this project stand out.

---

## Pre-Demo Setup (do this before the audience arrives)

```powershell
# Terminal 1 — Backend
$env:PYTHONPATH = "."
.venv\Scripts\python.exe -m uvicorn backend.app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open three browser windows (or private/incognito tabs):
- **Window A** — Admin session (admin@trustvault.com)
- **Window B** — Owner session (alice.owner@trustvault.com)
- **Window C** — Viewer session (bob.viewer@trustvault.com)

---

## Demo Script

### Act 1 — Login & Role-Based Navigation (45 seconds)

1. Open **Window A** → http://localhost:5173/login
2. Log in as `admin@trustvault.com` / `AdminPass123!`
3. Point out: **auto-redirected to `/admin/dashboard`** — role-based routing.
4. Show the stat cards: users, documents, failed logins, audit events.
5. Briefly show User Management — point out carol.viewer is listed with a pending role request.

**Say:** *"The system knows you're an admin and sends you to the admin dashboard. A viewer who types this URL would get a 403 Forbidden page — enforced by both the frontend guard AND the backend."*

---

### Act 2 — Owner Uploads a Document (60 seconds)

1. Switch to **Window B** → log in as `alice.owner@trustvault.com` / `AlicePass123!`
2. Auto-redirected to `/owner/dashboard` — show the "My Documents" card.
3. Click **Upload** — upload a real file (e.g., a small PDF or text file).
4. Fill in title, description, category → click Upload.
5. Document appears in the list with size, MIME type, upload date.

**Say:** *"The file is stored in a private directory with a UUID name — it's never served directly. Even if someone guesses the UUID, there's no HTTP route to it."*

---

### Act 3 — Share a Document with the Viewer (45 seconds)

1. On Alice's dashboard, click **Share** on a document.
2. Type `bob.viewer@trustvault.com` → select `read` permission → click Grant.
3. The permission is created. Show the permissions list — Bob is listed.

**Say:** *"Every permission grant is written to the audit log. The viewer's browser session doesn't cache this — the backend checks the database on every request."*

---

### Act 4 — Viewer Accesses the Document (30 seconds)

1. Switch to **Window C** → log in as `bob.viewer@trustvault.com` / `BobPass123!`
2. Go to **Documents Shared With Me** — the document Alice shared appears.
3. Click **Download** — download succeeds.

**Say:** *"Bob can access it because there's an active permission record in the database."*

---

### Act 5 — ⭐ HIGHLIGHT: Immediate Revocation (60 seconds)

This is the **core security feature** — make it dramatic.

1. Switch back to **Window B** (Alice's session).
2. Click **Share** on the same document → open permissions.
3. Click **Revoke** next to Bob → confirm.
4. Permission is removed instantly.
5. Switch to **Window C** (Bob's session).
6. Click **Download** again on the same document.

**Expected result:** `403 Forbidden — "Access denied"` message appears immediately.

**Say:** *"Bob still sees the document in his list, but the moment he tries to download it — the server checks the database live, finds no active permission, and denies him. Zero caching. Zero delay. This is why we use server-side permission checks rather than signed URLs."*

---

### Act 6 — Audit Trail (30 seconds)

1. Switch to **Window A** (Admin session).
2. Go to **Audit Logs**.
3. Filter by actor email: `alice.owner@trustvault.com`
4. Show the log entries: permission_grant → download (success by Bob) → permission_revoke → download (denied for Bob).

**Say:** *"Every security-relevant event is recorded with actor, action, resource, outcome, timestamp, and IP address. This log is append-only — there is no API endpoint to delete or modify audit records."*

---

### Act 7 — Privilege Escalation Prevention (30 seconds)

1. Log out from any session.
2. Go to http://localhost:5173/register
3. Fill in a new user form and **select Owner role in the dropdown**.
4. Register successfully.
5. Log in as the new user.
6. Show: they land on the **viewer dashboard** — not the owner dashboard.

**Say:** *"Even though the registration form let them select 'Owner', the backend ignores the role field and always creates new users as Viewers. A role upgrade request is queued for admin approval. The frontend role selector is for requesting a role — never for directly setting one."*

---

### Act 8 — CSRF Protection (15 seconds, optional)

Open browser DevTools → Network tab.

1. Make any state-changing request (e.g., upload or share).
2. Show the `X-CSRF-Token` request header.
3. Show the matching `csrf_token` cookie.

**Say:** *"Every state-changing request requires a CSRF token that matches a cookie set at login. A malicious website cannot read your cookies due to Same-Origin Policy, so it cannot forge this header — even if it tricks your browser into sending the session cookie."*

---

## Q&A Talking Points

| Question | Answer |
|----------|--------|
| Why HTTP-only cookies instead of localStorage JWTs? | JavaScript cannot read HTTP-only cookies, so XSS attacks cannot steal the session token. JWTs in localStorage are fully exposed to any script on the page. |
| Can the admin read all documents? | No — by policy, admin role does not grant automatic document access. An explicit permission record is required. Any exceptional access is audited. |
| What happens if the database is breached? | Passwords are bcrypt-hashed with a unique salt. An attacker with the hash still needs to crack each password individually at ~250 ms per attempt (bcrypt cost 12). |
| How do you prevent path traversal in file uploads? | Files are stored with UUID names generated by the server. The original filename is stored in the database only. There is no route that serves the storage directory. |
| Is this production-ready? | The security controls are production-grade. For a real deployment, add: HTTPS, rate limiting, MFA, virus scanning, and S3/GCS for file storage. |
