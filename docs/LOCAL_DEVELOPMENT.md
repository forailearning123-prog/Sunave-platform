# Local Development Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose

## Setup

1. Copy environment file:
   - `cp .env.example .env`
2. Install dependencies:
   - `npm install`
3. Run tests and quality checks:
   - `npm test`
   - `npm run lint`
   - `npm run build`

## Run Services (without Docker)

- API: `npm --workspace @sunave/api start`
- Web: `npm --workspace @sunave/web start`

## Run Services (Docker)

- `docker compose up --build`

## Authentication Pages

- `http://localhost:3000/auth/login`
- `http://localhost:3000/auth/register`
- `http://localhost:3000/auth/forgot-password`
- `http://localhost:3000/auth/reset-password`
- `http://localhost:3000/account/profile`
