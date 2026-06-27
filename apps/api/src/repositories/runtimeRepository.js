import { v4 as uuid } from 'uuid';

export function createRuntimeRepository(pool) {
  return {
    async createExecution(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO runtime_executions (id, organization_id, user_id, conversation_id, prompt_id, capability, status,
           request_body, resolved_prompt, resolved_system_prompt, retry_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [id, input.organizationId, input.userId || null, input.conversationId || null,
         input.promptId || null, input.capability, input.status || 'pending',
         JSON.stringify(input.requestBody || {}), input.resolvedPrompt || null,
         input.resolvedSystemPrompt || null, input.retryCount || 0]
      );
      return toExecutionOutput(result.rows[0]);
    },

    async updateExecution(id, input) {
      const fields = [];
      const params = [id];
      let idx = 2;

      if (input.status !== undefined) { fields.push(`status = $${idx++}`); params.push(input.status); }
      if (input.responseBody !== undefined) { fields.push(`response_body = $${idx++}`); params.push(input.responseBody); }
      if (input.responseStatus !== undefined) { fields.push(`response_status = $${idx++}`); params.push(input.responseStatus); }
      if (input.executionTimeMs !== undefined) { fields.push(`execution_time_ms = $${idx++}`); params.push(input.executionTimeMs); }
      if (input.latencyMs !== undefined) { fields.push(`latency_ms = $${idx++}`); params.push(input.latencyMs); }
      if (input.provider !== undefined) { fields.push(`provider = $${idx++}`); params.push(input.provider); }
      if (input.model !== undefined) { fields.push(`model = $${idx++}`); params.push(input.model); }
      if (input.promptTokens !== undefined) { fields.push(`prompt_tokens = $${idx++}`); params.push(input.promptTokens); }
      if (input.completionTokens !== undefined) { fields.push(`completion_tokens = $${idx++}`); params.push(input.completionTokens); }
      if (input.totalTokens !== undefined) { fields.push(`total_tokens = $${idx++}`); params.push(input.totalTokens); }
      if (input.estimatedCostUsd !== undefined) { fields.push(`estimated_cost_usd = $${idx++}`); params.push(input.estimatedCostUsd); }
      if (input.actualCostUsd !== undefined) { fields.push(`actual_cost_usd = $${idx++}`); params.push(input.actualCostUsd); }
      if (input.errorMessage !== undefined) { fields.push(`error_message = $${idx++}`); params.push(input.errorMessage); }
      if (input.errorCode !== undefined) { fields.push(`error_code = $${idx++}`); params.push(input.errorCode); }

      if (input.status === 'completed' || input.status === 'failed' || input.status === 'cancelled') {
        fields.push(`completed_at = NOW()`);
      }

      if (fields.length === 0) return null;
      const result = await pool.query(
        `UPDATE runtime_executions SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );
      return result.rows[0] ? toExecutionOutput(result.rows[0]) : null;
    },

    async findExecution(id) {
      const result = await pool.query(
        `SELECT re.*, u.display_name AS user_name, c.title AS conversation_title
         FROM runtime_executions re
         LEFT JOIN users u ON u.id = re.user_id
         LEFT JOIN conversations c ON c.id = re.conversation_id
         WHERE re.id = $1`,
        [id]
      );
      return result.rows[0] ? toExecutionOutput(result.rows[0]) : null;
    },

    async listExecutions({ organizationId, userId, conversationId, capability, status, limit = 50, offset = 0 } = {}) {
      const conditions = [`re.organization_id = $1`];
      const params = [organizationId];
      let idx = 2;

      if (userId) { conditions.push(`re.user_id = $${idx++}`); params.push(userId); }
      if (conversationId) { conditions.push(`re.conversation_id = $${idx++}`); params.push(conversationId); }
      if (capability) { conditions.push(`re.capability = $${idx++}`); params.push(capability); }
      if (status) { conditions.push(`re.status = $${idx++}`); params.push(status); }

      const where = conditions.join(' AND ');
      const result = await pool.query(
        `SELECT re.*, u.display_name AS user_name, c.title AS conversation_title
         FROM runtime_executions re
         LEFT JOIN users u ON u.id = re.user_id
         LEFT JOIN conversations c ON c.id = re.conversation_id
         WHERE ${where}
         ORDER BY re.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      );
      return result.rows.map(toExecutionOutput);
    },

    async getRuntimeStats(organizationId) {
      const result = await pool.query(
        `SELECT
           COUNT(*)::int AS total_executions,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE status = 'running')::int AS running,
           COALESCE(AVG(execution_time_ms) FILTER (WHERE status = 'completed'), 0)::int AS avg_execution_time_ms,
           COALESCE(SUM(total_tokens) FILTER (WHERE status = 'completed'), 0)::bigint AS total_tokens,
           COALESCE(SUM(estimated_cost_usd) FILTER (WHERE status = 'completed'), 0) AS total_estimated_cost,
           COALESCE(SUM(actual_cost_usd) FILTER (WHERE status = 'completed'), 0) AS total_actual_cost
         FROM runtime_executions WHERE organization_id = $1`,
        [organizationId]
      );
      return result.rows[0];
    },

    async getMostUsedPrompts(organizationId, limit = 5) {
      const result = await pool.query(
        `SELECT pt.id, pt.name, pt.description, pc.display_name AS category_name,
                COUNT(re.id)::int AS execution_count,
                AVG(re.execution_time_ms)::int AS avg_execution_time_ms
         FROM runtime_executions re
         JOIN prompt_templates pt ON pt.id = re.prompt_id
         LEFT JOIN prompt_categories pc ON pc.id = pt.category_id
         WHERE re.organization_id = $1 AND re.prompt_id IS NOT NULL
         GROUP BY pt.id, pt.name, pt.description, pc.display_name
         ORDER BY execution_count DESC LIMIT $2`,
        [organizationId, limit]
      );
      return result.rows;
    },

    async getRecentExecutions(organizationId, limit = 10) {
      const result = await pool.query(
        `SELECT re.id, re.capability, re.status, re.execution_time_ms, re.total_tokens,
                re.estimated_cost_usd, re.error_message, re.created_at,
                pt.name AS prompt_name, u.display_name AS user_name
         FROM runtime_executions re
         LEFT JOIN prompt_templates pt ON pt.id = re.prompt_id
         LEFT JOIN users u ON u.id = re.user_id
         WHERE re.organization_id = $1
         ORDER BY re.created_at DESC LIMIT $2`,
        [organizationId, limit]
      );
      return result.rows;
    },

    // ─── Logs ────────────────────────────────────────────────────────────

    async createLog(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO runtime_logs (id, execution_id, organization_id, level, message, metadata)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [id, input.executionId || null, input.organizationId, input.level || 'info',
         input.message, JSON.stringify(input.metadata || {})]
      );
      return result.rows[0];
    },

    async listLogs({ executionId, organizationId, level, limit = 50 } = {}) {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (executionId) { conditions.push(`execution_id = $${idx++}`); params.push(executionId); }
      if (organizationId) { conditions.push(`organization_id = $${idx++}`); params.push(organizationId); }
      if (level) { conditions.push(`level = $${idx++}`); params.push(level); }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT * FROM runtime_logs ${where} ORDER BY created_at DESC LIMIT $${idx++}`,
        [...params, limit]
      );
      return result.rows;
    }
  };
}

function toExecutionOutput(row) {
  return {
    id: row.id, organizationId: row.organization_id, userId: row.user_id,
    userName: row.user_name, conversationId: row.conversation_id,
    conversationTitle: row.conversation_title, promptId: row.prompt_id,
    capability: row.capability, status: row.status,
    requestBody: row.request_body, resolvedPrompt: row.resolved_prompt,
    resolvedSystemPrompt: row.resolved_system_prompt, responseBody: row.response_body,
    responseStatus: row.response_status, executionTimeMs: row.execution_time_ms,
    latencyMs: row.latency_ms, retryCount: row.retry_count,
    provider: row.provider, model: row.model,
    promptTokens: row.prompt_tokens, completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    estimatedCostUsd: row.estimated_cost_usd ? Number(row.estimated_cost_usd) : 0,
    actualCostUsd: row.actual_cost_usd ? Number(row.actual_cost_usd) : null,
    errorMessage: row.error_message, errorCode: row.error_code,
    createdAt: row.created_at, completedAt: row.completed_at
  };
}