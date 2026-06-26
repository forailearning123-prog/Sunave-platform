# Environment Variable Reference

| Variable | Purpose |
| --- | --- |
| `SUNAVE_ENV` | Runtime environment (`development`, `staging`, `production`) |
| `SUNAVE_LOG_LEVEL` | Log level |
| `SUNAVE_TENANCY_MODE` | Multi-tenant runtime mode |
| `API_PORT` | API server port |
| `WEB_PORT` | Web server port |
| `WEB_API_TARGET` | Web reverse-proxy target for `/api/*` |
| `DATABASE_URL` | External PostgreSQL connection string |
| `REDIS_URL` | External Redis connection string |
| `AUTH_ACCESS_TOKEN_SECRET` | Access token signing key |
| `AUTH_REFRESH_TOKEN_SECRET` | Refresh token signing key |
| `AUTH_ACCESS_TOKEN_TTL_SECONDS` | Access token lifetime |
| `AUTH_REFRESH_TOKEN_TTL_SECONDS` | Standard refresh token lifetime |
| `AUTH_REFRESH_TOKEN_REMEMBER_TTL_SECONDS` | Remember-session refresh lifetime |
| `AUTH_PASSWORD_RESET_TTL_MINUTES` | Password reset token expiry |
| `RUN_MIGRATIONS_ON_BOOT` | Run SQL migrations during API startup |
| `AI_GATEWAY_URL` | External AI gateway endpoint |
| `OLLAMA_BASE_URL` | External Ollama endpoint |
| `STT_SERVICE_URL` | External STT endpoint |
| `TTS_SERVICE_URL` | External TTS endpoint |
