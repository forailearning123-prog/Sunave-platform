// Agent Template Repository
// Prompts 20-24: Complete Agent Operating System

export function createAgentTemplateRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_templates WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByIdWithDetails(id) {
      const templateResult = await pool.query('SELECT * FROM agent_templates WHERE id = $1', [id]);
      if (!templateResult.rows[0]) return null;
      
      const template = templateResult.rows[0];
      
      // Increment usage count
      await pool.query(
        'UPDATE agent_templates SET usage_count = usage_count + 1 WHERE id = $1',
        [id]
      );
      
      return template;
    },

    async findAll(options = {}) {
      const { category, type, isSystem, isPublic, search, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_templates WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (category) {
        paramCount++;
        query += ` AND category = $${paramCount}`;
        params.push(category);
      }

      if (type) {
        paramCount++;
        query += ` AND type = $${paramCount}`;
        params.push(type);
      }

      if (isSystem !== undefined) {
        paramCount++;
        query += ` AND is_system = $${paramCount}`;
        params.push(isSystem);
      }

      if (isPublic !== undefined) {
        paramCount++;
        query += ` AND is_public = $${paramCount}`;
        params.push(isPublic);
      }

      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY is_system DESC, usage_count DESC, rating DESC, created_at DESC';
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      return result.rows;
    },

    async findByCategory(category, options = {}) {
      return this.findAll({ ...options, category });
    },

    async findByType(type, options = {}) {
      return this.findAll({ ...options, type });
    },

    async getSystemTemplates() {
      const result = await pool.query(
        'SELECT * FROM agent_templates WHERE is_system = true ORDER BY category, name ASC'
      );
      return result.rows;
    },

    async getPublicTemplates(options = {}) {
      return this.findAll({ ...options, isPublic: true });
    },

    async create(data) {
      const {
        name,
        displayName,
        description,
        category,
        type,
        icon,
        avatarUrl,
        isSystem = false,
        isPublic = false,
        configuration = {},
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
        loggingPolicy = {}
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_templates (
          name, display_name, description, category, type, icon, avatar_url,
          is_system, is_public, configuration, capabilities, permissions,
          goal_types, worker_access, knowledge_sources, prompt_profile,
          reasoning_policy, memory_policy, execution_policy, security_policy,
          cost_policy, logging_policy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING *`,
        [
          name, displayName, description, category, type, icon, avatarUrl,
          isSystem, isPublic, configuration, capabilities, permissions,
          goalTypes, workerAccess, knowledgeSources, promptProfile,
          reasoningPolicy, memoryPolicy, executionPolicy, securityPolicy,
          costPolicy, loggingPolicy
        ]
      );

      return result.rows[0];
    },

    async update(id, data) {
      const {
        name,
        displayName,
        description,
        category,
        type,
        icon,
        avatarUrl,
        isPublic,
        configuration,
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
        loggingPolicy
      } = data;

      const result = await pool.query(
        `UPDATE agent_templates SET
          name = COALESCE($1, name),
          display_name = COALESCE($2, display_name),
          description = COALESCE($3, description),
          category = COALESCE($4, category),
          type = COALESCE($5, type),
          icon = COALESCE($6, icon),
          avatar_url = COALESCE($7, avatar_url),
          is_public = COALESCE($8, is_public),
          configuration = COALESCE($9, configuration),
          capabilities = COALESCE($10, capabilities),
          permissions = COALESCE($11, permissions),
          goal_types = COALESCE($12, goal_types),
          worker_access = COALESCE($13, worker_access),
          knowledge_sources = COALESCE($14, knowledge_sources),
          prompt_profile = COALESCE($15, prompt_profile),
          reasoning_policy = COALESCE($16, reasoning_policy),
          memory_policy = COALESCE($17, memory_policy),
          execution_policy = COALESCE($18, execution_policy),
          security_policy = COALESCE($19, security_policy),
          cost_policy = COALESCE($20, cost_policy),
          logging_policy = COALESCE($21, logging_policy),
          updated_at = NOW()
        WHERE id = $22
        RETURNING *`,
        [
          name, displayName, description, category, type, icon, avatarUrl,
          isPublic, configuration, capabilities, permissions, goalTypes,
          workerAccess, knowledgeSources, promptProfile, reasoningPolicy,
          memoryPolicy, executionPolicy, securityPolicy, costPolicy,
          loggingPolicy, id
        ]
      );

      return result.rows[0];
    },

    async updateRating(id, rating, ratingCount) {
      const result = await pool.query(
        `UPDATE agent_templates 
         SET rating = $1, rating_count = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [rating, ratingCount, id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_templates WHERE id = $1', [id]);
    }
  };
}