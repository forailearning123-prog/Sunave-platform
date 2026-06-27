// Agent Delegation Repository
// Prompts 20-24: Complete Agent Operating System

import { DelegationType } from '@sunave/types/agents';

export function createAgentDelegationRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_delegations WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { type, executionId, goalId, taskId, status, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_delegations WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (type) {
        paramCount++;
        query += ` AND delegation_type = $${paramCount}`;
        params.push(type);
      }

      if (executionId) {
        paramCount++;
        query += ` AND execution_id = $${paramCount}`;
        params.push(executionId);
      }

      if (goalId) {
        paramCount++;
        query += ` AND goal_id = $${paramCount}`;
        params.push(goalId);
      }

      if (taskId) {
        paramCount++;
        query += ` AND task_id = $${paramCount}`;
        params.push(taskId);
      }

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      query += ' ORDER BY priority DESC, created_at DESC';
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      return result.rows;
    },

    async findByExecution(executionId) {
      const result = await pool.query(
        'SELECT * FROM agent_delegations WHERE execution_id = $1 ORDER BY created_at ASC',
        [executionId]
      );
      return result.rows;
    },

    async create(data) {
      const {
        agentId,
        organizationId,
        executionId,
        goalId,
        taskId,
        fromAgentId,
        toAgentId,
        toWorkerId,
        delegationType,
        context = {},
        input = {},
        priority = 5,
        requiresApproval = false
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_delegations (
          agent_id, organization_id, execution_id, goal_id, task_id,
          from_agent_id, to_agent_id, to_worker_id, delegation_type,
          context, input, priority, requires_approval
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          agentId, organizationId, executionId, goalId, taskId,
          fromAgentId, toAgentId, toWorkerId, delegationType,
          context, input, priority, requiresApproval
        ]
      );

      return result.rows[0];
    },

    async updateStatus(id, status, output = null) {
      const result = await pool.query(
        `UPDATE agent_delegations 
         SET status = $1, output = COALESCE($2, output), updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [status, output, id]
      );
      return result.rows[0];
    },

    async start(id) {
      const result = await pool.query(
        `UPDATE agent_delegations 
         SET started_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async complete(id, output) {
      const result = await pool.query(
        `UPDATE agent_delegations 
         SET status = 'completed', output = $1, completed_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [output, id]
      );
      return result.rows[0];
    },

    async fail(id, error) {
      const result = await pool.query(
        `UPDATE agent_delegations 
         SET status = 'failed', updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async approve(id, approvedBy) {
      const result = await pool.query(
        `UPDATE agent_delegations 
         SET approved_by = $1, approved_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [approvedBy, id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_delegations WHERE id = $1', [id]);
    }
  };
}