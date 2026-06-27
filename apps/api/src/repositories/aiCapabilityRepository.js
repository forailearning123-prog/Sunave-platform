import { v4 as uuid } from 'uuid';

/**
 * AI Capability Repository
 * Data access layer for the AI Capability Registry.
 * Tables: ai_capabilities
 */
export function createAiCapabilityRepository(pool) {
  return {

    // ─── Capability CRUD ──────────────────────────────────────────────────

    async listCapabilities({ enabledOnly = false, category = null } = {}) {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (enabledOnly) {
        conditions.push(`enabled = true`);
      }
      if (category) {
        conditions.push(`category = $${idx++}`);
        params.push(category);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT * FROM ai_capabilities ${where} ORDER BY category ASC, name ASC`,
        params
      );
      return result.rows.map(toCapabilityOutput);
    },

    async findCapability(id) {
      const result = await pool.query(
        `SELECT * FROM ai_capabilities WHERE id = $1`,
        [id]
      );
      return result.rows[0] ? toCapabilityOutput(result.rows[0]) : null;
    },

    async findCapabilityByName(name) {
      const result = await pool.query(
        `SELECT * FROM ai_capabilities WHERE name = $1`,
        [name]
      );
      return result.rows[0] || null;
    },

    async createCapability(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_capabilities (id, name, display_name, description, category, icon, enabled, is_system, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          id, input.name, input.displayName || input.name,
          input.description || '', input.category || 'general',
          input.icon || 'code', input.enabled ?? true,
          input.isSystem ?? false, JSON.stringify(input.metadata || {})
        ]
      );
      return toCapabilityOutput(result.rows[0]);
    },

    async updateCapability(id, input) {
      const result = await pool.query(
        `UPDATE ai_capabilities SET
           display_name = COALESCE($2, display_name),
           description  = COALESCE($3, description),
           category     = COALESCE($4, category),
           icon         = COALESCE($5, icon),
           enabled      = COALESCE($6, enabled),
           metadata     = CASE WHEN $7 IS NOT NULL THEN $7::jsonb ELSE metadata END,
           updated_at   = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id, input.displayName, input.description,
          input.category, input.icon, input.enabled,
          input.metadata ? JSON.stringify(input.metadata) : null
        ]
      );
      return result.rows[0] ? toCapabilityOutput(result.rows[0]) : null;
    },

    async deleteCapability(id) {
      const result = await pool.query(
        `DELETE FROM ai_capabilities WHERE id = $1 AND is_system = false RETURNING id`,
        [id]
      );
      return result.rows[0] || null;
    },

    async enableCapability(id) {
      await pool.query(
        `UPDATE ai_capabilities SET enabled = true, updated_at = NOW() WHERE id = $1`,
        [id]
      );
    },

    async disableCapability(id) {
      await pool.query(
        `UPDATE ai_capabilities SET enabled = false, updated_at = NOW() WHERE id = $1`,
        [id]
      );
    },

    // ─── Capability Discovery ─────────────────────────────────────────────

    async getCapabilityCategories() {
      const result = await pool.query(
        `SELECT category, COUNT(*)::int AS count,
                jsonb_agg(jsonb_build_object('id', id, 'name', name, 'display_name', display_name, 'enabled', enabled) ORDER BY name) AS capabilities
         FROM ai_capabilities
         GROUP BY category
         ORDER BY category`
      );
      return result.rows.map(r => ({
        category: r.category,
        count: r.count,
        capabilities: r.capabilities
      }));
    },

    async getCapabilitiesByProvider(providerId) {
      // Get capabilities that a provider supports (via model-caps join)
      const result = await pool.query(
        `SELECT DISTINCT c.id, c.name, c.display_name, c.category, c.icon, c.enabled, c.is_system
         FROM ai_model_capabilities mc
         JOIN ai_models m ON m.id = mc.model_id
         JOIN ai_capabilities c ON c.id = mc.capability_id
         WHERE m.provider_id = $1 AND mc.enabled = true AND m.enabled = true
         ORDER BY c.name`,
        [providerId]
      );
      return result.rows;
    }
  };
}

function toCapabilityOutput(row) {
  return {
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    description: row.description,
    category: row.category,
    icon: row.icon,
    enabled: row.enabled,
    isSystem: row.is_system,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}