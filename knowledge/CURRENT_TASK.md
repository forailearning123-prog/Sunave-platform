## Current Task

## Sprint
- Sprint 6

## Module
- AI Gateway & Provider Management

## Goal
- Implement the AI Gateway abstraction layer (Prompt 9) and AI Provider Management platform (Prompt 10).
  All AI capability requests across the platform are routed through the gateway.
  Administrators can configure, enable, disable, and prioritize AI providers without code changes.

## Allowed Files
- `apps/api/**`
- `apps/web/**`
- `packages/core/**`
- `knowledge/PROJECT_MEMORY.md`
- `knowledge/CURRENT_TASK.md`
- `knowledge/DECISIONS.md`
- `knowledge/MASTER_ROADMAP.md`

## Out-of-Scope Files
- Workers, Agents, Prompt Execution, Memory, Chat, Reasoning Engine implementation.

## Acceptance Criteria

### Prompt 9 — AI Gateway
- [x] Gateway abstraction (`aiGatewayService.js`) — chat, stream, vision, embedding, speech, transcription, reason, health, listModels, estimateCost
- [x] Provider interfaces — all 9 providers implement ProviderInterface via mock stubs
- [x] Routing engine — 6 routing policies (lowest_cost, highest_quality, fastest, local_first, cloud_first, org_override)
- [x] Health monitoring — availability, latency, success_rate tracking; auto-disables unhealthy providers
- [x] Capability routing — 14 capabilities mapped to provider types
- [x] Mock provider support — all providers return mock responses, no real API calls
- [x] Database schema — 6 tables (ai_providers, ai_provider_health, ai_provider_configuration, ai_provider_capabilities, ai_provider_policies, ai_provider_credentials)
- [x] API — GET /api/ai/providers, /health, /models, /capabilities, POST /api/ai/test, /estimate-cost
- [x] Admin UI — /admin/ai/providers, /admin/ai/health, /admin/ai/configuration

### Prompt 10 — AI Provider Management
- [x] Provider CRUD — POST/PUT/DELETE /api/ai/providers
- [x] Provider Policies — routing policy storage and listing
- [x] Health Monitoring — per-provider health history, connection test
- [x] Connection Testing — POST /api/ai/providers/test (latency, models found)
- [x] Credential Encryption — AES-256-GCM via credentialService; credentials never exposed raw
- [x] Capability Matrix — PUT /api/ai/providers/:id/capabilities
- [x] Model Sync — POST /api/ai/providers/sync-models
- [x] Credential Rotation — POST /api/ai/credentials/:providerId

## Next Module
- AI Model Registry
