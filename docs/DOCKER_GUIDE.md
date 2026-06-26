# Docker Guide

## Principles

- Docker-first runtime for both `api` and `web`
- Parity across local, staging, and production
- External dependencies consumed by environment variables only

## Commands

- Build: `docker compose build`
- Start: `docker compose up`
- Stop: `docker compose down`

## Services

- `api` exposes port `8080`
- `web` exposes port `3000`

`web` proxies `/api/*` to `api` via `WEB_API_TARGET`.
