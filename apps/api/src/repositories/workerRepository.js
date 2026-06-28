// Worker Repository - Data access layer for worker platform

import { v4 as uuidv4 } from 'uuid';

class WorkerRepository {
  constructor(db) {
    this.db = db;
  }

  // ─── Worker CRUD ─────────────────────────────────────────────────────────────

  async createWorker(organizationId, data, authorId = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO workers (
        id, organization_id, name, display_name, description, category,
        version, status, author, visibility, icon, tags, capabilities,
        required_permissions, required_inputs, expected_outputs,
        supported_execution_modes, retry_policy, timeout, cost_policy
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    const values = [
      id,
      organizationId,
      data.name,
      data.displayName || data.name,
      data.description || '',
      data.category || 'custom',
      data.version || '1.0.0',
      data.status || 'draft',
      authorId,
      data.visibility || 'private',
      data.icon || 'box',
      data.tags || [],
      JSON.stringify(data.capabilities || []),
      JSON.stringify(data.requiredPermissions || []),
      JSON.stringify(data.requiredInputs || []),
      JSON.stringify(data.expectedOutputs || []),
      data.supportedExecutionModes || ['manual'],
      JSON.stringify(data.retryPolicy || { maxRetries: 3, backoff: 'exponential' }),
      data.timeout || 300,
      JSON.stringify(data.costPolicy || {})
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToWorker(result.rows[0]);
  }

  async getWorkerById(id) {
    const query = 'SELECT * FROM workers WHERE id = $1';
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorker(result.rows[0]);
  }

  async getWorkerByName(organizationId, name) {
    const query = 'SELECT * FROM workers WHERE organization_id = $1 AND name = $2';
    const result = await this.db.query(query, [organizationId, name]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorker(result.rows[0]);
  }

  async updateWorker(id, data) {
    const updates = [];
    const values = [id];
    let paramCount = 1;

    const updateFields = {
      name: 'name',
      displayName: 'display_name',
      description: 'description',
      category: 'category',
      version: 'version',
      status: 'status',
      visibility: 'visibility',
      icon: 'icon',
      tags: 'tags',
      capabilities: { key: 'capabilities', transform: v => JSON.stringify(v) },
      requiredPermissions: { key: 'required_permissions', transform: v => JSON.stringify(v) },
      requiredInputs: { key: 'required_inputs', transform: v => JSON.stringify(v) },
      expectedOutputs: { key: 'expected_outputs', transform: v => JSON.stringify(v) },
      supportedExecutionModes: 'supported_execution_modes',
      retryPolicy: { key: 'retry_policy', transform: v => JSON.stringify(v) },
      timeout: 'timeout',
      costPolicy: { key: 'cost_policy', transform: v => JSON.stringify(v) }
    };

    for (const [field, dbField] of Object.entries(updateFields)) {
      if (data[field] !== undefined) {
        paramCount++;
        const fieldName = typeof dbField === 'string' ? dbField : dbField.key;
        const value = typeof dbField === 'string' ? data[field] : dbField.transform(data[field]);
        updates.push(`${fieldName} = $${paramCount}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return this.getWorkerById(id);
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE workers
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToWorker(result.rows[0]);
  }

  async deleteWorker(id) {
    const query = 'DELETE FROM workers WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  async searchWorkers(organizationId, filters = {}, limit = 50, offset = 0) {
    let query = 'SELECT * FROM workers WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      values.push(organizationId);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.visibility) {
      paramCount++;
      query += ` AND visibility = $${paramCount}`;
      values.push(filters.visibility);
    }

    if (filters.author) {
      paramCount++;
      query += ` AND author = $${paramCount}`;
      values.push(filters.author);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm, searchTerm);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      values.push(filters.tags);
    }

    query += ' ORDER BY created_at DESC';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToWorker(row));
  }

  async countWorkers(organizationId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM workers WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      values.push(organizationId);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      values.push(filters.status);
    }

    if (filters.visibility) {
      paramCount++;
      query += ` AND visibility = $${paramCount}`;
      values.push(filters.visibility);
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  // ─── Worker Versions ──────────────────────────────────────────────────────────

  async createWorkerVersion(workerId, version, definition, changelog = null, publishedBy = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO worker_versions (id, worker_id, version, changelog, definition, published_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [id, workerId, version, changelog, JSON.stringify(definition), publishedBy];
    const result = await this.db.query(query, values);
    return this.mapRowToWorkerVersion(result.rows[0]);
  }

  async getWorkerVersions(workerId) {
    const query = `
      SELECT * FROM worker_versions
      WHERE worker_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.db.query(query, [workerId]);
    return result.rows.map(row => this.mapRowToWorkerVersion(row));
  }

  async getWorkerVersion(workerId, version) {
    const query = 'SELECT * FROM worker_versions WHERE worker_id = $1 AND version = $2';
    const result = await this.db.query(query, [workerId, version]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorkerVersion(result.rows[0]);
  }

  async setCurrentVersion(workerId, versionId) {
    const query1 = 'UPDATE worker_versions SET is_current = false WHERE worker_id = $1';
    await this.db.query(query1, [workerId]);

    const query2 = `
      UPDATE worker_versions
      SET is_current = true, published_at = NOW()
      WHERE id = $1 AND worker_id = $2
      RETURNING *
    `;
    const result = await this.db.query(query2, [versionId, workerId]);
    return result.rows.length > 0;
  }

  // ─── Worker Dependencies ──────────────────────────────────────────────────────

  async addWorkerDependency(workerId, dependsOnWorkerId, versionConstraint = '*', isOptional = false) {
    const id = uuidv4();
    const query = `
      INSERT INTO worker_dependencies (id, worker_id, depends_on_worker_id, version_constraint, is_optional)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [id, workerId, dependsOnWorkerId, versionConstraint, isOptional];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getWorkerDependencies(workerId) {
    const query = `
      SELECT wd.*, w.name as depends_on_name, w.display_name as depends_on_display_name
      FROM worker_dependencies wd
      JOIN workers w ON wd.depends_on_worker_id = w.id
      WHERE wd.worker_id = $1
    `;
    const result = await this.db.query(query, [workerId]);
    return result.rows;
  }

  async removeWorkerDependency(workerId, dependsOnWorkerId) {
    const query = 'DELETE FROM worker_dependencies WHERE worker_id = $1 AND depends_on_worker_id = $2';
    const result = await this.db.query(query, [workerId, dependsOnWorkerId]);
    return result.rowCount > 0;
  }

  // ─── Worker Executions ────────────────────────────────────────────────────────

  async createExecution(workerId, organizationId, executionMode, inputs = {}, triggeredBy = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO worker_executions (
        id, worker_id, organization_id, execution_mode, inputs, triggered_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [id, workerId, organizationId, executionMode, JSON.stringify(inputs), triggeredBy];
    const result = await this.db.query(query, values);
    return this.mapRowToExecution(result.rows[0]);
  }

  async getExecution(id) {
    const query = 'SELECT * FROM worker_executions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToExecution(result.rows[0]);
  }

  async updateExecution(id, updates) {
    const updateFields = [];
    const values = [id];
    let paramCount = 1;

    const fieldMap = {
      status: 'status',
      outputs: { key: 'outputs', transform: v => JSON.stringify(v) },
      result: { key: 'result', transform: v => JSON.stringify(v) },
      errorMessage: 'error_message',
      startedAt: 'started_at',
      completedAt: 'completed_at',
      durationMs: 'duration_ms',
      retryCount: 'retry_count',
      tokenUsage: { key: 'token_usage', transform: v => JSON.stringify(v) },
      costUsd: 'cost_usd',
      metadata: { key: 'metadata', transform: v => JSON.stringify(v) }
    };

    for (const [field, dbField] of Object.entries(fieldMap)) {
      if (updates[field] !== undefined) {
        paramCount++;
        const fieldName = typeof dbField === 'string' ? dbField : dbField.key;
        const value = typeof dbField === 'string' ? updates[field] : dbField.transform(updates[field]);
        updateFields.push(`${fieldName} = $${paramCount}`);
        values.push(value);
      }
    }

    if (updateFields.length === 0) {
      return this.getExecution(id);
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE worker_executions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToExecution(result.rows[0]);
  }

  async getWorkerExecutions(workerId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM worker_executions
      WHERE worker_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [workerId, limit, offset]);
    return result.rows.map(row => this.mapRowToExecution(row));
  }

  async getOrganizationExecutions(organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM worker_executions
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [organizationId, limit, offset]);
    return result.rows.map(row => this.mapRowToExecution(row));
  }

  // ─── Marketplace ──────────────────────────────────────────────────────────────

  async createMarketplaceItem(workerId, data) {
    const id = uuidv4();
    const query = `
      INSERT INTO marketplace_items (
        id, worker_id, name, description, short_description, category,
        icon, thumbnail, documentation_url, version, changelog, tags,
        dependencies, compatibility, is_featured, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;
    const values = [
      id,
      workerId,
      data.name,
      data.description || '',
      data.shortDescription || '',
      data.category,
      data.icon || 'box',
      data.thumbnail || null,
      data.documentationUrl || null,
      data.version,
      data.changelog || null,
      data.tags || [],
      JSON.stringify(data.dependencies || []),
      JSON.stringify(data.compatibility || {}),
      data.isFeatured || false,
      data.isVerified || false
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToMarketplaceItem(result.rows[0]);
  }

  async getMarketplaceItem(id) {
    const query = 'SELECT * FROM marketplace_items WHERE id = $1';
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToMarketplaceItem(result.rows[0]);
  }

  async searchMarketplace(filters = {}, limit = 50, offset = 0) {
    let query = 'SELECT * FROM marketplace_items WHERE status = $1';
    const values = ['available'];
    let paramCount = 1;

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm);
    }

    if (filters.isFeatured !== undefined) {
      paramCount++;
      query += ` AND is_featured = $${paramCount}`;
      values.push(filters.isFeatured);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      values.push(filters.tags);
    }

    query += ' ORDER BY install_count DESC, rating_average DESC';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToMarketplaceItem(row));
  }

  async incrementInstallCount(marketplaceItemId) {
    const query = `
      UPDATE marketplace_items
      SET install_count = install_count + 1
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [marketplaceItemId]);
    return result.rows.length > 0;
  }

  // ─── Worker Ratings ───────────────────────────────────────────────────────────

  async createOrUpdateRating(marketplaceItemId, userId, organizationId, rating, review = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO worker_ratings (id, marketplace_item_id, user_id, organization_id, rating, review)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (marketplace_item_id, user_id)
      DO UPDATE SET rating = $5, review = $6, updated_at = NOW()
      RETURNING *
    `;
    const values = [id, marketplaceItemId, userId, organizationId, rating, review];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getWorkerRatings(marketplaceItemId, limit = 50, offset = 0) {
    const query = `
      SELECT wr.*, u.display_name as user_name
      FROM worker_ratings wr
      JOIN users u ON wr.user_id = u.id
      WHERE wr.marketplace_item_id = $1
      ORDER BY wr.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [marketplaceItemId, limit, offset]);
    return result.rows;
  }

  // ─── Execution Logs ───────────────────────────────────────────────────────────

  async createExecutionLog(executionId, executionType, organizationId, level, message, data = {}) {
    const id = uuidv4();
    const query = `
      INSERT INTO execution_logs (id, execution_id, execution_type, organization_id, level, message, data)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [id, executionId, executionType, organizationId, level, message, JSON.stringify(data)];
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getExecutionLogs(executionId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM execution_logs
      WHERE execution_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [executionId, limit, offset]);
    return result.rows;
  }

  // ─── Mapping Helpers ──────────────────────────────────────────────────────────

  mapRowToWorker(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      version: row.version,
      status: row.status,
      author: row.author,
      visibility: row.visibility,
      icon: row.icon,
      tags: row.tags || [],
      capabilities: row.capabilities || [],
      requiredPermissions: row.required_permissions || [],
      requiredInputs: row.required_inputs || [],
      expectedOutputs: row.expected_outputs || [],
      supportedExecutionModes: row.supported_execution_modes || [],
      retryPolicy: row.retry_policy || {},
      timeout: row.timeout,
      costPolicy: row.cost_policy || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToWorkerVersion(row) {
    return {
      id: row.id,
      workerId: row.worker_id,
      version: row.version,
      changelog: row.changelog,
      definition: row.definition,
      isCurrent: row.is_current,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      createdAt: row.created_at
    };
  }

  mapRowToExecution(row) {
    return {
      id: row.id,
      workerId: row.worker_id,
      workerVersionId: row.worker_version_id,
      organizationId: row.organization_id,
      triggeredBy: row.triggered_by,
      executionMode: row.execution_mode,
      status: row.status,
      inputs: row.inputs || {},
      outputs: row.outputs || {},
      result: row.result || {},
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      retryCount: row.retry_count,
      maxRetries: row.max_retries,
      tokenUsage: row.token_usage || {},
      costUsd: row.cost_usd,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }

  mapRowToMarketplaceItem(row) {
    return {
      id: row.id,
      workerId: row.worker_id,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
      category: row.category,
      icon: row.icon,
      thumbnail: row.thumbnail,
      documentationUrl: row.documentation_url,
      version: row.version,
      changelog: row.changelog,
      tags: row.tags || [],
      dependencies: row.dependencies || [],
      compatibility: row.compatibility || {},
      isFeatured: row.is_featured,
      isVerified: row.is_verified,
      installCount: row.install_count,
      ratingAverage: parseFloat(row.rating_average),
      ratingCount: row.rating_count,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default WorkerRepository;