// Agent Collaboration Repository
// Prompts 20-24: Complete Agent Operating System

import { CollaborationType } from '../../../../packages/types/agents/index.js';

export function createAgentCollaborationRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_collaborations WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByAgent(agentId, options = {}) {
      const { type, status, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_collaborations WHERE agent_id = $1';
      const params = [agentId];
      let paramCount = 1;

      if (type) {
        paramCount++;
        query += ` AND collaboration_type = $${paramCount}`;
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

    async findByTargetAgent(targetAgentId, options = {}) {
      const { type, status, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_collaborations WHERE target_agent_id = $1';
      const params = [targetAgentId];
      let paramCount = 1;

      if (type) {
        paramCount++;
        query += ` AND collaboration_type = $${paramCount}`;
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

    async create(data) {
      const {
        agentId,
        organizationId,
        collaborationType,
        targetAgentId,
        context = {},
        input = {},
        priority = 5
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_collaborations (
          agent_id, organization_id, collaboration_type, target_agent_id,
          context, input, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          agentId, organizationId, collaborationType, targetAgentId,
          context, input, priority
        ]
      );

      return result.rows[0];
    },

    async updateStatus(id, status, output = null) {
      const result = await pool.query(
        `UPDATE agent_collaborations 
         SET status = $1, output = COALESCE($2, output), updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [status, output, id]
      );
      return result.rows[0];
    },

    async accept(id) {
      const result = await pool.query(
        `UPDATE agent_collaborations 
         SET status = 'accepted', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async reject(id) {
      const result = await pool.query(
        `UPDATE agent_collaborations 
         SET status = 'rejected', updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async complete(id, output) {
      const result = await pool.query(
        `UPDATE agent_collaborations 
         SET status = 'completed', output = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING *`,
        [output, id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_collaborations WHERE id = $1', [id]);
    }
  };
}