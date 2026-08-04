# Multi Tenant Rules
This platform is a strict multi-tenant SaaS.

Tenant isolation is mandatory.

---

# Tenant Ownership
Every business entity belongs to exactly one tenant.

Every table must include:
- tenant_id

Exceptions:
- System configuration
- Global templates
- Global asset packs

---

# Tenant Identification
Tenant is identified via slug in the URL (`/{slug}`).

Slug must be globally unique.

Tenant context is obtained from the slug, not from request body/query.

---

# Isolation
Two-layer isolation:
1. Application layer: every query must include `WHERE tenant_id = ?`
2. Database layer: PostgreSQL Row-Level Security (RLS) as an additional safeguard

---

# Query Rules
Every query must be tenant scoped.

Never query data without tenant_id.

Bad:
SELECT * FROM invitations;

Good:
SELECT * FROM invitations
WHERE tenant_id = ?

---

# Service Layer
Services must receive tenant context.

Services should never infer tenant from request parameters.

---

# Storage
Every uploaded file must be stored under:

tenant/{tenant_id}/...

Examples:
tenant/123/gallery/image.webp
tenant/123/music/song.mp3

---

# Cache
Every cache key must include tenant_id.

Example:
tenant:123:invitation:list

---

# Queue
Every job payload must include:
- tenant_id
- invitation_id (if applicable)

---

# Static Publishing
Generated websites must never access another tenant's data.

Publishing must only include resources belonging to the tenant.

---

# Analytics
Analytics must always be tenant scoped.

Admin analytics may aggregate globally.

Customer analytics must never include other tenants.

---

# Search
Search results must only contain current tenant resources.

---

# Soft Delete
Soft deleted records remain tenant scoped.

---

# Unique Constraints
Prefer composite unique indexes.

Example:
tenant_id + slug
tenant_id + guest_name
tenant_id + invitation_name

---

# Testing
Critical tests:
- Cross-tenant access
- Cross-tenant upload
- Cross-tenant cache
- Cross-tenant publish