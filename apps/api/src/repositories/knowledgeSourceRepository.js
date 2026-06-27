import { v4 as uuidv4 } from 'uuid';

export function createKnowledgeSourceRepository(pool) {
  const list = async ({ organizationId, sourceType, status, categoryId, limit = 50, offset = 0 }) => {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let idx = 2;

    if (sourceType) { conditions.push(`source_type = $${idx++}`); params.push(sourceType); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (categoryId) { conditions.push(`category_id = $${idx++}`); params.push(categoryId); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM knowledge_sources
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
      'SELECT * FROM knowledge_sources WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      categoryId, name, description, sourceType, sourceIdentifier,
      sourceMetadata, isPublic, permissions, tags, createdBy
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO knowledge_sources (
        id, organization_id, category_id, name, description, source_type,
        source_identifier, source_metadata, is_public, permissions, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id, organizationId, categoryId || null, name, description || '', sourceType,
        sourceIdentifier, sourceMetadata || {}, isPublic ?? false, permissions || {}, tags || [],
        createdBy || null
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
      'category_id', 'name', 'description', 'source_metadata', 'status',
      'indexing_progress', 'error_message', 'chunk_count', 'token_count',
      'is_public', 'permissions', 'tags', 'last_indexed_at'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE knowledge_sources SET ${updates.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`;
    const { rows } = await pool.query(query, params);
    return rows[0];
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM knowledge_sources WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const findByIdentifier = async (organizationId, sourceType, sourceIdentifier) => {
    const { rows } = await pool.query(
      `SELECT * FROM knowledge_sources
       WHERE organization_id = $1 AND source_type = $2 AND source_identifier = $3`,
      [organizationId, sourceType, sourceIdentifier]
    );
    return rows[0] || null;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         source_type,
         status,
         COUNT(*) as count,
         SUM(chunk_count) as total_chunks,
         SUM(token_count) as total_tokens
       FROM knowledge_sources
       WHERE organization_id = $1
       GROUP BY source_type, status
       ORDER BY source_type, status`,
      [organizationId]
    );
    return rows;
  };

  const incrementChunks = async (organizationId, id, chunkCount, tokenCount) => {
    const { rows } = await pool.query(
      `UPDATE knowledge_sources
       SET chunk_count = chunk_count + $1,
           token_count = token_count + $2,
           updated_at = NOW()
       WHERE id = $3 AND organization_id = $4
       RETURNING *`,
      [chunkCount, tokenCount, id, organizationId]
    );
    return rows[0] || null;
  };

  return {
    list, get, create, update, remove, findByIdentifier,
    getStats, incrementChunks
  };
}