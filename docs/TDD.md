# Technical Design Document — Celebra

> Derived from [PRD.md](./PRD.md). Aligned with [AGENTS.md](../AGENTS.md), [Architecture.md](./Architecture.md), [Tech_Stack.md](./Tech_Stack.md), [Database_Design.md](./Database_Design.md), [Domain_Rules.md](./Domain_Rules.md), [Multi_Tenant_Rules.md](./Multi_Tenant_Rules.md), [Template_System.md](./Template_System.md), [Security_Checklist.md](./Security_Checklist.md), [Definition_of_Done.md](./Definition_of_Done.md).

---

## 1. Architecture Overview

### 1.1 Repository Structure

```
celebra/
├── apps/
│   ├── frontend/          # Next.js (App Router)
│   └── backend/           # NestJS
├── packages/
│   └── shared/            # Shared types, DTOs, validation schemas
├── docker-compose.yml     # PostgreSQL + Redis + NestJS (VPS)
├── pnpm-workspace.yaml
└── docs/
```

**Monorepo tool:** pnpm workspaces.

### 1.2 Deployment Topology

| Component | Target | Notes |
|-----------|--------|-------|
| Next.js frontend | Vercel | Edge CDN, ISR, hybrid ISG+API |
| NestJS backend | VPS (Docker Compose) | REST API behind reverse proxy |
| PostgreSQL | VPS (Docker Compose) | Single shared database, RLS enforced |
| Redis | VPS (Docker Compose) | Cache, sessions, rate limiting |
| Cloudflare R2 | Cloudflare | Object storage, signed URLs |
| BullMQ | VPS (Phase 2+) | Deferred from MVP |

### 1.3 Layer Diagram

```
Browser
  ├── Landing (/)
  ├── Admin Panel (/admin)
  ├── Customer Dashboard (/{slug}/dashboard)
  ├── Public Invitation (/{slug})
  └── Scanner PWA (/{slug}/scanner)
         │
    ┌────┴────┐
    │ Vercel  │ ← Next.js (ISG + API Routes + CDN)
    └────┬────┘
         │
    ┌────┴────┐
    │  VPS    │ ← NestJS REST API
    │         │ ← PostgreSQL (Drizzle ORM + RLS)
    │         │ ← Redis (ioredis)
    └────┬────┘
         │
    ┌────┴────┐
    │   R2    │ ← Object storage (tenant-scoped paths)
    └─────────┘
```

### 1.4 Request Flow (Tenant-Scoped)

```
GET /{slug}/dashboard/invitations
  → Next.js extracts {slug}
  → Calls NestJS API with slug + auth cookie
  → NestJS resolves tenant_id from slug (TenantService)
  → All services receive tenant_id as tenant context
  → Drizzle: every query filters WHERE tenant_id = ?
  → PG: RLS policy enforces same filter as safeguard
```

### 1.5 Three Design Systems

| Context | Design System | Location |
|---------|--------------|----------|
| Landing Page | Custom tokens (`Design_System.md`) | Route group `(landing)` |
| Dashboard (admin, customer, scanner) | shadcn/ui + Tailwind CSS | `/admin`, `/{slug}/dashboard`, `/{slug}/scanner` |
| Public Invitation | Template HTML/CSS/JS | `/{slug}` |

No crossover between design systems.

---

## 2. Public Interfaces

### 2.1 Route Map (Next.js App Router)

```
/                          → (landing)/page.tsx
/pricing                   → (landing)/pricing/page.tsx
/faq                       → (landing)/faq/page.tsx
/demo                      → (landing)/demo/page.tsx
/contact                   → (landing)/contact/page.tsx
/checkout                  → (checkout)/page.tsx (payment form + plan selection)
/checkout/success          → (checkout)/success/page.tsx (post-payment)
/login                     → (auth)/login/page.tsx
/admin                     → (admin)/layout.tsx → dashboard, customers, subscriptions, templates, categories, publish-monitoring
/{slug}                    → [slug]/page.tsx (public invitation, ISG)
/{slug}?guest={token}      → [slug]/page.tsx (guest personalization)
/{slug}/dashboard          → [slug]/(dashboard)/layout.tsx → invitations, editor, guests, preview, settings
/{slug}/scanner            → [slug]/scanner/page.tsx (PWA, Phase 2)
```

### 2.2 NestJS API Modules

```
/api/auth                 → Better Auth integration (login, logout, session)
/api/checkout             → Create Xendit invoice, handle callback
/api/tenants              → Tenant CRUD (admin only)
/api/invitations          → Customer invitation CRUD
/api/invitations/:id/content  → Content read/update (editor)
/api/invitations/:id/publish  → Trigger publish pipeline
/api/invitations/:id/guests   → Guest CRUD + CSV/XLSX import
/api/invitations/:id/rsvp     → RSVP submission/update (public)
/api/guestbook            → Guestbook messages (public)
/api/media                → Upload/download (signed URL generation)
/api/templates            → Template CRUD (admin: upload bundle, customer: browse)
/api/categories           → Category CRUD (admin)
/api/subscriptions        → Subscription management (admin)
/api/admin/dashboard      → Aggregated metrics (admin)
/api/admin/customers      → Customer/tenant management (admin)
/api/admin/publish-monitor → Publish history across tenants (admin)
/api/public/invitation/:slug → Public invitation data (RSVP, guestbook, comments)
/api/scanner              → Guest list download, attendance sync (Phase 2)
```

### 2.3 API Standards (per AGENTS.md §5)

Every endpoint must implement:
- **Input validation** — DTO + `class-validator` + `ValidationPipe`
- **Authentication** — Better Auth guard on protected routes
- **Authorization** — Tenant ownership verification (slug → tenant_id), RBAC at service layer
- **Exception handling** — `HttpException` with consistent error response shape
- **Structured logging** — timestamp, level, requestId, userId, action, error

### 2.4 Error Response Shape

```json
{
  "statusCode": 400,
  "message": "Invitation title is required",
  "error": "Bad Request",
  "requestId": "uuid"
}
```

Never expose: stack traces, SQL, internal paths, environment variables.

### 2.5 Rate Limiting (Redis-based, per AGENTS.md §13 Security)

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/login | 5 | 15 min |
| POST /api/auth/forgot-password | 3 | 30 min |
| POST /api/public/rsvp | 10 | 1 min |
| POST /api/guestbook | 10 | 1 min |
| POST /api/media/upload | 5 | 1 min |
| POST /api/scanner/attendance | 20 | 1 min |

### 2.6 API-to-Frontend Communication

Frontend calls:
1. **Server Components** — Direct NestJS API calls (`fetch` with auth cookies forwarded) for initial data.
2. **Client Components** — Client-side `fetch` to NestJS API for dynamic operations (RSVP, guestbook, media upload, scanner sync).
3. **Server Actions** — Used for form mutations where it simplifies the pattern (create invitation, update content). Backend API still called internally.

---

## 3. Data Model

### 3.1 Drizzle Schema Definitions

All timestamps use `timestamptz` (ISO 8601, UTC). Status fields use `text` + `CHECK` constraint.

#### Tenant

```sql
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### User

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
```

#### Invitation

```sql
CREATE TABLE invitations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL, -- references template version, not template
  slug                TEXT NOT NULL,
  title               TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  published_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX idx_invitations_tenant_id ON invitations(tenant_id);
```

#### InvitationContent

```sql
CREATE TABLE invitation_contents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id  UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE UNIQUE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  content_json   JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invitation_contents_invitation_id ON invitation_contents(invitation_id);
```

#### Template

```sql
CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID NOT NULL REFERENCES categories(id),
  name          TEXT NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  preview_image TEXT,
  html_bundle   TEXT NOT NULL,   -- raw HTML with {{placeholder}} syntax
  css_bundle    TEXT,
  js_bundle     TEXT,
  json_schema   JSONB NOT NULL,  -- field metadata for form editor
  is_premium    BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Category

```sql
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Guest

```sql
CREATE TABLE guests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id     UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  guest_role_id     UUID REFERENCES guest_roles(id),
  token             UUID NOT NULL,
  name              TEXT NOT NULL,
  phone             TEXT,
  attendance_status TEXT CHECK (attendance_status IN ('pending', 'checked_in')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (invitation_id, token)
);
CREATE INDEX idx_guests_invitation_id ON guests(invitation_id);
```

#### GuestRole

```sql
CREATE TABLE guest_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### RSVP

```sql
CREATE TABLE rsvps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id     UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE UNIQUE,
  attendance   BOOLEAN NOT NULL,
  guest_count  INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
  message      TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Guestbook

```sql
CREATE TABLE guestbooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  guest_id      UUID REFERENCES guests(id) ON DELETE SET NULL,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_guestbooks_invitation_id ON guestbooks(invitation_id);
```

#### GuestMedia

```sql
CREATE TABLE guest_media (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id   UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'voice_note')),
  object_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### PublishHistory

```sql
CREATE TABLE publish_histories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_publish_histories_invitation_id ON publish_histories(invitation_id);
```

#### Subscription

```sql
CREATE TABLE subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  plan       TEXT NOT NULL CHECK (plan IN ('1_month', '3_months', '6_months', '12_months')),
  status     TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
```

#### Payment

```sql
CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID REFERENCES tenants(id) ON DELETE SET NULL,
  xendit_invoice_id   TEXT NOT NULL UNIQUE,
  xendit_external_id  TEXT NOT NULL UNIQUE,
  user_email          TEXT NOT NULL,
  user_name           TEXT NOT NULL,
  user_phone          TEXT,
  plan                TEXT NOT NULL,
  amount              INTEGER NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  paid_at             TIMESTAMPTZ,
  expired_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
```

#### AuditLog

```sql
CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  entity     TEXT NOT NULL,
  entity_id  UUID,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(tenant_id, entity, entity_id);
```

### 3.2 Indexes Summary

| Table | Index | Type |
|-------|-------|------|
| tenants | `slug` | UNIQUE |
| users | `tenant_id` | B-tree |
| users | `(tenant_id, email)` | UNIQUE composite |
| invitations | `tenant_id` | B-tree |
| invitations | `(tenant_id, slug)` | UNIQUE composite |
| invitation_contents | `invitation_id` | UNIQUE + B-tree |
| guests | `invitation_id` | B-tree |
| guests | `(invitation_id, token)` | UNIQUE composite |
| guest_media | `guest_id` | UNIQUE + B-tree |
| guestbooks | `invitation_id` | B-tree |
| publish_histories | `invitation_id` | B-tree |
| subscriptions | `tenant_id` | UNIQUE + B-tree |
| audit_logs | `tenant_id` | B-tree |
| audit_logs | `(tenant_id, entity, entity_id)` | composite |

### 3.3 PostgreSQL Row-Level Security (RLS)

```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
-- ... all tenant-scoped tables

CREATE POLICY tenant_isolation ON tenants
  USING (id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON invitations
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

`app.current_tenant_id` is set at the beginning of each request via `SET LOCAL` in a NestJS guard/interceptor.

### 3.4 Soft Delete Policy (Where Applicable)

Invitations support archive (soft delete) via a `deleted_at` column:

```sql
ALTER TABLE invitations ADD COLUMN deleted_at TIMESTAMPTZ;
```

Queries exclude soft-deleted rows by default: `WHERE deleted_at IS NULL`.

### 3.5 Cache Key Convention

```
tenant:{tenant_id}:invitation:list
tenant:{tenant_id}:invitation:{invitation_id}
tenant:{tenant_id}:invitation:{invitation_id}:guests
tenant:{tenant_id}:invitation:{invitation_id}:published_html
```

---

## 4. Backend Behavior Details & Edge Cases

### 4.1 Authentication (Better Auth + Drizzle Adapter)

**Login flow:**
1. POST `/api/auth/login` with `{ email, password }`
2. Backend validates credentials against Better Auth's `user` table
3. On success: Better Auth creates session, sets httpOnly cookie, returns session info
4. On failure: return 401 (never disclose whether email or password is wrong)
5. Rate limited: 5 attempts per 15 min per IP

**Account creation:** No public signup. Accounts are created automatically on successful payment via the checkout flow (see §4.10).

**Logout:** POST `/api/auth/logout` — invalidates session server-side.

**Session expiration:** Enforced by Better Auth. Default TTL: 7 days, refresh on activity.

**Edge cases:**
- Session expired mid-edit: return 401; frontend redirects to login with `?redirect=` param.
- Concurrent sessions: Allowed (devices). Revoke-all-sessions in Phase 2.
- Forgot password: POST `/api/auth/forgot-password` → sends email with reset token (TTL: 15 min). Token stored in Redis: `reset_token:{token}` → `{ user_id, tenant_id }`.
- Admin login: Same auth system. Role-based guard (`role = 'admin'`) on `/admin` routes.

### 4.2 Authorization (RBAC)

| Role | Scope | Permissions |
|------|-------|-------------|
| `super_admin` | Global (system user) | All admin panel, all tenants |
| `owner` | Tenant | Full dashboard: CRUD invitations, guests, settings, publish |
| `admin` | Tenant | Same as owner (MVP doesn't differentiate) |
| `staff` | Tenant | Scanner login only (Phase 2) |

Tenant ownership check (NestJS guard):
1. Extract slug from route param
2. Resolve `tenant_id` from slug
3. Get current user's `tenant_id` from session
4. Assert: `current_user.tenant_id === resolved_tenant_id` → proceed, else → 403

**Edge cases:**
- User from tenant A accesses tenant B's slug: 403.
- Deleted user tries to access: 401 (session invalid).
- Expired trial: dashboard remains accessible; publish is blocked.

### 4.3 Invitation CRUD

**Create:**
1. Customer selects template (`template_id`) from catalog
2. Backend: copy `template.json_schema` to `invitation_contents.content_json` initialized with defaults derived from schema field defaults
3. Set `template_version_id = template.id`, `status = 'draft'`
4. Generate unique `slug` (auto from title or manual input; validated unique within tenant)
5. Insert `invitation` + `invitation_content` in a transaction
6. Audit log: `{ action: 'create', entity: 'invitation', entity_id: ... }`

**Duplicate:**
1. Clone `invitation` row (new slug: `{original_slug}-copy` or UUID-based)
2. Clone `invitation_content` row (same `content_json`)
3. Do NOT clone guests/RSVPs
4. New invitation starts as `draft`

**Archive (soft-delete):**
1. Set `deleted_at = now()` on invitation
2. Public invitation URL returns 410 Gone (not 404, to distinguish from non-existent)
3. Dashboard: archived invitations listed separately, can be restored (set `deleted_at = NULL`)
4. Audit log: `{ action: 'archive', entity: 'invitation', entity_id: ... }`

**List:**
- Always filter `WHERE tenant_id = ? AND deleted_at IS NULL`
- Paginated (cursor-based: `created_at DESC, id DESC`), page size 20
- Support filter by status: `?status=draft|published`

**Edge cases:**
- Cannot delete published invitation: must archive first (published snapshot remains accessible until subscription expires)
- Cannot edit published invitation's content: must duplicate → edit draft → publish new version
- Slug collision on duplicate: auto-suffix with `-copy` or UUID segment

### 4.4 Visual Editor (Content Update)

**Update content_json:**
1. PUT `/api/invitations/:id/content` with `{ content_json: {...} }`
2. Validate against template's `json_schema` (required fields present, types match, image URLs are valid R2 keys)
3. Update `invitation_contents.content_json`
4. Update `invitation_contents.schema_version` if schema changed
5. Update `invitations.updated_at`

**Template placeholder injection (renderer):**
```
Input: html_bundle (string), content_json (object)
Process: String.replaceAll('{{section.field}}', content_json[section][field])
Output: Rendered HTML string
```

The renderer runs both in:
- Editor iframe (client-side, via `postMessage`)
- Preview (server-side)
- Publish pipeline (server-side)

**Edge cases:**
- Content references an image that was deleted from R2: show placeholder image
- Template has placeholders not in content_json: leave as `{{...}}` (shown as-is in editor; validators warn)
- Content has fields not in schema: ignored during render (extra keys don't break injection)
- Concurrent editing by multiple users: last-write-wins (no locking in MVP). Acceptable for single-tenant small teams.

### 4.5 Guest Management

**CRUD:**
- List: `WHERE invitation_id = ?` (tenant-scoped via invitation → tenant)
- Create: POST with `{ name, phone?, guest_role_id? }`, auto-generate `token = gen_random_uuid()`
- Update: PUT with name/phone/role changes
- Delete: soft-delete or hard-delete (TBD — soft-delete preserves RSVP data)

**CSV/XLSX Import:**
1. POST `/api/invitations/:id/guests/import` (multipart form: file)
2. Parse: first row = headers. Columns map: `name` (required), `phone` (optional), `role` (optional, matched by name to guest_roles)
3. Validate each row: name not empty, phone format if present, role exists if specified
4. Insert all valid rows in a transaction (skip duplicates by name+invitation_id; log skipped count)
5. Return: `{ imported: N, skipped: M, errors: [...] }`

**QR Token Generation:**
- Token = UUID v4, generated server-side on guest creation
- QR code = rendered on frontend (client-side QR lib) from token string
- Token is used for: personalized invitation URL `/{slug}?guest={token}`, scanner QR check-in

**Edge cases:**
- Import with 10,000 guests: process in chunks of 500; timeout after 30s → return partial result with remaining told to re-import
- Duplicate guest name in same invitation: allowed (different tokens); just warn
- Deleted guest's RSVP/guestbook/media: guest_id set to NULL (retain data, lose identity linkage)

### 4.6 RSVP

**Submit:**
1. POST `/api/public/invitation/:slug/rsvp` with `{ token, attendance, guest_count?, message? }`
2. Resolve guest from token: `SELECT * FROM guests WHERE token = ?` (public endpoint, no tenant_id in URL path — slug identifies tenant indirectly)
3. Check: one RSVP per guest (UNIQUE constraint on `guest_id`)
4. If exists: update (PUT semantics on same endpoint — idempotent)
5. Validate: `guest_count > 0` if attendance is true
6. Insert/update `rsvps` row

**Edge cases:**
- Invalid token: 404 (don't reveal whether token was valid → consistent error message)
- RSVP after event start: rejected (400 "RSVP period has ended") — need event date from content_json
- Duplicate submission by same token: update existing RSVP (PUT semantics)

### 4.7 Guestbook

1. POST `/api/public/invitation/:slug/guestbook` with `{ guest_token?, message }`
2. Guest token optional (anonymous guestbook entries allowed)
3. Sanitize message (strip HTML tags, limit 1000 chars)
4. Insert into `guestbooks`
5. Rate limited: 10 per 1 min per IP

**Edge cases:**
- Empty message: reject 400
- Token provided but invalid: still accept (anonymous), but log mismatch

### 4.8 Guest Media Upload

1. POST `/api/public/invitation/:slug/media` (multipart: file + guest_token)
2. Validate: MIME type (image/*, video/mp4, audio/mpeg, audio/wav, audio/webm), file size (max 10MB)
3. Check guest exists and hasn't uploaded already (UNIQUE on `guest_id` in `guest_media`)
4. Resize/compress if image (Sharp: WebP, max 1920px wide)
5. Upload to R2: `tenant/{tenant_id}/{invitation_id}/guest-media/{guest_id}.{ext}`
6. Insert `guest_media` row with `object_key`
7. Return signed URL for display

**Edge cases:**
- Re-upload: delete old media first (one media per guest)
- File exceeds size: reject before processing, 413
- Invalid MIME: reject 415
- Processing fails (e.g., corrupt image): delete partial upload, return 422

### 4.9 Publish Pipeline

1. POST `/api/invitations/:id/publish` (authenticated, tenant owner)
2. Check: invitation status is `draft`
3. Load: template HTML bundle + current `content_json`
4. Inject: run placeholder injection (Section 4.4 renderer)
5. Generate hybrid page:
   - Static: injected HTML → stored in Redis as `tenant:{id}:invitation:{id}:published_html`
   - Dynamic: RSVP form, guestbook, comment, media upload included as client-side React components via `<script>` tags appended to HTML
6. Upload static assets referenced in content_json to R2 (if not already there — idempotent checks)
7. Trigger Vercel ISR revalidation: `GET /{slug}` with `x-prerender-revalidate` header
8. Update `invitations.status = 'published'`, `published_at = now()`
9. Insert `publish_histories` row: `{ version: N+1, status: 'success' }`
10. Insert `audit_logs` row: `{ action: 'publish', entity: 'invitation', entity_id: ... }`
11. Return: `{ published_url: '/{slug}', version: N+1 }`

**Edge cases:**
- Publish fails mid-pipeline: insert `publish_histories` row with `status: 'failed'`, invitation stays `draft`, error logged. Customer notified to retry.
- Customer edits draft after publish: creates divergence between draft and published version. Publish again = new version. Published snapshot stays frozen.
- R2 upload fails: retry up to 3 times with exponential backoff, then fail with clear error.
- Multiple rapid publishes: sequential ok (pipeline is synchronous in MVP).

### 4.10 Customer Onboarding & Payment (Xendit)

**Checkout flow:**
1. Customer visits `/checkout`, fills: name, phone, email, selects subscription plan
2. POST `/api/checkout` creates a pending `payment` row and a Xendit invoice via Xendit API
3. Frontend redirects customer to Xendit invoice URL for payment
4. Customer completes payment on Xendit's page
5. Xendit sends callback to `/api/checkout/callback` on payment success
6. Backend creates `tenant` (auto-generate unique slug from name), `user` (auto-generate random password), and `subscription` (status: active) in a single transaction
7. Backend sends credentials (email + password + dashboard URL) via email and WhatsApp
8. Customer receives credentials and logs in at `/login`

**Xendit integration:**
- Use Xendit Invoice API (`POST /v2/invoices`)
- Store `xendit_invoice_id` and `xendit_external_id` in `payments` table
- Verify callback authenticity via Xendit webhook verification (callback token)
- On payment failure/expiry: update `payments.status`, no tenant created

**Subscription check (every request to public invitation):**
- Next.js middleware or `getStaticProps` checks: `SELECT status, expired_at FROM subscriptions WHERE tenant_id = ?`
- If `expired` → return subscription-expired page (not 404)

**Edge cases:**
- Payment expired, customer retries: create new payment row + new Xendit invoice
- Callback received twice (retry): idempotent — check if tenant already exists via `xendit_invoice_id`
- Subscription renewed after expiry: public invitation becomes available again immediately.
- Manual activation by admin: POST `/api/admin/subscriptions/:id/activate`

### 4.11 Public Invitation Rendering (ISG + API)

**ISG (Incremental Static Generation):**
- `generateStaticParams`: return all published `slug` values
- `revalidate`: 60 seconds (or manual on publish)
- Page content: serve pre-rendered HTML from Redis → render on server
- Dynamic features (RSVP, guestbook, media upload): client-side React components hydrating after page load, calling NestJS API

**Guest Personalization (`?guest={token}`):**
- Page loads normally
- URL param `guest` is read by client-side JS
- If token valid: pre-fill RSVP form with guest name, personalize greeting
- If token invalid: show generic guest experience (RSVP still works anonymously)

**Edge cases:**
- Published invitation accessed with deleted slug: 404
- Archived invitation accessed: 410 Gone
- Expired subscription: subscription-expired page (200 but blocked)
- Guest token in URL, but guest was deleted: token rejected silently, generic experience

### 4.12 Asset Management (R2)

**Upload flow:**
1. Frontend requests signed upload URL: POST `/api/media/upload-url` with `{ filename, content_type, context: 'template' | 'invitation' }`
2. Backend validates file type, generates signed URL (PUT, TTL 5 min) with path: `tenant/{tenant_id}/{context}/{uuid}.{ext}`
3. Frontend uploads file directly to signed URL (bypasses backend for large files)
4. Frontend notifies backend: POST `/api/media/confirm` with `{ object_key }`
5. Backend verifies object exists in R2

**Edge cases:**
- Signed URL expired: frontend retries from step 1
- File not confirmed within 10 min: background cleanup (Phase 2 with BullMQ)
- Image referenced in content_json deleted: return placeholder

### 4.13 Scanner (Phase 2 — Detailed Design)

**Guest list download:**
1. Scanner user logs in (staff role) via `/{slug}/scanner`
2. GET `/api/scanner/invitation/:slug/guest-list` returns all guests with tokens (paginated, max 10,000)
3. Client stores in IndexedDB: `{ token, name, phone, role, attendance_status }`

**Offline scan:**
1. Camera decodes QR → obtains UUID token
2. Lookup in IndexedDB: `find(g => g.token === token)`
3. If not found: show "Guest not in list" (invalid token)
4. If found and `attendance_status === 'pending'`: mark as `checked_in`, add to sync queue
5. If found and `attendance_status === 'checked_in'`: show "Already checked in" (duplicate rejected)

**Background sync:**
1. Service Worker detects online → triggers sync
2. POST `/api/scanner/invitation/:slug/attendance/batch` with `[{ token, checked_in_at }]`
3. Backend resolves guest by token, updates `attendance_status = 'checked_in'`
4. Conflict: if guest already checked in (another scanner synced first) → skip (idempotent)
5. Clear sync queue on success

**Edge cases:**
- Partial sync failure: retry failed items, don't remove succeeded items from queue
- Guest list updated (customer added/deleted guests) while scanner offline: stale IndexedDB. On next online, re-download full list.
- Two scanners mark same guest differently: last-write-wins via `updated_at` comparison
- Token collision: UUID v4 collision probability is negligible; DB UNIQUE constraint as safety net

---

## 5. Frontend Design

### 5.1 Landing Page `(landing)/`

Route group, no authentication required.

| Page | Key Components | Data Source |
|------|---------------|-------------|
| Home (`/`) | Hero, FeaturesGrid, CTABanner, Testimonials | Static content |
| Pricing (`/pricing`) | PricingCard (x4 tiers), FAQ accordion | Static content + subscription plans from API |
| FAQ (`/faq`) | AccordionGroup, SearchBar | Static content |
| Demo (`/demo`) | Embedded video/interactive walkthrough | Static |
| Contact (`/contact`) | ContactForm (name, email, message) | POST to NestJS contact endpoint |

Design system: `Design_System.md` custom tokens. No shadcn/ui usage on landing.

### 5.2 Admin Panel `/admin`

All routes protected. Role: `super_admin`.

| Page | Key Components | Data Source |
|------|---------------|-------------|
| Dashboard | StatCards (tenants, invitations, revenue), RecentActivity | `/api/admin/dashboard` |
| Customers | DataTable (search, filter, paginate), CustomerDetail | `/api/admin/customers` |
| Subscriptions | DataTable, ActivateButton, ExpireButton | `/api/admin/subscriptions` |
| Templates | DataTable, TemplateUpload (HTML/CSS/JS + JSON Schema), PreviewModal | `/api/templates` |
| Categories | CRUD table, InlineEdit | `/api/categories` |
| Publish Monitoring | DataTable (status, version, timestamp, tenant), FilterByTenant | `/api/admin/publish-monitor` |

Design system: shadcn/ui + Tailwind CSS. All components from shadcn/ui (DataTable = `@tanstack/react-table` + shadcn table primitives).

### 5.3 Customer Dashboard `/{slug}/(dashboard)/`

All routes authenticated. Role: `owner` or `admin` of tenant.

#### 5.3.1 Authentication Pages `(auth)/`

| Page | Components | Notes |
|------|-----------|-------|
| Login | LoginForm (email, password, submit), ForgotPasswordLink | Server Action → Better Auth |
| Forgot Password | EmailInput, SubmitButton | Server Action → POST to NestJS |

#### 5.3.2 Invitation List `/(dashboard)/invitations/`

**Page:** Server Component, fetches invitation list from API.
**Components:** InvitationCard (title, status badge, last modified, template thumbnail), CreateButton, SearchInput, StatusFilter (draft/published/archived).

#### 5.3.3 Template Catalog `/(dashboard)/templates/`

**Page:** Server Component.
**Components:** CategoryTabs, TemplateCard (name, preview image, premium badge), SearchBar.
**Flow:** Browse/Search → Select template → Confirm → Redirect to editor.

#### 5.3.4 Visual Editor `/(dashboard)/editor/[invitationId]/`

**Page:** Client Component (heavy interactivity).

```
┌────────────────────────────────────────────────────┐
│  Editor Header                                      │
│  [← Back] [Invitation Title] [Preview] [Publish]    │
├──────────┬─────────────────────────────────────────┤
│          │                                          │
│  Form    │  Iframe                                  │
│  Panel   │  (Rendered Template HTML)                │
│          │                                          │
│  Section │                                          │
│  Fields  │                                          │
│          │                                          │
│          │                                          │
├──────────┴─────────────────────────────────────────┤
│  Status bar: last saved, auto-save indicator        │
└────────────────────────────────────────────────────┘
```

**Core flow:**
1. Load template HTML + `content_json` + `json_schema`
2. Render iframe: inject `content_json` into template HTML, post via `srcdoc`
3. Render form panel: parse `json_schema` → generate form fields (text input, textarea, image upload, date picker, color picker, map picker)
4. User edits form → update `content_json` → inject into iframe via `iframe.contentWindow.postMessage({ content_json })`
5. Auto-save: debounce 2s → PUT `/api/invitations/:id/content`

**Components:**
- `EditorLayout` — split pane (form panel + iframe)
- `FormPanel` — recursive form renderer from JSON Schema
- `FieldRenderer` — maps field type to component: `TextField`, `TextareaField`, `ImageField` (upload + preview), `GalleryField` (multi-upload + sortable), `DateField`, `MapField` (leaflet picker), `MusicField` (upload + audio player), `ColorField` (color picker)
- `TemplateIframe` — iframe with `srcdoc`, listens to `postMessage`
- `SectionToggle` — enable/disable optional sections (maps to section visibility in renderer)
- `PreviewModal` — desktop + mobile viewport toggle
- `PublishButton` — triggers publish pipeline, shows confirmation dialog
- `AutosaveIndicator` — "Saving..." / "Saved" / "Error"

**Edge cases:**
- Iframe sandbox: `sandbox="allow-scripts allow-same-origin"` (template JS allowed, but no top-level navigation)
- Template HTML is malformed: render in iframe as-is (browser handles); if broken, show error banner "Template rendering error — contact support"
- Very large images in gallery: lazy-load thumbnails in form panel (IntersectionObserver)
- Browser back/forward: save draft before navigation (`beforeunload` warning if unsaved)

#### 5.3.5 Guest Management `/(dashboard)/guests/[invitationId]/`

**Components:** GuestTable (DataTable: name, phone, role, token, RSVP status, check-in status), AddGuestDialog, EditGuestDialog, ImportButton (CSV/XLSX file picker), ExportButton (CSV download), QrCodeModal (displays QR for copy/print), FilterByRole, SearchBar, DeleteConfirmDialog.

#### 5.3.6 Preview `/(dashboard)/preview/[invitationId]/`

**Components:** DesktopPreview (iframe at 1440px viewport), MobilePreview (iframe at 375px viewport), ViewportToggle.
Uses same renderer as editor (iframe + injected HTML). Read-only.

#### 5.3.7 Settings `/(dashboard)/settings/[invitationId]/`

**Components:**
- `LocalizationSettings` — language picker
- `SharingSettings` — WhatsApp share URL generator, Telegram share URL generator
- `CalendarInviteSettings` — generate .ics file download link
- `SeoSettings` — meta title, meta description, OG image upload
- `PdfExportButton` — triggers Puppeteer PDF generation (Phase 2)

### 5.4 Public Invitation `/[slug]/`

**Page:** Hybrid — ISG for static HTML, client components for dynamic features.

```
┌──────────────────────────────────────────┐
│  Template Rendered HTML (static, ISG)     │
│  (Animation, Music, Gallery, Countdown)   │
├──────────────────────────────────────────┤
│  Dynamic Components (client-side)         │
│  ┌─────────────┬──────────────────────┐  │
│  │ RSVP Form   │ Guestbook            │  │
│  │ (if token)  │ (message list)       │  │
│  ├─────────────┼──────────────────────┤  │
│  │ Media Upload│ Comments             │  │
│  └─────────────┴──────────────────────┘  │
└──────────────────────────────────────────┘
```

**Components (Client):**
- `RsvpForm` — adds guest_count, message, submit button; updates existing RSVP
- `GuestbookFeed` — message list (polling every 30s or on-demand refresh)
- `GuestbookForm` — message input + submit
- `MediaUploader` — file input (image/video/audio), preview, progress bar
- `CommentSection` — threaded comments (Phase 2+)
- `LanguageSwitcher` — selects locale, reloads page with `?lang=xx`
- `MusicPlayer` — play/pause background music (uses template's audio element)

**Personalization (`?guest={token}`):**
- If token valid: RSVP form pre-filled with guest name, personalized greeting in template
- If token invalid/missing: generic "You are invited" experience

### 5.5 Scanner PWA `/[slug]/scanner/` (Phase 2)

**Page:** Client Component, offline-first PWA.

**Components:**
- `ScannerLogin` — staff credentials (stored in IndexedDB for offline reuse)
- `GuestListDownloader` — downloads full guest list, shows progress bar
- `QrScanner` — camera component (uses `navigator.mediaDevices.getUserMedia` or `BarcodeDetector` API)
- `ScanResult` — shows guest info (name, role), check-in button
- `SyncQueue` — pending syncs counter, manual sync trigger
- `OfflineIndicator` — "You are offline. N scans pending sync."

**Service Worker:**
- Cache app shell (scanner HTML/JS/CSS)
- Background Sync API for attendance data

### 5.6 Shared Layout Components

| Component | Usage |
|-----------|-------|
| `DashboardSidebar` | Admin panel + Customer dashboard shared layout (shadcn/ui sidebar) |
| `TopNav` | Breadcrumb, user avatar dropdown, notification bell |
| `TenantSwitcher` | Not in MVP (single tenant per user) |
| `ErrorBoundary` | Catches render errors, shows fallback UI |
| `LoadingSkeleton` | shadcn/ui Skeleton cards for loading states |
| `EmptyState` | "No invitations yet. Create your first!" with CTA |
| `ConfirmDialog` | shadcn/ui AlertDialog wrapper for destructive actions |

---

## 6. Roles & Permissions Design

### 6.1 Role Definitions

| Role | Scope | DB Table | Description |
|------|-------|----------|-------------|
| `super_admin` | Global | `users` (tenant_id = NULL or system tenant) | Platform operator. Access to `/admin`. |
| `owner` | Tenant | `users.role = 'owner'` | Full access to all invitations under their tenant. |
| `admin` | Tenant | `users.role = 'admin'` | Same as owner in MVP. Reserved for future granular permissions. |
| `staff` | Tenant | `users.role = 'staff'` | Scanner-only access (Phase 2). Cannot modify invitations/guests. |
| `guest` | Public | No user row | Identified by guest token. Can RSVP, post guestbook, upload media. |

### 6.2 Permission Matrix

| Resource / Action | super_admin | owner | admin | staff | guest | Public |
|-------------------|-------------|-------|-------|-------|-------|--------|
| View admin dashboard | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage customers (CRUD tenant) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage subscriptions | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Upload templates | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Browse template catalog | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create/edit invitation | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Publish invitation | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage guests (CRUD) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Import/export guests | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| View invitation preview | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit settings | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Scanner login | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Download guest list (scanner) | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Mark attendance | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Submit RSVP | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Post guestbook | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Upload media | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| View public invitation | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |

### 6.3 Guard Implementation (NestJS)

```typescript
// AuthGuard — validates session
@UseGuards(AuthGuard)

// TenantGuard — resolves tenant_id from slug, verifies user belongs to tenant
@UseGuards(AuthGuard, TenantGuard)

// RolesGuard — checks user.role against required roles
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
@Roles('owner', 'admin')

// Public endpoints — no auth guard, rate limit only
@Public()
```

### 6.4 Tenant Isolation in Guards

```
TenantGuard:
  1. Get slug from @Param('slug') or infer from invitation_id → tenant_id
  2. Get current user from session (AuthGuard must run first)
  3. If super_admin: skip tenant check (access all)
  4. If normal user: assert user.tenant_id === resolved_tenant_id
  5. Set app.current_tenant_id for RLS
```

---

## 7. Test Plan

### 7.1 Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Backend — Unit | Jest | Service methods, business logic, validators |
| Backend — Integration | Jest + Supertest | Full API endpoints (HTTP in → HTTP out, real DB + Redis) |
| Frontend — Unit | Vitest | Component rendering, hooks, utility functions |
| Frontend — Integration | Vitest + Testing Library | User flows (edit → save → preview) |
| E2E (optional MVP) | Playwright | Critical paths: signup → publish → RSVP |

### 7.2 Critical Flow Tests (per Definition_of_Done.md)

#### Authentication
- [ ] Login with valid credentials → 200, session cookie set
- [ ] Login with invalid password → 401
- [ ] Login with non-existent email → 401
- [ ] Access protected endpoint without session → 401
- [ ] Access protected endpoint with expired session → 401
- [ ] Rate limit: 5 failed logins → 6th returns 429
- [ ] Forgot password: valid email → 200, reset token generated
- [ ] Forgot password: non-existent email → 200 (consistent response, no user enumeration)

#### Checkout & Payment
- [ ] Create checkout (name, phone, email, plan) → 201, Xendit invoice created
- [ ] Xendit callback (paid) → tenant + user + subscription created in transaction
- [ ] Xendit callback (paid) double-sent → idempotent, no duplicate tenant
- [ ] Xendit callback (failed/expired) → payment status updated, no tenant created
- [ ] Credentials sent via email + WhatsApp on payment success
- [ ] Login with auto-generated credentials → 200

#### Multi-Tenant Isolation
- [ ] User from tenant A accesses tenant B's invitation → 403
- [ ] User from tenant A lists invitations → only tenant A's invitations returned
- [ ] Public invitation for tenant A → does not show tenant B's data
- [ ] Upload file for tenant A → stored under `tenant/A/...`
- [ ] Cache key for tenant A → scoped with `tenant:A:...`
- [ ] Cross-tenant publish → denied

#### Invitation CRUD
- [ ] Create invitation → 201, draft status, content initialized
- [ ] Duplicate invitation → 201, new slug, content cloned, guests not cloned
- [ ] Archive invitation → 200, deleted_at set, public URL returns 410
- [ ] Restore archived invitation → 200, deleted_at = null
- [ ] List invitations → paginated, tenant-scoped, excludes soft-deleted
- [ ] Create invitation with duplicate slug in same tenant → 409

#### Guest CRUD
- [ ] Create guest → 201, token auto-generated (UUID)
- [ ] List guests → tenant-scoped via invitation
- [ ] Import CSV with 100 valid rows → 100 imported, 0 skipped
- [ ] Import CSV with 20 valid + 5 duplicate + 3 invalid → 20 imported, 5 skipped, 3 errors
- [ ] Import XLSX with valid rows → same behavior as CSV
- [ ] Delete guest → RSVP/guestbook/media preserved (guest_id NULL, not cascaded)

#### RSVP
- [ ] Submit RSVP with valid token → 201, attendance recorded
- [ ] Submit RSVP with invalid token → 404
- [ ] Submit RSVP without token → 404
- [ ] Update existing RSVP → 200, attendance updated
- [ ] Submit RSVP with guest_count=0 → 400
- [ ] Submit RSVP after event start → 400

#### Guestbook
- [ ] Post guestbook message with valid token → 201
- [ ] Post guestbook message without token (anonymous) → 201
- [ ] Post empty message → 400
- [ ] Rate limit: 11th message in 1 min → 429

#### Media Upload
- [ ] Upload valid image with guest token → 201, object_key stored
- [ ] Upload valid video → 201
- [ ] Upload valid audio → 201
- [ ] Upload .exe → 415 (unsupported media type)
- [ ] Upload >10MB file → 413
- [ ] Guest uploads second media → 409 (one media per guest)

#### Publish Pipeline
- [ ] Publish draft invitation → 200, status = 'published', published_at set
- [ ] Publish already-published invitation → 409
- [ ] Published invitation page accessible via /{slug}
- [ ] Publish history recorded
- [ ] Audit log recorded
- [ ] Template placeholders injected correctly in published HTML
- [ ] Expired subscription → public invitation returns blocked page

#### Template System
- [ ] Admin uploads template (HTML + JSON Schema) → 201
- [ ] Customer browses templates by category → paginated, filtered
- [ ] Customer selects template for new invitation → content_json initialized from schema defaults
- [ ] Template updated by admin → existing invitations unaffected (frozen at creation version)

#### Visual Editor
- [ ] Update content_json → 200, valid against schema
- [ ] Update content_json with invalid field type → 400
- [ ] Render: `{{hero.title}}` injected with content value
- [ ] Render: missing placeholder → left as `{{...}}` in output
- [ ] Render: extra content keys → ignored

### 7.3 Test Data & Fixtures

- **Seed script:** `apps/backend/test/seed.ts` — creates known tenants, users, templates, categories, invitations, guests for integration tests
- **Test database:** separate PostgreSQL database (`celebra_test`) created before test run, migrated via `drizzle-kit push`
- **Test Redis:** separate Redis database index (e.g., `REDIS_URL` with `db=1`)
- **R2 mock:** local MinIO or mock S3 for integration tests (no real R2 calls in CI)

### 7.4 CI Pipeline (Future)

1. `pnpm lint` — ESLint (frontend + backend)
2. `pnpm typecheck` — tsc --noEmit (frontend + backend)
3. `pnpm test` — Jest + Vitest
4. `pnpm build` — `next build` + `nest build`

---

## 8. Risks, Constraints, Out of Scope

### 8.1 Technical Risks

| Risk | Severity | Mitigation | Status |
|------|----------|------------|--------|
| Template HTML injection security (XSS from admin-uploaded templates) | High | Sandbox iframe, CSP headers, template validation on upload (scan for `<script>` with `eval`, `document.write`) | Design |
| PostgreSQL RLS misconfiguration leaking cross-tenant data | Critical | Two-layer isolation (app + RLS), every query tested for tenant scoping, integration tests cover all cross-tenant scenarios | Design |
| Vercel ISR cache stale after publish | Medium | Manual revalidation trigger on publish; fallback: SSR on first request after publish | Accept |
| Large CSV/XLSX import timeout | Medium | Process in chunks, return partial results, 30s timeout | Accept |
| Offline scanner sync conflicts (Phase 2) | Medium | Last-write-wins, DB-level duplicate rejection, idempotent batch endpoint | Design |
| R2 upload failure during publish | Medium | Retry with backoff (max 3), fail gracefully, invitation stays draft | Accept |
| Single developer bottleneck | Low | Monorepo, shared types, clear docs — enables future team scaling | Accept |

### 8.2 Constraints

1. **No drag-and-drop editor.** Form-driven only. Template authors must learn `{{placeholder}}` syntax and JSON Schema.
2. **No template version migration in MVP.** Templates frozen at creation. Migration deferred until real-world demand.
3. **Synchronous image processing in MVP.** Sharp runs in request cycle. Large uploads may be slow. Queue-based (BullMQ) in Phase 2.
4. **`drizzle-kit push` for schema changes.** No formal migration files. Must be replaced before team scales beyond single developer.
5. **No real-time updates.** RSVP and guestbook refresh via polling/on-demand, not WebSockets.
6. **Shared PostgreSQL instance.** Single database, RLS enforced. Separate databases per tenant not needed yet.
7. **No custom domains in Phase 1–2.** All invitations published under Celebra's domain (`/{slug}`).

### 8.3 Out of Scope

| Item | Phase |
|------|-------|
| Drag-and-drop visual editor | Never |
| Real-time collaborative editing | Never |
| Native mobile apps (iOS/Android) | Never |
| Multi-vendor e-commerce marketplace | Never (Phase 3 is template marketplace only) |
| QR Check-in + Scanner PWA | Phase 2 |
| BullMQ async job processing | Phase 2 |
| PDF export (Puppeteer) | Phase 2 |
| Localization (multi-language dashboard) | Phase 2 |
| Premium themes | Phase 3 |
| Tenant-scoped analytics | Phase 3 |
| Custom domain (CNAME verification) | Phase 3 |
| Integrations (calendar, social) | Phase 3 |
| Template marketplace | Phase 3 |
| Tenant migration tools | TBD |

---

## 9. Implementation Plan

### 9.1 Phase Breakdown

#### Phase 0 — Project Scaffold

**Prerequisites:** None.

1. Initialize pnpm monorepo (`pnpm-workspace.yaml`, root `package.json`)
2. Create `apps/frontend` — `create-next-app` with TypeScript, Tailwind, App Router
3. Create `apps/backend` — `nest new`, connect Drizzle + PostgreSQL
4. Create `packages/shared` — shared types, DTOs, validation schemas
5. Set up Docker Compose: PostgreSQL 16, Redis 7
6. Configure environment variables (`.env.example`)
7. Set up ESLint, Prettier, TypeScript strict mode
8. Initialize Better Auth with Drizzle adapter
9. Create initial Drizzle schema + `drizzle-kit push`
10. Set up Vitest (frontend) and Jest (backend) configurations

**Deliverables:** Working monorepo, dev servers running, DB migrated, auth working.

#### Phase 1 — Core Platform (MVP)

**Step 1: Landing Website**
- Build all 5 pages (Home, Pricing, FAQ, Demo, Contact)
- Apply `Design_System.md` tokens
- Static content; contact form → POST to backend

**Step 2: Checkout & Payment**
- Checkout page (name, phone, email, plan selection)
- Xendit invoice integration (create invoice, handle callback)
- Auto-create tenant + user + subscription on payment success
- Send credentials via email + WhatsApp

**Step 3: Authentication**
- Login page + Server Action
- Forgot password flow
- Session management (Better Auth)
- Auth guards on NestJS

**Step 4: Admin Panel**
- Dashboard with aggregate metrics
- Customer management (tenant CRUD)
- Subscription management
- Category CRUD
- Template upload (HTML/CSS/JS + JSON Schema)
- Publish monitoring

**Step 5: Customer Dashboard — Invitation Management**
- Invitation list (Server Component)
- Create invitation (template catalog → select → draft)
- Duplicate invitation
- Archive/restore invitation
- Invitation detail page

**Step 6: Visual Editor**
- Editor page layout (form panel + iframe)
- Template placeholder injection engine (server + client)
- Form panel: dynamic field renderer from JSON Schema
- Image upload (R2 signed URL flow)
- Auto-save (debounced)
- Desktop/mobile preview modal
- Publish button + pipeline

**Step 7: Guest Management**
- Guest CRUD (DataTable)
- CSV/XLSX import
- QR token generation (UUID)
- RSVP tracking
- Guest role assignment

**Step 8: Public Invitation**
- ISG page for `/{slug}`
- RSVP form (Client Component)
- Guestbook (Client Component)
- Media upload
- Template music player
- Guest personalization via `?guest={token}`

**Step 9: Settings**
- SEO metadata editor
- WhatsApp/Telegram share links
- Calendar invite (.ics generation)

**Step 10: Polish & Testing**
- Integration tests for critical flows
- Cross-tenant isolation tests
- Rate limiting tests
- Error boundary + loading states
- Lighthouse audit (<2s public page load)

**Deliverables:** MVP deployed (Vercel + VPS). Full critical flows working end-to-end.

#### Phase 2 — Advanced Features

1. QR Check-in scanner PWA (`/{slug}/scanner`)
2. Offline sync (IndexedDB + Background Sync API)
3. Localization (multi-language dashboard via `next-intl`)
4. PDF export (Puppeteer)
5. BullMQ for async jobs (email, notifications, image processing)
6. Notification email delivery (guest invitation links)

#### Phase 3 — Premium & Scale

1. Premium themes
2. Tenant-scoped analytics + admin global aggregation
3. Custom domain (CNAME verification, SSL)
4. Integrations (calendar sync, social feeds)
5. Template marketplace
6. Proper database migrations (replace `drizzle-kit push`)
7. Performance optimization (Redis caching strategy, CDN tuning)

### 9.2 Development Workflow

1. **Branch:** `feature/{phase}-{module}` from `main`
2. **Code:** Follow AGENTS.md standards (strict typing, no `any`, shadcn/ui for dashboard, reuse before create)
3. **Test:** Write integration tests for critical flows before merge
4. **Review:** Run through Definition_of_Done checklist
5. **Merge:** Squash merge to `main`

### 9.3 Environment Variable Reference

```bash
# apps/frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3000

# apps/backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/celebra
REDIS_URL=redis://localhost:6379
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=celebra
R2_PUBLIC_URL=https://cdn.celebra.com
BETTER_AUTH_SECRET=xxx
SMTP_HOST=xxx
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASS=xxx

# Docker Compose
POSTGRES_USER=celebra
POSTGRES_PASSWORD=xxx
POSTGRES_DB=celebra
REDIS_PASSWORD=xxx
```

---

## 10. Open Questions (from PRD §Open Questions)

For each open question, the TDD assumes a default. Deviations must be resolved before implementation.

| # | Question | TDD Assumption | Needs Decision By |
|---|----------|---------------|-------------------|
| 1 | Pricing tiers | 4 plans: trial (14 days), 1-month, 3-months, 6-months, 12-months. Actual prices TBD. | Phase 1 — Step 3 |
| 2 | Trial expiration behavior | Invitation deactivated immediately; dashboard accessible for 30-day grace period to subscribe. | Phase 1 — Step 3 |
| 3 | Template authoring tooling | Admin manually uploads HTML/CSS/JS + JSON Schema. No validation tooling in MVP. | Phase 1 — Step 3 |
| 4 | Guest privacy (GDPR) | Collect name + phone only. Consent via public invitation footer disclaimer. Deletion: manual via customer dashboard. | Phase 1 — Step 6 |
| 5 | Multi-language launch scope | English only in MVP. `next-intl` infrastructure ready, translations added per language in Phase 2. | Phase 1 |
| 6 | Analytics detail | Admin: tenant count, invitation count, publish count, revenue aggregate. Customer: TBD Phase 3. | Phase 3 |
| 7 | Guest invitation delivery | MVP: customer manually shares invitation URL (WhatsApp, Telegram). Email delivery in Phase 2. | Phase 1 |
| 8 | File size limits | 10MB per file. Per-invitation cap: 500MB. Enforced at application layer. | Phase 1 — Step 5 |
| 9 | Subscription grace period | 30 days after expiry → invitation deactivated. Dashboard accessible for renewal. | Phase 1 — Step 3 |
| 10 | Admin authentication | Same Better Auth system. Initial super_admin seeded manually via DB script. | Phase 0 |
| 11 | Scanner distribution | URL only (`/{slug}/scanner`). PWA "Add to Home Screen" prompt. | Phase 2 |
| 12 | Template marketplace revenue | TBD Phase 3 — not needed for MVP. | Phase 3 |
