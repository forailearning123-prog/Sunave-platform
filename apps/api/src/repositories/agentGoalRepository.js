// Agent Goal Repository
// Prompts 20-24: Complete Agent Operating System

export function createAgentGoalRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_goals WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { status, executionId, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_goals WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
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
        'SELECT * FROM agent_goals WHERE execution_id = $1 ORDER BY priority DESC, created_at ASC',
        [executionId]
      );
      return result.rows;
    },

    async create(data) {
      const {
        agentId,
        organizationId,
        executionId,
        title,
        description,
        type,
        priority = 5,
        context = {},
        constraints = {},
        successCriteria = {},
        metadata = {}
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_goals (
          agent_id, organization_id, execution_id, title, description, type,
          priority, context, constraints, success_criteria, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          agentId, organizationId, executionId, title, description, type,
          priority, context, constraints, successCriteria, metadata
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
        progress,
        context,
        constraints,
        successCriteria,
        metadata,
        startedAt,
        completedAt
      } = data;

      const result = await pool.query(
        `UPDATE agent_goals SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          priority = COALESCE($4, priority),
          status = COALESCE($5, status),
          progress = COALESCE($6, progress),
          context = COALESCE($7, context),
          constraints = COALESCE($8, constraints),
          success_criteria = COALESCE($9, success_criteria),
          metadata = COALESCE($10, metadata),
          started_at = COALESCE($11, started_at),
          completed_at = COALESCE($12, completed_at),
          updated_at = NOW()
        WHERE id = $13
        RETURNING *`,
        [
          title, description, type, priority, status, progress,
          context, constraints, successCriteria, metadata,
          startedAt, completedAt, id
        ]
      );

      return result.rows[0];
    },

    async updateProgress(id, progress) {
      const result = await pool.query(
        `UPDATE agent_goals 
         SET progress = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [progress, id]
      );
      return result.rows[0];
    },

    async complete(id) {
      const result = await pool.query(
        `UPDATE agent_goals 
         SET status = 'completed', progress = 100, completed_at = NOW(), updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async fail(id) {
      const result = await pool.query(
        `UPDATE agent_goals 
         SET status = 'failed', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_goals WHERE id = $1', [id]);
    }
  };
}