# Database Designs
This document defines the core domain model.

---

## Implementation Notes
- ORM: Drizzle
- Status values: string + check constraint (not PostgreSQL native enum), flexible for development
- Migration: `drizzle-kit push` (single developer)
- Isolation: Row-level (shared table + PostgreSQL RLS)
- Unique constraints: composite (tenant_id + field) for tenant-scoped resources

---

# Tenant
Represents a customer account.

Fields:
- id
- slug (unique, used in URL)
- name
- trial_ends_at
- created_at
- updated_at

---

# User
Belongs to Tenant.

Fields:
- id
- tenant_id
- name
- email
- password_hash
- role
- created_at
- updated_at

---

# Invitation
Fields:
- id
- tenant_id
- template_version_id
- slug
- title
- status (draft | published)
- published_at
- created_at
- updated_at

---

# Invitation Content
Stores schema-driven editable data.

Fields:
- id
- invitation_id
- schema_version
- content_json

---

# Template
Global template definition. Admin upload HTML/CSS/JS bundle.

Fields:
- id
- category_id
- name
- version
- preview_image
- html_bundle (raw HTML template with `{{...}}` placeholders)
- css_bundle
- js_bundle
- json_schema (field metadata for the form editor)
- is_premium
- is_active
- created_at
- updated_at

---

# Asset Pack
Global decorative assets (optional).

---

# Guest
Fields:
- id
- invitation_id
- guest_role_id
- token (UUID, unique per invitation)
- name
- phone
- attendance_status
- created_at
- updated_at

---

# Guest Role
Examples:
- Family
- Friend
- VIP
- Vendor

---

# RSVP
Fields:
- id
- guest_id
- attendance
- guest_count
- message
- responded_at

---

# Guestbook
Fields:
- id
- invitation_id
- guest_id
- message
- created_at

---

# Guest Media
Fields:
- id
- guest_id
- media_type
- object_key

---

# Publish History
Tracks every publish operation.

Fields:
- id
- invitation_id
- version
- status
- published_at

---

# Subscription
Fields:
- id
- tenant_id
- plan
- status
- started_at
- expired_at

---

# Custom Domain
Future feature.

Fields:
- id
- tenant_id
- domain
- verification_status

---

# Audit Log
Fields:
- id
- tenant_id
- user_id
- action
- entity
- entity_id
- metadata
- created_at

---

# Common Rules
Every business table includes:
- created_at
- updated_at

Soft-delete capable entities include:
- deleted_at

All foreign keys must be indexed.

Frequently queried columns should be indexed.

Composite unique indexes should be preferred for tenant-scoped resources.