// Schedule Repository - Data access layer for scheduling framework

import { v4 as uuidv4 } from 'uuid';

class ScheduleRepository {
  constructor(db) {
    this.db = db;
  }

  // ─── Schedule CRUD ───────────────────────────────────────────────────────────

  async createSchedule(organizationId, data, createdBy = null) {
    const id = uuidv4();
    const query = `
      INSERT INTO schedules (
        id, organization_id, name, description, schedule_type, cron_expression,
        schedule_config, execution_target, is_active, last_run_at, next_run_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      id,
      organizationId,
      data.name,
      data.description || '',
      data.scheduleType,
      data.cronExpression || null,
      JSON.stringify(data.scheduleConfig || {}),
      JSON.stringify(data.executionTarget || {}),
      data.isActive !== undefined ? data.isActive : true,
      data.lastRunAt || null,
      data.nextRunAt || null,
      createdBy
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToSchedule(result.rows[0]);
  }

  async getScheduleById(id) {
    const query = 'SELECT * FROM schedules WHERE id = $1';
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToSchedule(result.rows[0]);
  }

  async updateSchedule(id, data) {
    const updates = [];
    const values = [id];
    let paramCount = 1;

    const updateFields = {
      name: 'name',
      description: 'description',
      scheduleType: 'schedule_type',
      cronExpression: 'cron_expression',
      scheduleConfig: { key: 'schedule_config', transform: v => JSON.stringify(v) },
      executionTarget: { key: 'execution_target', transform: v => JSON.stringify(v) },
      isActive: 'is_active',
      lastRunAt: 'last_run_at',
      nextRunAt: 'next_run_at',
      runCount: 'run_count'
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
      return this.getScheduleById(id);
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE schedules
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return this.mapRowToSchedule(result.rows[0]);
  }

  async deleteSchedule(id) {
    const query = 'DELETE FROM schedules WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  async searchSchedules(organizationId, filters = {}, limit = 50, offset = 0) {
    let query = 'SELECT * FROM schedules WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      values.push(organizationId);
    }

    if (filters.scheduleType) {
      paramCount++;
      query += ` AND schedule_type = $${paramCount}`;
      values.push(filters.scheduleType);
    }

    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    if (filters.createdBy) {
      paramCount++;
      query += ` AND created_by = $${paramCount}`;
      values.push(filters.createdBy);
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
    return result.rows.map(row => this.mapRowToSchedule(row));
  }

  async countSchedules(organizationId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM schedules WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      values.push(organizationId);
    }

    if (filters.scheduleType) {
      paramCount++;
      query += ` AND schedule_type = $${paramCount}`;
      values.push(filters.scheduleType);
    }

    if (filters.isActive !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      values.push(filters.isActive);
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  async getActiveSchedules() {
    const query = `
      SELECT * FROM schedules
      WHERE is_active = true
      AND next_run_at IS NOT NULL
      AND next_run_at <= NOW()
      ORDER BY next_run_at ASC
    `;
    const result = await this.db.query(query);
    return result.rows.map(row => this.mapRowToSchedule(row));
  }

  async updateScheduleRun(id, nextRunAt) {
    const query = `
      UPDATE schedules
      SET last_run_at = NOW(),
          next_run_at = $2,
          run_count = run_count + 1
      WHERE id = $1
      RETURNING *
    `;
    const result = await this.db.query(query, [id, nextRunAt]);
    return result.rows.length > 0 ? this.mapRowToSchedule(result.rows[0]) : null;
  }

  // ─── Mapping Helpers ──────────────────────────────────────────────────────────

  mapRowToSchedule(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      scheduleType: row.schedule_type,
      cronExpression: row.cron_expression,
      scheduleConfig: row.schedule_config || {},
      executionTarget: row.execution_target || {},
      isActive: row.is_active,
      lastRunAt: row.last_run_at,
      nextRunAt: row.next_run_at,
      runCount: row.run_count,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default ScheduleRepository;