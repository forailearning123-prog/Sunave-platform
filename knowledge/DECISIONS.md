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

## 2026-06-26 - IAM (Users, Teams & RBAC) Decisions

1. **Permission checks are DB-backed via a centralized permission service.**
   - Rationale: permissions must never be hardcoded in application logic. The `role_permissions` table is the single source of truth; changing a role's permissions requires no code changes.

2. **System roles (Owner/Admin/Manager/User/Guest) are seeded in migration 003 with fixed UUIDs.**
   - Rationale: deterministic UUIDs allow idempotent migrations and foreign-key referencing. System roles are flagged `system_role = true` and cannot be deleted or modified via the API.

3. **Custom roles are organization-scoped; system roles have `organization_id = NULL`.**
   - Rationale: organizations can create their own roles (e.g., "Engineer", "Support Lead") without conflicting with platform-wide system roles. Role listing returns both system roles and org-specific roles for a given org.

4. **Teams support unlimited nesting via `parent_team_id` self-reference.**
   - Rationale: organizations need to model real-world hierarchies (Company → Division → Department → Squad). The tree is built client-side from a flat query to avoid recursive SQL for pg-mem compatibility.

5. **Teams use soft delete (archived_at timestamp) rather than hard delete.**
   - Rationale: consistent with organizations (archive/restore pattern). Data preservation and audit integrity are maintained. Hard delete is also available for complete removal.

6. **`DELETE /api/users/:id` soft-deletes (sets status = 'archived') rather than dropping the row.**
   - Rationale: user data must be preserved for audit logs, team history, and organization membership records. Hard deletion would break referential integrity with audit_logs.

7. **Permission middleware (`requirePermission`) is async and queries the DB on every request.**
   - Rationale: permissions must be dynamic — changing a role's permissions in the DB takes effect immediately without requiring a server restart or cache invalidation.

8. **The existing static `hasPermission` from `@sunave/core` is retained for legacy routes (organizations, auth).**
   - Rationale: backward compatibility without regressions. New IAM routes use the DB-backed service. A future refactor could unify both.

9. **`user_preferences` table is always organization-scoped (`organization_id NOT NULL`).**
   - Rationale: global user preferences (timezone, language) are stored in the `users` table directly. Organization-specific preferences (notification settings, dashboards) belong in `user_preferences` and require org context.

10. **Audit log `resource` column added to record the specific entity affected.**
    - Rationale: allows filtering audit logs by entity (e.g., `user:uuid`, `team:uuid`, `role:uuid`) without parsing JSON metadata fields.


1. **Active organization is stored in a `current_org_id` httpOnly cookie.**
   - Rationale: stateless approach that avoids modifying access tokens on every org switch. The cookie persists across requests without requiring a new JWT.

2. **Multi-tenant middleware (`requireOrg`) resolves org context from cookie, falling back to the user's first active membership.**
   - Rationale: seamless UX for users belonging to one org; explicit switcher for multi-org users.

3. **Organization role permissions are enforced via `requireOrgPermission` using `req.org.role`, not the JWT `req.auth.role`.**
   - Rationale: a user may have different roles in different organizations. The JWT role is only used for profile-level operations.

4. **No permanent deletion of organizations — archive/restore only.**
   - Rationale: data preservation and audit integrity; matches business requirement.

5. **Invitation tokens are UUID pairs stored as SHA-256 hashes, matching the password reset pattern.**
   - Rationale: consistency with existing token security model.

6. **Invitations automatically allow re-invite by replacing pending invitations for the same email+org.**
   - Rationale: simplifies UX when an invitation expires and needs to be resent.

7. **Organization settings use JSONB per category with UPSERT semantics.**
   - Rationale: flexible, schema-free settings storage that can grow per category without migrations.

8. **Audit logs use fire-and-forget inserts (failures are silently swallowed).**
   - Rationale: audit log failure must never break the primary business flow.

9. **Migration versioning table (`schema_migrations`) tracks applied migrations.**
   - Rationale: each migration file runs exactly once, enabling incremental schema evolution without idempotency hacks in DDL.

10. **`Guest` role added to initial CHECK constraint in `001_auth.sql` (not via ALTER TABLE in 002).**
    - Rationale: pg-mem (test in-memory DB) does not support named inline CHECK constraint modification. Since the project has no production database yet, updating the original migration is acceptable and cleaner than workarounds.
