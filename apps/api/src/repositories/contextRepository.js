import { v4 as uuidv4 } from 'uuid';

export function createContextRepository(pool) {
  const list = async ({ organizationId, contextType, conversationId, userId, limit = 50, offset = 0 }) => {
    const conditions = ['organization_id = $1'];
    const params = [organizationId];
    let idx = 2;

    if (contextType) { conditions.push(`context_type = $${idx++}`); params.push(contextType); }
    if (conversationId) { conditions.push(`conversation_id = $${idx++}`); params.push(conversationId); }
    if (userId) { conditions.push(`user_id = $${idx++}`); params.push(userId); }

    const where = conditions.join(' AND ');
    const query = `
      SELECT * FROM contexts
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
      'SELECT * FROM contexts WHERE id = $1 AND organization_id = $2',
      [id, organizationId]
    );
    return rows[0] || null;
  };

  const create = async (organizationId, data) => {
    const id = uuidv4();
    const {
      conversationId, userId, contextType, contextData, assembledContext,
      contextSizeTokens, contextWindowBudget, usedTokens, sources, rankingMetadata
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO contexts (
        id, organization_id, conversation_id, user_id, context_type, context_data,
        assembled_context, context_size_tokens, context_window_budget, used_tokens,
        sources, ranking_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id, organizationId, conversationId || null, userId || null, contextType,
        contextData || {}, assembledContext || null, contextSizeTokens || null,
        contextWindowBudget || 4096, usedTokens || 0, sources || [], rankingMetadata || {}
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
      'context_data', 'assembled_context', 'context_size_tokens',
      'context_window_budget', 'used_tokens', 'sources', 'ranking_metadata'
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) return existing;

    updates.push(`updated_at = NOW()`);
    const query = `UPDATE contexts SET ${updates.join(', ')} WHERE id = $1 AND organization_id = $2 RETURNING *`;
    const { rows } = await pool.query(query, params);
    return rows[0];
  };

  const remove = async (organizationId, id) => {
    const { rows } = await pool.query(
      'DELETE FROM contexts WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );
    return rows.length > 0;
  };

  const getByConversation = async (organizationId, conversationId, limit = 10) => {
    const { rows } = await pool.query(
      `SELECT * FROM contexts
       WHERE organization_id = $1 AND conversation_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [organizationId, conversationId, limit]
    );
    return rows;
  };

  const getStats = async (organizationId) => {
    const { rows } = await pool.query(
      `SELECT
         context_type,
         COUNT(*) as count,
         AVG(context_size_tokens) as avg_tokens,
         SUM(used_tokens) as total_tokens_used
       FROM contexts
       WHERE organization_id = $1
       GROUP BY context_type
       ORDER BY count DESC`,
      [organizationId]
    );
    return rows;
  };

  return {
    list, get, create, update, remove, getByConversation, getStats
  };
}