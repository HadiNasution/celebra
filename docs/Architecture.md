# System Architecture

## Architecture Style
- Multi-tenant SaaS
- Monorepo (pnpm workspaces: Next.js frontend + NestJS backend)
- Hybrid rendering (ISG for static pages, API routes for dynamic features)
- CDN-first delivery
- Offline-first PWA for QR Scanner
- Form-driven Visual Editor (no drag-and-drop)

---

## Route Structure
All in one Next.js app:

Landing (marketing)
- /

Admin Panel
- /admin

Customer Dashboard
- /{slug}/dashboard

Public Invitation
- /{slug}

Scanner (PWA)
- /{slug}/scanner

Guest Personalization
- /{slug}?guest={token}

---

## Tenant Model
- Tenant is identified via slug in the URL (`/{slug}`).
- All business data must include `tenant_id`.
- Every query must be tenant-scoped.
- Isolation at the application layer + PostgreSQL Row-Level Security.
- No cross-tenant data.

---

## Core Modules
### Landing
Marketing website. Within one Next.js app, use route group `(landing)`.

### Admin
- Customer Management
- Subscription
- Template Management (upload HTML/CSS/JS)
- Domain Management
- Publish Monitoring
- Analytics

### Customer Dashboard
- Authentication
- Invitation Management
- Visual Editor (form-driven)
- Guest Management
- Preview
- Settings

### Public Invitation
Hybrid: main page is statically generated (ISG), dynamic features (RSVP, Guestbook) via client-side API calls to NestJS backend.

### Scanner
Offline-first PWA at `/{slug}/scanner`. Separate from dashboard.

---

## Visual Editor
Architecture:
- Form-driven (never drag-and-drop)
- Editor renders raw HTML template in an iframe
- Form panel on the side edits data according to the template schema
- Schema is defined as a combination of placeholders `{{key.name}}` in HTML + JSON Schema for field metadata

---

## Template Model
```
Admin uploads HTML/CSS/JS → stored as template
→ User selects template from catalog
→ Editor form-driven → edit content (content_json)
→ Preview → Publish
```

---

## Guest Management
- CRUD
- Import CSV/XLSX
- QR Generation (token: UUID)
- RSVP
- Guest Roles

---

## Scanner Workflow
1. Login
2. Download guest list
3. Store in IndexedDB
4. Offline validation
5. QR Scan (decode UUID token)
6. Mark attendance
7. Queue sync
8. Background synchronization

---

## Publish Pipeline
Draft
↓
Inject content_json into template HTML placeholders
↓
Generate hybrid page (ISG + dynamic components)
↓
Upload assets to R2 (tenant/{tenant_id}/...)
↓
Deploy/refresh via Vercel ISR
↓
Published

---

## Non Functional Requirements
- Multi Tenant
- Responsive
- Mobile First
- Offline Support for scanner
- Fast (&lt;2s)
- CDN Delivery
- Secure
- Audit Log
- Daily Backup
