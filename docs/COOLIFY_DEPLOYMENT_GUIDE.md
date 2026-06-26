# Coolify Deployment Guide

## Deployment Model
- Deploy via `docker-compose.coolify.yml`
- Traffic managed by Traefik labels
- Environment variables managed in Coolify project settings

## Required Coolify Variables
- `SUNAVE_API_HOST`
- `SUNAVE_WEB_HOST`
- all variables in `.env.example`

## External Services
- Keep Ollama, LiteLLM/AI Gateway, PostgreSQL, Redis, STT, and TTS external.
