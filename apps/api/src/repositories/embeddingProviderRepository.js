import { v4 as uuidv4 } from 'uuid';

export function createEmbeddingProviderRepository(pool) {
  const list = async ({ organizationId, providerType, isActive, limit = 50, offset = 0 }) => {
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (organizationId) {
      conditions.push(`(organization_id = $${idx++} OR organization_id IS NULL)`);
      params.push(organizationId);
    }
    if (providerType) { conditions.push(`provider_type = $${idx++}`); params.push(providerType); }
    if (isActive !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(isActive); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM embedding_providers
      WHERE ${where}
      ORDER BY is_default DESC, created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const get = async (organizationId, id) => {
    const { rows } = await pool.query(
      'SELECT * FROM embedding_providers WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const getDefault = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT * FROM embedding_providers
       WHERE (organization_id = $1 OR organization_id IS NULL)
         AND is_default = true
         AND is_active = true
       ORDER BY organization_id NULLS LAST
       LIMIT 1`,
      [organizationId]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      name, providerType, displayName, description, config, credentialsEncrypted,
      isDefault, dimensions, maxTokens, costPer1kTokens, rateLimitRpm, rateLimitTpm, createdBy
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO embedding_providers (
        id, organization_id, name, provider_type, display_name, description, config,
        credentials_encrypted, is_default, dimensions, max_tokens, cost_per_1k_tokens,
        rate_limit_rpm, rate_limit_tpm, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, organizationId || null, name, providerType, displayName, description || '',
        config || {}, credentialsEncrypted || null, isDefault ?? false,
        dimensions || 1536, maxTokens || 8191, costPer1kTokens || 0,
        rateLimitRpm || null, rateLimitTpm || null, createdBy || null
      ]
    );
    return rows[0];
  };

  const update = async (organizationId, id, data) => {
    const existing = await get(organizationId, id);
    if (!existing) return null;

    const updates = [];
    const params = [id];
    let idx = 2;

    const fields = [
      'name', 'display_name', 'description', 'config', 'credentials_encrypted',
      'dimensions', 'max_tokens', 'cost_per_1k_tokens', 'rate_limit_rpm', 'rate_limit_tpm',
      'health_status', 'last_error'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }

    if (data.isActive !== undefined) {
      updates.push(`is_active = $${idx++}`);
      params.push(data.isActive);
    }
    if (data.isDefault !== undefined) {
      updates.push(`is_default = $${idx++}`);
      params.push(data.isDefault);
    }
    if (data.lastHealthCheck) {
      updates.push(`last_health_check = $${idx++}`);
      params.push(data.lastHealthCheck);
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE embedding_providers SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(query, params);
    return rows[0];
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM embedding_providers WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL) RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const setDefault = async (organizationId, id) => {
    await pool.query(
      'UPDATE embedding_providers SET is_default = false WHERE organization_id = $1',
      [organizationId]
    );
    const { rows } = await pool.query(
      'UPDATE embedding_providers SET is_default = true, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return rows[0] || null;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         provider_type,
         is_active,
         COUNT(*) as count,
         SUM(dimensions) as total_dimensions
       FROM embedding_providers
       WHERE organization_id = $1 OR organization_id IS NULL
       GROUP BY provider_type, is_active
       ORDER BY provider_type, is_active`,
      [organizationId]
    );
    return rows;
  };

  return {
    list, get, getDefault, create, update, remove, setDefault, getStats
  };
}