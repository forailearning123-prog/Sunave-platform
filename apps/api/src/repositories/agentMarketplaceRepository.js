// Agent Marketplace Repository
// Prompts 20-24: Complete Agent Operating System

export function createAgentMarketplaceRepository(pool) {
  return {
    async findById(id) {
      const result = await pool.query('SELECT * FROM agent_marketplace_items WHERE id = $1', [id]);
      return result.rows[0] || null;
    },

    async findByOrganization(organizationId, options = {}) {
      const { category, type, isPublic, isFeatured, search, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_marketplace_items WHERE organization_id = $1';
      const params = [organizationId];
      let paramCount = 1;

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

      if (isPublic !== undefined) {
        paramCount++;
        query += ` AND is_public = $${paramCount}`;
        params.push(isPublic);
      }

      if (isFeatured !== undefined) {
        paramCount++;
        query += ` AND is_featured = $${paramCount}`;
        params.push(isFeatured);
      }

      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY is_featured DESC, download_count DESC, rating DESC, created_at DESC';
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      return result.rows;
    },

    async findPublic(options = {}) {
      const { category, type, isFeatured, search, limit = 50, offset = 0 } = options;
      
      let query = 'SELECT * FROM agent_marketplace_items WHERE is_public = true';
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

      if (isFeatured !== undefined) {
        paramCount++;
        query += ` AND is_featured = $${paramCount}`;
        params.push(isFeatured);
      }

      if (search) {
        paramCount++;
        query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
      }

      query += ' ORDER BY is_featured DESC, download_count DESC, rating DESC, created_at DESC';
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(limit);
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(offset);

      const result = await pool.query(query, params);
      return result.rows;
    },

    async findFeatured(limit = 10) {
      const result = await pool.query(
        `SELECT * FROM agent_marketplace_items 
         WHERE is_public = true AND is_featured = true 
         ORDER BY download_count DESC, rating DESC 
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    },

    async findByTemplate(templateId) {
      const result = await pool.query(
        'SELECT * FROM agent_marketplace_items WHERE template_id = $1 ORDER BY created_at DESC',
        [templateId]
      );
      return result.rows;
    },

    async create(data) {
      const {
        agentId,
        organizationId,
        templateId,
        name,
        displayName,
        description,
        category,
        type,
        icon,
        avatarUrl,
        version = '1.0.0',
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
        loggingPolicy = {},
        isPublic = false,
        isFeatured = false,
        isVerified = false,
        tags = []
      } = data;

      const result = await pool.query(
        `INSERT INTO agent_marketplace_items (
          agent_id, organization_id, template_id, name, display_name, description,
          category, type, icon, avatar_url, version, configuration, capabilities,
          permissions, goal_types, worker_access, knowledge_sources, prompt_profile,
          reasoning_policy, memory_policy, execution_policy, security_policy,
          cost_policy, logging_policy, is_public, is_featured, is_verified, tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        RETURNING *`,
        [
          agentId, organizationId, templateId, name, displayName, description,
          category, type, icon, avatarUrl, version, configuration, capabilities,
          permissions, goalTypes, workerAccess, knowledgeSources, promptProfile,
          reasoningPolicy, memoryPolicy, executionPolicy, securityPolicy,
          costPolicy, loggingPolicy, isPublic, isFeatured, isVerified, tags
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
        version,
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
        loggingPolicy,
        isPublic,
        isFeatured,
        isVerified,
        tags
      } = data;

      const result = await pool.query(
        `UPDATE agent_marketplace_items SET
          name = COALESCE($1, name),
          display_name = COALESCE($2, display_name),
          description = COALESCE($3, description),
          category = COALESCE($4, category),
          type = COALESCE($5, type),
          icon = COALESCE($6, icon),
          avatar_url = COALESCE($7, avatar_url),
          version = COALESCE($8, version),
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
          is_public = COALESCE($22, is_public),
          is_featured = COALESCE($23, is_featured),
          is_verified = COALESCE($24, is_verified),
          tags = COALESCE($25, tags),
          updated_at = NOW()
        WHERE id = $26
        RETURNING *`,
        [
          name, displayName, description, category, type, icon, avatarUrl,
          version, configuration, capabilities, permissions, goalTypes,
          workerAccess, knowledgeSources, promptProfile, reasoningPolicy,
          memoryPolicy, executionPolicy, securityPolicy, costPolicy,
          loggingPolicy, isPublic, isFeatured, isVerified, tags, id
        ]
      );

      return result.rows[0];
    },

    async incrementDownload(id) {
      const result = await pool.query(
        `UPDATE agent_marketplace_items 
         SET download_count = download_count + 1, updated_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      return result.rows[0];
    },

    async updateRating(id, rating, ratingCount) {
      const result = await pool.query(
        `UPDATE agent_marketplace_items 
         SET rating = $1, rating_count = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [rating, ratingCount, id]
      );
      return result.rows[0];
    },

    async delete(id) {
      await pool.query('DELETE FROM agent_marketplace_items WHERE id = $1', [id]);
    }
  };
}