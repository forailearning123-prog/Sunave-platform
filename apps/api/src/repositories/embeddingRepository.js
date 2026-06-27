import { v4 as uuidv4 } from 'uuid';

export function createEmbeddingRepository(pool) {
  const list = async ({ organizationId, chunkId, providerId, limit = 50, offset = 0 }) => {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let idx = 2;

    if (chunkId) { conditions.push(`chunk_id = $${idx++}`); params.push(chunkId); }
    if (providerId) { conditions.push(`provider_id = $${idx++}`); params.push(providerId); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM embeddings
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const get = async (organizationId, id) => {
    const { rows } = await pool.query(
      'SELECT * FROM embeddings WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const getByChunk = async (organizationId, chunkId) => {
    const { rows } = await pool.query(
      'SELECT * FROM embeddings WHERE chunk_id = $1 AND organization_id = $2',
      [chunkId, organizationId]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      chunkId, providerId, vector, model, dimensions, tokenCount, costUsd, metadata
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO embeddings (
        id, organization_id, chunk_id, provider_id, vector, model, dimensions,
        token_count, cost_usd, metadata
      ) VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        id, organizationId, chunkId, providerId, vector, model, dimensions,
        tokenCount || 0, costUsd || 0, metadata || {}
      ]
    );
    return rows[0];
  };

  const batchCreate = async (organizationId, embeddings) => {
    if (embeddings.length === 0) return [];
    
    const values = [];
    const params = [];
    let idx = 1;

    for (const emb of embeddings) {
      const id = uuidv4();
      values.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}::vector, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      params.push(
        id, organizationId, emb.chunkId, emb.providerId, emb.vector, emb.model,
        emb.dimensions, emb.tokenCount || 0, emb.costUsd || 0, emb.metadata || {}
      );
    }

    const query = `
      INSERT INTO embeddings (
        id, organization_id, chunk_id, provider_id, vector, model, dimensions,
        token_count, cost_usd, metadata
      ) VALUES ${values.join(', ')}
      RETURNING *
    `;
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM embeddings WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const removeByChunk = async (organizationId, chunkId) => {
    const { rows } = await pool.query(
      'DELETE FROM embeddings WHERE chunk_id = $1 AND organization_id = $2 RETURNING id',
      [chunkId, organizationId]
    );
    return rows.length;
  };

  const removeBySource = async (organizationId, sourceId) => {
    const { rows } = await pool.query(
      `DELETE FROM embeddings
       WHERE chunk_id IN (SELECT id FROM chunks WHERE source_id = $1 AND organization_id = $2)
       AND organization_id = $2
       RETURNING id`,
      [sourceId, organizationId]
    );
    return rows.length;
  };

  const searchSimilar = async (organizationId, vector, limit = 10, threshold = 0.7) => {
    const { rows } = await pool.query(
      `SELECT 
         e.*,
         1 - (e.vector <=> $1::vector) as similarity
       FROM embeddings e
       WHERE e.organization_id = $2
       ORDER BY e.vector <=> $1::vector
       LIMIT $3`,
      [vector, organizationId, limit]
    );
    return rows;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         provider_id,
         model,
         COUNT(*) as count,
         SUM(token_count) as total_tokens,
         SUM(cost_usd) as total_cost
       FROM embeddings
       WHERE organization_id = $1
       GROUP BY provider_id, model
       ORDER BY count DESC`,
      [organizationId]
    );
    return rows;
  };

  return {
    list, get, getByChunk, create, batchCreate,
    remove, removeByChunk, removeBySource, searchSimilar, getStats
  };
}