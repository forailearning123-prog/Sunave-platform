# Current Task

## Sprint
- Sprint 3

## Module
- Settings

## Goal
- Implement user preferences, notification settings, and account settings module. Includes per-user and per-org preference storage, UI settings pages, and notification categories.

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

## Acceptance Criteria (Previous Sprint — IAM)
- [x] User Management (CRUD, status transitions, force logout)
- [x] Team Management (CRUD, archive/restore, nested hierarchy)
- [x] Nested Teams (multi-level parent_team_id tree)
- [x] Roles (system roles protected, custom org roles)
- [x] Permissions (21 seeded permissions across categories)
- [x] RBAC Engine (DB-backed permissionService with hasPermission/hasAnyPermission/hasAllPermissions)
- [x] Permission Middleware (requirePermission factory on all IAM routes)
- [x] Audit Logging (user.created, user.updated, user.suspended, role.assigned, team.created, team.member_added, etc.)
- [x] Responsive UI (/users, /users/detail, /teams, /teams/detail, /roles, /permissions)
- [x] Documentation Updated

## Next Module
- Dashboard
