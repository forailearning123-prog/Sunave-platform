# Coolify Deployment Guide

## Deployment Model

- Use `docker-compose.coolify.yml`
- Route traffic with Traefik labels
- Manage all configuration in Coolify environment variables

## Required Host Variables

- `SUNAVE_API_HOST`
- `SUNAVE_WEB_HOST`

## Required Auth Variables

- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_REFRESH_TOKEN_SECRET`

## Platform Constraints

Ollama, LiteLLM/AI Gateway, PostgreSQL, Redis, STT, and TTS remain external platform services.
