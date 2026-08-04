# Definition of Done
A feature is considered complete only if all items below are satisfied.

---

# Functional
- Requirements implemented
- Business rules followed
- No placeholder logic
- No TODO left behind

---

# Code Quality
- Production-ready
- No duplicate code
- No dead code
- No commented code
- Strong typing maintained
- No any unless justified

---

# Architecture
- Follows project architecture
- Reuses existing modules
- No unnecessary dependencies

---

# Security
- Authentication implemented
- Authorization verified
- Validation added
- Tenant isolation verified

---

# Database
- Migration included (if needed)
- Indexes reviewed
- No destructive schema changes

---

# Testing
- Backend: Jest + Supertest (integration test)
- Frontend: Vitest
- Critical flows only di MVP

Minimum:
- Unit Test
- Integration Test (critical flows)

Critical flows:
- Authentication
- Publish
- Guest CRUD
- RSVP
- QR Check-in

---

# Performance
- No unnecessary re-render
- No N+1 query
- Images optimized
- Lazy loading where appropriate

---

# Documentation
Update documentation if:
- API changes
- Schema changes
- Environment variables change
- Business rules change

---

# Review Checklist
Before merge:
- Lint passes
- Type check passes
- Tests pass
- Build succeeds
- No console.log
- No secrets
- Ready for code review