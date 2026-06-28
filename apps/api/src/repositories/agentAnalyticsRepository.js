// Agent Analytics Repository
// Prompts 20-24: Complete Agent Operating System

export function createAgentAnalyticsRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_analytics WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { startDate, endDate, limit = 90, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_analytics WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND date <= $${paramCount}`;
        params.push(endDate);
      }

      query += ' ORDER BY date DESC';
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      return result.rows;
    },

    async findByOrganization(organizationId, options = {}) {
      const { startDate, endDate, agentId, limit = 90, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_analytics WHERE organization_id = $1';
      const params = [organizationId];
      let paramCount = 1;

      if (startDate) {
        paramCount++;
        query += ` AND date >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        query += ` AND date <= $${paramCount}`;
        params.push(endDate);
      }

      if (agentId) {
        paramCount++;
        query += ` AND agent_id = $${paramCount}`;
        params.push(agentId);
      }

      query += ' ORDER BY date DESC';
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      return result.rows;
    },

    async getOrCreate(agentId, organizationId, date) {
      const result = await pool.query(
        `INSERT INTO agent_analytics (agent_id, organization_id, date)
         VALUES ($1, $2, $3)
         ON CONFLICT (agent_id, organization_id, date) DO UPDATE SET
           updated_at = NOW()
         RETURNING *`,
        [agentId, organizationId, date]
      );
      return result.rows[0];
    },

    async incrementMetric(agentId, organizationId, date, metric, increment = 1) {
      const allowedMetrics = [
        'executions_started', 'executions_completed', 'executions_failed', 'executions_cancelled',
        'goals_completed', 'goals_failed', 'tasks_completed', 'tasks_failed',
        'tokens_used_total', 'cost_estimate_total', 'cost_actual_total',
        'approvals_requested', 'approvals_granted', 'delegations_made',
        'delegations_received', 'escalations'
      ];

      if (!allowedMetrics.includes(metric)) {
        throw new Error(`Invalid metric: ${metric}`);
      }

      await pool.query(
        `INSERT INTO agent_analytics (agent_id, organization_id, date, ${metric})
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (agent_id, organization_id, date) 
         DO UPDATE SET ${metric} = agent_analytics.${metric} + EXCLUDED.${metric}, updated_at = NOW()`,
        [agentId, organizationId, date, increment]
      );
    },

    async updateAvgMetric(agentId, organizationId, date, metric, value) {
      const allowedMetrics = ['planning_time_avg_ms', 'execution_time_avg_ms', 'total_time_avg_ms'];

      if (!allowedMetrics.includes(metric)) {
        throw new Error(`Invalid avg metric: ${metric}`);
      }

      await pool.query(
        `INSERT INTO agent_analytics (agent_id, organization_id, date, ${metric})
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (agent_id, organization_id, date) 
         DO UPDATE SET ${metric} = EXCLUDED.${metric}, updated_at = NOW()`,
        [agentId, organizationId, date, value]
      );
    },

    async updateWorkersUsed(agentId, organizationId, date, workerId, count = 1) {
      await pool.query(
        `INSERT INTO agent_analytics (agent_id, organization_id, date, workers_used)
         VALUES ($1, $2, $3, jsonb_build_object($4::text, $5::int))
         ON CONFLICT (agent_id, organization_id, date) 
         DO UPDATE SET 
           workers_used = jsonb_set(
             COALESCE(agent_analytics.workers_used, '{}'),
             ARRAY[$4::text],
             (COALESCE((agent_analytics.workers_used->>$4::text)::int, 0) + $5)::text::jsonb
           ),
           updated_at = NOW()`,
        [agentId, organizationId, date, workerId, count]
      );
    },

    async getOrganizationStats(organizationId, startDate, endDate) {
      const result = await pool.query(
        `SELECT 
          COUNT(DISTINCT agent_id) as total_agents,
          SUM(executions_started) as total_executions,
          SUM(executions_completed) as completed_executions,
          SUM(executions_failed) as failed_executions,
          SUM(goals_completed) as completed_goals,
          SUM(tasks_completed) as completed_tasks,
          SUM(tasks_failed) as failed_tasks,
          SUM(tokens_used_total) as total_tokens,
          SUM(cost_actual_total) as total_cost,
          SUM(approvals_requested) as total_approvals,
          SUM(delegations_made) as total_delegations,
          SUM(escalations) as total_escalations
         FROM agent_analytics
         WHERE organization_id = $1
         AND date >= $2
         AND date <= $3`,
        [organizationId, startDate, endDate]
      );
      return result.rows[0];
    },

    async getTopAgents(organizationId, startDate, endDate, limit = 10) {
      const result = await pool.query(
        `SELECT 
          a.id,
          a.name,
          a.display_name,
          a.icon,
          SUM(aa.executions_completed) as executions,
          SUM(aa.goals_completed) as goals,
          SUM(aa.tasks_completed) as tasks,
          SUM(aa.cost_actual_total) as cost,
          AVG(aa.total_time_avg_ms) as avg_time
         FROM agent_analytics aa
         JOIN agents a ON a.id = aa.agent_id
         WHERE aa.organization_id = $1
         AND aa.date >= $2
         AND aa.date <= $3
         GROUP BY a.id, a.name, a.display_name, a.icon
         ORDER BY executions DESC
         LIMIT $4`,
        [organizationId, startDate, endDate, limit]
      );
      return result.rows;
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_analytics WHERE id = $1', [id]);
    }
  };
}
