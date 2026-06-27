// Agent Approval Repository
// Prompts 20-24: Complete Agent Operating System

import { ApprovalType, ApprovalStatus } from '@sunave/types/agents';

export function createAgentApprovalRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_approvals WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { type, status, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_approvals WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (type) {
        paramCount++;
        query += ` AND approval_type = $${paramCount}`;
        params.push(type);
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
        'SELECT * FROM agent_approvals WHERE execution_id = $1 ORDER BY created_at ASC',
        [executionId]
      );
      return result.rows;
    },

    async findByRequestedBy(userId, options = {}) {
      const { status, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_approvals WHERE requested_by = $1';
      const params = [userId];
      let paramCount = 1;

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

    async create(data) {
      const {
        agentId,
        organizationId,
        executionId,
        goalId,
        taskId,
        delegationId,
        approvalType,
        title,
        description,
        context = {},
        input = {},
        priority = 5,
        requestedBy,
        expiresAt
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_approvals (
          agent_id, organization_id, execution_id, goal_id, task_id, delegation_id,
          approval_type, title, description, context, input, priority,
          requested_by, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          agentId, organizationId, executionId, goalId, taskId, delegationId,
          approvalType, title, description, context, input, priority,
          requestedBy, expiresAt
        ]
      );

      return result.rows[0];
    },

    async approve(id, approvedBy) {
      const result = await pool.query(
        `UPDATE agent_approvals 
         SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [approvedBy, id]
      );
      return result.rows[0];
    },

    async reject(id, approvedBy, rejectionReason) {
      const result = await pool.query(
        `UPDATE agent_approvals 
         SET status = 'rejected', approved_by = $1, approved_at = NOW(), 
             rejection_reason = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [approvedBy, rejectionReason, id]
      );
      return result.rows[0];
    },

    async expire(id) {
      const result = await pool.query(
        `UPDATE agent_approvals 
         SET status = 'expired', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_approvals WHERE id = $1', [id]);
    },

    async getPendingApprovals(agentId) {
      const result = await pool.query(
        `SELECT * FROM agent_approvals 
         WHERE agent_id = $1 
         AND status = 'pending'
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY priority DESC, created_at ASC`,
        [agentId]
      );
      return result.rows;
    }
  };
}