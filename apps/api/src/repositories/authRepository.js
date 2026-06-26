import { ROLE } from '@sunave/core';
import { v4 as uuid } from 'uuid';

export function createAuthRepository(pool) {
  return {
    async createUser(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO users (id, first_name, last_name, email, password_hash, timezone, language, avatar_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, first_name, last_name, email, timezone, language, avatar_url, created_at`,
        [id, input.firstName, input.lastName, input.email, input.passwordHash, input.timezone || 'UTC', input.language || 'en', input.avatarUrl || '']
      );
      return result.rows[0];
    },

    async findUserByEmail(email) {
      const result = await pool.query(
        `SELECT id, first_name, last_name, email, password_hash, timezone, language, avatar_url, created_at
         FROM users WHERE email = $1`,
        [email]
      );
      return result.rows[0] || null;
    },

    async findUserById(id) {
      const result = await pool.query(
        `SELECT id, first_name, last_name, email, timezone, language, avatar_url, created_at
         FROM users WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    },

    async updateUserProfile(id, updates) {
      const result = await pool.query(
        `UPDATE users
         SET first_name = COALESCE($2, first_name),
             last_name = COALESCE($3, last_name),
             timezone = COALESCE($4, timezone),
             language = COALESCE($5, language),
             avatar_url = COALESCE($6, avatar_url),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, first_name, last_name, email, timezone, language, avatar_url`,
        [id, updates.firstName ?? null, updates.lastName ?? null, updates.timezone ?? null, updates.language ?? null, updates.avatarUrl ?? null]
      );
      return result.rows[0] || null;
    },

    async updatePassword(id, passwordHash) {
      await pool.query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, passwordHash]);
    },

    async createSession(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO sessions (id, user_id, refresh_token_hash, user_agent, ip_address, remember_session, expires_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, user_id, remember_session, expires_at, created_at, last_active_at`,
        [id, input.userId, input.refreshTokenHash, input.userAgent, input.ipAddress, input.rememberSession, input.expiresAt]
      );
      return result.rows[0];
    },

    async listActiveSessions(userId) {
      const result = await pool.query(
        `SELECT id, user_agent, ip_address, remember_session, expires_at, created_at, last_active_at
         FROM sessions
         WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
         ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows;
    },

    async touchSession(sessionId) {
      await pool.query('UPDATE sessions SET last_active_at = NOW() WHERE id = $1', [sessionId]);
    },

    async findSessionByHash(sessionId, refreshTokenHash) {
      const result = await pool.query(
        `SELECT id, user_id, expires_at, revoked_at
         FROM sessions
         WHERE id = $1 AND refresh_token_hash = $2`,
        [sessionId, refreshTokenHash]
      );
      return result.rows[0] || null;
    },

    async revokeSession(sessionId) {
      await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE id = $1', [sessionId]);
    },

    async revokeAllSessions(userId) {
      await pool.query('UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
    },

    async createPasswordResetToken(userId, tokenHash, expiresAt) {
      const id = uuid();
      await pool.query(
        'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES ($1,$2,$3,$4)',
        [id, userId, tokenHash, expiresAt]
      );
    },

    async usePasswordResetToken(tokenHash) {
      const result = await pool.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
         RETURNING user_id`,
        [tokenHash]
      );
      return result.rows[0] || null;
    },

    async findMembership(userId) {
      const result = await pool.query(
        `SELECT om.organization_id, om.role, o.name as organization_name, o.industry, o.country
         FROM organization_members om
         JOIN organizations o ON o.id = om.organization_id
         WHERE om.user_id = $1
         ORDER BY om.created_at ASC
         LIMIT 1`,
        [userId]
      );
      return result.rows[0] || null;
    },

    async createOrganizationForOwner(userId, organizationName, industry, country) {
      return pool.query('BEGIN').then(async () => {
        try {
          const orgResult = await pool.query(
            `INSERT INTO organizations (id, name, industry, country, created_by)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING id, name, industry, country`,
            [uuid(), organizationName, industry, country, userId]
          );
          const organization = orgResult.rows[0];
          await pool.query(
            `INSERT INTO organization_members (id, organization_id, user_id, role)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (organization_id, user_id) DO NOTHING`,
            [uuid(), organization.id, userId, ROLE.OWNER]
          );
          await pool.query('COMMIT');
          return organization;
        } catch (error) {
          await pool.query('ROLLBACK');
          throw error;
        }
      });
    }
  };
}
