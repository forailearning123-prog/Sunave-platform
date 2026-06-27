// Workflow Repository - Data access layer for workflow engine

const { v4: uuidv4 } = require('uuid');

class WorkflowRepository {
  constructor(db) {
    this.db = db;
  }

  // ─── Workflow CRUD ───────────────────────────────────────────────────────────

  async createWorkflow(organizationId, data, authorId = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO workflows (
        id, organization_id, name, description, category, version, status,
        steps, connections, variables, inputs, outputs, triggers, author
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [
      id,
      organizationId,
      data.name,
      data.description || '',
      data.category || 'custom',
      data.version || '1.0.0',
      data.status || 'draft',
      JSON.stringify(data.steps || []),
      JSON.stringify(data.connections || []),
      JSON.stringify(data.variables || {}),
      JSON.stringify(data.inputs || []),
      JSON.stringify(data.outputs || []),
      JSON.stringify(data.triggers || []),
      authorId
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToWorkflow(result.rows[0]);
  }

  async getWorkflowById(id) {
    const query = 'SELECT * FROM workflows WHERE id = $1';
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorkflow(result.rows[0]);
  }

  async updateWorkflow(id, data) {
    const updates = [];
    const values = [id];
    let paramCount = 1;

    const updateFields = {
      name: 'name',
      description: 'description',
      category: 'category',
      version: 'version',
      status: 'status',
      steps: { key: 'steps', transform: v => JSON.stringify(v) },
      connections: { key: 'connections', transform: v => JSON.stringify(v) },
      variables: { key: 'variables', transform: v => JSON.stringify(v) },
      inputs: { key: 'inputs', transform: v => JSON.stringify(v) },
      outputs: { key: 'outputs', transform: v => JSON.stringify(v) },
      triggers: { key: 'triggers', transform: v => JSON.stringify(v) }
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
      return this.getWorkflowById(id);
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE workflows
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToWorkflow(result.rows[0]);
  }

  async deleteWorkflow(id) {
    const query = 'DELETE FROM workflows WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  async searchWorkflows(organizationId, filters = {}, limit = 50, offset = 0) {
    let query = 'SELECT * FROM workflows WHERE 1=1';
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

    if (filters.author) {
      paramCount++;
      query += ` AND author = $${paramCount}`;
      values.push(filters.author);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToWorkflow(row));
  }

  async countWorkflows(organizationId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM workflows WHERE 1=1';
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

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  // ─── Workflow Steps ──────────────────────────────────────────────────────────

  async addWorkflowStep(workflowId, stepData) {
    const id = uuidv4();
    const query = `
      INSERT INTO workflow_steps (
        id, workflow_id, step_id, step_type, name, description, config, position, order_index
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      id,
      workflowId,
      stepData.stepId,
      stepData.stepType,
      stepData.name,
      stepData.description || '',
      JSON.stringify(stepData.config || {}),
      JSON.stringify(stepData.position || { x: 0, y: 0 }),
      stepData.orderIndex || 0
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToWorkflowStep(result.rows[0]);
  }

  async getWorkflowSteps(workflowId) {
    const query = `
      SELECT * FROM workflow_steps
      WHERE workflow_id = $1
      ORDER BY order_index ASC
    `;
    const result = await this.db.query(query, [workflowId]);
    return result.rows.map(row => this.mapRowToWorkflowStep(row));
  }

  async updateWorkflowStep(workflowId, stepId, data) {
    const updates = [];
    const values = [workflowId, stepId];
    let paramCount = 2;

    const updateFields = {
      name: 'name',
      description: 'description',
      config: { key: 'config', transform: v => JSON.stringify(v) },
      position: { key: 'position', transform: v => JSON.stringify(v) },
      orderIndex: 'order_index'
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
      const query = 'SELECT * FROM workflow_steps WHERE workflow_id = $1 AND step_id = $2';
      const result = await this.db.query(query, [workflowId, stepId]);
      if (result.rows.length === 0) return null;
      return this.mapRowToWorkflowStep(result.rows[0]);
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(workflowId, stepId);

    const query = `
      UPDATE workflow_steps
      SET ${updates.join(', ')}
      WHERE workflow_id = $${paramCount - 1} AND step_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows.length > 0 ? this.mapRowToWorkflowStep(result.rows[0]) : null;
  }

  async deleteWorkflowStep(workflowId, stepId) {
    const query = 'DELETE FROM workflow_steps WHERE workflow_id = $1 AND step_id = $2';
    const result = await this.db.query(query, [workflowId, stepId]);
    return result.rowCount > 0;
  }

  // ─── Workflow Connections ────────────────────────────────────────────────────

  async addWorkflowConnection(workflowId, connectionData) {
    const id = uuidv4();
    const query = `
      INSERT INTO workflow_connections (
        id, workflow_id, connection_id, source_step_id, target_step_id,
        source_port, target_port, condition
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      id,
      workflowId,
      connectionData.connectionId,
      connectionData.sourceStepId,
      connectionData.targetStepId,
      connectionData.sourcePort || 'output',
      connectionData.targetPort || 'input',
      JSON.stringify(connectionData.condition || {})
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToWorkflowConnection(result.rows[0]);
  }

  async getWorkflowConnections(workflowId) {
    const query = `
      SELECT * FROM workflow_connections
      WHERE workflow_id = $1
    `;
    const result = await this.db.query(query, [workflowId]);
    return result.rows.map(row => this.mapRowToWorkflowConnection(row));
  }

  async deleteWorkflowConnection(workflowId, connectionId) {
    const query = 'DELETE FROM workflow_connections WHERE workflow_id = $1 AND connection_id = $2';
    const result = await this.db.query(query, [workflowId, connectionId]);
    return result.rowCount > 0;
  }

  // ─── Workflow Executions ─────────────────────────────────────────────────────

  async createWorkflowExecution(workflowId, organizationId, triggerType, inputs = {}, triggeredBy = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO workflow_executions (
        id, workflow_id, organization_id, trigger_type, inputs, triggered_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [id, workflowId, organizationId, triggerType, JSON.stringify(inputs), triggeredBy];
    const result = await this.db.query(query, values);
    return this.mapRowToWorkflowExecution(result.rows[0]);
  }

  async getWorkflowExecution(id) {
    const query = 'SELECT * FROM workflow_executions WHERE id = $1';
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorkflowExecution(result.rows[0]);
  }

  async updateWorkflowExecution(id, updates) {
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
      currentStepId: 'current_step_id',
      executionPath: { key: 'execution_path', transform: v => JSON.stringify(v) },
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
      return this.getWorkflowExecution(id);
    }

    paramCount++;
    updateFields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE workflow_executions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToWorkflowExecution(result.rows[0]);
  }

  async getWorkflowExecutions(workflowId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM workflow_executions
      WHERE workflow_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [workflowId, limit, offset]);
    return result.rows.map(row => this.mapRowToWorkflowExecution(row));
  }

  async getOrganizationWorkflowExecutions(organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM workflow_executions
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [organizationId, limit, offset]);
    return result.rows.map(row => this.mapRowToWorkflowExecution(row));
  }

  // ─── Workflow Templates ──────────────────────────────────────────────────────

  async createWorkflowTemplate(data, createdBy = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO workflow_templates (
        id, name, description, category, icon, thumbnail, template, tags,
        is_system, is_public, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      id,
      data.name,
      data.description || '',
      data.category,
      data.icon || 'template',
      data.thumbnail || null,
      JSON.stringify(data.template || {}),
      data.tags || [],
      data.isSystem || false,
      data.isPublic || false,
      createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToWorkflowTemplate(result.rows[0]);
  }

  async getWorkflowTemplate(id) {
    const query = 'SELECT * FROM workflow_templates WHERE id = $1';
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToWorkflowTemplate(result.rows[0]);
  }

  async searchWorkflowTemplates(filters = {}, limit = 50, offset = 0) {
    let query = 'SELECT * FROM workflow_templates WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      values.push(filters.category);
    }

    if (filters.isPublic !== undefined) {
      paramCount++;
      query += ` AND is_public = $${paramCount}`;
      values.push(filters.isPublic);
    }

    if (filters.isSystem !== undefined) {
      paramCount++;
      query += ` AND is_system = $${paramCount}`;
      values.push(filters.isSystem);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      const searchTerm = `%${filters.search}%`;
      values.push(searchTerm, searchTerm);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      values.push(filters.tags);
    }

    query += ' ORDER BY usage_count DESC, rating DESC';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(limit);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    values.push(offset);

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToWorkflowTemplate(row));
  }

  async incrementTemplateUsage(templateId) {
    const query = `
      UPDATE workflow_templates
      SET usage_count = usage_count + 1
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [templateId]);
    return result.rows.length > 0;
  }

  // ─── Mapping Helpers ──────────────────────────────────────────────────────────

  mapRowToWorkflow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      category: row.category,
      version: row.version,
      status: row.status,
      steps: row.steps || [],
      connections: row.connections || [],
      variables: row.variables || {},
      inputs: row.inputs || [],
      outputs: row.outputs || [],
      triggers: row.triggers || [],
      author: row.author,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToWorkflowStep(row) {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      stepId: row.step_id,
      stepType: row.step_type,
      name: row.name,
      description: row.description,
      config: row.config || {},
      position: row.position || { x: 0, y: 0 },
      orderIndex: row.order_index,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToWorkflowConnection(row) {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      connectionId: row.connection_id,
      sourceStepId: row.source_step_id,
      targetStepId: row.target_step_id,
      sourcePort: row.source_port,
      targetPort: row.target_port,
      condition: row.condition || {},
      createdAt: row.created_at
    };
  }

  mapRowToWorkflowExecution(row) {
    return {
      id: row.id,
      workflowId: row.workflow_id,
      organizationId: row.organization_id,
      triggeredBy: row.triggered_by,
      triggerType: row.trigger_type,
      status: row.status,
      inputs: row.inputs || {},
      outputs: row.outputs || {},
      result: row.result || {},
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      currentStepId: row.current_step_id,
      executionPath: row.execution_path || [],
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }

  mapRowToWorkflowTemplate(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      icon: row.icon,
      thumbnail: row.thumbnail,
      template: row.template,
      tags: row.tags || [],
      isSystem: row.is_system,
      isPublic: row.is_public,
      usageCount: row.usage_count,
      rating: parseFloat(row.rating),
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

module.exports = WorkflowRepository;