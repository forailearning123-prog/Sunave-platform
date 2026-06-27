import { v4 as uuidv4 } from 'uuid';

export function createVectorIndexRepository(pool) {
  const list = async ({ organizationId, indexType, vectorStoreType, status, limit = 50, offset = 0 }) => {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let idx = 2;

    if (indexType) { conditions.push(`index_type = $${idx++}`); params.push(indexType); }
    if (vectorStoreType) { conditions.push(`vector_store_type = $${idx++}`); params.push(vectorStoreType); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM vector_indices
      WHERE ${where}
      ORDER BY updated_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const get = async (organizationId, id) => {
    const { rows } = await pool.query(
      'SELECT * FROM vector_indices WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      name, indexType, vectorStoreType, config, dimensions, metric
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO vector_indices (
        id, organization_id, name, index_type, vector_store_type, config,
        dimensions, metric
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        id, organizationId, name, indexType || 'ivfflat', vectorStoreType || 'pgvector',
        config || {}, dimensions, metric || 'cosine'
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
      'name', 'index_type', 'vector_store_type', 'config', 'dimensions', 'metric',
      'status', 'error_message', 'total_vectors'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }

    if (data.lastBuiltAt) {
      updates.push(`last_built_at = $${idx++}`);
      params.push(data.lastBuiltAt);
    }
    if (data.lastOptimizedAt) {
      updates.push(`last_optimized_at = $${idx++}`);
      params.push(data.lastOptimizedAt);
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE vector_indices SET ${updates.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`;
    const { rows } = await pool.query(query, params);
    return rows[0];
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM vector_indices WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const getByName = async (organizationId, name) => {
    const { rows } = await pool.query(
      'SELECT * FROM vector_indices WHERE organization_id = $1 AND name = $2',
      [organizationId, name]
    );
    return rows[0] || null;
  };

  const getReadyIndices = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT * FROM vector_indices
       WHERE organization_id = $1 AND status = 'ready'
       ORDER BY updated_at DESC`,
      [organizationId]
    );
    return rows;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         vector_store_type,
         status,
         COUNT(*) as count,
         SUM(total_vectors) as total_vectors,
         SUM(dimensions) as total_dimensions
       FROM vector_indices
       WHERE organization_id = $1
       GROUP BY vector_store_type, status
       ORDER BY vector_store_type, status`,
      [organizationId]
    );
    return rows;
  };

  return {
    list, get, create, update, remove, getByName, getReadyIndices, getStats
  };
}