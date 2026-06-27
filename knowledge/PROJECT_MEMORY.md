# Project Memory

## Current Sprint
- Sprint 9: CRM Platform (Epic 7)

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
- `packages/types`: TypeScript type definitions for all modules
- `knowledge`: constitution, decisions, sprint context

## Active Modules
- Authentication
- Organizations & Multi-Tenancy
- Users, Teams & RBAC (IAM)
- Settings & Configuration Engine
- Dashboard Framework
- AI Provider & Model Registry Platform
- AI Intelligence Platform (Memory, Knowledge, Context, Embeddings, Vector Store)
- Worker Platform
- Agent Platform (Prompts 20-24)
- Business Operating Platform (Epic 6)

## Completed Modules
- Foundation scaffolding
- Authentication
- Organizations & Multi-Tenancy
- Users
- Teams
- RBAC
- Settings & Configuration Engine
- Dashboard Framework
- AI Provider & Model Registry Platform (Prompts 11 & 12)
- AI Intelligence Platform (Prompts 15 & 16)
- Worker Platform (Prompts 17, 18 & 19)
- Agent Platform (Prompts 20-24)
- Business Operating Platform (Epic 6)

## Pending Modules
- Goal Management
- Conversation Platform & Prompt Library
- Plugin runtime loader
- Vision Processing
- Speech Processing

## API Contracts
- Authentication endpoints are available under `/api/auth/*`.
- Organization endpoints are available under `/api/organizations/*`.
- User endpoints are available under `/api/users/*`.
- Team endpoints are available under `/api/teams/*`.
- Role endpoints are available under `/api/roles/*`.
- Permission list is available at `/api/roles/permissions`.
- Dashboard endpoints are available under `/api/dashboard/*`.
- Settings endpoints are available under `/api/settings/*`.
- Feature flag endpoints are available at `/api/settings/feature-flags`.
- AI Provider & Model Registry endpoints are available under `/api/ai/*`:
  - `GET/POST/PUT/DELETE /api/ai/providers` — Provider CRUD
  - `GET/POST/PUT/DELETE /api/ai/models` — Model CRUD
  - `GET/POST/PUT /api/ai/capabilities` — Capability registry
  - `GET/PUT /api/ai/policies` — Routing policies
  - `GET /api/ai/health` — Health monitoring
  - `GET /api/ai/statistics` — Usage & cost statistics
  - `GET /api/ai/usage` — Token usage logs
  - `GET /api/ai/costs` — Cost tracking
  - `GET/POST/PUT/DELETE /api/ai/budgets` — Budget management
  - `POST /api/ai/providers/test` — Test provider connection
  - `POST /api/ai/providers/sync` — Sync provider models
  - `POST /api/ai/models/refresh` — Refresh all models
  - `POST /api/ai/test` — Gateway test
  - `POST /api/ai/estimate-cost` — Cost estimation
- AI Intelligence Platform endpoints are available under `/api/intelligence/*`:
  - `GET/POST /api/intelligence/memory` — Memory CRUD
  - `GET/PUT/DELETE /api/intelligence/memory/{id}` — Memory operations
  - `GET /api/intelligence/knowledge/search` — Knowledge search
  - `POST /api/intelligence/knowledge/index` — Index knowledge source
  - `POST /api/intelligence/knowledge/retrieve/{id}` — Retrieve knowledge
  - `POST /api/intelligence/embeddings` — Generate embeddings
  - `GET /api/intelligence/vector/health` — Vector store health
  - `POST /api/intelligence/context/build` — Build context
  - `POST /api/intelligence/search` — Semantic/keyword search
  - `GET /api/intelligence/memory/stats` — Memory statistics
  - `GET /api/intelligence/knowledge/stats` — Knowledge statistics
  - `GET /api/intelligence/embeddings/stats` — Embedding statistics
  - `GET /api/intelligence/context/stats` — Context statistics
- Agent Platform endpoints are available under `/api/agents/*`:
  - `GET/POST/PUT/DELETE /api/agents` — Agent CRUD
  - `GET/POST/PUT/DELETE /api/agents/:id/workers` — Worker management
  - `GET/POST /api/agents/:id/policies` — Policy management
  - `GET/POST /api/agents/:id/memory` — Memory references
  - `GET/POST /api/agents/:id/executions` — Execution management
  - `GET/POST/PUT /api/agents/:id/goals` — Goal management
  - `GET/POST/PUT /api/agents/:id/tasks` — Task management
  - `GET /api/agents/:id/decisions` — Decision tracking
  - `GET/POST /api/agents/:id/delegations` — Delegation management
  - `GET /api/agents/:id/approvals` — Approval workflows
  - `GET/POST/PUT/DELETE /api/agents/templates` — Template management
  - `GET/POST /api/agents/marketplace` — Marketplace operations
  - `GET/POST /api/agents/:id/collaborations` — Collaboration management
- Worker Platform endpoints are available under `/api/workers/*` and `/api/workflows/*`.
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
- Implemented AI Provider & Model Registry tables (migration 007):
  - `ai_models` — Model registry with capability flags, cost estimation, status
  - `ai_capabilities` — Master capability list (17 system capabilities seeded)
  - `ai_model_capabilities` — Model ↔ Capability mapping
  - `ai_usage` — Aggregated usage tracking (daily/weekly/monthly/yearly)
  - `ai_token_usage` — Granular per-request token and cost tracking
  - `ai_cost_summary` — Cost summaries per period
  - `ai_budgets` — Budget configuration with alerting
- Implemented AI Intelligence Platform tables (migration 009):
  - `memories` — Multi-type memory store (10 types, importance levels, retention policies)
  - `knowledge_sources` — Knowledge base sources with indexing status
  - `chunks` — Document chunks with chunking strategies
  - `chunk_metadata` — Key-value metadata for chunks
  - `embeddings` — Vector embeddings with pgvector support
  - `embedding_providers` — Embedding provider configuration (local, OpenAI, Gemini, etc.)
  - `vector_indices` — Vector index management (6 backends supported)
  - `contexts` — Context assembly with budget tracking
  - `retrieval_logs` — Retrieval operation audit trail
  - `search_logs` — Search operation audit trail
  - `memory_policies` — Retention and importance policies (9 system policies seeded)
  - `knowledge_categories` — Hierarchical knowledge categorization (10 system categories)
- Implemented Worker Platform tables (migration 010):
  - `workers` — Worker definitions with versioning and dependencies
  - `worker_versions` — Version history for workers
  - `worker_dependencies` — Worker dependency management
  - `worker_executions` — Worker execution tracking
  - `workflows` — Workflow definitions
  - `workflow_steps` — Workflow step definitions
  - `workflow_connections` — Step connections and flow
  - `workflow_executions` — Workflow execution tracking
  - `workflow_templates` — Pre-built workflow templates (9 system templates)
  - `schedules` — Scheduling framework (once, hourly, daily, weekly, monthly, cron)
  - `marketplace_items` — Worker marketplace
  - `worker_ratings` — Worker rating system
  - `execution_logs` — Detailed execution logging
- Implemented Agent Platform tables (migration 011):
  - `agents` — Agent registry with full configuration
  - `agent_templates` — Agent templates (7 system templates seeded)
  - `agent_executions` — Agent execution tracking
  - `agent_goals` — Goal management
  - `agent_tasks` — Task management with worker assignment
  - `agent_workers` — Worker assignments for agents
  - `agent_decisions` — Decision tracking and approval
  - `agent_delegations` — Delegation management
  - `agent_approvals` — Approval workflows
  - `agent_memory_references` — Memory integration
  - `agent_analytics` — Daily analytics aggregation
  - `agent_policies` — Agent policies (cost, execution, security, approval, escalation, resource)
  - `agent_marketplace_items` — Agent marketplace
  - `agent_collaborations` — Agent collaboration tracking
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
