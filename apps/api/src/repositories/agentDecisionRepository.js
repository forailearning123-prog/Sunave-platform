// Agent Decision Repository
// Prompts 20-24: Complete Agent Operating System

import { DecisionType } from '../../../../packages/types/agents/index.js';

export function createAgentDecisionRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_decisions WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { type, executionId, goalId, taskId, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_decisions WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
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

    async findByExecution(executionId) {
      const result = await pool.query(
        'SELECT * FROM agent_decisions WHERE execution_id = $1 ORDER BY created_at ASC',
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
        type,
        reasoning,
        context = {},
        input = {},
        output = {},
        confidence
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_decisions (
          agent_id, organization_id, execution_id, goal_id, task_id,
          type, reasoning, context, input, output, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          agentId, organizationId, executionId, goalId, taskId,
          type, reasoning, context, input, output, confidence
        ]
      );

      return result.rows[0];
    },

    async approve(id, approvedBy) {
      const result = await pool.query(
        `UPDATE agent_decisions 
         SET approved = true, approved_by = $1, approved_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [approvedBy, id]
      );
      return result.rows[0];
    },

    async reject(id, approvedBy) {
      const result = await pool.query(
        `UPDATE agent_decisions 
         SET approved = false, approved_by = $1, approved_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [approvedBy, id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_decisions WHERE id = $1', [id]);
    }
  };
}
