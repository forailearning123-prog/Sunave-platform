# Sunave AI OS

Sunave AI OS is a Docker-first, multi-tenant, API-first business operating system foundation.

This repository currently contains **foundation-only scaffolding** for Sprint 1 implementation:
- Monorepo structure for apps, packages, and plugins
- Engineering constitution and project memory templates for AI assistants
- Docker and Coolify deployment templates
- Shared documentation and environment configuration references

## Monorepo Layout

- `apps/` – deployable applications (`api`, `web` placeholders)
- `packages/` – shared internal libraries
- `plugins/` – plugin modules/extensions
- `docs/` – developer and operations documentation
- `knowledge/` – AI-optimized architectural memory and governance
- `scripts/` – repository automation scripts

## Quick Start

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```
2. Build and run placeholders:
   ```bash
   docker compose up --build
   ```
3. Read docs:
   - `/docs/LOCAL_DEVELOPMENT.md`
   - `/docs/DOCKER_GUIDE.md`
   - `/docs/COOLIFY_DEPLOYMENT_GUIDE.md`

## Current Scope

No business features are implemented yet by design.
Sprint 1 should begin from the module-scoped workflow defined in `/knowledge/CURRENT_TASK.md`.
