# TrustVault — Secure Document Sharing with a Real Audit Trail

> **Hackathon Project** | Full-Stack | React + FastAPI + SQLite/PostgreSQL

TrustVault is a role-based, secure document management system that demonstrates real-world security principles: HTTP-only session cookies, CSRF protection, PBKDF2/bcrypt password hashing, per-document permissions, immediate permission revocation, and an immutable audit trail.

---

## Table of Contents

1. [Demo Credentials](#demo-credentials)
2. [Project Structure](#project-structure)
3. [Quick Start](#quick-start)
4. [Technology Stack](#technology-stack)
5. [Roles & Permissions](#roles--permissions)
6. [Security Architecture](#security-architecture)
7. [Running Tests](#running-tests)
8. [API Documentation](#api-documentation)
9. [Environment Variables](#environment-variables)

---

## Demo Credentials

> ⚠️ These credentials are for **demo purposes only**. Never commit real `.env` files or passwords to version control.

| Role   | Email                      | Password       |
|--------|----------------------------|----------------|
| Admin  | admin@trustvault.com       | AdminPass123!  |
| Owner  | alice.owner@trustvault.com | AlicePass123!  |
| Viewer | bob.viewer@trustvault.com  | BobPass123!    |
| Viewer | carol.viewer@trustvault.com| CarolPass123!  |

Carol has a **pending owner role request** — use the Admin panel to approve or deny it.

---

## Project Structure

```
trust vault/
├── frontend/                  # React + Vite SPA
│   ├── src/
│   │   ├── api/               # Axios-like fetch wrappers per domain
│   │   ├── components/        # Reusable UI components (common/, layout/, documents/)
│   │   ├── context/           # AuthContext — session state
│   │   ├── pages/             # Pages grouped by role (auth/, admin/, owner/, viewer/, common/)
│   │   ├── routes/            # ProtectedRoute guard
│   │   └── styles/            # index.css with CSS design-token variables
│   └── package.json
├── backend/                   # Python FastAPI application
│   ├── app/
│   │   ├── api/v1/            # Route handlers (auth, documents, permissions, admin)
│   │   ├── core/              # Config, security utilities, exception handlers
│   │   ├── db/                # SQLAlchemy session, init_db, bootstrap, seed
│   │   ├── middleware/        # Pure-ASGI security headers middleware
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Business logic (auth, audit, permissions, storage)
│   ├── tests/                 # pytest security test suite (15 tests)
│   ├── alembic/               # Database migration scripts
│   └── requirements.txt
├── storage/                   # Private file storage (never served directly)
│   └── documents/
├── docs/
│   └── demo-guide.md
├── init_database.py           # One-click database initializer & health check tool
├── README.md
├── THREATS.md
├── API_DOCUMENTATION.md
├── PROMPTS.md
└── docker-compose.yml
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Git

### 1. Clone / open the workspace

```powershell
cd "trust vault"
```

### 2. Set up the Python virtual environment

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 3. Configure the backend

```powershell
copy backend\.env.example backend\.env
# Edit backend\.env if needed — defaults work for SQLite development
```

### 4. Initialize the database with demo data

Run the automated database setup and verification tool:

```powershell
$env:PYTHONPATH = "."
.venv\Scripts\python.exe init_database.py
```
This tool automatically verifies the database, creates all tables (`users`, `audit_logs`, `documents`, `sessions`, `role_requests`, `document_permissions`), and seeds default demo accounts with initial audit trail records.

### 5. Start the backend server

```powershell
.venv\Scripts\python.exe run_backend.py
```
*(Or if you activated the virtual environment: `python run_backend.py`)*

The backend will start on **http://localhost:8000** (interactive Swagger docs at **http://localhost:8000/docs**).

### 6. Set up the frontend

```powershell
cd frontend
npm install
copy .env.example .env
```

### 7. Start the frontend dev server

```powershell
npm run dev
```

The frontend is now running at **http://localhost:5173**

---

## Technology Stack

| Layer        | Technology                       | Why                                              |
|--------------|----------------------------------|--------------------------------------------------|
| Frontend     | React 18 + Vite                  | Fast HMR, modern JSX, best-in-class DX           |
| Styling      | Plain CSS + custom properties    | Zero runtime overhead, full control              |
| Icons        | Lucide React                     | Consistent, accessible SVG icon set             |
| Routing      | React Router v6                  | Declarative, nested routes, role guards          |
| Backend      | FastAPI (Python 3.11)            | Async, auto-validated, Swagger built-in          |
| Database     | SQLite (dev) / PostgreSQL (prod) | SQLite for zero-config demo; Postgres for prod   |
| ORM          | SQLAlchemy 2.x + Alembic         | Type-safe queries, schema migrations             |
| Auth         | HTTP-only session cookies + CSRF | Prevents XSS token theft; double-submit CSRF     |
| Passwords    | bcrypt                           | Slow-by-design; resistant to brute force         |
| File storage | Local filesystem (private dir)   | Never served directly; storage abstraction layer |
| Testing      | pytest + FastAPI TestClient      | 15 security-focused integration tests            |

---

## Roles & Permissions

### Admin

- View system-wide audit logs and security events
- Manage all user accounts (activate/deactivate)
- Change user roles (all changes are audited)
- Approve or deny owner-role requests
- **Cannot read document contents** without explicit permission (by policy)

### Owner

- Upload, edit, delete own documents
- Grant/revoke per-user read or edit permissions on own documents
- View audit events related to own documents
- Cannot access other owners' documents without a granted permission

### Viewer

- View and download documents explicitly shared with them
- Permission level (read/edit) is enforced server-side on every request
- **Immediate revocation**: if an owner revokes access, the next request is denied in real time

---

## Security Architecture

See [THREATS.md](THREATS.md) for the full threat model.

Key controls:

| Threat                  | Control                                                            |
|-------------------------|--------------------------------------------------------------------|
| Session hijacking       | HTTP-only, Secure, SameSite=Lax cookies                           |
| CSRF                    | Double-submit cookie pattern (X-CSRF-Token header required)        |
| Password breach         | bcrypt hashing; never stored in plaintext                          |
| Privilege escalation    | Role never accepted from request body; set only server-side        |
| IDOR                    | Every resource access checks ownership + permission in the DB      |
| Path traversal          | Storage names are UUIDs; original names stored in DB only          |
| Malicious uploads       | File signature check; allowlist MIME types; max 50 MB              |
| Audit tampering         | Append-only audit log; no DELETE or UPDATE endpoints               |
| Information leakage     | 404 for unauthorized resources (not 403); generic error messages   |

---

## Running Tests

> **Important**: Tests require `BypassSandbox` or a normal terminal (not sandboxed). Run from the workspace root.

```powershell
$env:PYTHONPATH = "."
.venv\Scripts\python.exe -m pytest backend\tests\test_security_suite.py -v
```

Expected output: **15 passed**

Test coverage includes:
- Unauthenticated access rejection
- Role-based access control (admin/owner/viewer separation)
- CSRF token enforcement
- Document access control (ownership + permission)
- Viewer cannot download without permission
- Immediate revocation enforcement
- Privilege escalation prevention
- Audit log creation for security events
- Public registration cannot create admin accounts

---

## API Documentation

Interactive docs: **http://localhost:8000/docs** (Swagger UI)  
Full reference: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## Environment Variables

### Backend (`backend/.env`)

```ini
DATABASE_URL=sqlite:///./trustvault.db
SECRET_KEY=change-me-in-production-use-32-random-bytes
STORAGE_DIR=../storage/documents
MAX_FILE_SIZE_MB=50
ALLOWED_EXTENSIONS=pdf,docx,doc,xlsx,xls,pptx,txt,png,jpg,jpeg
SESSION_EXPIRE_HOURS=24
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`frontend/.env`)

```ini
VITE_API_BASE_URL=http://localhost:8000
```

---

## Docker (optional)

```powershell
docker-compose up --build
```

See [docker-compose.yml](docker-compose.yml) for the full stack configuration.
