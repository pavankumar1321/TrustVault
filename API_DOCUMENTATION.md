# TrustVault API Documentation

**Base URL:** `http://localhost:8000`  
**Interactive Docs:** http://localhost:8000/docs (Swagger UI)  
**API Version:** v1 (`/api/v1/`)

---

## Authentication

TrustVault uses **HTTP-only session cookies** for authentication and a **double-submit CSRF token** for mutation protection.

### Flow

1. `POST /api/v1/auth/login` — receive `session` cookie + `csrf_token` cookie
2. Include `X-CSRF-Token: <value>` header on all state-changing requests (POST, PUT, DELETE)
3. `POST /api/v1/auth/logout` — session is deleted server-side

---

## Auth Endpoints

### POST `/api/v1/auth/login`

Log in with email and password.

**Request body:**
```json
{
  "email": "alice.owner@trustvault.com",
  "password": "AlicePass123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 2,
    "email": "alice.owner@trustvault.com",
    "full_name": "Alice Owner",
    "role": "owner",
    "is_active": true
  },
  "csrf_token": "abc123..."
}
```

Sets cookies:
- `session` — HTTP-only, Secure, SameSite=Lax
- `csrf_token` — JS-readable (for double-submit pattern)

**Errors:** `401 Unauthorized` (invalid credentials), `403 Forbidden` (account inactive)

---

### POST `/api/v1/auth/register`

Register a new account. Role is always set to `viewer` regardless of what is submitted.

**Request body:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "full_name": "New User",
  "requested_role": "owner"
}
```

**Response:** `201 Created`
```json
{
  "id": 5,
  "email": "newuser@example.com",
  "full_name": "New User",
  "role": "viewer",
  "is_active": true,
  "created_at": "2026-10-23T09:00:00Z"
}
```

> ⚠️ `requested_role` creates a **pending role request** for admin review. It never directly grants the role.

---

### POST `/api/v1/auth/logout`

Invalidate the current session.

**Headers:** `X-CSRF-Token: <csrf_token>`  
**Response:** `200 OK` — session cookie cleared

---

### GET `/api/v1/auth/me`

Get the current authenticated user.

**Response:** `200 OK`
```json
{
  "id": 2,
  "email": "alice.owner@trustvault.com",
  "full_name": "Alice Owner",
  "role": "owner",
  "is_active": true,
  "created_at": "2026-10-20T00:00:00Z"
}
```

**Errors:** `401 Unauthorized`

---

## Document Endpoints

All document endpoints require authentication. Access is further restricted by role and document-level permissions.

### GET `/api/v1/documents`

List documents accessible to the current user.

**Query parameters:**

| Parameter   | Type   | Description                                         |
|-------------|--------|-----------------------------------------------------|
| `search`    | string | Filter by title (partial match)                     |
| `category`  | string | Filter by category                                  |
| `view_mode` | string | `owned` (my docs), `shared` (docs I shared), or `""` (all accessible) |
| `page`      | int    | Page number (default 1)                             |
| `limit`     | int    | Items per page (default 10, max 100)                |

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "title": "Q3 Financial Report",
      "description": "Quarterly financials",
      "category": "report",
      "owner_id": 2,
      "owner_name": "Alice Owner",
      "file_size": 204800,
      "original_filename": "q3-report.pdf",
      "mime_type": "application/pdf",
      "created_at": "2026-10-20T10:00:00Z",
      "user_permission": "read"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

> **Security note:** Documents the caller does not own or have permission for are **not included** — they return as if they do not exist.

---

### POST `/api/v1/documents/upload`

Upload a new document. **Owner role required.**

**Headers:** `X-CSRF-Token: <csrf_token>`, `Content-Type: multipart/form-data`

**Form fields:**

| Field         | Type   | Required | Description              |
|---------------|--------|----------|--------------------------|
| `file`        | file   | Yes      | The file to upload       |
| `title`       | string | Yes      | Display title            |
| `description` | string | No       | Optional description     |
| `category`    | string | No       | One of: report, contract, invoice, specification, presentation, other |

**Response:** `201 Created` — document object

**Errors:**
- `400` — invalid file type or file too large
- `403` — not an owner

---

### GET `/api/v1/documents/{document_id}`

Get document metadata. Caller must own it or have an active permission.

**Response:** `200 OK` — document object  
**Errors:** `404` (not found or no permission — deliberate, to prevent ID enumeration)

---

### PUT `/api/v1/documents/{document_id}/metadata`

Update document title, description, or category. **Owner only.**

**Headers:** `X-CSRF-Token: <csrf_token>`

**Request body:**
```json
{
  "title": "Updated Title",
  "description": "New description",
  "category": "contract"
}
```

**Response:** `200 OK` — updated document object

---

### DELETE `/api/v1/documents/{document_id}`

Delete a document. **Owner only.** Also deletes all permission records and the physical file.

**Headers:** `X-CSRF-Token: <csrf_token>`  
**Response:** `200 OK`

---

### GET `/api/v1/documents/{document_id}/download`

Download the document file. Caller must own it or have read/edit permission.

> **Immediate revocation:** Permission is checked live against the DB on every request. No caching.

**Response:** Binary file stream with `Content-Disposition: attachment`  
**Errors:** `403 Forbidden` (permission revoked), `404` (not found)

---

## Permission Endpoints

### GET `/api/v1/permissions/document/{document_id}`

List all permissions for a document. **Document owner only.**

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": 1,
      "document_id": 1,
      "grantee_id": 3,
      "grantee_email": "bob.viewer@trustvault.com",
      "grantee_name": "Bob Viewer",
      "permission_level": "read",
      "granted_at": "2026-10-20T11:00:00Z"
    }
  ]
}
```

---

### POST `/api/v1/permissions/grant`

Grant a user access to a document. **Document owner only.**

**Headers:** `X-CSRF-Token: <csrf_token>`

**Request body:**
```json
{
  "document_id": 1,
  "grantee_email": "bob.viewer@trustvault.com",
  "permission_level": "read"
}
```

**Response:** `201 Created` — permission object

**Errors:** `404` (user not found), `403` (not document owner), `409` (permission already exists)

---

### DELETE `/api/v1/permissions/{permission_id}`

Revoke a specific permission. **Document owner only.** Takes effect immediately.

**Headers:** `X-CSRF-Token: <csrf_token>`  
**Response:** `200 OK`

> **Demo tip:** Revoke Bob's permission while Bob is logged in, then try to download the document — the server immediately returns `403 Forbidden`.

---

## Admin Endpoints

All admin endpoints require `role == 'admin'`.

### GET `/api/v1/admin/stats`

System-wide statistics.

**Response:** `200 OK`
```json
{
  "total_users": 4,
  "total_documents": 3,
  "failed_logins_24h": 0,
  "denied_access_24h": 0,
  "pending_role_requests": 1,
  "audit_events_24h": 12
}
```

---

### GET `/api/v1/admin/users`

List all users with optional filters.

**Query params:** `search`, `role`, `page`, `limit`

**Response:** paginated user list

---

### PUT `/api/v1/admin/users/{user_id}/role`

Change a user's role. Logged in audit trail.

**Request body:** `{ "role": "owner" }`

---

### PUT `/api/v1/admin/users/{user_id}/status`

Activate or deactivate a user account.

**Request body:** `{ "is_active": false }`

---

### GET `/api/v1/admin/role-requests`

List role upgrade requests.

**Query params:** `status_filter` (`pending` | `approved` | `denied` | `""`), `page`, `limit`

---

### POST `/api/v1/admin/role-requests/{request_id}/action`

Approve or deny a role request.

**Request body:**
```json
{
  "status": "approved",
  "admin_notes": "Verified identity"
}
```

---

### GET `/api/v1/admin/audit-logs`

Search the audit log.

**Query params:** `action`, `outcome`, `actor_email`, `resource_type`, `page`, `limit`

**Response:** paginated audit log entries

---

## Error Responses

All errors follow this format:

```json
{
  "detail": "Human-readable error message"
}
```

| HTTP Status | Meaning                                         |
|-------------|------------------------------------------------|
| 400         | Bad request (validation error, invalid file)   |
| 401         | Not authenticated                               |
| 403         | Authenticated but not authorized                |
| 404         | Resource not found (or deliberately hidden)     |
| 409         | Conflict (e.g., permission already exists)      |
| 422         | Unprocessable entity (Pydantic validation fail) |
| 500         | Internal server error                           |
