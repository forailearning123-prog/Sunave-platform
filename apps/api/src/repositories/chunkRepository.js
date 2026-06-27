import { v4 as uuidv4 } from 'uuid';

export function createChunkRepository(pool) {
  const list = async ({ organizationId, sourceId, limit = 100, offset = 0 }) => {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let idx = 2;

    if (sourceId) { conditions.push(`source_id = $${idx++}`); params.push(sourceId); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM chunks
      WHERE ${where}
      ORDER BY source_id, chunk_index
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    params.push(limit, offset);
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const get = async (organizationId, id) => {
    const { rows } = await pool.query(
      'SELECT * FROM chunks WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      sourceId, chunkIndex, content, contentHash, tokenCount, charCount,
      startOffset, endOffset, pageNumber, sectionPath, language,
      chunkingStrategy, metadata
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO chunks (
        id, organization_id, source_id, chunk_index, content, content_hash,
        token_count, char_count, start_offset, end_offset, page_number,
        section_path, language, chunking_strategy, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, organizationId, sourceId, chunkIndex, content, contentHash,
        tokenCount || 0, charCount || content.length, startOffset || null,
        endOffset || null, pageNumber || null, sectionPath || [],
        language || 'en', chunkingStrategy || 'semantic', metadata || {}
      ]
    );
    return rows[0];
  };

  const batchCreate = async (organizationId, chunks) => {
    if (chunks.length === 0) return [];
    
    const values = [];
    const params = [];
    let idx = 1;

    for (const chunk of chunks) {
      const id = uuidv4();
      values.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      params.push(
        id, organizationId, chunk.sourceId, chunk.chunkIndex, chunk.content,
        chunk.contentHash, chunk.tokenCount || 0, chunk.charCount || chunk.content.length,
        chunk.startOffset || null, chunk.endOffset || null, chunk.pageNumber || null,
        chunk.sectionPath || [], chunk.language || 'en',
        chunk.chunkingStrategy || 'semantic', chunk.metadata || {}
      );
    }

    const query = `
      INSERT INTO chunks (
        id, organization_id, source_id, chunk_index, content, content_hash,
        token_count, char_count, start_offset, end_offset, page_number,
        section_path, language, chunking_strategy, metadata
      ) VALUES ${values.join(', ')}
      RETURNING *
    `;
    const { rows } = await pool.query(query, params);
    return rows;
  };

  const getBySource = async (organizationId, sourceId) => {
    const { rows } = await pool.query(
      `SELECT * FROM chunks
       WHERE organization_id = $1 AND source_id = $2
       ORDER BY chunk_index`,
      [organizationId, sourceId]
    );
    return rows;
  };

  const getByHash = async (organizationId, contentHash) => {
    const { rows } = await pool.query(
      'SELECT * FROM chunks WHERE organization_id = $1 AND content_hash = $2',
      [organizationId, contentHash]
    );
    return rows[0] || null;
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM chunks WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const removeBySource = async (organizationId, sourceId) => {
    const { rows } = await pool.query(
      'DELETE FROM chunks WHERE organization_id = $1 AND source_id = $2 RETURNING id',
      [organizationId, sourceId]
    );
    return rows.length;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         chunking_strategy,
         COUNT(*) as count,
         SUM(token_count) as total_tokens,
         SUM(char_count) as total_chars
       FROM chunks
       WHERE organization_id = $1
       GROUP BY chunking_strategy
       ORDER BY count DESC`,
      [organizationId]
    );
    return rows;
  };

  return {
    list, get, create, batchCreate, getBySource, getByHash,
    remove, removeBySource, getStats
  };
}