import { v4 as uuidv4 } from 'uuid';

export function createMemoryRepository(pool) {
  const list = async ({ organizationId, ownerType, ownerId, memoryType, importance, limit = 50, offset = 0 }) => {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let idx = 2;

    if (ownerType) { conditions.push(`owner_type = $${idx++}`); params.push(ownerType); }
    if (ownerId) { conditions.push(`owner_id = $${idx++}`); params.push(ownerId); }
    if (memoryType) { conditions.push(`memory_type = $${idx++}`); params.push(memoryType); }
    if (importance) { conditions.push(`importance = $${idx++}`); params.push(importance); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM memories
      WHERE ${where}
      ORDER BY importance DESC, accessed_at DESC NULLS LAST, created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const get = async (organizationId, id) => {
    const { rows } = await pool.query(
      'SELECT * FROM memories WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      ownerType, ownerId, memoryType, title, summary, content,
      embeddingReference, tags, importance, confidence, expiresAt, createdBy, metadata
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO memories (
        id, organization_id, owner_type, owner_id, memory_type, title, summary, content,
        embedding_reference, tags, importance, confidence, expires_at, created_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, organizationId, ownerType, ownerId, memoryType, title, summary || null,
        content, embeddingReference || null, tags || [], importance || 'medium',
        confidence ?? 1.0, expiresAt || null, createdBy || null, metadata || {}
      ]
    );
    return rows[0];
  };

  const update = async (organizationId, id, data) => {
    const existing = await get(organizationId, id);
    if (!existing) return null;

    const updates = [];
    const params = [id, organizationId];
    let idx = 3;

    const fields = [
      'title', 'summary', 'content', 'embedding_reference', 'tags',
      'importance', 'confidence', 'expires_at', 'metadata'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }

    if (data.accessedAt) {
      updates.push(`accessed_at = $${idx++}`);
      params.push(data.accessedAt);
    }
    if (data.accessCount !== undefined) {
      updates.push(`access_count = $${idx++}`);
      params.push(data.accessCount);
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE memories SET ${updates.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`;
    const { rows } = await pool.query(query, params);
    return rows[0];
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM memories WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const incrementAccess = async (organizationId, id) => {
    const { rows } = await pool.query(
      `UPDATE memories
       SET access_count = access_count + 1, accessed_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const getByOwner = async (organizationId, ownerType, ownerId, memoryType) => {
    const conditions = ['organization_id = $1', 'owner_type = $2', 'owner_id = $3'];
    const params = [organizationId, ownerType, ownerId];
    let idx = 4;

    if (memoryType) {
      conditions.push(`memory_type = $${idx++}`);
      params.push(memoryType);
    }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM memories
      WHERE ${where}
      ORDER BY importance DESC, created_at DESC
    `;
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const search = async (organizationId, query, options = {}) => {
    const { limit = 20, offset = 0, memoryType, minImportance } = options;
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let idx = 2;

    if (query) {
      conditions.push(`(title ILIKE $${idx} OR summary ILIKE $${idx} OR content ILIKE $${idx})`);
      params.push(`%${query}%`);
      idx++;
    }

    if (memoryType) {
      conditions.push(`memory_type = $${idx++}`);
      params.push(memoryType);
    }

    if (minImportance) {
      const importanceLevels = ['low', 'medium', 'high', 'critical', 'pinned'];
      const minIdx = importanceLevels.indexOf(minImportance);
      if (minIdx >= 0) {
        const allowed = importanceLevels.slice(minIdx);
        conditions.push(`importance = ANY($${idx++})`);
        params.push(allowed);
      }
    }

    const where = conditions.join(' AND ');
    const sqlQuery = `
      SELECT * FROM memories
      WHERE ${where}
      ORDER BY importance DESC, access_count DESC, created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const { rows } = await pool.query(sqlQuery, params);
    return rows;
  };

  const archiveExpired = async (organizationId) => {
    const { rows } = await pool.query(
      `UPDATE memories
       SET importance = 'archived', updated_at = NOW()
       WHERE organization_id = $1
         AND expires_at IS NOT NULL
         AND expires_at < NOW()
         AND importance != 'archived'
       RETURNING id`,
      [organizationId]
    );
    return rows;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         memory_type,
         importance,
         COUNT(*) as count,
         SUM(LENGTH(content)) as total_size
       FROM memories
       WHERE organization_id = $1
       GROUP BY memory_type, importance
       ORDER BY memory_type, importance`,
      [organizationId]
    );
    return rows;
  };

  return {
    list, get, create, update, remove, incrementAccess,
    getByOwner, search, archiveExpired, getStats
  };
}