# Technical Design Document — Celebra

> Derived from [PRD.md](./PRD.md). Aligned with [AGENTS.md](../AGENTS.md) and [Tech_Stack.md](./Tech_Stack.md).
>
> Scope: **Phase 1 (MVP) only.** Phase 2/3 are referenced from [PRD.md](./PRD.md) and summarized in §9.
> This document reflects the current implementation; the executable source of truth is the code (`apps/backend/src`, `apps/frontend/src`). Where the doc and code disagree, code wins.

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

### 1.2 Deployment Topology (MVP)

| Component | Target | Notes |
|-----------|--------|-------|
| Next.js frontend | Vercel | Edge CDN, ISR |
| NestJS backend | VPS (Docker Compose) | REST API behind reverse proxy |
| PostgreSQL | VPS (Docker Compose) | Single shared database |
| Redis | VPS (Docker Compose) | Cache, rate limiting |
| Guest media | Local disk (`apps/backend/uploads`) | Static-served; R2 migration deferred (§4.8) |

### 1.3 Request Flow (Tenant-Scoped)

```
GET /{slug}/dashboard/invitations
  → Next.js extracts {slug}
  → Calls NestJS API with slug + auth cookie
  → TenantGuard resolves tenant_id from slug, asserts user belongs to tenant
  → All services filter WHERE tenant_id = ?
```

Tenant isolation is **application-layer only** in MVP: every query must include `tenant_id` (see `Multi_Tenant_Rules.md`). PostgreSQL RLS is planned as a second layer but not yet implemented.

### 1.4 Three Design Systems

| Context | Design System | Location |
|---------|--------------|----------|
| Landing Page | Custom tokens (`Design_System.md`) | Route group `(landing)` |
| Dashboard (admin, customer) | shadcn/ui + Tailwind CSS | `/admin`, `/{slug}/dashboard` |
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
/checkout                  → (checkout)/page.tsx
/checkout/success          → (checkout)/success/page.tsx
/login                     → (auth)/login/page.tsx
/forgot-password           → (auth)/forgot-password/page.tsx
/admin                     → (admin)/... (dashboard, customers, subscriptions, templates, categories, publish-monitoring)
/{slug}                    → [slug]/page.tsx (public invitation)
/{slug}?guest={token}      → [slug]/page.tsx (guest personalization)
/{slug}/dashboard          → [slug]/dashboard/... (home redirects to invitations, editor, guests)
```

### 2.2 NestJS API Modules

```
/api/auth                 → login, me, forgot-password (HMAC token)
/api/checkout             → create Xendit invoice, handle callback
/api/tenants              → tenant CRUD (admin)
/api/invitations          → invitation CRUD
/api/invitations/:id/content  → content read/update (editor)
/api/invitations/:id/publish  → trigger publish pipeline
/api/invitations/:id/guests   → guest CRUD + CSV import
/api/templates            → template CRUD (admin upload, customer browse)
/api/categories           → category CRUD (admin)
/api/subscriptions        → subscription management (admin)
/api/admin/dashboard      → aggregated metrics
/api/admin/customers      → customer/tenant management
/api/admin/publish-monitor → publish history across tenants
/api/public/invitation/:slug            → public invitation data (HTML + guest)
/api/public/invitation/:slug/guestbook  → list/create guestbook (public)
/api/public/invitation/:slug/rsvp       → RSVP submit/update (public)
/api/public/invitation/:slug/media      → guest media upload (public)
```

### 2.3 API Standards (per AGENTS.md §5)

Every endpoint implements:
- **Input validation** — DTO + `class-validator` + `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`)
- **Authentication** — `AuthGuard` validates HMAC-signed token from `celebra_session` cookie
- **Authorization** — `TenantGuard` (slug → tenant_id ownership) + `RolesGuard` (RBAC)
- **Exception handling** — `HttpException` + global `AllExceptionsFilter` returning a consistent shape
- **Structured logging** — see AGENTS.md §14

### 2.4 Error Response Shape

```json
{
  "statusCode": 400,
  "message": "Invitation title is required",
  "error": "Bad Request"
}
```

Never expose stack traces, SQL, internal paths, or environment variables.

### 2.5 Rate Limiting

Redis-backed via `assertRateLimit` (`apps/backend/src/common/rate-limit.ts`). Fails open when Redis is unavailable.

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/login | 5 | 15 min |
| POST /api/auth/forgot-password | 3 | 30 min |
| POST /api/public/invitation/:slug/rsvp | 10 | 1 min |
| POST /api/public/invitation/:slug/guestbook | 10 | 1 min |
| POST /api/public/invitation/:slug/media | 5 | 1 min |

### 2.6 API-to-Frontend Communication

1. **Server Components / Server Actions** — call NestJS directly (login action forwards cookies to `NEXT_PUBLIC_API_URL`).
2. **Client Components** — client-side `fetch` for dynamic operations (RSVP, guestbook, media upload).

---

## 3. Data Model

Source of truth: `apps/backend/src/db/schema.ts` (Drizzle). The SQL below mirrors it. All timestamps use `timestamptz`; status fields use `text` + `CHECK`.

#### tenants

```sql
CREATE TABLE tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### users

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('super_admin', 'owner', 'admin', 'staff')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
```

#### invitations

```sql
CREATE TABLE invitations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_version_id UUID NOT NULL, -- freezes at creation template version
  slug                TEXT NOT NULL,
  title               TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  published_at        TIMESTAMPTZ,
  deleted_at          TIMESTAMPTZ,   -- soft delete (archive)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX idx_invitations_tenant_id ON invitations(tenant_id);
```

#### invitation_contents

```sql
CREATE TABLE invitation_contents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id  UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE UNIQUE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  content_json   JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### categories

```sql
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### templates

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

#### guest_roles

```sql
CREATE TABLE guest_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### guests

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

#### rsvps

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

#### guestbooks

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

#### guest_media

```sql
CREATE TABLE guest_media (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id   UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE UNIQUE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'voice_note')),
  object_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### publish_histories

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

#### subscriptions

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

#### payments

```sql
CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID REFERENCES tenants(id) ON DELETE SET NULL,
  xendit_invoice_id  TEXT NOT NULL UNIQUE,
  xendit_external_id TEXT NOT NULL UNIQUE,
  user_email         TEXT NOT NULL,
  user_name          TEXT NOT NULL,
  user_phone         TEXT,
  plan               TEXT NOT NULL,
  amount             INTEGER NOT NULL,
  status             TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired', 'failed')),
  paid_at            TIMESTAMPTZ,
  expired_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
```

#### audit_logs

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

### 3.1 Cache Key Convention

```
tenant:{tenant_id}:invitation:{invitation_id}:published_html
```

### 3.2 Soft Delete

Invitations archive via `deleted_at`. Queries exclude archived rows by default (`WHERE deleted_at IS NULL`); public URL returns `410 Gone`.

---

## 4. Backend Behavior (MVP)

### 4.1 Authentication (HMAC Token)

Stateless HMAC-signed token — no session table, no DB lookup per request, no revoke. Passwords hashed with `bcryptjs`.

**Token format:** `base64url(JSON payload).base64url(HMAC-SHA256(payload, AUTH_TOKEN_SECRET))`
Payload: `{ id, email, role, tenantId, exp }`. TTL: 30 days. Verified in constant time (`timingSafeEqual`).

**Login flow:**
1. `POST /api/auth/login` with `{ email, password }`
2. Rate limited 5/15min per IP (`auth:login:{ip}`)
3. Lookup user by email, verify with `bcryptjs`
4. On success return `{ token, user, tenantSlug }`; frontend server action stores token in httpOnly cookie `celebra_session`
5. On failure return 401 (never disclose email vs password)

**Account creation:** No public signup. Accounts auto-created on successful payment (§4.10).

**Logout:** Stateless — frontend deletes the cookie.

**Forgot password:** `POST /api/auth/forgot-password` always returns 200 (no user enumeration). If email exists, a reset token is stored in Redis (`reset_token:{token}`, TTL 15 min). The reset-password page and email delivery are deferred to Phase 2.

**Admin login:** Same auth system; `super_admin` role gates `/admin`.

### 4.2 Authorization (RBAC)

| Role | Scope | Permissions |
|------|-------|-------------|
| `super_admin` | Global | Admin panel, all tenants |
| `owner` | Tenant | Full dashboard: CRUD invitations, guests, settings, publish |
| `admin` | Tenant | Same as owner (MVP does not differentiate) |
| `staff` | Tenant | Reserved for Phase 2 scanner |

Tenant ownership (`TenantGuard`): resolve `tenant_id` from slug → assert `user.tenant_id === resolved_tenant_id` → else 403. `super_admin` skips the check.

### 4.3 Invitation CRUD

- **Create:** select template → initialize `content_json` from schema defaults → insert `invitation` + `invitation_contents` in a transaction → audit log `invitation.created`. Slug auto-generated from title and uniquified (`-2`, `-3`, …).
- **Duplicate:** clone invitation + content (same `content_json`), new slug `{slug}-copy`, no guests/RSVPs, starts `draft`.
- **Archive/Restore:** soft delete via `deleted_at`; audit log `invitation.archived` / `invitation.restored`.
- **List:** filter `WHERE tenant_id = ? AND deleted_at IS NULL`, optional `?status=` filter.

**Constraints:**
- Published invitations cannot be edited — duplicate → edit → publish a new version.
- Published invitations cannot be deleted — archive first.

### 4.4 Visual Editor (Content Update)

- `PUT /api/invitations/:id/content` validates `content_json` against the template `json_schema` (required fields present, `gallery` must be array), rejects edits on published invitations, updates `content_json`.
- **Renderer** (`apps/backend/src/invitation/renderer.ts`): regex replaces `{{ section.field }}` placeholders with `content_json` values; missing keys are left as `{{...}}`. `assembleHtml(body, css, js)` wraps CSS/JS into `<style>`/`<script>`.
- The same renderer runs in editor (client-side), preview, and publish.

### 4.5 Guest Management

- **CRUD** under `/api/invitations/:id/guests`; create auto-generates `token = gen_random_uuid()`.
- **CSV import:** first row = headers; columns `name` (required), `phone`, `role`; validates each row, reports `{ imported, skipped, errors }`.
- Token powers personalized URL `/{slug}?guest={token}` (and QR check-in in Phase 2).

### 4.6 RSVP

`POST /api/public/invitation/:slug/rsvp` with `{ token, attendance, guest_count?, message? }`:
1. Resolve guest by token → 404 if not found (consistent, no token probing).
2. Reject if event date has passed (from `content_json.countdown.event_date`).
3. Upsert on `guest_id` (one RSVP per guest, updatable until event starts).
4. Rate limited 10/min.

### 4.7 Guestbook

`POST /api/public/invitation/:slug/guestbook` with `{ guest_token?, message }`:
- Anonymous allowed (token optional).
- Sanitize (strip HTML tags), trim, max 1000 chars.
- Rate limited 10/min.

### 4.8 Guest Media Upload

`POST /api/public/invitation/:slug/media` (multipart `file` + `guestToken`):
- Max 10MB; MIME whitelist: JPG, PNG, WebP, AVIF, MP4, MP3, WAV, WebM.
- One media per guest (unique `guest_id`); re-upload replaces old file.
- Stored on **local disk** under `uploads/tenant/{tenant_id}/{invitation_id}/guest-media/` and served statically at `/api/public/media`. R2 migration deferred (§8).

### 4.9 Publish Pipeline

`POST /api/invitations/:id/publish`:
1. Require `draft` status; validate content against schema.
2. Render HTML (placeholder injection + CSS/JS assembly).
3. Store rendered HTML in Redis `tenant:{id}:invitation:{id}:published_html`.
4. In one transaction: set `status = 'published'` + `published_at`, insert `publish_histories` (version N+1), insert `audit_logs` (`invitation.published`).
5. Return `{ publishedUrl: '/{slug}', version }`.

R2 asset upload and Vercel ISR revalidation are deferred until infrastructure is available. Published snapshot is immutable.

### 4.10 Customer Onboarding & Payment (Xendit)

1. Customer fills checkout (name, phone, email, plan) → `POST /api/checkout` creates pending `payment` + Xendit invoice → redirect to invoice URL.
2. Xendit callback (`/api/checkout/callback`) on success creates `tenant` + `user` (random password, bcrypt hash) + `subscription` (active) in a single transaction, then sends credentials.
3. Callback is idempotent (dedupe via `xendit_invoice_id`).

### 4.11 Public Invitation Rendering

`GET /api/public/invitation/:slug` (optionally `?guest={token}`):
1. Resolve tenant by slug → invitation by slug (tenant-scoped).
2. `410 Gone` if archived, `404` if not published.
3. Assert subscription active → `403` if expired.
4. Return rendered HTML (from Redis cache or re-rendered) + guest name if token valid.

Dynamic features (RSVP, guestbook, media upload) are client-side widgets on `[slug]/page.tsx` calling the public API.

---

## 5. Frontend Design (MVP)

### 5.1 Landing `(landing)/`
Home, Pricing, FAQ, Demo, Contact — static content, `Design_System.md` tokens, no shadcn/ui.

### 5.2 Admin Panel `/admin`
Dashboard, Customers, Subscriptions, Templates (upload bundle), Categories, Publish Monitoring — shadcn/ui + Tailwind, role `super_admin`.

### 5.3 Customer Dashboard `/{slug}/(dashboard)/`
- **Auth** `(auth)/`: Login, Forgot Password (server actions → NestJS).
- **Invitations:** list (Server Component), create (template catalog → draft), editor, guests.
- **Visual Editor** (`editor/[invitationId]`): Client Component — form panel (from `json_schema`) + iframe (`srcdoc` rendered template). Auto-save via debounced `PUT content`. Desktop/mobile preview + publish button.
- **Guests** (`guests/[invitationId]`): table CRUD, CSV import, QR token display.

### 5.4 Public Invitation `/[slug]/`
Rendered template HTML (server) + client widgets (`widgets.tsx`): RSVP form, guestbook feed/form, media uploader. Guest personalization via `?guest={token}`.

---

## 6. Roles & Permissions

See §4.2. `guest` has no user row — identified by guest token for RSVP/media; anonymous guestbook allowed.

---

## 7. Test Plan

### 7.1 Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Backend — Unit | Jest | Token sign/verify, CSV parser, renderer, validators |
| Backend — Integration | Jest + Supertest | API endpoints (HTTP in → HTTP out, real DB + Redis) |
| Frontend — Unit | Vitest | Components, hooks, utilities |

Critical flows only (per `Definition_of_Done.md`): authentication, authorization, uploads, payment, cross-tenant isolation.

### 7.2 Critical Flows

**Authentication**
- Login valid → 200 + token cookie; invalid password / unknown email → 401.
- Protected endpoint without/expired token → 401.
- Rate limit: 6th login within 15 min → 429.
- Forgot password: any email → 200 (no enumeration).

**Checkout & Payment**
- Callback (paid) → tenant + user + subscription created in one transaction.
- Callback double-sent → idempotent (no duplicate tenant).

**Multi-Tenant Isolation**
- Tenant A user accesses tenant B invitation → 404 (NotFound; 404 avoids disclosing resource existence).
- List invitations → only own tenant rows.
- Public invitation A → never exposes tenant B data.

**Guest CRUD / RSVP / Guestbook / Media**
- Guest create → token auto-generated (UUID).
- CSV import → correct imported/skipped/errors counts.
- RSVP valid token → recorded; invalid token → 404; after event start → 400; update → upsert.
- Guestbook empty message → 400; HTML stripped.
- Media: valid image/video/audio → stored; `.exe` → 415; >10MB → 413; second upload → replaces.

**Publish**
- Publish draft → published + `published_at` set; publish already-published → 409.
- Publish history + audit log recorded.
- Placeholders injected correctly; expired subscription → 403.

---

## 8. Risks & Constraints

| Risk | Severity | Mitigation |
|------|----------|------------|
| Template HTML XSS (admin-uploaded) | High | iframe sandbox, template upload validation |
| Cross-tenant leak (no RLS yet) | Critical | Application-layer `WHERE tenant_id` on every query; RLS planned as second layer |
| Guest media on local disk | Medium | Not scalable; migrate to R2 when infra available |
| Large CSV import timeout | Medium | Chunked processing, partial results |
| Single developer | Low | Monorepo, shared types, clear docs |

**Constraints (MVP):** form-driven editor (no drag-and-drop), no template version migration, no RLS, guest media on local disk, no real-time updates, single shared PostgreSQL.

**Out of scope:** drag-and-drop editor, real-time collaboration, native apps, custom domains, analytics, template marketplace.

---

## 9. Implementation Status & Roadmap

Phase 1 (MVP) implemented: landing, checkout/payment, onboarding, admin panel, customer dashboard (auth, invitations, editor, guests), public invitation (RSVP, guestbook, media).

Deferred to Phase 2: QR check-in scanner, offline sync, PDF export, localization, BullMQ, email/WhatsApp notification delivery, R2 migration, RLS.

Deferred to Phase 3: premium themes, analytics, custom domain, integrations, template marketplace.

---

## 10. Open Questions (MVP)

| # | Question |
|---|----------|
| 1 | Exact subscription pricing tiers and durations |
| 2 | Template authoring tooling (manual upload vs validator) |
| 3 | Guest privacy (GDPR/CCPA) consent, retention, deletion |
| 4 | Which languages at launch; `next-intl` dashboard + public scope |
| 5 | Notification delivery channels for guest invites (Phase 2) |
| 6 | Per-file / per-invitation media size caps enforcement |
| 7 | Subscription grace period before public invitation deactivation |
| 8 | Admin panel authentication (currently same system, `super_admin` seeded) |
