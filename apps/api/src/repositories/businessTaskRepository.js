// Business Task Repository

import { v4 as uuidv4 } from 'uuid';

class BusinessTaskRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_tasks (
        id, organization_id, object_id, title, description, status, priority,
        assignee_id, assignee_type, due_date, reminder_at, parent_task_id,
        checklist, dependencies, is_recurring, recurrence_pattern, metadata,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.objectId,
      data.title,
      data.description || null,
      data.status || 'open',
      data.priority || 'medium',
      data.assigneeId || null,
      data.assigneeType || null,
      data.dueDate || null,
      data.reminderAt || null,
      data.parentTaskId || null,
      JSON.stringify(data.checklist || []),
      JSON.stringify(data.dependencies || []),
      data.isRecurring || false,
      data.recurrencePattern ? JSON.stringify(data.recurrencePattern) : null,
      JSON.stringify(data.metadata || {}),
      userId,
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_tasks
      WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByObject(objectId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT t.*, u.display_name as assignee_name, u.email as assignee_email
      FROM business_tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      WHERE t.object_id = $1 AND t.organization_id = $2 AND t.archived_at IS NULL
      ORDER BY t.due_date ASC NULLS LAST, t.priority DESC, t.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [objectId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByAssignee(assigneeId, organizationId, status = null, limit = 50, offset = 0) {
    let query = `
      SELECT t.*, bo.name as object_name, bo.object_type
      FROM business_tasks t
      JOIN business_objects bo ON t.object_id = bo.id
      WHERE t.assignee_id = $1 AND t.organization_id = $2 AND t.archived_at IS NULL
    `;
    const params = [assigneeId, organizationId];
    let paramIndex = 3;

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY t.due_date ASC NULLS LAST, t.priority DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  async findSubtasks(parentTaskId, organizationId) {
    const query = `
      SELECT * FROM business_tasks
      WHERE parent_task_id = $1 AND organization_id = $2 AND archived_at IS NULL
      ORDER BY created_at ASC
    `;

    const result = await this.db.query(query, [parentTaskId, organizationId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async update(id, organizationId, data, userId) {
    const now = new Date().toISOString();

    const updates = [];
    const params = [id, organizationId];
    let paramIndex = 3;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
      if (data.status === 'completed') {
        updates.push(`completed_at = $${paramIndex++}`);
        params.push(now);
      }
    }

    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(data.priority);
    }

    if (data.assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramIndex++}`);
      params.push(data.assigneeId);
    }

    if (data.assigneeType !== undefined) {
      updates.push(`assignee_type = $${paramIndex++}`);
      params.push(data.assigneeType);
    }

    if (data.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex++}`);
      params.push(data.dueDate);
    }

    if (data.reminderAt !== undefined) {
      updates.push(`reminder_at = $${paramIndex++}`);
      params.push(data.reminderAt);
    }

    if (data.checklist !== undefined) {
      updates.push(`checklist = $${paramIndex++}`);
      params.push(JSON.stringify(data.checklist));
    }

    if (data.dependencies !== undefined) {
      updates.push(`dependencies = $${paramIndex++}`);
      params.push(JSON.stringify(data.dependencies));
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);
    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (updates.length === 0) {
      return this.findById(id, organizationId);
    }

    const query = `
      UPDATE business_tasks
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async archive(id, organizationId, userId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_tasks
      SET archived_at = $1, updated_by = $2, updated_at = $3
      WHERE id = $4 AND organization_id = $5 AND archived_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, userId, now, id, organizationId]);
    return result.rows.length > 0;
  }

  async delete(id, organizationId, userId) {
    const query = `
      DELETE FROM business_tasks
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows.length > 0;
  }

  async getTaskStats(organizationId, assigneeId = null) {
    let query = `
      SELECT
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tasks,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
        COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('completed', 'cancelled') THEN 1 END) as overdue_tasks
      FROM business_tasks
      WHERE organization_id = $1 AND archived_at IS NULL
    `;
    const params = [organizationId];

    if (assigneeId) {
      query += ` AND assignee_id = $2`;
      params.push(assigneeId);
    }

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      objectId: row.object_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigneeId: row.assignee_id,
      assigneeType: row.assignee_type,
      assigneeName: row.assignee_name,
      assigneeEmail: row.assignee_email,
      dueDate: row.due_date,
      reminderAt: row.reminder_at,
      parentTaskId: row.parent_task_id,
      checklist: row.checklist || [],
      dependencies: row.dependencies || [],
      isRecurring: row.is_recurring,
      recurrencePattern: row.recurrence_pattern,
      metadata: row.metadata || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
      archivedAt: row.archived_at
    };
  }
}

export default BusinessTaskRepository;