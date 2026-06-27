import { v4 as uuid } from 'uuid';

export function createConversationRepository(pool) {
  return {
    async listConversations({ organizationId, userId, type, status, search, tags, pinned, favorite, limit = 50, offset = 0 } = {}) {
      const conditions = [`c.organization_id = $1`];
      const params = [organizationId];
      let idx = 2;

      if (userId) { conditions.push(`c.user_id = $${idx++}`); params.push(userId); }
      if (type) { conditions.push(`c.type = $${idx++}`); params.push(type); }
      if (status) { conditions.push(`c.status = $${idx++}`); params.push(status); }
      if (pinned) { conditions.push(`c.pinned = true`); }
      if (favorite) { conditions.push(`c.favorite = true`); }
      if (search) { conditions.push(`(c.title ILIKE $${idx} OR c.description ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
      if (tags && tags.length > 0) { conditions.push(`c.tags && $${idx++}`); params.push(tags); }

      const where = conditions.join(' AND ');
      const result = await pool.query(
        `SELECT c.*, u.display_name AS user_name,
                (SELECT COUNT(*)::int FROM conversation_messages WHERE conversation_id = c.id) AS message_count
         FROM conversations c
         JOIN users u ON u.id = c.user_id
         WHERE ${where}
         ORDER BY c.pinned DESC, c.updated_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      );
      return result.rows.map(toConversationOutput);
    },

    async findConversation(id) {
      const result = await pool.query(
        `SELECT c.*, u.display_name AS user_name,
                (SELECT COUNT(*)::int FROM conversation_messages WHERE conversation_id = c.id) AS message_count
         FROM conversations c
         JOIN users u ON u.id = c.user_id
         WHERE c.id = $1`,
        [id]
      );
      return result.rows[0] ? toConversationOutput(result.rows[0]) : null;
    },

    async createConversation(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO conversations (id, organization_id, user_id, title, description, type, status, context, system_prompt, capability, model_policy, pinned, favorite, tags, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [id, input.organizationId, input.userId, input.title || 'New Conversation', input.description || '',
         input.type || 'chat', input.status || 'active', JSON.stringify(input.context || {}),
         input.systemPrompt || null, input.capability || null, JSON.stringify(input.modelPolicy || {}),
         input.pinned ?? false, input.favorite ?? false, input.tags || [], JSON.stringify(input.metadata || {})]
      );
      return toConversationOutput(result.rows[0]);
    },

    async updateConversation(id, input) {
      const result = await pool.query(
        `UPDATE conversations SET
           title = COALESCE($2, title), description = COALESCE($3, description),
           type = COALESCE($4, type), status = COALESCE($5, status),
           context = CASE WHEN $6 IS NOT NULL THEN $6::jsonb ELSE context END,
           system_prompt = COALESCE($7, system_prompt), capability = COALESCE($8, capability),
           model_policy = CASE WHEN $9 IS NOT NULL THEN $9::jsonb ELSE model_policy END,
           pinned = COALESCE($10, pinned), favorite = COALESCE($11, favorite),
           tags = COALESCE($12, tags), metadata = CASE WHEN $13 IS NOT NULL THEN $13::jsonb ELSE metadata END,
           updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, input.title, input.description, input.type, input.status,
         input.context ? JSON.stringify(input.context) : null, input.systemPrompt, input.capability,
         input.modelPolicy ? JSON.stringify(input.modelPolicy) : null,
         input.pinned, input.favorite, input.tags, input.metadata ? JSON.stringify(input.metadata) : null]
      );
      return result.rows[0] ? toConversationOutput(result.rows[0]) : null;
    },

    async deleteConversation(id) {
      await pool.query(`UPDATE conversations SET status = 'deleted', updated_at = NOW() WHERE id = $1`, [id]);
    },

    async archiveConversation(id) {
      await pool.query(`UPDATE conversations SET status = 'archived', updated_at = NOW() WHERE id = $1`, [id]);
    },

    async duplicateConversation(id, newUserId, organizationId) {
      const orig = await this.findConversation(id);
      if (!orig) return null;
      const messages = await this.listMessages(id);
      const conv = await this.createConversation({
        organizationId, userId: newUserId, title: `${orig.title} (Copy)`, type: orig.type,
        context: orig.context, systemPrompt: orig.systemPrompt, capability: orig.capability
      });
      for (const msg of messages) {
        await this.createMessage(conv.id, {
          role: msg.role, content: msg.content, attachments: msg.attachments,
          metadata: msg.metadata, toolCalls: msg.toolCalls,
          provider: msg.provider, model: msg.model
        });
      }
      return conv;
    },

    async togglePin(id, pinned) {
      await pool.query(`UPDATE conversations SET pinned = $2, updated_at = NOW() WHERE id = $1`, [id, pinned]);
    },

    async toggleFavorite(id, favorite) {
      await pool.query(`UPDATE conversations SET favorite = $2, updated_at = NOW() WHERE id = $1`, [id, favorite]);
    },

    async getConversationCounts(organizationId) {
      const result = await pool.query(
        `SELECT status, COUNT(*)::int AS count FROM conversations WHERE organization_id = $1 GROUP BY status`,
        [organizationId]
      );
      return result.rows;
    },

    // ─── Messages ──────────────────────────────────────────────────────────

    async listMessages(conversationId, { limit = 100, offset = 0 } = {}) {
      const result = await pool.query(
        `SELECT * FROM conversation_messages WHERE conversation_id = $1
         ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
        [conversationId, limit, offset]
      );
      return result.rows.map(toMessageOutput);
    },

    async createMessage(conversationId, input) {
      const id = uuid();
      await pool.query(
        `UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );
      const result = await pool.query(
        `INSERT INTO conversation_messages (id, conversation_id, role, content, attachments, metadata, tool_calls,
           execution_time_ms, token_usage, provider, model, input_cost_usd, output_cost_usd, total_cost_usd)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
        [id, conversationId, input.role, input.content, JSON.stringify(input.attachments || []),
         JSON.stringify(input.metadata || {}), JSON.stringify(input.toolCalls || []),
         input.executionTimeMs || null, JSON.stringify(input.tokenUsage || {}),
         input.provider || null, input.model || null,
         input.inputCostUsd || null, input.outputCostUsd || null, input.totalCostUsd || null]
      );
      return toMessageOutput(result.rows[0]);
    },

    async getMessageCount(conversationId) {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM conversation_messages WHERE conversation_id = $1`,
        [conversationId]
      );
      return result.rows[0].count;
    }
  };
}

function toConversationOutput(row) {
  return {
    id: row.id, organizationId: row.organization_id, userId: row.user_id, userName: row.user_name,
    title: row.title, description: row.description, type: row.type, status: row.status,
    context: row.context, systemPrompt: row.system_prompt, capability: row.capability,
    modelPolicy: row.model_policy, pinned: row.pinned, favorite: row.favorite,
    tags: row.tags, metadata: row.metadata, messageCount: row.message_count || 0,
    lastMessageAt: row.last_message_at, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function toMessageOutput(row) {
  return {
    id: row.id, conversationId: row.conversation_id, role: row.role, content: row.content,
    attachments: row.attachments, metadata: row.metadata, toolCalls: row.tool_calls,
    executionTimeMs: row.execution_time_ms, tokenUsage: row.token_usage,
    provider: row.provider, model: row.model,
    inputCostUsd: row.input_cost_usd ? Number(row.input_cost_usd) : null,
    outputCostUsd: row.output_cost_usd ? Number(row.output_cost_usd) : null,
    totalCostUsd: row.total_cost_usd ? Number(row.total_cost_usd) : null,
    createdAt: row.created_at
  };
}