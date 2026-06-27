// Agent Execution Repository
// Prompts 20-24: Complete Agent Operating System

import { ExecutionStatus } from '@sunave/types/agents';

export function createAgentExecutionRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_executions WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { status, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_executions WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';
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
      const { status, agentId, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_executions WHERE organization_id = $1';
      const params = [organizationId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (agentId) {
        paramCount++;
        query += ` AND agent_id = $${paramCount}`;
        params.push(agentId);
      }

      query += ' ORDER BY created_at DESC';
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      return result.rows;
    },

    async create(data) {
      const {
        agentId,
        organizationId,
        userId,
        status = ExecutionStatus.PENDING,
        goal,
        context = {}
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_executions (agent_id, organization_id, user_id, status, goal, context)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [agentId, organizationId, userId, status, goal, context]
      );

      return result.rows[0];
    },

    async update(id, data) {
      const {
        status,
        plan,
        context,
        result,
        error,
        startedAt,
        completedAt,
        planningTimeMs,
        executionTimeMs,
        totalTimeMs,
        tokensUsed,
        costEstimate,
        costActual,
        workersUsed,
        tasksCompleted,
        tasksFailed,
        tasksTotal
      } = data;

      const result = await pool.query(
        `UPDATE agent_executions SET
          status = COALESCE($1, status),
          plan = COALESCE($2, plan),
          context = COALESCE($3, context),
          result = COALESCE($4, result),
          error = COALESCE($5, error),
          started_at = COALESCE($6, started_at),
          completed_at = COALESCE($7, completed_at),
          planning_time_ms = COALESCE($8, planning_time_ms),
          execution_time_ms = COALESCE($9, execution_time_ms),
          total_time_ms = COALESCE($10, total_time_ms),
          tokens_used = COALESCE($11, tokens_used),
          cost_estimate = COALESCE($12, cost_estimate),
          cost_actual = COALESCE($13, cost_actual),
          workers_used = COALESCE($14, workers_used),
          tasks_completed = COALESCE($15, tasks_completed),
          tasks_failed = COALESCE($16, tasks_failed),
          tasks_total = COALESCE($17, tasks_total),
          updated_at = NOW()
        WHERE id = $18
        RETURNING *`,
        [
          status, plan, context, result, error, startedAt, completedAt,
          planningTimeMs, executionTimeMs, totalTimeMs, tokensUsed,
          costEstimate, costActual, workersUsed, tasksCompleted,
          tasksFailed, tasksTotal, id
        ]
      );

      return result.rows[0];
    },

    async start(id) {
      const result = await pool.query(
        `UPDATE agent_executions 
         SET status = $1, started_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [ExecutionStatus.EXECUTING, id]
      );
      return result.rows[0];
    },

    async complete(id, result, costActual) {
      const resultRow = await pool.query(
        `UPDATE agent_executions 
         SET status = $1, result = $2, cost_actual = $3, completed_at = NOW(), updated_at = NOW() 
         WHERE id = $4 
         RETURNING *`,
        [ExecutionStatus.COMPLETED, result, costActual, id]
      );
      return resultRow.rows[0];
    },

    async fail(id, error) {
      const result = await pool.query(
        `UPDATE agent_executions 
         SET status = $1, error = $2, completed_at = NOW(), updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [ExecutionStatus.FAILED, error, id]
      );
      return result.rows[0];
    },

    async cancel(id) {
      const result = await pool.query(
        `UPDATE agent_executions 
         SET status = $1, completed_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [ExecutionStatus.CANCELLED, id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_executions WHERE id = $1', [id]);
    },

    async getStats(agentId, days = 30) {
      const result = await pool.query(
        `SELECT 
          COUNT(*) as total_executions,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          AVG(planning_time_ms) as avg_planning_time,
          AVG(execution_time_ms) as avg_execution_time,
          AVG(total_time_ms) as avg_total_time,
          SUM(tokens_used) as total_tokens,
          SUM(cost_actual) as total_cost
         FROM agent_executions
         WHERE agent_id = $1
         AND created_at >= NOW() - INTERVAL '${days} days'`,
        [agentId]
      );
      return result.rows[0];
    }
  };
}