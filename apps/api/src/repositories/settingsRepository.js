import { v4 as uuid } from 'uuid';

/**
 * Data access layer for the Settings & Configuration Engine.
 * Covers: system_settings, user_preferences, feature_flags, feature_flag_assignments.
 * Organization settings already live in organizationRepository.js.
 */
export function createSettingsRepository(pool) {
  return {

    // ─── System Settings ────────────────────────────────────────────────────

    async getSystemSettings(category) {
      if (category) {
        const result = await pool.query(
          'SELECT settings FROM system_settings WHERE category = $1',
          [category]
        );
        return result.rows[0]?.settings ?? null;
      }
      const result = await pool.query('SELECT category, settings FROM system_settings ORDER BY category');
      const out = {};
      for (const row of result.rows) {
        out[row.category] = row.settings;
      }
      return out;
    },

    async upsertSystemSettings(category, settings) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO system_settings (id, category, settings)
         VALUES ($1, $2, $3)
         ON CONFLICT (category)
         DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
         RETURNING *`,
        [id, category, JSON.stringify(settings)]
      );
      return result.rows[0];
    },

    // ─── User Preferences ───────────────────────────────────────────────────

    async getUserPreferences(userId, orgId, category) {
      if (category) {
        const result = await pool.query(
          `SELECT preferences FROM user_preferences
           WHERE user_id = $1 AND organization_id = $2 AND category = $3`,
          [userId, orgId, category]
        );
        return result.rows[0]?.preferences ?? null;
      }
      const result = await pool.query(
        `SELECT category, preferences FROM user_preferences
         WHERE user_id = $1 AND organization_id = $2
         ORDER BY category`,
        [userId, orgId]
      );
      const out = {};
      for (const row of result.rows) {
        out[row.category] = row.preferences;
      }
      return out;
    },

    async upsertUserPreferences(userId, orgId, category, preferences) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO user_preferences (id, user_id, organization_id, category, preferences)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, organization_id, category)
         DO UPDATE SET preferences = EXCLUDED.preferences, updated_at = NOW()
         RETURNING *`,
        [id, userId, orgId, category, JSON.stringify(preferences)]
      );
      return result.rows[0];
    },

    // ─── Feature Flags ──────────────────────────────────────────────────────

    async listFeatureFlags() {
      const result = await pool.query(
        'SELECT * FROM feature_flags ORDER BY key'
      );
      return result.rows.map(toFlagOutput);
    },

    async getFeatureFlag(key) {
      const result = await pool.query(
        'SELECT * FROM feature_flags WHERE key = $1',
        [key]
      );
      return result.rows[0] ? toFlagOutput(result.rows[0]) : null;
    },

    async updateFeatureFlag(key, input) {
      const result = await pool.query(
        `UPDATE feature_flags SET
           enabled = COALESCE($2, enabled),
           rollout_percentage = COALESCE($3, rollout_percentage),
           config = COALESCE($4, config),
           updated_at = NOW()
         WHERE key = $1
         RETURNING *`,
        [
          key,
          input.enabled ?? null,
          input.rolloutPercentage ?? null,
          input.config ? JSON.stringify(input.config) : null
        ]
      );
      return result.rows[0] ? toFlagOutput(result.rows[0]) : null;
    },

    async upsertFeatureFlagAssignment(flagKey, scope, scopeId, enabled) {
      const flagResult = await pool.query(
        'SELECT id FROM feature_flags WHERE key = $1',
        [flagKey]
      );
      const flag = flagResult.rows[0];
      if (!flag) return null;

      const id = uuid();
      const result = await pool.query(
        `INSERT INTO feature_flag_assignments (id, flag_id, scope, scope_id, enabled)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (flag_id, scope, scope_id)
         DO UPDATE SET enabled = EXCLUDED.enabled
         RETURNING *`,
        [id, flag.id, scope, scopeId, enabled]
      );
      return result.rows[0];
    },

    async listFeatureFlagAssignments(flagKey) {
      const result = await pool.query(
        `SELECT ffa.* FROM feature_flag_assignments ffa
         JOIN feature_flags ff ON ff.id = ffa.flag_id
         WHERE ff.key = $1
         ORDER BY ffa.scope, ffa.scope_id`,
        [flagKey]
      );
      return result.rows;
    },

    async isFeatureFlagEnabled(flagKey, context = {}) {
      const flag = await this.getFeatureFlag(flagKey);
      if (!flag) return false;

      // Org-level override takes precedence
      if (context.orgId) {
        const orgAssignment = await pool.query(
          `SELECT ffa.enabled FROM feature_flag_assignments ffa
           JOIN feature_flags ff ON ff.id = ffa.flag_id
           WHERE ff.key = $1 AND ffa.scope = 'organization' AND ffa.scope_id = $2`,
          [flagKey, context.orgId]
        );
        if (orgAssignment.rows[0]) {
          return orgAssignment.rows[0].enabled;
        }
      }

      // Role-level override
      if (context.role) {
        const roleAssignment = await pool.query(
          `SELECT ffa.enabled FROM feature_flag_assignments ffa
           JOIN feature_flags ff ON ff.id = ffa.flag_id
           WHERE ff.key = $1 AND ffa.scope = 'role' AND ffa.scope_id = $2`,
          [flagKey, context.role]
        );
        if (roleAssignment.rows[0]) {
          return roleAssignment.rows[0].enabled;
        }
      }

      // Percentage rollout
      if (flag.flagType === 'percentage') {
        return flag.rolloutPercentage > 0;
      }

      return flag.enabled;
    }
  };
}

function toFlagOutput(row) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description,
    flagType: row.flag_type,
    enabled: row.enabled,
    rolloutPercentage: row.rollout_percentage,
    config: row.config,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
