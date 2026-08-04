# AI Agent Instructions

## 1. Codebase Inspection
Before generating or modifying code, the AI agent must:
- Inspect the existing project structure.
- Search for existing implementations before creating new ones.
- Treat the existing source code as the primary source of truth.
- Reuse utilities, components, services, and helpers whenever possible.

Inspection priority:
1. Existing source code
2. Shared libraries
3. Project configuration
4. Environment variables
5. Tests
6. Documentation

---

## 2. General Development Principles
- Produce production-ready code.
- Avoid overengineering.
- Minimize duplication.
- Follow the existing architecture.
- Follow established naming conventions.
- Do not introduce breaking changes unless explicitly requested.
- DO NOT over-engineer, keep it as simple as possible.
- If you found any gap or miss, don't assume or take initiative. It's better to do a verification with me

---

## 3. Frontend Standards
### Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Components
- Prefer functional components.
- Prefer Server Components where possible.
- Use Client Components only when necessary.
- Avoid unnecessary prop drilling.
- Avoid inline styles.

### TypeScript
- Enable strict typing.
- Avoid `any`.
- Prefer `type` and `interface` appropriately.
- Use utility types such as `Readonly`, `Record`, `Partial`, `Pick`, and `Omit`.

### React
- Use `useMemo` and `useCallback` only when they provide measurable value.
- Use Suspense and Error Boundaries where appropriate.

### Next.js
- Follow the App Router architecture.
- Prefer:
  1. Server Components
  2. Server Actions
  3. Client Components
- Use Route Handlers for APIs.

### UI
- Reuse shadcn/ui components whenever possible.
- Use Tailwind CSS utilities instead of custom CSS where practical.

---

## 4. Backend Standards

### Framework
NestJS

### Guidelines
- Follow the Module → Controller → Service architecture.
- Use dependency injection.
- Keep business logic inside services.
- Controllers should only coordinate requests and responses.

---

## 5. API Standards
Every endpoint should include:
- Input validation
- Authentication
- Authorization
- Exception handling
- Structured logging

Use DTOs, ValidationPipe, class-validator, and class-transformer.

---

## 6. Database Standards
Database: PostgreSQL
- Use migrations for schema changes.
- Avoid manual schema modifications.
- Prefer ORM over raw SQL unless necessary.
- Add indexes for foreign keys, unique fields, and frequently queried columns.

---

## 7. Cache
Redis should be used for:
- Session storage
- Frequently accessed data
- Expensive query results
- Rate limiting

Avoid caching sensitive information unnecessarily.

---

## 8. Queue
BullMQ should be used for:
- Email
- Notifications
- Image processing
- PDF generation
- Webhook retries

Jobs should be idempotent, retryable, and properly logged.

---

## 9. Storage
Cloudflare R2
- Store files in object storage.
- Store only metadata and object references in the database.

---

## 10. Image Processing
Sharp
- Resize images.
- Compress images.
- Prefer modern formats such as WebP or AVIF when supported.

---

## 11. PDF Generation
Puppeteer
- Generate PDFs from HTML templates.
- Avoid manually constructing PDFs.

---

## 12. Authentication
Better Auth / Auth.js
- Authenticate every protected endpoint.
- Authorize access explicitly.
- Never trust client-provided authorization data.

---

## 13. Security
Always:
- Validate input.
- Sanitize data where appropriate.
- Use parameterized queries.
- Store secrets in environment variables.
- Never hardcode credentials.

---

## 14. Logging
Use structured logging.

Include:
- Timestamp
- Log level
- Request ID
- User ID (if available)
- Action
- Error details

Never log passwords, tokens, secrets, or API keys.

---

## 15. Error Handling
- Throw meaningful exceptions.
- Avoid generic errors.
- Return consistent error responses.

---

## 16. Testing
Minimum expectations:
- Unit tests
- Integration tests

Critical flows should always be tested, including authentication, authorization, uploads, and payment-related functionality.

---

## 17. Docker
All services should support Docker deployment.

Use:
- Multi-stage builds
- `.dockerignore`
- Health checks

---

## 18. Deployment
Supported targets:
- Cloudflare
- Vercel
- VPS
- Docker

Do not tightly couple the application to a single deployment platform.

---

## 19. Code Review Checklist
Before considering work complete:
- No duplicate code
- No unnecessary dependencies
- No `console.log`
- No dead code
- No commented-out code
- Strong typing maintained
- Endpoints validated
- Errors handled
- No hardcoded credentials
- Project conventions followed

---

## 20. AI Agent Rules
1. Search before creating new code.
2. Reuse existing implementations whenever possible.
3. Follow the project's architecture.
4. Do not introduce architectural changes unless requested.
5. Explain trade-offs when multiple solutions exist.
6. Produce production-ready code.
7. Minimize new dependencies.
8. Preserve backward compatibility unless instructed otherwise.
9. Prefer readability over cleverness.
10. Generate code that is ready for code review and pull requests.
