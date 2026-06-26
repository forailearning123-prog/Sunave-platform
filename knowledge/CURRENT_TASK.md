# Current Task

## Sprint
- Sprint 2

## Module
- Organizations & Multi-Tenancy (Complete)

## Goal
- Implement full multi-tenant organization module: CRUD, membership, invitations, tenant middleware, settings, audit logging.

## Allowed Files
- `apps/api/**`
- `apps/web/**`
- `packages/core/**`
- `docs/**`
- `.env.example`
- `docker-compose*.yml`
- `knowledge/PROJECT_MEMORY.md`
- `knowledge/CURRENT_TASK.md`
- `knowledge/DECISIONS.md`

## Out-of-Scope Files
- Workers, AI, agents, goals, dashboard business modules, marketplace modules, and unrelated plugin implementations.

## Acceptance Criteria
- [x] Organizations CRUD (create, read, update, archive, restore)
- [x] Multi-Tenant Architecture (requireOrg middleware, tenant isolation)
- [x] Organization Switcher (POST /switch, current_org_id cookie)
- [x] Member Management (list, update, remove)
- [x] Invitations (send, accept, list)
- [x] Middleware (requireOrg, requireOrgPermission)
- [x] Organization Settings (CRUD per category)
- [x] Audit Logging (created, updated, archived, restored, member events, invitation events)
- [x] Tests (28 API tests including multi-tenant isolation)
- [x] Documentation Updated

## Next Module
- Users & Teams
