import { v4 as uuid } from 'uuid';

/**
 * AI Usage & Cost Repository
 * Data access layer for usage tracking, token usage, cost summaries, and budgets.
 * Tables: ai_usage, ai_token_usage, ai_cost_summary, ai_budgets
 */
export function createAiUsageRepository(pool) {
  return {

    // ─── Usage Tracking ──────────────────────────────────────────────────

    async recordUsage(data) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_token_usage (
           id, organization_id, user_id, provider_id, model_id, capability_id,
           session_id, request_id, prompt_tokens, completion_tokens, total_tokens,
           estimated_cost_usd, actual_cost_usd, latency_ms, success, error_message
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          id, data.organizationId || null, data.userId || null,
          data.providerId, data.modelId || null, data.capabilityId || null,
          data.sessionId || null, data.requestId || null,
          data.promptTokens || 0, data.completionTokens || 0,
          (data.promptTokens || 0) + (data.completionTokens || 0),
          data.estimatedCostUsd || 0, data.actualCostUsd || null,
          data.latencyMs || null, data.success ?? true, data.errorMessage || null
        ]
      );
      return result.rows[0];
    },

    async listTokenUsage({
      organizationId = null,
      providerId = null,
      modelId = null,
      startDate = null,
      endDate = null,
      limit = 50,
      offset = 0
    } = {}) {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (organizationId) {
        conditions.push(`organization_id = $${idx++}`);
        params.push(organizationId);
      }
      if (providerId) {
        conditions.push(`provider_id = $${idx++}`);
        params.push(providerId);
      }
      if (modelId) {
        conditions.push(`model_id = $${idx++}`);
        params.push(modelId);
      }
      if (startDate) {
        conditions.push(`usage_date >= $${idx++}`);
        params.push(startDate);
      }
      if (endDate) {
        conditions.push(`usage_date <= $${idx++}`);
        params.push(endDate);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT t.*, p.name AS provider_name, m.name AS model_name, c.display_name AS capability_name
         FROM ai_token_usage t
         LEFT JOIN ai_providers p ON p.id = t.provider_id
         LEFT JOIN ai_models m ON m.id = t.model_id
         LEFT JOIN ai_capabilities c ON c.id = t.capability_id
         ${where}
         ORDER BY t.created_at DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]
      );
      return result.rows;
    },

    // ─── Aggregated Usage ────────────────────────────────────────────────

    async upsertAggregatedUsage(data) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_usage (
           id, organization_id, user_id, provider_id, model_id, capability_id,
           request_count, input_tokens, output_tokens, total_tokens,
           total_latency_ms, avg_latency_ms, success_count, error_count,
           period_start, period_end, period_type
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (organization_id, provider_id, model_id, capability_id, period_start, period_type)
         DO UPDATE SET
           request_count   = ai_usage.request_count + EXCLUDED.request_count,
           input_tokens    = ai_usage.input_tokens + EXCLUDED.input_tokens,
           output_tokens   = ai_usage.output_tokens + EXCLUDED.output_tokens,
           total_tokens    = ai_usage.total_tokens + EXCLUDED.total_tokens,
           total_latency_ms = ai_usage.total_latency_ms + EXCLUDED.total_latency_ms,
           avg_latency_ms  = (ai_usage.total_latency_ms + EXCLUDED.total_latency_ms) /
                             (ai_usage.request_count + EXCLUDED.request_count),
           success_count   = ai_usage.success_count + EXCLUDED.success_count,
           error_count     = ai_usage.error_count + EXCLUDED.error_count
         RETURNING *`,
        [
          id, data.organizationId || null, data.userId || null,
          data.providerId || null, data.modelId || null, data.capabilityId || null,
          data.requestCount || 1, data.inputTokens || 0, data.outputTokens || 0,
          (data.inputTokens || 0) + (data.outputTokens || 0),
          data.totalLatencyMs || 0, data.avgLatencyMs || null,
          data.successCount ?? 1, data.errorCount ?? 0,
          data.periodStart, data.periodEnd, data.periodType || 'daily'
        ]
      );
      return result.rows[0];
    },

    async getUsageStats({
      organizationId = null,
      providerId = null,
      modelId = null,
      startDate = null,
      endDate = null,
      periodType = 'daily',
      groupBy = 'day'
    } = {}) {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (organizationId) {
        conditions.push(`organization_id = $${idx++}`);
        params.push(organizationId);
      }
      if (providerId) {
        conditions.push(`provider_id = $${idx++}`);
        params.push(providerId);
      }
      if (modelId) {
        conditions.push(`model_id = $${idx++}`);
        params.push(modelId);
      }
      if (startDate) {
        conditions.push(`period_start >= $${idx++}`);
        params.push(startDate);
      }
      if (endDate) {
        conditions.push(`period_end <= $${idx++}`);
        params.push(endDate);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let groupByClause;
      let dateTrunc;
      switch (groupBy) {
        case 'month':
          dateTrunc = 'date_trunc(\'month\', period_start)';
          break;
        case 'year':
          dateTrunc = 'date_trunc(\'year\', period_start)';
          break;
        default:
          dateTrunc = 'period_start';
      }

      const result = await pool.query(
        `SELECT ${dateTrunc} AS period,
                SUM(request_count) AS total_requests,
                SUM(input_tokens) AS total_input_tokens,
                SUM(output_tokens) AS total_output_tokens,
                SUM(total_tokens) AS total_tokens,
                SUM(success_count) AS total_success,
                SUM(error_count) AS total_errors,
                CASE WHEN SUM(request_count) > 0
                  THEN ROUND((SUM(error_count)::numeric / SUM(request_count)::numeric) * 100, 2)
                  ELSE 0
                END AS error_rate
         FROM ai_usage
         ${where}
         GROUP BY ${dateTrunc}
         ORDER BY period DESC`,
        params
      );
      return result.rows;
    },

    // ─── Cost Tracking ───────────────────────────────────────────────────

    async upsertCostSummary(data) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_cost_summary (
           id, organization_id, provider_id, model_id,
           estimated_cost, actual_cost, currency,
           token_count, request_count,
           period_start, period_end, period_type
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (organization_id, provider_id, model_id, period_start, period_type)
         DO UPDATE SET
           estimated_cost = ai_cost_summary.estimated_cost + EXCLUDED.estimated_cost,
           actual_cost    = COALESCE(ai_cost_summary.actual_cost, 0) + COALESCE(EXCLUDED.actual_cost, 0),
           token_count    = ai_cost_summary.token_count + EXCLUDED.token_count,
           request_count  = ai_cost_summary.request_count + EXCLUDED.request_count
         RETURNING *`,
        [
          id, data.organizationId || null, data.providerId || null,
          data.modelId || null, data.estimatedCost || 0, data.actualCost || null,
          data.currency || 'USD', data.tokenCount || 0, data.requestCount || 1,
          data.periodStart, data.periodEnd, data.periodType || 'daily'
        ]
      );
      return result.rows[0];
    },

    async getCostStats({
      organizationId = null,
      providerId = null,
      modelId = null,
      startDate = null,
      endDate = null,
      groupBy = 'day'
    } = {}) {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (organizationId) {
        conditions.push(`organization_id = $${idx++}`);
        params.push(organizationId);
      }
      if (providerId) {
        conditions.push(`provider_id = $${idx++}`);
        params.push(providerId);
      }
      if (modelId) {
        conditions.push(`model_id = $${idx++}`);
        params.push(modelId);
      }
      if (startDate) {
        conditions.push(`period_start >= $${idx++}`);
        params.push(startDate);
      }
      if (endDate) {
        conditions.push(`period_end <= $${idx++}`);
        params.push(endDate);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      let dateTrunc;
      switch (groupBy) {
        case 'month':
          dateTrunc = 'date_trunc(\'month\', period_start)';
          break;
        case 'year':
          dateTrunc = 'date_trunc(\'year\', period_start)';
          break;
        default:
          dateTrunc = 'period_start';
      }

      const result = await pool.query(
        `SELECT ${dateTrunc} AS period,
                SUM(estimated_cost) AS total_estimated_cost,
                SUM(COALESCE(actual_cost, 0)) AS total_actual_cost,
                SUM(token_count) AS total_tokens,
                SUM(request_count) AS total_requests,
                COUNT(DISTINCT provider_id) AS active_providers,
                COUNT(DISTINCT model_id) AS active_models
         FROM ai_cost_summary
         ${where}
         GROUP BY ${dateTrunc}
         ORDER BY period DESC`,
        params
      );
      return result.rows;
    },

    async getMonthlyCost(organizationId) {
      const result = await pool.query(
        `SELECT COALESCE(SUM(estimated_cost), 0) AS total_estimated,
                COALESCE(SUM(COALESCE(actual_cost, 0)), 0) AS total_actual
         FROM ai_cost_summary
         WHERE organization_id = $1
           AND period_type = 'monthly'
           AND period_start >= date_trunc('month', CURRENT_DATE)
           AND period_end < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
        [organizationId]
      );
      return result.rows[0] || { totalEstimated: 0, totalActual: 0 };
    },

    // ─── Budget ──────────────────────────────────────────────────────────

    async listBudgets(organizationId) {
      const result = await pool.query(
        `SELECT * FROM ai_budgets WHERE organization_id = $1 ORDER BY created_at DESC`,
        [organizationId]
      );
      return result.rows;
    },

    async findBudget(id) {
      const result = await pool.query(
        `SELECT * FROM ai_budgets WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    },

    async createBudget(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_budgets (
           id, organization_id, name, scope, scope_id,
           monthly_limit, yearly_limit, token_limit, request_limit,
           alert_threshold, alert_emails, enabled, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          id, input.organizationId, input.name,
          input.scope || 'organization', input.scopeId || null,
          input.monthlyLimit || null, input.yearlyLimit || null,
          input.tokenLimit || null, input.requestLimit || null,
          input.alertThreshold ?? 80,
          input.alertEmails || [],
          input.enabled ?? true, input.createdBy || null
        ]
      );
      return result.rows[0];
    },

    async updateBudget(id, input) {
      const result = await pool.query(
        `UPDATE ai_budgets SET
           name            = COALESCE($2, name),
           monthly_limit   = COALESCE($3, monthly_limit),
           yearly_limit    = COALESCE($4, yearly_limit),
           token_limit     = COALESCE($5, token_limit),
           request_limit   = COALESCE($6, request_limit),
           alert_threshold = COALESCE($7, alert_threshold),
           alert_emails    = COALESCE($8, alert_emails),
           enabled         = COALESCE($9, enabled),
           updated_at      = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id, input.name, input.monthlyLimit, input.yearlyLimit,
          input.tokenLimit, input.requestLimit,
          input.alertThreshold, input.alertEmails, input.enabled
        ]
      );
      return result.rows[0] || null;
    },

    async deleteBudget(id) {
      const result = await pool.query(
        `DELETE FROM ai_budgets WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rows[0] || null;
    },

    // ─── Statistics ──────────────────────────────────────────────────────

    async getDashboardStats(organizationId, periodStart, periodEnd) {
      const result = await pool.query(
        `SELECT
           COALESCE(SUM(request_count), 0) AS total_requests,
           COALESCE(SUM(total_tokens), 0) AS total_tokens,
           COALESCE(SUM(input_tokens), 0) AS total_input_tokens,
           COALESCE(SUM(output_tokens), 0) AS total_output_tokens,
           COALESCE(SUM(success_count), 0) AS total_success,
           COALESCE(SUM(error_count), 0) AS total_errors,
           COALESCE(COUNT(DISTINCT provider_id), 0) AS active_providers,
           COALESCE(COUNT(DISTINCT model_id), 0) AS active_models
         FROM ai_usage
         WHERE organization_id = $1
           AND period_start >= $2
           AND period_end <= $3`,
        [organizationId, periodStart, periodEnd]
      );
      return result.rows[0];
    },

    async getTopModels(organizationId, limit = 5) {
      const result = await pool.query(
        `SELECT m.id, m.name, m.display_name, p.name AS provider_name,
                SUM(u.request_count) AS total_requests,
                SUM(u.total_tokens) AS total_tokens,
                SUM(u.total_latency_ms) / NULLIF(SUM(u.request_count), 0) AS avg_latency_ms
         FROM ai_usage u
         JOIN ai_models m ON m.id = u.model_id
         JOIN ai_providers p ON p.id = m.provider_id
         WHERE u.organization_id = $1
         GROUP BY m.id, m.name, m.display_name, p.name
         ORDER BY total_requests DESC
         LIMIT $2`,
        [organizationId, limit]
      );
      return result.rows;
    },

    async getTopProviders(organizationId, limit = 5) {
      const result = await pool.query(
        `SELECT p.id, p.name, p.type,
                SUM(u.request_count) AS total_requests,
                SUM(u.total_tokens) AS total_tokens,
                SUM(u.input_tokens) AS total_input_tokens,
                SUM(u.output_tokens) AS total_output_tokens
         FROM ai_usage u
         JOIN ai_providers p ON p.id = u.provider_id
         WHERE u.organization_id = $1
         GROUP BY p.id, p.name, p.type
         ORDER BY total_requests DESC
         LIMIT $2`,
        [organizationId, limit]
      );
      return result.rows;
    },

    async getRecentFailures(organizationId, limit = 10) {
      const result = await pool.query(
        `SELECT t.*, p.name AS provider_name, c.display_name AS capability_name
         FROM ai_token_usage t
         LEFT JOIN ai_providers p ON p.id = t.provider_id
         LEFT JOIN ai_capabilities c ON c.id = t.capability_id
         WHERE t.organization_id = $1 AND t.success = false
         ORDER BY t.created_at DESC
         LIMIT $2`,
        [organizationId, limit]
      );
      return result.rows;
    }
  };
}