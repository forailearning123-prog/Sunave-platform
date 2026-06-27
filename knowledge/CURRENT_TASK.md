## Current Task

## Sprint
- Sprint 6

## Module
- AI Provider & Model Registry Platform (Prompts 11 & 12)

## Goal
- Build the complete AI Provider and Model Registry Platform including Provider Registry, Model Registry, Capability Registry, Routing Policies, Model Discovery, Health Monitoring, Usage Statistics, and Cost Tracking.

## Allowed Files
- `apps/api/**`
- `apps/web/**`
- `packages/core/**`
- `knowledge/PROJECT_MEMORY.md`
- `knowledge/CURRENT_TASK.md`
- `knowledge/DECISIONS.md`
- `knowledge/MASTER_ROADMAP.md`

## Out-of-Scope Files
- Prompt Execution, Workers, Agents, Memory, Conversation, Embeddings, Vision Processing, Speech Processing.

## Acceptance Criteria (Current Sprint)
- [x] Provider Registry (CRUD, types, capability flags, credential encryption)
- [x] Model Registry (CRUD, capability flags, status, cost estimation, external ID sync)
- [x] Capability Registry (17 system capabilities, categories, provider mapping)
- [x] Routing Policies (15 policy types, global seeds, org overrides)
- [x] Model Discovery (sync, refresh, upsert by external ID)
- [x] Health Monitoring (time-series health tracking, auto-disable unhealthy)
- [x] Usage & Cost Tracking (per-request, aggregated, monthly cost summaries, budgets)
- [x] AI Administration Portal (9 pages: overview, providers, models, capabilities, policies, health, usage, costs, settings)
- [x] Dashboard Widgets (provider health, top models, capability usage, recent failures)
- [x] Migration 007 (new tables: ai_models, ai_capabilities, ai_model_capabilities, ai_usage, ai_token_usage, ai_cost_summary, ai_budgets)
- [x] Documentation Updated

## Next Module
- Conversation Platform & Prompt Library
