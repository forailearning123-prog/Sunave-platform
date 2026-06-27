import { v4 as uuidv4 } from 'uuid';

export function createPolicyRepository(pool) {
  const list = async ({ organizationId, memoryType, isSystem, isActive, limit = 50, offset = 0 }) => {
    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (organizationId) {
      conditions.push(`(organization_id = $${idx++} OR organization_id IS NULL)`);
      params.push(organizationId);
    }
    if (memoryType) { conditions.push(`memory_type = $${idx++}`); params.push(memoryType); }
    if (isSystem !== undefined) { conditions.push(`is_system = $${idx++}`); params.push(isSystem); }
    if (isActive !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(isActive); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM memory_policies
      WHERE ${where}
      ORDER BY is_system DESC, name
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const get = async (organizationId, id) => {
    const { rows } = await pool.query(
      'SELECT * FROM memory_policies WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL)',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const getByType = async (organizationId, memoryType) => {
    const { rows } = await pool.query(
      `SELECT * FROM memory_policies
       WHERE (organization_id = $1 OR organization_id IS NULL)
         AND memory_type = $2
         AND is_active = true
       ORDER BY is_system DESC
       LIMIT 1`,
      [organizationId, memoryType]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      name, description, memoryType, retentionPeriod, maxSizeBytes,
      importanceFilter, autoArchive, archiveAfterDays, isSystem
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO memory_policies (
        id, organization_id, name, description, memory_type, retention_period,
        max_size_bytes, importance_filter, auto_archive, archive_after_days, is_system
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        id, organizationId || null, name, description || '', memoryType, retentionPeriod || 'persistent',
        maxSizeBytes || null, importanceFilter || [], autoArchive ?? false,
        archiveAfterDays || null, isSystem ?? false
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
      'name', 'description', 'retention_period', 'max_size_bytes',
      'importance_filter', 'auto_archive', 'archive_after_days', 'is_active'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE memory_policies SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(query, params);
    return rows[0];
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM memory_policies WHERE id = $1 AND (organization_id = $2 OR organization_id IS NULL) RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         memory_type,
         is_system,
         COUNT(*) as count
       FROM memory_policies
       WHERE organization_id = $1 OR organization_id IS NULL
       GROUP BY memory_type, is_system
       ORDER BY memory_type, is_system`,
      [organizationId]
    );
    return rows;
  };

  return {
    list, get, getByType, create, update, remove, getStats
  };
}