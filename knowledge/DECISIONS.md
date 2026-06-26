# Architecture Decisions Log

## 2026-06-26 - Foundation Decisions

1. **Ollama remains an external service.**
   - Rationale: keep compute lifecycle independent from app deployments.

2. **STT and TTS are external platform services.**
   - Rationale: avoid embedding media infrastructure in core apps.

3. **AI Gateway owns provider/model selection.**
   - Rationale: centralize AI provider routing and fallback policy.

4. **Workers request capabilities, not model names.**
   - Rationale: decouple business logic from model/provider churn.

5. **Docker-first deployment is mandatory.**
   - Rationale: ensure reproducible environments and delivery parity.

6. **Coolify is the deployment platform.**
   - Rationale: standardize deployment and Traefik-based routing.

## 2026-06-26 - Authentication Decisions

1. **Authentication method is email + password only.**
   - Rationale: intentionally simple and production-ready baseline.

2. **Access token + refresh token cookie model is used.**
   - Rationale: short-lived access tokens with revocable persistent sessions.

3. **Refresh tokens are stored as SHA-256 hashes in the database.**
   - Rationale: prevent raw token exposure if persistence is compromised.

4. **CSRF protection uses double-submit token checks.**
   - Rationale: protect state-changing cookie-authenticated requests.

5. **First login without organization requires minimal onboarding (name, industry, country).**
   - Rationale: satisfy scope with tenant bootstrap and owner assignment.

6. **RBAC checks are centralized in middleware using shared role/permission contracts.**
   - Rationale: avoid page-level permission hardcoding and maintain policy consistency.
