# Project Memory

## Current Sprint
- Sprint 3: Users, Teams & RBAC (IAM) module.

## Architecture Summary
- Multi-tenant, API-first, plugin-oriented platform.
- Authentication implemented as first bounded module.
- Organizations module implements full multi-tenancy with tenant isolation.
- IAM module implements users, teams, roles, permissions, and DB-backed RBAC engine.
- External infrastructure consumed via configuration only.

## Tech Stack
- Node.js + Express (API + Web)
- PostgreSQL SQL migrations with version tracking (schema_migrations table)
- Docker / Docker Compose
- Coolify + Traefik deployment labels

## Folder Structure
- `apps/api`: API modules, middleware, migrations, repositories, services
- `apps/web`: auth, profile, organizations, users, teams, roles, and permissions UI pages
- `packages/core`: shared schemas, RBAC constants, response contracts
- `knowledge`: constitution, decisions, sprint context

## Active Modules
- Authentication
- Organizations & Multi-Tenancy
- Users, Teams & RBAC (IAM)

## Completed Modules
- Foundation scaffolding
- Authentication
- Organizations & Multi-Tenancy
- Users
- Teams
- RBAC

## Pending Modules
- Settings (user preferences)
- Dashboard
- AI Gateway
- Plugin runtime loader
- Worker orchestration
- Agents

## API Contracts
- Authentication endpoints are available under `/api/auth/*`.
- Organization endpoints are available under `/api/organizations/*`.
- User endpoints are available under `/api/users/*`.
- Team endpoints are available under `/api/teams/*`.
- Role endpoints are available under `/api/roles/*`.
- Permission list is available at `/api/roles/permissions`.
- Responses use a common `success/data/error` envelope.

## Database Summary
- Implemented auth schema tables:
  - `users` (extended with display_name, phone, job_title, department, employee_id, status, last_login)
  - `sessions`
  - `password_reset_tokens`
- Implemented organizations schema tables (migration 002):
  - `organizations` (extended with slug, status, billing, quota, timestamps)
  - `organization_members` (extended with title, status, joined_at, Guest role)
  - `invitations`
  - `audit_logs` (extended with resource column in migration 003)
  - `organization_settings`
- Implemented IAM schema tables (migration 003):
  - `teams` (with parent_team_id for nested hierarchy, archived_at for soft delete)
  - `team_members`
  - `roles` (system_role flag; Owner/Admin/Manager/User/Guest seeded)
  - `permissions` (21 permissions seeded across users/teams/iam/goals/projects/platform/settings/billing/security categories)
  - `role_permissions` (many-to-many; seeded per system role)
  - `user_preferences`
- Migration tracking: `schema_migrations` table (each migration runs exactly once)

## Permission Engine
- `apps/api/src/services/permissionService.js` provides `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, and `requirePermission` middleware factory.
- All IAM routes use DB-backed permission checks via `permService.requirePermission(PERMISSION.*)`.
- System roles (Owner/Admin/Manager/User/Guest) have predefined permission sets seeded in migration 003.
- Custom org-scoped roles can be created and assigned permissions via the roles API.

## Current Decisions
- See `/knowledge/DECISIONS.md` for all architectural and authentication decisions.
