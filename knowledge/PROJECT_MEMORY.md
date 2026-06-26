# Project Memory

## Current Sprint
- Sprint 2: Organizations & Multi-Tenancy module.

## Architecture Summary
- Multi-tenant, API-first, plugin-oriented platform.
- Authentication implemented as first bounded module.
- Organizations module implements full multi-tenancy with tenant isolation.
- External infrastructure consumed via configuration only.

## Tech Stack
- Node.js + Express (API + Web)
- PostgreSQL SQL migrations with version tracking (schema_migrations table)
- Docker / Docker Compose
- Coolify + Traefik deployment labels

## Folder Structure
- `apps/api`: API modules, middleware, migrations, repositories
- `apps/web`: auth, profile, and organizations UI pages
- `packages/core`: shared schemas, RBAC, response contracts
- `knowledge`: constitution, decisions, sprint context

## Active Modules
- Authentication
- Organizations & Multi-Tenancy

## Completed Modules
- Foundation scaffolding
- Authentication
- Organizations & Multi-Tenancy

## Pending Modules
- Users & Teams (next)
- RBAC (full implementation)
- Settings (user preferences)
- Dashboard
- AI Gateway
- Plugin runtime loader
- Worker orchestration

## API Contracts
- Authentication endpoints are available under `/api/auth/*`.
- Organization endpoints are available under `/api/organizations/*`.
- Responses use a common `success/data/error` envelope.

## Database Summary
- Implemented auth schema tables:
  - `users`
  - `sessions`
  - `password_reset_tokens`
- Implemented organizations schema tables (migration 002):
  - `organizations` (extended with slug, status, billing, quota, timestamps)
  - `organization_members` (extended with title, status, joined_at, Guest role)
  - `invitations`
  - `audit_logs`
  - `organization_settings`
- Migration tracking: `schema_migrations` table (each migration runs exactly once)

## Current Decisions
- See `/knowledge/DECISIONS.md` for all architectural and authentication decisions.
