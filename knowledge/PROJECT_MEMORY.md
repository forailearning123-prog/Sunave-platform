# Project Memory

## Current Sprint
- Sprint 1: Authentication module.

## Architecture Summary
- Multi-tenant, API-first, plugin-oriented platform.
- Authentication implemented as first bounded module.
- External infrastructure consumed via configuration only.

## Tech Stack
- Node.js + Express (API + Web)
- PostgreSQL SQL migrations
- Docker / Docker Compose
- Coolify + Traefik deployment labels

## Folder Structure
- `apps/api`: auth API, middleware, migrations
- `apps/web`: auth and profile UI pages
- `packages/core`: shared schemas, RBAC, response contracts
- `knowledge`: constitution, decisions, sprint context

## Active Modules
- Authentication

## Completed Modules
- Foundation scaffolding
- Authentication

## Pending Modules
- Organizations module (next)
- Plugin runtime loader
- Worker orchestration

## API Contracts
- Authentication endpoints are available under `/api/auth/*`.
- Responses use a common `success/data/error` envelope.

## Database Summary
- Implemented auth schema tables:
  - `users`
  - `organizations`
  - `organization_members`
  - `sessions`
  - `password_reset_tokens`

## Current Decisions
- See `/knowledge/DECISIONS.md` for all architectural and authentication decisions.
