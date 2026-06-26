# Project Memory

## Current Sprint
- Sprint 4: Dashboard Framework module.

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
- Settings & Configuration Engine
- Dashboard Framework

## Completed Modules
- Foundation scaffolding
- Authentication
- Organizations & Multi-Tenancy
- Users
- Teams
- RBAC
- Settings & Configuration Engine
- Dashboard Framework

## Pending Modules
- Goal Management
- AI Gateway
- AI Providers
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
- Dashboard endpoints are available under `/api/dashboard/*`.
  - `GET /api/dashboard` — full config (widgets + layout + preferences)
  - `GET /api/dashboard/widgets` — widget registry (supports ?category= and ?enabled= filters)
  - `GET /api/dashboard/widgets/:id` — single widget definition
  - `POST /api/dashboard/layout` — save a layout
  - `PUT /api/dashboard/layout` — update active layout
  - `PUT /api/dashboard/layout/reset` — restore default layout
  - `GET /api/dashboard/preferences` — user dashboard preferences
  - `PUT /api/dashboard/preferences` — update preferences
  - `GET /api/dashboard/data/:providerKey` — fetch mock provider data
- Settings endpoints are available under `/api/settings/*`.
- Feature flag endpoints are available at `/api/settings/feature-flags`.
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
- Implemented Settings schema tables (migration 004):
  - `system_settings` (global defaults per category; 17 categories seeded)
  - `feature_flags` (10 flags seeded; boolean/percentage/org_rollout/role_rollout types)
  - `feature_flag_assignments` (org/role/user-scoped flag overrides)
  - `configuration_cache` (persistent cache layer for future Redis companion)
- Migration tracking: `schema_migrations` table (each migration runs exactly once)

## Permission Engine
- `apps/api/src/services/permissionService.js` provides `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, and `requirePermission` middleware factory.
- All IAM routes use DB-backed permission checks via `permService.requirePermission(PERMISSION.*)`.
- System roles (Owner/Admin/Manager/User/Guest) have predefined permission sets seeded in migration 003.
- Custom org-scoped roles can be created and assigned permissions via the roles API.

## Configuration Engine
- `apps/api/src/services/configurationService.js` is the single source of truth for all configurable settings.
- Resolution hierarchy: User preference → Organization setting → System default → Application default.
- Provides typed accessors: `getBoolean`, `getNumber`, `getString`, `getObject`, `getArray`.
- In-memory cache with configurable TTL; `invalidate(pattern)` for targeted invalidation.
- `apps/api/src/repositories/settingsRepository.js` handles DB access for system_settings, user_preferences, feature_flags.

## Current Decisions
- See `/knowledge/DECISIONS.md` for all architectural and authentication decisions.
