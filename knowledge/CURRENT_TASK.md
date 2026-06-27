## Current Task

## Sprint
- Sprint 7

## Module
- AI Runtime Platform: Conversation Engine + Prompt Library (Prompts 13 & 14)

## Goal
- Build the AI Runtime Platform including Conversation Engine, Prompt Library, Prompt Templates with Variables, Runtime Context, Runtime Policies, Execution Logging.

## Allowed Files
- `apps/api/**`
- `apps/web/**`
- `packages/core/**`
- `knowledge/PROJECT_MEMORY.md`
- `knowledge/CURRENT_TASK.md`
- `knowledge/DECISIONS.md`
- `knowledge/MASTER_ROADMAP.md`

## Out-of-Scope Files
- Workers, Agents, Memory Engine, Knowledge Retrieval, Embeddings, Vector Database, Voice, Image Generation, Automation.

## Acceptance Criteria (Current Sprint)
- [x] Conversation Engine (CRUD, types, statuses, messages, pin/favorite/duplicate)
- [x] Prompt Library (templates, categories, variables, versioning, publish/clone/rollback)
- [x] Prompt Templates with {{variables}} resolution
- [x] Runtime Context (org, user, locale, timezone, feature flags)
- [x] Runtime Policies (maxTokens, temperature, topP, streaming, retry)
- [x] Conversation History (messages with token usage, provider, model, cost tracking)
- [x] Runtime Logging (execution records, logs by level, error tracking)
- [x] Dashboard Widgets (runtime stats, recent executions, most used prompts)
- [x] Migration 008 (new tables: conversations, conversation_messages, prompt_templates, prompt_categories, prompt_versions, runtime_executions, runtime_logs)
- [x] API Endpoints (conversations CRUD, messages, prompts CRUD, versions, runtime execute/chat/stream, runtime stats)
- [x] Frontend Pages (4 pages: conversations list, conversation detail/chat, prompt library, prompt editor, runtime dashboard)
- [x] Documentation Updated

## Next Module
- Memory Engine + Knowledge Retrieval
