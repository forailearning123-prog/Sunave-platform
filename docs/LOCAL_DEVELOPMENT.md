# Local Development Guide

## Prerequisites
- Docker + Docker Compose
- Git

## Setup
1. `cp .env.example .env`
2. `./scripts/bootstrap.sh`
3. `docker compose up --build`

## Notes
- PostgreSQL, Redis, Ollama, and AI Gateway are external services.
- This scaffold does not install platform dependencies locally.
