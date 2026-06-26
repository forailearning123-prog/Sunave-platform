# Coding Standards

## Architecture

- API-first contracts and response consistency
- Plugin-capable modular boundaries
- Tenant-safe design for all persisted entities
- Capability-based AI integrations (outside auth scope)

## Authentication Rules

- Email/password only for current auth module
- Never store plaintext passwords
- Use shared validation schemas from `packages/core`
- Use RBAC middleware for authorization decisions

## Security

- Secure cookie handling
- CSRF checks on state-changing authenticated endpoints
- Rate limit sensitive auth routes
- Never expose stack traces or internal errors in responses

## Quality

- Add unit and API tests for behavior changes
- Keep business-domain modules out of authentication scope
- Document decisions in `knowledge/DECISIONS.md`
