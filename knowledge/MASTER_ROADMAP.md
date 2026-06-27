# Master Roadmap

## Prompt 1 — Foundation ✅
- Docker-first monorepo scaffold
- apps/api, apps/web, packages/core
- Coolify / Traefik deployment manifests

## Prompt 2 — Authentication ✅
- Email + password authentication
- Access token + refresh token cookie model
- Password reset, session management, CSRF protection
- First-login onboarding (org name, industry, country)

## Prompt 3 — Organizations & Multi-Tenancy ✅
- Organizations CRUD with archive/restore
- Multi-org membership, invitations
- Organization settings (JSONB per category, UPSERT)
- Audit logs, org context cookie

## Prompt 4 — Users, Teams & RBAC (IAM) ✅
- Users management (profile, status, soft delete)
- Teams with nested hierarchy (parent_team_id)
- Roles (system + custom org-scoped)
- Permissions (21 seeded, DB-backed RBAC engine)
- user_preferences table (org-scoped)

## Prompt 5 — Settings & Configuration Engine ✅
- Configuration resolution hierarchy (user → org → system → app default)
- system_settings, feature_flags, feature_flag_assignments tables
- Feature flags: boolean / percentage / org_rollout / role_rollout
- In-memory cache with TTL and targeted invalidation
- Settings API: /api/settings/system, /organization, /user, /feature-flags

## Prompt 6 — Executive Dashboard Framework ✅
- DashboardRegistry (registerWidget, removeWidget, getWidgets, getWidget)
- DashboardDataProvider base class + 6 mock provider implementations
- Layout Engine (move, resize, hide, pin, restoreDefaults, drag-and-drop)
- Layout persistence via localStorage per user
- 10 placeholder widgets with mock data (executive-summary, goals-overview, projects-overview, recent-activity, notifications, system-health, ai-status, worker-status, storage-usage, org-overview)
- Executive dashboard HTML shell (header, sidebar, KPI cards, AI banner, quick actions)
- Widget Catalog page (/dashboard/widgets)
- Dashboard Settings page (/dashboard/settings)
- API: GET/POST/PUT /api/dashboard/* (widgets, layout, preferences, data providers)
- Responsive 12-column CSS grid, dark executive palette, animation system
- Documentation updated

## Prompt 7 — Goal Management (Planned)
- Goal CRUD (create, update, archive, delete)
- Goal types: outcome, output, initiative
- Milestones and key results
- Goal assignments (users, teams)
- Progress tracking and reporting
- Goal widget integration with dashboard registry

## Prompt 8 — Projects (Planned)
## Prompt 9 — AI Gateway (Completed in Prompts 9 & 10)
## Prompt 10 — AI Provider & Model Registry ✅
- Provider Registry (CRUD, types, capability flags, credential encryption)
- Model Registry (CRUD, capability flags, status, cost estimation, external ID sync)
- Capability Registry (17 system capabilities, categories, provider mapping)
- Routing Policies (15 policy types, global seeds, org overrides)
- Model Discovery (sync, refresh, upsert by external ID)
- Health Monitoring (time-series health tracking, auto-disable unhealthy)
- Usage & Cost Tracking (per-request, aggregated, monthly cost summaries, budgets)
- AI Administration Portal (9 pages: overview, providers, models, capabilities, policies, health, usage, costs, settings)
- Dashboard Widgets (provider health, top models, capability usage, recent failures)
- Migration 007 (new tables: ai_models, ai_capabilities, ai_model_capabilities, ai_usage, ai_token_usage, ai_cost_summary, ai_budgets)

## Prompt 11 — Conversation Platform & Prompt Library ✅
## Prompt 12 — Finance (Planned)
## Prompt 13 — HR (Planned)
## Prompt 14 — CRM (Planned)
## Prompt 15 & 16 — AI Intelligence Platform ✅
- Memory Engine (10 memory types: working, conversation, session, long-term, knowledge, organization, user, project, goal, agent)
- Knowledge Retrieval system with unified interface
- Embedding Framework (local, OpenAI, Gemini, Vertex, Ollama)
- Vector Store abstraction (pgvector, Qdrant, Pinecone, Weaviate, Chroma, Redis)
- Semantic Search (similarity, hybrid, keyword, metadata, filtered)
- Context Builder with window budget management
- Document Intelligence (chunking engine: fixed, semantic, sliding window, hierarchical)
- Context Cache with TTL and invalidation
- Intelligence Dashboard with stats and monitoring
- Migration 009 (12 new tables: memories, knowledge_sources, chunks, embeddings, embedding_providers, vector_indices, contexts, retrieval_logs, search_logs, memory_policies, knowledge_categories, chunk_metadata)
- API: /api/intelligence/* (memory, knowledge, embeddings, vector, context, search)
- Frontend: /intelligence/* (overview, memory, search, context, knowledge, vector, admin)

## Prompt 17, 18 & 19 — Worker Platform ✅
- Worker Registry (CRUD, versioning, dependencies, search, filter, tag)
- Worker Runtime interface (validate, prepare, execute, retry, cancel, resume, pause, complete, fail, cleanup)
- Worker Definitions with 15 categories and 7 execution modes
- Worker Parameters (15 input types, 12 output types)
- Worker Validation framework
- Worker Execution Framework with execution history
- Workflow Engine (sequential, parallel, conditional, loop, retry, delay, approval, webhook, manual, merge)
- Workflow Designer with steps and connections
- Workflow Runtime with execution tracking
- Workflow Templates (9 system templates: document processing, research, meeting summary, email automation, knowledge update, project reporting, goal review, task review, customer support)
- Worker Marketplace (browse, search, install, rate, favorite, version history)
- Worker Versioning system
- Execution History (worker and workflow executions, logs, metrics)
- Scheduling Framework (once, hourly, daily, weekly, monthly, cron)
- Dashboard Widgets (worker status, workflow status, recent executions, popular workers, marketplace, execution success rate, workflow health)
- Migration 010 (13 tables: workers, worker_versions, worker_dependencies, worker_executions, workflows, workflow_steps, workflow_connections, workflow_executions, workflow_templates, schedules, marketplace_items, worker_ratings, execution_logs)
- API: /api/workers/* and /api/workflows/* (complete CRUD + execution + marketplace + schedules)
- Frontend: /workers, /workflows, /marketplace (with full UI and styling)
- Documentation updated
