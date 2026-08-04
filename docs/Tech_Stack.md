# Tech Stack

## Repository
- Monorepo (pnpm workspaces)
- `apps/frontend` — Next.js
- `apps/backend` — NestJS
- `packages/shared` — shared types, DTOs, validation schemas

---

## Frontend
- Next.js (App Router)
- React
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui
- lucide-react (icons)
- next-intl (i18n)
- Vitest (testing)

---

## Backend
- NestJS
- Jest (testing)
- Supertest (integration testing)

---

## Database
- PostgreSQL
- Drizzle ORM
- drizzle-kit (push migrations)

---

## Cache
- Redis
- ioredis

---

## Queue
- BullMQ (not used in MVP, prepared for Phase 2+)

---

## Storage
- Cloudflare R2

---

## Image Processing
- Sharp
- Synchronous in request (not via queue in MVP)

---

## PDF
- Puppeteer

---

## Authentication
- Better Auth
- Drizzle adapter

---

## Deployment
- Next.js → Vercel (edge, CDN, ISR)
- NestJS, PostgreSQL, Redis → VPS (Docker Compose)

---

## Design Systems
Three separate design systems by context:

1. **Landing Page** → Design_System.md (custom tokens)
2. **Dashboard (admin, customer, scanner)** → shadcn/ui + Tailwind
3. **Public Invitation** → Custom HTML/CSS/JS (from admin-created templates)

---

## Development Rules
UI
- Dashboard: always use shadcn/ui, don't build components that already exist.
- Landing: follow Design_System.md tokens.
- Public invitation: render raw HTML template, don't use shadcn/ui.
- Use lucide-react for icons.

Styling
- Tailwind CSS only (for dashboard).
- Prefer utility classes over custom CSS.

TypeScript
- Strict mode.
- Never use `any`.
- Prefer `type` over `interface` unless extension is required.

General
- Reuse existing libraries before adding dependencies.
- Prefer Server Components when appropriate.
- Keep business logic outside UI components.