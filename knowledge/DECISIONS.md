# Architecture Decisions Log

## 2026-06-26 - Foundation Decisions

1. **Ollama remains an external service.**
   - Rationale: keep compute lifecycle independent from app deployments.

2. **STT and TTS are external platform services.**
   - Rationale: avoid embedding media infrastructure in core apps.

3. **AI Gateway owns provider/model selection.**
   - Rationale: centralize AI provider routing and fallback policy.

4. **Workers request capabilities, not model names.**
   - Rationale: decouple business logic from model/provider churn.

5. **Docker-first deployment is mandatory.**
   - Rationale: ensure reproducible environments and delivery parity.

6. **Coolify is the deployment platform.**
   - Rationale: standardize deployment and Traefik-based routing.

## 2026-06-26 - Authentication Decisions

1. **Authentication method is email + password only.**
   - Rationale: intentionally simple and production-ready baseline.

2. **Access token + refresh token cookie model is used.**
   - Rationale: short-lived access tokens with revocable persistent sessions.

3. **Refresh tokens are stored as SHA-256 hashes in the database.**
   - Rationale: prevent raw token exposure if persistence is compromised.

4. **CSRF protection uses double-submit token checks.**
   - Rationale: protect state-changing cookie-authenticated requests.

5. **First login without organization requires minimal onboarding (name, industry, country).**
   - Rationale: satisfy scope with tenant bootstrap and owner assignment.

6. **RBAC checks are centralized in middleware using shared role/permission contracts.**
   - Rationale: avoid page-level permission hardcoding and maintain policy consistency.

## 2026-06-26 - IAM (Users, Teams & RBAC) Decisions

1. **Permission checks are DB-backed via a centralized permission service.**
   - Rationale: permissions must never be hardcoded in application logic. The `role_permissions` table is the single source of truth; changing a role's permissions requires no code changes.

2. **System roles (Owner/Admin/Manager/User/Guest) are seeded in migration 003 with fixed UUIDs.**
   - Rationale: deterministic UUIDs allow idempotent migrations and foreign-key referencing. System roles are flagged `system_role = true` and cannot be deleted or modified via the API.

3. **Custom roles are organization-scoped; system roles have `organization_id = NULL`.**
   - Rationale: organizations can create their own roles (e.g., "Engineer", "Support Lead") without conflicting with platform-wide system roles. Role listing returns both system roles and org-specific roles for a given org.

4. **Teams support unlimited nesting via `parent_team_id` self-reference.**
   - Rationale: organizations need to model real-world hierarchies (Company → Division → Department → Squad). The tree is built client-side from a flat query to avoid recursive SQL for pg-mem compatibility.

5. **Teams use soft delete (archived_at timestamp) rather than hard delete.**
   - Rationale: consistent with organizations (archive/restore pattern). Data preservation and audit integrity are maintained. Hard delete is also available for complete removal.

6. **`DELETE /api/users/:id` soft-deletes (sets status = 'archived') rather than dropping the row.**
   - Rationale: user data must be preserved for audit logs, team history, and organization membership records. Hard deletion would break referential integrity with audit_logs.

7. **Permission middleware (`requirePermission`) is async and queries the DB on every request.**
   - Rationale: permissions must be dynamic — changing a role's permissions in the DB takes effect immediately without requiring a server restart or cache invalidation.

8. **The existing static `hasPermission` from `@sunave/core` is retained for legacy routes (organizations, auth).**
   - Rationale: backward compatibility without regressions. New IAM routes use the DB-backed service. A future refactor could unify both.

9. **`user_preferences` table is always organization-scoped (`organization_id NOT NULL`).**
   - Rationale: global user preferences (timezone, language) are stored in the `users` table directly. Organization-specific preferences (notification settings, dashboards) belong in `user_preferences` and require org context.

10. **Audit log `resource` column added to record the specific entity affected.**
    - Rationale: allows filtering audit logs by entity (e.g., `user:uuid`, `team:uuid`, `role:uuid`) without parsing JSON metadata fields.


1. **Active organization is stored in a `current_org_id` httpOnly cookie.**
   - Rationale: stateless approach that avoids modifying access tokens on every org switch. The cookie persists across requests without requiring a new JWT.

2. **Multi-tenant middleware (`requireOrg`) resolves org context from cookie, falling back to the user's first active membership.**
   - Rationale: seamless UX for users belonging to one org; explicit switcher for multi-org users.

3. **Organization role permissions are enforced via `requireOrgPermission` using `req.org.role`, not the JWT `req.auth.role`.**
   - Rationale: a user may have different roles in different organizations. The JWT role is only used for profile-level operations.

4. **No permanent deletion of organizations — archive/restore only.**
   - Rationale: data preservation and audit integrity; matches business requirement.

5. **Invitation tokens are UUID pairs stored as SHA-256 hashes, matching the password reset pattern.**
   - Rationale: consistency with existing token security model.

6. **Invitations automatically allow re-invite by replacing pending invitations for the same email+org.**
   - Rationale: simplifies UX when an invitation expires and needs to be resent.

7. **Organization settings use JSONB per category with UPSERT semantics.**
   - Rationale: flexible, schema-free settings storage that can grow per category without migrations.

8. **Audit logs use fire-and-forget inserts (failures are silently swallowed).**
   - Rationale: audit log failure must never break the primary business flow.

9. **Migration versioning table (`schema_migrations`) tracks applied migrations.**
   - Rationale: each migration file runs exactly once, enabling incremental schema evolution without idempotency hacks in DDL.

10. **`Guest` role added to initial CHECK constraint in `001_auth.sql` (not via ALTER TABLE in 002).**
    - Rationale: pg-mem (test in-memory DB) does not support named inline CHECK constraint modification. Since the project has no production database yet, updating the original migration is acceptable and cleaner than workarounds.

## 2026-06-26 - Settings & Configuration Engine Decisions

1. **Configuration resolution hierarchy is user → org → system → app default.**
   - Rationale: user preferences override organizational defaults, which override system defaults, which override hardcoded application defaults. This supports full multi-tenant customization while always providing safe fallbacks without null-checks scattered across the codebase.

2. **`system_settings` table uses JSONB per category (same pattern as `organization_settings`).**
   - Rationale: consistent with the existing organization settings pattern. Schema-free JSONB per category allows each settings domain to evolve independently without migrations.

3. **All configuration access goes through `configurationService` — no direct DB queries for settings.**
   - Rationale: enforces the single source of truth principle. The service owns resolution, caching, and cache invalidation. Direct DB queries would bypass caching and break hierarchy resolution.

4. **In-memory Map cache with TTL; Redis support deferred.**
   - Rationale: Redis is an external infrastructure dependency. An in-memory cache is sufficient for single-instance deployments and satisfies the caching requirement without adding operational complexity now. The `cache()` and `invalidate()` API is designed to be backend-agnostic for future Redis migration.

5. **Feature flags support boolean, percentage, org_rollout, and role_rollout types.**
   - Rationale: covers the full range of controlled rollout strategies. Boolean flags are the common case; percentage and assignment scopes support gradual rollout and org/role-specific access without code changes.

6. **Feature flag org/role overrides are stored in `feature_flag_assignments` (separate table, not merged into `feature_flags`).**
   - Rationale: keeps the global flag state clean and queryable. Assignments are a sparse override layer; the base flag is the source of truth and assignments are applied at resolution time.

7. **User preferences are always organization-scoped (inheriting the existing `user_preferences` table constraint).**
   - Rationale: consistent with IAM decision #9. A user in two organizations may have different notification preferences per org. Global appearance preferences (theme) are stored under the active org context.

8. **Settings API routes live under `/api/settings/*` (not split across multiple top-level prefixes).**
   - Rationale: a single router mount keeps the settings domain cohesive. Feature flags at `/api/settings/feature-flags` is consistent with the module boundary rather than a separate top-level prefix.

9. **`configurationService` is injected into the settings router — no singleton.**
   - Rationale: follows the established dependency injection pattern used by all other routers. Avoids global mutable state and makes testing straightforward.

## 2026-06-26 - AI Gateway Decisions (Prompts 9 & 10)

1. **All AI capability requests go through `aiGatewayService` — never directly to providers.**
   - Rationale: enforces the CONSTITUTION rule "No Hardcoded AI Model Names" and "Capability-Based AI Requests". Business modules are permanently decoupled from provider/model churn. Swapping providers requires zero code changes in business logic.

2. **Capabilities are requested by name (e.g., `'reasoning'`, `'vision'`), not by model name.**
   - Rationale: directly implements CONSTITUTION §8. This allows the gateway to route to the best available provider for each capability, and enables future A/B testing and cost optimization without touching business code.

3. **All 9 provider stubs return mock responses — no real AI calls in this module.**
   - Rationale: the gateway abstraction and all interfaces are production-ready. Real API integration is gated behind provider enablement and key configuration. Shipping mock-first avoids provider-specific bugs blocking the platform build.

4. **Provider credentials are encrypted at rest using AES-256-GCM.**
   - Rationale: CONSTITUTION §12 (Security Baseline). Credentials stored as plaintext in the DB would be a critical vulnerability. AES-256-GCM provides authenticated encryption — tampering with the ciphertext is detectable. The key is sourced from `AI_CREDENTIAL_ENCRYPTION_KEY` env var; a dev fallback is provided but not secure for production.

5. **Raw credentials are NEVER returned in API responses — only masked (`****xxxx`).**
   - Rationale: follows the same principle as password handling. The API surface must never expose secrets regardless of authentication state. `credentialService.toApiSafe()` is the single path for credential externalization.

6. **Credential rotation is supported via the `ai_provider_credentials` table (named key store).**
   - Rationale: providers may have multiple keys (primary/secondary) and keys must be rotatable without downtime. The `rotated_at` timestamp enables audit and rotation policy enforcement.

7. **Health monitoring auto-disables providers with success_rate < 50%.**
   - Rationale: a provider that fails more than half the time adds latency and noise to the routing path. Auto-disable with DB persistence ensures the gateway adapts to degraded providers without operator intervention.

8. **Routing policies are stored in `ai_provider_policies` table — not hardcoded.**
   - Rationale: CONSTITUTION §4 (Configuration-Driven Development). Routing policy must be changeable without code deployment. Global policy seeds `local_first` by default; org-level overrides are stored as scoped policy rows.

9. **`aiGatewayService` is instantiated once in `app.js` and injected into the AI router — no singleton.**
   - Rationale: consistent with the dependency injection pattern established by all other services. Enables testing with mocked repositories.

10. **The `sunave_local` provider is seeded as the default provider (priority 1) and cannot be deleted.**
    - Rationale: guarantees there is always at least one available provider so the gateway is never in a zero-provider state. Local provider requires no external credentials and works offline.

11. **Provider capability matrix is stored in two places: column flags on `ai_providers` and rows in `ai_provider_capabilities`.**
    - Rationale: the column flags (supports_chat, supports_vision, etc.) enable fast queries without joins. The `ai_provider_capabilities` table supports the detailed capability matrix with custom capabilities, notes, and per-provider toggles for advanced admin use.

12. **`ai_provider_health` is a time-series table — one row per check, never updated in place.**
    - Rationale: preserves health history for trend analysis and debugging. The `ai_providers.health_status` column is a denormalized cache of the latest state for fast reads. Health queries use `DISTINCT ON (provider_id)` for latest-per-provider.

## 2026-06-27 - AI Provider & Model Registry Platform (Prompts 11 & 12)

1. **Model registry is a separate table (`ai_models`) from providers, not embedded as JSON.**
    - Rationale: models have their own lifecycle (versioning, status, cost tracking). A separate table with capability flags enables efficient querying by capability and cost comparison without parsing JSON.

2. **Capabilities are stored in their own table (`ai_capabilities`) with a many-to-many join table (`ai_model_capabilities`).**
    - Rationale: capabilities are reusable across providers and models. The join table supports fine-grained enable/disable, priority, and per-mapping configuration without altering the model or capability definition.

3. **17 system capabilities are seeded with deterministic UUIDs.**
    - Rationale: ensures consistent capability IDs across environments. System capabilities are flagged `is_system = true` and cannot be deleted via API, following the same pattern as system roles.

4. **Usage tracking is split into granular (`ai_token_usage`) and aggregated (`ai_usage`) tables.**
    - Rationale: granular records support per-request audit trails for billing disputes. Aggregated records support fast dashboard queries. The upsert pattern with incrementing counters prevents duplicate rows during concurrent requests.

5. **Cost tracking uses estimated and actual cost columns.**
    - Rationale: estimated cost is calculated at request time using the model's per-token rates. Actual cost is populated when the provider returns billing data (or when using a metered provider). This supports both pre-billing estimates and post-billing reconciliation.

6. **Budgets are organization-scoped with support for provider/model/capability/user sub-scopes.**
    - Rationale: organizations need the ability to set budgets at different granularities — a global monthly cap for the org, per-provider caps for cost control, and per-model caps for experimentation governance.

7. **Model discovery uses `external_id` for idempotent upsert and provider-specific model references.**
    - Rationale: providers return model IDs in their API responses (e.g., `gpt-4o`, `claude-3-5-sonnet`). Storing these as `external_id` allows the system to detect model additions/removals on sync without relying on fragile name matching.

8. **Routing policy CHECK constraint was extended via migration (not in initial schema) to support 15 policy types.**
    - Rationale: the original migration 006 only supported 6 policy types. Rather than creating a new table, extending the CHECK constraint in migration 007 keeps the schema evolution clean and allows existing seeded policies to remain valid.

9. **Health summary endpoint (`/api/ai/health/summary`) was added in addition to the existing `/api/ai/health`.**
   - Rationale: the existing health endpoint runs health checks (adding latency to the response). The summary endpoint reads the last known health state from the database — suitable for dashboard widgets that need fast, cached data.

10. **All usage/cost/statistics endpoints filter by organization ID for multi-tenant isolation.**
    - Rationale: each organization's usage data must be isolated. The `organization_id` column on all usage/cost tables enables natural partitioning. Unauthenticated or cross-org queries return empty results.

## 2026-06-27 - AI Intelligence Platform (Prompts 15 & 16)

1. **Memory Engine supports 10 distinct memory types as separate pluggable modules.**
   - Rationale: different memory types have different retention policies, importance levels, and use cases. Working memory is temporary; organization memory is permanent. The type system enables fine-grained control without hardcoding behavior.

2. **Memory policies are stored in `memory_policies` table, not hardcoded.**
   - Rationale: CONSTITUTION §4 (Configuration-Driven Development). Retention periods, importance filters, and auto-archive rules must be changeable without code deployment. System policies are seeded; orgs can create custom policies.

3. **All memory records include importance levels (low/medium/high/critical/pinned/archived).**
   - Rationale: enables priority-based retrieval and context ranking. Critical and pinned memories are always included; low-importance memories can be filtered. The access_count and accessed_at fields support usage-based ranking.

4. **Knowledge sources implement a unified interface (index/search/retrieve/delete/refresh/health/supports).**
   - Rationale: CONSTITUTION §2 (Plugin-Based Design). Future modules (CRM, HR, Finance) can provide knowledge without modifying the intelligence platform. The interface contract enables plug-and-play knowledge providers.

5. **Chunking is configurable with 5 strategies (fixed/semantic/sliding_window/hierarchical/custom).**
   - Rationale: different document types benefit from different chunking. Semantic chunking preserves meaning; sliding window enables overlap; hierarchical supports nested documents. The `chunking_strategy` column on chunks enables per-chunk strategy selection.

6. **Embedding providers are abstracted with support for 5 backends (local/OpenAI/Gemini/Vertex/Ollama).**
   - Rationale: CONSTITUTION §7 (No Hardcoded AI Model Names). Embedding models change frequently; the provider abstraction allows swapping without touching business logic. A default provider is selected per organization.

7. **Vector store abstraction supports 6 backends (pgvector/Qdrant/Pinecone/Weaviate/Chroma/Redis).**
   - Rationale: different organizations have different scale and compliance requirements. pgvector for self-hosted; Pinecone for managed scale; Redis for low-latency caching. The `vector_store_type` column enables per-index backend selection.

8. **Context Builder enforces a token budget and assembles context from multiple sources.**
   - Rationale: AI models have context window limits. The builder automatically includes conversation history, user memory, organization memory, and knowledge base while respecting the budget. Sources are ranked by relevance and pruned if necessary.

9. **Context ranking uses multiple signals: similarity, recency, importance, confidence, source priority.**
   - Rationale: the most relevant context is not always the most recent or most important. Combining signals ensures the AI receives the best possible context. Ranking metadata is stored for audit and optimization.

10. **All intelligence operations are organization-isolated and permission-aware.**
    - Rationale: CONSTITUTION §3 (Multi-Tenancy by Default). Memories, knowledge, and contexts belong to organizations. Cross-org queries return empty results. Permission checks ensure users only access content they're authorized to see.

11. **Embeddings are never exposed via API — only internal references.**
    - Rationale: embeddings are internal representation artifacts. Exposing them would leak semantic information and increase payload size. The API returns metadata and similarity scores, not raw vectors.

12. **Mock embeddings are used for development; real providers are configured via environment variables.**
    - Rationale: enables platform development without external API keys. Production deployments configure real providers (OpenAI, etc.) via `embedding_providers` table. The abstraction allows seamless switching between mock and real.

## 2026-06-27 - Business Operating Platform (Epic 6)

1. **All business entities inherit from BusinessObject.**
   - Rationale: Ensures uniform fields (id, owner, visibility, metadata) and behaviors across CRM, HR, Finance, etc.

2. **Relationship Engine supports dynamic typing.**
   - Rationale: Avoids hardcoded foreign keys for every possible edge, enabling highly configurable networks of objects.

3. **Unified Activity Timeline tracks all events.**
   - Rationale: Every comment, status change, and worker execution is recorded generically to provide a consistent audit history.

4. **Abstracted Approval & Notification Engines.**
   - Rationale: Modules do not build custom workflows; they publish events or status updates to a single centralized engine.

5. **Tags and Custom Fields are globally managed.**
   - Rationale: Allows cross-object querying and prevents schema drift across modules.

## 2026-06-27 - Enterprise Business Applications Platform (Epics 7, 8 & 9)

1. **CRM, HR, and Finance platforms do not create their own core infrastructure.**
   - Rationale: Everything must extend the Business Operating Platform. This reduces duplication of features like timelines, tasks, and notifications.

2. **Normalized schemas are implemented as metadata/custom fields atop `business_objects`.**
   - Rationale: Ensures a unified query layer and uniform behaviors across modules while satisfying the requirement for domain-specific schemas without diverging table hierarchies.

3. **APIs and Frontends isolated in package and app directories.**
   - Rationale: The core API (`apps/api`) remains untouched and acts as a foundation. Domain logic for specific business modules resides in `packages/business/` and their respective UI components in `apps/web/`.

