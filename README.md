# Sunave AI OS

Sunave AI OS is a Docker-first, multi-tenant, API-first business operating system.

This repository now includes **Sprint 1 - Authentication Module** as the first functional platform module.

## Monorepo Layout

- `apps/api` - Authentication API and security middleware
- `apps/web` - Authentication and profile UI pages
- `packages/core` - Shared validation schemas, response contracts, and RBAC definitions
- `docs` - Development and deployment documentation
- `knowledge` - Constitution, project memory, task scope, and decisions
- `scripts` - Setup helpers

## Implemented Authentication Capabilities

- Email/password registration with strong-password validation
- Login, logout, refresh-token flow, remember session
- Session metadata tracking and logout-all
- Forgot/reset password with expiring reset tokens
- Change password
- First-login organization creation (Owner assignment)
- Profile read/update
- RBAC middleware with Owner/Admin/Manager/User roles

## API Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `GET /api/auth/sessions`
- `POST /api/auth/logout-all`
- `POST /api/auth/complete-onboarding`

All endpoints return a consistent object format:

- success: `{"success": true, "data": {...}}`
- failure: `{"success": false, "error": {"code": "...", "message": "..."}}`

## Frontend Routes

- `/auth/login`
- `/auth/register`
- `/auth/forgot-password`
- `/auth/reset-password`
- `/account/profile`
- `/auth/organization` (first login setup)

## Local Development

```bash
cp .env.example .env
npm install
npm test
npm run lint
npm run build
npm --workspace @sunave/api start
npm --workspace @sunave/web start
```

Run with Docker:

```bash
docker compose up --build
```

## Security Notes

- Passwords are hashed with Argon2
- Access and refresh token cookies are httpOnly
- CSRF protection uses double-submit token checks
- Login and forgot-password endpoints are rate-limited
- Internal server errors are not exposed to clients

## Scope Guardrails

Only authentication is implemented in this sprint. AI, workers, agents, goals, dashboard features, and business modules remain out of scope.
