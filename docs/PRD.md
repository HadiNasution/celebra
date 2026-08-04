# Product Requirements Document — Celebra

## Problem Statement

Organizing events such as weddings, birthdays, graduations, and corporate gatherings requires sending invitations to guests. Traditional printed invitations are costly, logistically slow, and offer no interactivity. Existing digital invitation tools are either too rigid (single-use templates with no customization) or too complex for non-technical users (requiring coding or design skills).

There is no platform that combines:
- A **no-code visual editor** that lets non-technical users build event websites,
- **Multi-tenant SaaS** so customers can independently manage multiple invitations from one dashboard,
- **Guest management** with RSVP, token-based personalization, QR check-in, and offline support,
- A **template system** that is reusable, versioned, and data-driven—where content and presentation are fully separated.

Customers need a self-service, subscription-based platform where they can create, edit, publish, and manage invitation websites without technical assistance.

---

## Goals

### Business Goals
- Provide a subscription-based revenue stream through hosting duration plans (1–12 months).
- Monetize premium features: QR Check-in, Guest Roles, Localization, Integrations, and Premium Templates.
- Establish a future template marketplace for additional revenue.

### Product Goals
- Deliver a self-service platform that lets non-technical customers create and publish website-based invitations independently.
- Support 8+ event types (Wedding, Birthday, Family Gathering, School Event, Corporate Internal Event, Seminar, Gathering, Graduation) through a flexible, reusable template system.
- Provide a no-code visual editor that is form-driven (not drag-and-drop), rendering templates in an iframe with a side panel for data editing.
- Enable guest management with CSV/XLSX import, unique token generation, RSVP, and QR-based check-in with offline support.
- Ensure strict multi-tenant data isolation at application and database layers.
- Achieve fast performance: <2s page loads, CDN-first delivery, mobile-first responsive design.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Customer sign-up to first publish time | <15 minutes for basic invitation |
| Template selection to publish | <5 steps |
| Public invitation page load (guest-facing) | <2 seconds globally (CDN) |
| Scanner offline sync success rate | >99% once connectivity restored |
| Cross-tenant data leaks | Zero |
| Trial-to-paid conversion | TBD post-launch (baseline needed) |
| Guest RSVP completion rate | TBD (baseline needed) |

---

## Feature Requirements

### 1. Landing Website
Route: `/`

| Feature | Description |
|---------|-------------|
| Home | Hero, key benefits, CTA |
| Pricing | Subscription plans (1–12 months), premium feature pricing |
| FAQ | Common questions and answers |
| Demo | Interactive walkthrough of the product |
| Contact | Contact form or support channel |

Design system: Custom tokens from `Design_System.md` (primary `#EBB552`, secondary `#1C322D`, font Inter + Playfair Display).

---

### 2. Admin Panel
Route: `/admin`

| Feature | Description |
|---------|-------------|
| Dashboard | Platform overview, key metrics |
| Customer Management | View/update tenant accounts |
| Subscription Management | Manage plans, status, activations, expirations |
| Template Management | Upload HTML/CSS/JS template bundles |
| Theme Management | Theme is part of template—CSS within the bundle |
| Asset Pack Management | Optional decorative asset packs |
| Category Management | Template categories for catalog browsing |
| Domain Management | (Future) Custom domain verification |
| Publish Monitoring | Track publish operations across tenants |
| Analytics | Global aggregated analytics (not per-tenant) |
| Customer Support | Support ticket/workflow management |

---

### 3. Customer Dashboard
Route: `/{slug}/dashboard`

#### 3.1 Authentication
- Login (email + password via Better Auth)
- Forgot Password flow
- Session expiration enforced

#### 3.2 Invitation Management
| Action | Description |
|--------|-------------|
| Create Invitation | Select template → create draft |
| Duplicate Invitation | Clone existing invitation with its content |
| Archive Invitation | Soft-delete; preserve data |
| Draft | Save work in progress |
| Publish | Trigger publish pipeline |

Invitation states: `draft`, `published`.

#### 3.3 Template Catalog
- Browse templates by category
- Search templates by name
- Preview template before selection

#### 3.4 Visual Editor
Architecture: Form-driven, no drag-and-drop.

- Renders raw HTML template in an iframe.
- Side panel renders form fields matching the template's JSON Schema.
- Template placeholders (`{{section.field}}`) map to form inputs.
- Field types supported: `text`, `textarea`, `image`, `gallery`, `date`, `map`, `music`, `color`.
- Changes in form → inject content into iframe → WYSIWYG preview.

Editable sections:
- Event Information
- Bride / Groom details
- Schedule
- Maps (lat/lng)
- Gallery (images)
- Music (audio URL)
- Countdown (event date)
- Bank Information (e.g., gift transfers)
- Additional Information
- Optional sections (toggle on/off per section)

#### 3.5 Guest Management
- CRUD operations for guests
- Import guests via CSV / XLSX
- Assign Guest Roles (Family, Friend, VIP, Vendor)
- Generate unique QR token (UUID) per guest
- Track RSVP responses per guest

#### 3.6 Preview
- Desktop viewport preview
- Mobile viewport preview
- Uses same renderer as editor (true WYSIWYG)
- Save draft / Reset to last saved

#### 3.7 Settings
- Localization (multi-language via `next-intl`)
- WhatsApp share integration
- Telegram share integration
- Calendar invite link generation
- Printable PDF export (Puppeteer)
- SEO metadata (title, description, OG tags)
- Custom Domain (Future — Phase 3)

---

### 4. Public Invitation
Route: `/{slug}`  
Guest personalization: `/{slug}?guest={token}`

Features:
- Opening animation (template-defined)
- Background music
- Photo gallery
- RSVP form (one submission per guest token, updatable until event starts)
- Guestbook (leave messages for event host)
- Comment section
- Media upload (max 1 per guest; image, video, or voice note)
- Multi-language support

Rendering: Hybrid approach—static content via ISG, dynamic features via client-side API calls to NestJS backend.

---

### 5. QR Check-in (Phase 2)
Route: `/{slug}/scanner` (PWA)

Scanner workflow:
1. Staff login to scanner
2. Download guest list to IndexedDB
3. Scan QR code → decode UUID token
4. Validate against offline guest list
5. Mark attendance (one check-in per guest)
6. Reject duplicate scans
7. Queue sync operations
8. Background sync when online

Offline-first PWA: remains usable without internet; data syncs when connectivity returns.

---

### 6. Publish Pipeline
```
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
```

Constraints:
- Publishing never modifies customer content.
- Published invitations should not be edited directly.
- Every publish operation recorded in Publish History + Audit Log.

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Monorepo (pnpm workspaces)** | Shared types/DTOs between Next.js frontend and NestJS backend; single repository for coordination. |
| **Next.js App Router** | Hybrid rendering: ISG for static content, API routes for dynamic features, all in one app. |
| **Form-driven editor (no drag-and-drop)** | Lower complexity; template authors define schema, customers fill a form. Iframe rendering keeps editor and output identical. |
| **Hybrid schema system** | `{{section.field}}` placeholders in template HTML + JSON Schema for form metadata. Simple, inspectable, versionable. |
| **Template versioning with freeze** | Existing invitations freeze at creation template version; prevents template updates from breaking published invitations. |
| **Tenant via URL slug** | `/{slug}` identifies tenant; no guesswork from request body/query; works naturally with the URL structure. |
| **Two-layer tenant isolation** | Application layer (WHERE tenant_id) + PostgreSQL RLS. Defense in depth. |
| **Shared database, shared tables** | Simpler operations; isolation enforced by queries + RLS rather than separate databases per tenant. |
| **PostgreSQL + Drizzle ORM** | Relational integrity, strong typing, push-based migrations for single-developer velocity. |
| **Cloudflare R2 for object storage** | Tenant-scoped paths (`tenant/{tenant_id}/...`); signed URLs only; bucket never exposed directly. |
| **Better Auth with Drizzle adapter** | Handles authentication/authorization; avoids building auth from scratch. |
| **Redis for cache** | Tenant-scoped keys (`tenant:{id}:resource`); session storage, expensive query caching, rate limiting. |
| **Three design systems** | Landing (custom tokens), Dashboard (shadcn/ui + Tailwind), Public Invitation (template HTML/CSS/JS). No crossover. |
| **BullMQ deferred to Phase 2** | Not needed in MVP; email, notifications, image processing run synchronously in request cycle. |
| **Status as string + check constraint** | Development flexibility vs. PostgreSQL enums; easier to evolve schema early-stage. |

---

## Scope & Boundaries

### Phase 1 (MVP)
- Landing Website (Home, Pricing, FAQ, Demo, Contact)
- Admin Panel (Dashboard, Customer/Subscription/Template Management, Categories, Publish Monitoring)
- Customer Dashboard (Auth, Invitation CRUD, Template Catalog, Visual Editor, Guest Management, Preview, Settings)
- Publish Pipeline (ISG + API routes)
- Public Invitation (RSVP, Guestbook, Media Upload, Multi-language)

### Phase 2
- QR Check-in (PWA Scanner)
- Offline sync (IndexedDB → background sync)
- Localization (multi-language dashboard)
- PDF Export (Puppeteer)
- BullMQ for async jobs (email, notifications, image processing)

### Phase 3
- Premium Themes
- Analytics (tenant-scoped + admin global aggregation)
- Custom Domain (verification, CNAME)
- Integrations (calendar, social, etc.)
- Template Marketplace

### Out of Scope (All Phases)
- Drag-and-drop visual editor
- Real-time collaborative editing
- Native mobile apps
- Multi-vendor marketplace (Phase 3 is template marketplace, not e-commerce)
- Migration tools for template version upgrades (deferred until real-world demand)

---

## Dependencies

### External Services
| Service | Purpose | Criticality |
|---------|---------|-------------|
| Vercel | Frontend hosting, ISR, CDN | High (production) |
| Cloudflare R2 | Object storage (images, music, media) | High |
| PostgreSQL (self-hosted VPS) | Primary database | Critical |
| Redis (self-hosted VPS) | Cache, session store, rate limiting | High |
| Better Auth (library) | Authentication | Critical |
| Docker Compose (VPS) | Backend + DB + Redis deployment | High |

### Key Libraries
| Library | Purpose |
|---------|---------|
| Next.js | Frontend framework |
| NestJS | Backend framework |
| Drizzle ORM | Database access |
| shadcn/ui | Dashboard UI components |
| Tailwind CSS | Dashboard styling |
| Sharp | Image processing (resize, compress, WebP/AVIF) |
| Puppeteer | PDF generation from HTML |
| ioredis | Redis client |
| next-intl | Internationalization |
| BullMQ | Job queue (Phase 2+) |
| lucide-react | Icons |
| Vitest | Frontend testing |
| Jest + Supertest | Backend testing |

---

## Risk & Assumptions

### Risks (from Product Brief)

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Visual Editor complexity** | High | Form-driven design reduces scope vs. drag-and-drop; iframe + JSON Schema is well-understood pattern. |
| **Template versioning** | Medium | Freeze at creation time; no migration tool in MVP. Add migration only when real-world cases demand it. |
| **Multi-tenant data isolation** | Critical | Two-layer isolation (app + RLS). Must be tested per Security Checklist: cross-tenant access, upload, cache, publish. |
| **Offline synchronization** | Medium | IndexedDB + background sync. Conflict resolution: last-write-wins for check-in; duplicate scans rejected at DB level. |
| **Media storage growth** | Medium | Limit 1 media per guest. Bucket lifecycle policies on R2. Monitor storage costs. |
| **Static site publishing** | Medium | Hybrid approach (ISG + API routes) avoids full static generation overhead. Each publish creates a new Publish History record. |
| **Template migration** | Low (deferred) | No migration tool in MVP. Templates frozen at creation version. Migration strategy TBD when real-world cases emerge. |

### Assumptions
- Customers have basic web literacy (can fill a form, upload images).
- Templates are created by admin (not by customers). The template author knows `{{placeholder}}` syntax and JSON Schema.
- Single developer velocity is acceptable for Phase 1; team may scale later.
- PostgreSQL RLS is adequate as a second isolation layer; no need for separate databases per tenant.
- ISG (Incremental Static Generation via Vercel ISR) is sufficient for public invitation performance; edge-rendered pages are not required.
- QR scanner users (event staff) will have occasional internet access for initial guest list download and periodic syncs.
- Trial period of 14 days is adequate for customer conversion evaluation.
- All uploaded files fit the allowed MIME types (JPG, PNG, WebP, AVIF, MP4, MP3); any other type is rejected.

---

## Known Issues

1. **Template version migration**: There is no mechanism to migrate an existing invitation from one template version to another. Published invitations are frozen at creation version. Migration tool is deferred until real-world demand.
2. **No drag-and-drop editor**: Some customers may expect drag-and-drop. Current form-driven approach is simpler to build but may feel less intuitive for certain workflows. This is an intentional scope decision.
3. **Synchronous image processing in MVP**: Sharp runs in the request cycle, not via queue. Large image uploads may increase response time. Queue-based processing arrives in Phase 2 with BullMQ.
4. **Single developer migration strategy**: `drizzle-kit push` is used for schema changes; no formal migration files. This is adequate for a single developer but must be replaced with proper migrations before the team scales.
5. **Offline check-in conflict resolution**: Defined as last-write-wins for attendance. If two scanners mark the same guest differently before sync, the later write wins. This is acceptable for check-in but may need refinement if attendance data gains further downstream use.
6. **No real-time updates**: RSVP, guestbook, and comment sections use client-side polling or on-demand refresh, not WebSockets. Acceptable for MVP scope.
7. **Custom domain in Phase 3**: Customers cannot use their own domain in Phases 1–2; all invitations published under the Celebra domain.

---

## Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Multi-tenant | Slug-identified, strict isolation at app + DB layers |
| Responsive | Mobile-first; breakpoints at 640/768/1024/1280/1536px |
| Performance | Public invitation <2s load (CDN), images optimized (WebP/AVIF) |
| Security | Auth on every protected endpoint, RBAC at service layer, input validation (DTO + ValidationPipe), rate limiting on sensitive endpoints, audit logging |
| Reliability | Daily PostgreSQL backups, R2 bucket replica, graceful degradation for dynamic features |
| Maintainability | Monorepo with shared packages, no duplicate code, Drizzle typed ORM |
| Accessibility | Touch targets ≥44px, semantic HTML, ARIA labels on interactive elements |
| Offline (Scanner) | IndexedDB storage, background sync, queue for pending operations |

---

## Open Questions

1. **Pricing model specifics**: Exact pricing tiers and durations for subscriptions are not yet defined. Needs business validation.
2. **Trial conversion funnel**: What happens after the 14-day trial ends? Is the invitation deactivated immediately or after a grace period? What messaging is shown to guests?
3. **Template authoring tooling**: Will admin upload raw HTML/CSS/JS manually, or will there be a template authoring guide/validator for `{{placeholders}}` and JSON Schema?
4. **Guest privacy (GDPR/CCPA compliance)**: What personal data is collected from guests (name, phone, attendance)? How is consent handled? Are data retention and deletion policies defined?
5. **Multi-language scope**: Which languages are supported at launch? Is translation done by the platform or by the customer? Does `next-intl` cover both dashboard and public invitation?
6. **Analytics detail**: What specific metrics are tracked for public invitations (visits, RSVP rate, etc.)? What is shown to admin vs. customer?
7. **Notification delivery**: How are guest invitations delivered? Email with token URL? WhatsApp link? SMS? Which channels are Phase 1?
8. **Media upload limits**: What is the per-file size limit and per-invitation total storage cap? Is this enforced at the R2 level or application level?
9. **Subscription grace period**: Does the platform offer a grace period after subscription expiry before deactivating the public invitation? Duration?
10. **Admin panel authentication**: Does the admin panel use the same Better Auth system as customers? Are there separate admin credentials or role-based access within the same system?
11. **Scanner deployment**: How will the PWA scanner be distributed to event staff? Via URL only, or will there be a wrapper app?
12. **Template marketplace business model**: What is the revenue split between platform and template authors in Phase 3?
