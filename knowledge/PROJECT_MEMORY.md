# Project Memory

## Current Sprint
- Sprint 6: AI Gateway & Provider Management.

## Architecture Summary
- Multi-tenant, API-first, plugin-oriented platform.
- Authentication implemented as first bounded module.
- Organizations module implements full multi-tenancy with tenant isolation.
- IAM module implements users, teams, roles, permissions, and DB-backed RBAC engine.
- External infrastructure consumed via configuration only.
- AI Gateway abstraction layer: all AI capability requests go through the gateway — never directly to providers.

## Tech Stack
- Node.js + Express (API + Web)
- PostgreSQL SQL migrations with version tracking (schema_migrations table)
- Docker / Docker Compose
- Coolify + Traefik deployment labels

## Folder Structure
- `apps/api`: API modules, middleware, migrations, repositories, services
- `apps/web`: auth, profile, organizations, users, teams, roles, permissions, settings, goals, projects, tasks, admin/ai UI pages
- `packages/core`: shared schemas, RBAC constants, response contracts
- `knowledge`: constitution, decisions, sprint context

## Active Modules
- Authentication
- Organizations & Multi-Tenancy
- Users, Teams & RBAC (IAM)
- Settings & Configuration Engine
- Goal Management & Project Workspace
- AI Gateway & Provider Management

## Completed Modules
- Foundation scaffolding
- Authentication
- Organizations & Multi-Tenancy
- Users
- Teams
- RBAC
- Settings & Configuration Engine
- Goal Management & Project Workspace
- AI Gateway (Prompt 9)
- AI Provider Management (Prompt 10)

## Pending Modules
- Dashboard
- AI Model Registry
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
- Settings endpoints are available under `/api/settings/*`.
- Feature flag endpoints are available at `/api/settings/feature-flags`.
- Goals endpoints are available under `/api/goals/*`.
- Projects endpoints are available under `/api/projects/*`.
- Tasks endpoints are available under `/api/tasks/*`.
- AI Gateway endpoints are available under `/api/ai/*`:
  - `GET /api/ai/providers` — list all providers with health summary
  - `GET /api/ai/health` — gateway-level health check (updates DB)
  - `GET /api/ai/models` — list all available models
  - `GET /api/ai/capabilities` — capability map and routing policies
  - `POST /api/ai/test` — test gateway with mock capability request
  - `POST /api/ai/estimate-cost` — estimate cost for capability
  - `POST /api/ai/providers` — create provider (admin)
  - `PUT /api/ai/providers/:id` — update provider (admin)
  - `DELETE /api/ai/providers/:id` — delete provider (admin)
  - `GET /api/ai/providers/:id` — provider detail + capabilities + credential names
  - `GET /api/ai/providers/:id/health` — health history
  - `PUT /api/ai/providers/:id/capabilities` — update capability matrix (admin)
  - `POST /api/ai/providers/test` — test provider connection (admin)
  - `POST /api/ai/providers/sync-models` — sync model list (admin)
  - `GET /api/ai/policies` — routing policies for current org
  - `POST /api/ai/credentials/:providerId` — store/rotate credential (admin)
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
- Implemented Goals & Projects schema tables (migration 005):
  - `goals`, `projects`, `milestones`, `tasks`, `task_labels`, `task_label_assignments`
  - `comments`, `attachments`, `activities`, `dependencies`
- Implemented AI Gateway schema tables (migration 006):
  - `ai_providers` (name, type, encrypted API key, enabled, priority, is_default, capability flags, health_status)
  - `ai_provider_health` (time-series: availability, latency_ms, success_rate, failures, checked_at)
  - `ai_provider_configuration` (per-org overrides, JSONB settings)
  - `ai_provider_capabilities` (detailed capability matrix per provider)
  - `ai_provider_policies` (routing policies: lowest_cost, highest_quality, fastest, local_first, cloud_first, org_override)
  - `ai_provider_credentials` (AES-256-GCM encrypted named credential store with rotation support)
  - Seeded: Sunave Local provider (default, priority 1) + global local_first routing policy
- Migration tracking: `schema_migrations` table (each migration runs exactly once)

## Permission Engine
- `apps/api/src/services/permissionService.js` provides `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, and `requirePermission` middleware factory.
- All IAM routes use DB-backed permission checks via `permService.requirePermission(PERMISSION.*)`.
- System roles (Owner/Admin/Manager/User/Guest) have predefined permission sets seeded in migration 003.
- Custom org-scoped roles can be created and assigned permissions via the roles API.
- AI admin routes use `permService.requirePermission('platform.manage')`.

## Configuration Engine
- `apps/api/src/services/configurationService.js` is the single source of truth for all configurable settings.
- Resolution hierarchy: User preference → Organization setting → System default → Application default.
- Provides typed accessors: `getBoolean`, `getNumber`, `getString`, `getObject`, `getArray`.
- In-memory cache with configurable TTL; `invalidate(pattern)` for targeted invalidation.
- `apps/api/src/repositories/settingsRepository.js` handles DB access for system_settings, user_preferences, feature_flags.

## AI Gateway
- `apps/api/src/services/aiGatewayService.js` is the ONLY entry point for AI capability requests.
- Business modules call `gateway.chat(capability, messages, context)` — never providers directly.
- Supported capabilities: reasoning, coding, vision, speech, translation, ocr, embeddings, summarization, planning, classification, extraction, generation, function_calling, chat.
- Routing policies: lowest_cost, highest_quality, fastest, local_first (default), cloud_first, org_override.
- Mock provider stubs implemented for: sunave_local, openai, anthropic, gemini, vertex_ai, azure_openai, openrouter, litellm, ollama.
- Health monitoring: `gateway.health()` runs checks, updates DB records, auto-disables unhealthy providers.
- `apps/api/src/services/credentialService.js` provides AES-256-GCM encryption for all provider credentials.

## Current Decisions
- See `/knowledge/DECISIONS.md` for all architectural and authentication decisions.


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

## Completed Modules
- Foundation scaffolding
- Authentication
- Organizations & Multi-Tenancy
- Users
- Teams
- RBAC
- Settings & Configuration Engine

## Pending Modules
- Dashboard
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
