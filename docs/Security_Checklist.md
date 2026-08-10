# Security Checklist
This document defines the minimum security standards for the platform.

---

# Authentication
- Every protected endpoint must require authentication.
- Never trust client-provided identity.
- Authentication uses an HMAC-signed token (node:crypto) stored in an httpOnly cookie, with passwords hashed via bcryptjs.
- Session expiration must be enforced.
- Support secure logout from all devices in the future.

---

# Authorization
- Every request must verify tenant ownership.
- Every request must verify resource ownership.
- Never rely on frontend authorization.
- RBAC should be enforced at the service layer.

---

# Multi-Tenant Isolation
- Every database query must include tenant_id.
- Every cache key must include tenant_id.
- Every storage object path must include tenant_id.
- Every queue payload must include tenant_id.
- Isolasi dua lapis: application layer + PostgreSQL RLS.
- Never expose data across tenants.

---

# Input Validation
Always validate:
- Request body
- Query parameters
- Route parameters
- Uploaded files

Use DTO + ValidationPipe.

Never trust client input.

---

# SQL Injection
- Always use ORM.
- Use parameterized queries.
- Avoid string concatenation.

---

# XSS
- Sanitize user-generated HTML.
- Escape rendered content.
- Validate uploaded SVG files.

---

# File Upload
Allowed:
- JPG
- PNG
- WebP
- AVIF
- MP4
- MP3

Reject:
- Executables
- Scripts
- HTML
- Unknown MIME types

Validate:
- MIME type
- Extension
- File size

---

# Object Storage
Cloudflare R2

Rules:
- Never expose bucket directly.
- Store only object key in database.
- Generate signed URLs when necessary.

---

# Secrets
Never hardcode:
- API keys
- Tokens
- Database credentials
- Storage credentials

Use environment variables only.

---

# Logging
Never log:
- Password
- Session
- Access Token
- Refresh Token
- Secret
- API Key

---

# Rate Limiting
Apply rate limits to:
- Login
- Register
- Forgot Password
- RSVP
- Guestbook
- Media Upload
- QR Check-in API

---

# Audit Log
Log:
- Login
- Publish
- Delete
- Subscription changes
- Domain changes
- Admin actions

---

# Error Response
Never expose:
- Stack trace
- SQL query
- Internal paths
- Environment variables

Return consistent error responses.

---

# Security Review Checklist
Before merge:
- Authentication verified
- Authorization verified
- Tenant isolation verified
- Validation implemented
- Secrets protected
- Logging safe
- Upload validated
- Rate limit applied