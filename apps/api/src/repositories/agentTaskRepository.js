// Agent Task Repository
// Prompts 20-24: Complete Agent Operating System

import { TaskStatus } from '@sunave/types/agents';

export function createAgentTaskRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_tasks WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { status, goalId, executionId, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_tasks WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (goalId) {
        paramCount++;
        query += ` AND goal_id = $${paramCount}`;
        params.push(goalId);
      }

      if (executionId) {
        paramCount++;
        query += ` AND execution_id = $${paramCount}`;
        params.push(executionId);
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
        'SELECT * FROM agent_tasks WHERE execution_id = $1 ORDER BY priority DESC, created_at ASC',
        [executionId]
      );
      return result.rows;
    },

    async findByWorker(workerId, options = {}) {
      const { status, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_tasks WHERE worker_id = $1';
      const params = [workerId];
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

    async create(data) {
      const {
        agentId,
        organizationId,
        goalId,
        executionId,
        parentTaskId,
        title,
        description,
        type,
        priority = 5,
        workerId,
        workerType,
        input = {},
        dependencies = [],
        estimatedTimeMs,
        costEstimate,
        maxRetries = 3,
        approvalRequired = false,
        metadata = {}
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_tasks (
          agent_id, organization_id, goal_id, execution_id, parent_task_id,
          title, description, type, priority, worker_id, worker_type,
          input, dependencies, estimated_time_ms, cost_estimate,
          max_retries, approval_required, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          agentId, organizationId, goalId, executionId, parentTaskId,
          title, description, type, priority, workerId, workerType,
          input, dependencies, estimatedTimeMs, costEstimate,
          maxRetries, approvalRequired, metadata
        ]
      );

      return result.rows[0];
    },

    async update(id, data) {
      const {
        title,
        description,
        type,
        priority,
        status,
        workerId,
        workerType,
        input,
        output,
        result,
        error,
        dependencies,
        estimatedTimeMs,
        actualTimeMs,
        tokensUsed,
        costEstimate,
        costActual,
        retryCount,
        maxRetries,
        approvalRequired,
        approvalStatus,
        approvedBy,
        approvedAt,
        metadata,
        startedAt,
        completedAt
      } = data;

      const result = await pool.query(
        `UPDATE agent_tasks SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          worker_id = COALESCE($6, worker_id),
          worker_type = COALESCE($7, worker_type),
          input = COALESCE($8, input),
          output = COALESCE($9, output),
          result = COALESCE($10, result),
          error = COALESCE($11, error),
          dependencies = COALESCE($12, dependencies),
          estimated_time_ms = COALESCE($13, estimated_time_ms),
          actual_time_ms = COALESCE($14, actual_time_ms),
          tokens_used = COALESCE($15, tokens_used),
          cost_estimate = COALESCE($16, cost_estimate),
          cost_actual = COALESCE($17, cost_actual),
          retry_count = COALESCE($18, retry_count),
          max_retries = COALESCE($19, max_retries),
          approval_required = COALESCE($20, approval_required),
          approval_status = COALESCE($21, approval_status),
          approved_by = COALESCE($22, approved_by),
          approved_at = COALESCE($23, approved_at),
          metadata = COALESCE($24, metadata),
          started_at = COALESCE($25, started_at),
          completed_at = COALESCE($26, completed_at),
          updated_at = NOW()
        WHERE id = $27
        RETURNING *`,
        [
          title, description, type, priority, status, workerId, workerType,
          input, output, result, error, dependencies, estimatedTimeMs, actualTimeMs,
          tokensUsed, costEstimate, costActual, retryCount, maxRetries,
          approvalRequired, approvalStatus, approvedBy, approvedAt, metadata,
          startedAt, completedAt, id
        ]
      );

      return result.rows[0];
    },

    async assignWorker(id, workerId, workerType) {
      const result = await pool.query(
        `UPDATE agent_tasks 
         SET worker_id = $1, worker_type = $2, status = $3, updated_at = NOW() 
         WHERE id = $4 
         RETURNING *`,
        [workerId, workerType, TaskStatus.ASSIGNED, id]
      );
      return result.rows[0];
    },

    async start(id) {
      const result = await pool.query(
        `UPDATE agent_tasks 
         SET status = $1, started_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [TaskStatus.EXECUTING, id]
      );
      return result.rows[0];
    },

    async complete(id, output, result, actualTimeMs, tokensUsed, costActual) {
      const resultRow = await pool.query(
        `UPDATE agent_tasks 
         SET status = $1, output = $2, result = $3, actual_time_ms = $4,
             tokens_used = $5, cost_actual = $6, completed_at = NOW(), updated_at = NOW() 
         WHERE id = $7 
         RETURNING *`,
        [TaskStatus.COMPLETED, output, result, actualTimeMs, tokensUsed, costActual, id]
      );
      return resultRow.rows[0];
    },

    async fail(id, error) {
      const result = await pool.query(
        `UPDATE agent_tasks 
         SET status = $1, error = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [TaskStatus.FAILED, error, id]
      );
      return result.rows[0];
    },

    async retry(id) {
      const result = await pool.query(
        `UPDATE agent_tasks 
         SET status = $1, retry_count = retry_count + 1, error = NULL, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [TaskStatus.RETRYING, id]
      );
      return result.rows[0];
    },

    async cancel(id) {
      const result = await pool.query(
        `UPDATE agent_tasks 
         SET status = $1, completed_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [TaskStatus.CANCELLED, id]
      );
      return result.rows[0];
    },

    async approve(id, approvedBy) {
      const result = await pool.query(
        `UPDATE agent_tasks 
         SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [approvedBy, id]
      );
      return result.rows[0];
    },

    async reject(id, approvedBy, reason) {
      const result = await pool.query(
        `UPDATE agent_tasks 
         SET approval_status = 'rejected', approved_by = $1, approved_at = NOW(), error = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [approvedBy, reason, id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_tasks WHERE id = $1', [id]);
    },

    async getPendingTasks(agentId) {
      const result = await pool.query(
        `SELECT * FROM agent_tasks 
         WHERE agent_id = $1 
         AND status IN ('pending', 'assigned', 'retrying')
         AND (approval_required = false OR approval_status = 'approved')
         ORDER BY priority DESC, created_at ASC`,
        [agentId]
      );
      return result.rows;
    }
  };
}