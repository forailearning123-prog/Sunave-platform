// Agent Repository
// Prompts 20-24: Complete Agent Operating System

import { AgentStatus, AgentType, AgentVisibility } from '../../../../packages/types/agents/index.js';

export function createAgentRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByIdWithDetails(id) {
      const agentResult = await pool.query('SELECT * FROM agents WHERE id = $1', [id]);
      if (!agentResult.rows[0]) return null;
      
      const agent = agentResult.rows[0];
      
      // Get worker assignments
      const workersResult = await pool.query(
        'SELECT * FROM agent_workers WHERE agent_id = $1',
        [id]
      );
      agent.workers = workersResult.rows;
      
      // Get policies
      const policiesResult = await pool.query(
        'SELECT * FROM agent_policies WHERE agent_id = $1 ORDER BY priority DESC',
        [id]
      );
      agent.policies = policiesResult.rows;
      
      // Get memory references
      const memoryResult = await pool.query(
        'SELECT * FROM agent_memory_references WHERE agent_id = $1',
        [id]
      );
      agent.memoryReferences = memoryResult.rows;
      
      return agent;
    },

    async findByOrganization(organizationId, options = {}) {
      const { status, type, department, visibility, search, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agents WHERE organization_id = $1';
      const params = [organizationId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (type) {
        paramCount++;
        query += ` AND role = $${paramCount}`;
        params.push(type);
      }

      if (department) {
        paramCount++;
        query += ` AND department = $${paramCount}`;
        params.push(department);
      }

      if (visibility) {
        paramCount++;
        query += ` AND visibility = $${paramCount}`;
        params.push(visibility);
      }

      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
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

    async countByOrganization(organizationId, options = {}) {
      const { status, type, department } = options;
      
      let query = 'SELECT COUNT(*) FROM agents WHERE organization_id = $1';
      const params = [organizationId];
      let paramCount = 1;

      if (status) {
        paramCount++;
        query += ` AND status = $${paramCount}`;
        params.push(status);
      }

      if (type) {
        paramCount++;
        query += ` AND role = $${paramCount}`;
        params.push(type);
      }

      if (department) {
        paramCount++;
        query += ` AND department = $${paramCount}`;
        params.push(department);
      }

      const result = await pool.query(query, params);
      return parseInt(result.rows[0].count, 10);
    },

    async create(data) {
      const {
        organizationId,
        name,
        displayName,
        description,
        department,
        role,
        icon,
        avatarUrl,
        status = AgentStatus.DRAFT,
        version = '1.0.0',
        ownerId,
        visibility = AgentVisibility.PRIVATE,
        capabilities = [],
        permissions = {},
        goalTypes = [],
        workerAccess = [],
        knowledgeSources = [],
        promptProfile = {},
        reasoningPolicy = {},
        memoryPolicy = {},
        executionPolicy = {},
        securityPolicy = {},
        costPolicy = {},
        loggingPolicy = {},
        metadata = {}
      } = data;

      const result = await pool.query(
        `INSERT INTO agents (
          organization_id, name, display_name, description, department, role, icon, avatar_url,
          status, version, owner_id, visibility, capabilities, permissions, goal_types,
          worker_access, knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
          execution_policy, security_policy, cost_policy, logging_policy, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *`,
        [
          organizationId, name, displayName, description, department, role, icon, avatarUrl,
          status, version, ownerId, visibility, capabilities, permissions, goalTypes,
          workerAccess, knowledgeSources, promptProfile, reasoningPolicy, memoryPolicy,
          executionPolicy, securityPolicy, costPolicy, loggingPolicy, metadata
        ]
      );

      return result.rows[0];
    },

    async update(id, data) {
      const {
        name,
        displayName,
        description,
        department,
        role,
        icon,
        avatarUrl,
        status,
        version,
        visibility,
        capabilities,
        permissions,
        goalTypes,
        workerAccess,
        knowledgeSources,
        promptProfile,
        reasoningPolicy,
        memoryPolicy,
        executionPolicy,
        securityPolicy,
        costPolicy,
        loggingPolicy,
        metadata,
        archivedAt
      } = data;

      const result = await pool.query(
        `UPDATE agents SET
          name = COALESCE($1, name),
          display_name = COALESCE($2, display_name),
          description = COALESCE($3, description),
          department = COALESCE($4, department),
          role = COALESCE($5, role),
          icon = COALESCE($6, icon),
          avatar_url = COALESCE($7, avatar_url),
          status = COALESCE($8, status),
          version = COALESCE($9, version),
          visibility = COALESCE($10, visibility),
          capabilities = COALESCE($11, capabilities),
          permissions = COALESCE($12, permissions),
          goal_types = COALESCE($13, goal_types),
          worker_access = COALESCE($14, worker_access),
          knowledge_sources = COALESCE($15, knowledge_sources),
          prompt_profile = COALESCE($16, prompt_profile),
          reasoning_policy = COALESCE($17, reasoning_policy),
          memory_policy = COALESCE($18, memory_policy),
          execution_policy = COALESCE($19, execution_policy),
          security_policy = COALESCE($20, security_policy),
          cost_policy = COALESCE($21, cost_policy),
          logging_policy = COALESCE($22, logging_policy),
          metadata = COALESCE($23, metadata),
          archived_at = COALESCE($24, archived_at),
          updated_at = NOW()
        WHERE id = $25
        RETURNING *`,
        [
          name, displayName, description, department, role, icon, avatarUrl,
          status, version, visibility, capabilities, permissions, goalTypes,
          workerAccess, knowledgeSources, promptProfile, reasoningPolicy, memoryPolicy,
          executionPolicy, securityPolicy, costPolicy, loggingPolicy, metadata,
          archivedAt, id
        ]
      );

      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agents WHERE id = $1', [id]);
    },

    async archive(id) {
      const result = await pool.query(
        'UPDATE agents SET status = $1, archived_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
        [AgentStatus.ARCHIVED, id]
      );
      return result.rows[0];
    },

    async restore(id) {
      const result = await pool.query(
        'UPDATE agents SET status = $1, archived_at = NULL, updated_at = NOW() WHERE id = $2 RETURNING *',
        [AgentStatus.DRAFT, id]
      );
      return result.rows[0];
    },

    async addWorker(agentId, workerId, accessLevel = 'read', priority = 5, configuration = {}) {
      const result = await pool.query(
        `INSERT INTO agent_workers (agent_id, organization_id, worker_id, access_level, priority, configuration)
         SELECT a.organization_id, a.organization_id, $2, $3, $4, $5
         FROM agents a WHERE a.id = $1
         ON CONFLICT (agent_id, worker_id) DO UPDATE SET
           access_level = EXCLUDED.access_level,
           priority = EXCLUDED.priority,
           configuration = EXCLUDED.configuration,
           updated_at = NOW()
         RETURNING *`,
        [agentId, workerId, accessLevel, priority, configuration]
      );
      return result.rows[0];
    },

    async removeWorker(agentId, workerId) {
      await pool.query(
        'DELETE FROM agent_workers WHERE agent_id = $1 AND worker_id = $2',
        [agentId, workerId]
      );
    },

    async getWorkers(agentId) {
      const result = await pool.query(
        `SELECT aw.*, w.name, w.display_name, w.description, w.category, w.type
         FROM agent_workers aw
         JOIN workers w ON w.id = aw.worker_id
         WHERE aw.agent_id = $1
         ORDER BY aw.priority DESC, w.name ASC`,
        [agentId]
      );
      return result.rows;
    },

    async addPolicy(agentId, policyData) {
      const { name, description, policyType, rules = [], isActive = true, priority = 5 } = policyData;
      
      const result = await pool.query(
        `INSERT INTO agent_policies (agent_id, organization_id, name, description, policy_type, rules, is_active, priority)
         SELECT organization_id, organization_id, $1, $2, $3, $4, $5, $6
         FROM agents WHERE id = $7
         RETURNING *`,
        [name, description, policyType, rules, isActive, priority, agentId]
      );
      return result.rows[0];
    },

    async getPolicies(agentId) {
      const result = await pool.query(
        'SELECT * FROM agent_policies WHERE agent_id = $1 ORDER BY priority DESC, created_at ASC',
        [agentId]
      );
      return result.rows;
    },

    async addMemoryReference(agentId, memoryId, memoryType, referenceType, context = {}) {
      const result = await pool.query(
        `INSERT INTO agent_memory_references (agent_id, organization_id, memory_id, memory_type, reference_type, context)
         SELECT a.organization_id, a.organization_id, $2, $3, $4, $5
         FROM agents a WHERE a.id = $1
         RETURNING *`,
        [agentId, memoryId, memoryType, referenceType, context]
      );
      return result.rows[0];
    },

    async getMemoryReferences(agentId) {
      const result = await pool.query(
        'SELECT * FROM agent_memory_references WHERE agent_id = $1 ORDER BY created_at DESC',
        [agentId]
      );
      return result.rows;
    }
  };
}
