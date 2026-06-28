// Business Audit Repository

import { v4 as uuidv4 } from 'uuid';

class BusinessAuditRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_audit_logs (
        id, organization_id, actor_id, actor_type, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent, device_info,
        worker_id, agent_id, api_endpoint, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.actorId || userId,
      data.actorType || 'user',
      data.action,
      data.resourceType,
      data.resourceId || null,
      data.oldValues ? JSON.stringify(data.oldValues) : null,
      data.newValues ? JSON.stringify(data.newValues) : null,
      data.ipAddress || null,
      data.userAgent || null,
      data.deviceInfo ? JSON.stringify(data.deviceInfo) : null,
      data.workerId || null,
      data.agentId || null,
      data.apiEndpoint || null,
      JSON.stringify(data.metadata || {}),
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_audit_logs
      WHERE id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByResource(resourceType, resourceId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM business_audit_logs
      WHERE resource_type = $1 AND resource_id = $2 AND organization_id = $3
      ORDER BY created_at DESC
      LIMIT $4 OFFSET $5
    `;

    const result = await this.db.query(query, [resourceType, resourceId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByActor(actorId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM business_audit_logs
      WHERE actor_id = $1 AND organization_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [actorId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByOrganization(organizationId, filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT * FROM business_audit_logs
      WHERE organization_id = $1
    `;
    const params = [organizationId];
    let paramIndex = 2;

    if (filters.action) {
      query += ` AND action = $${paramIndex++}`;
      params.push(filters.action);
    }

    if (filters.resourceType) {
      query += ` AND resource_type = $${paramIndex++}`;
      params.push(filters.resourceType);
    }

    if (filters.actorId) {
      query += ` AND actor_id = $${paramIndex++}`;
      params.push(filters.actorId);
    }

    if (filters.actorType) {
      query += ` AND actor_type = $${paramIndex++}`;
      params.push(filters.actorType);
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByDateRange(organizationId, startDate, endDate, limit = 1000) {
    const query = `
      SELECT * FROM business_audit_logs
      WHERE organization_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
      LIMIT $4
    `;

    const result = await this.db.query(query, [organizationId, startDate, endDate, limit]);
    return result.rows.map(row => this.mapRow(row));
  }

  async getStats(organizationId, startDate = null, endDate = null) {
    let query = `
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT actor_id) as unique_actors,
        COUNT(DISTINCT resource_type) as resource_types,
        COUNT(DISTINCT DATE(created_at)) as active_days
      FROM business_audit_logs
      WHERE organization_id = $1
    `;
    const params = [organizationId];

    if (startDate) {
      query += ` AND created_at >= $2`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $3`;
      params.push(endDate);
    }

    const result = await this.db.query(query, params);
    return result.rows[0];
  }

  async getActionStats(organizationId, startDate = null, endDate = null) {
    let query = `
      SELECT action, COUNT(*) as count
      FROM business_audit_logs
      WHERE organization_id = $1
    `;
    const params = [organizationId];

    if (startDate) {
      query += ` AND created_at >= $2`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= $3`;
      params.push(endDate);
    }

    query += ` GROUP BY action ORDER BY count DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async deleteOldLogs(organizationId, beforeDate) {
    const query = `
      DELETE FROM business_audit_logs
      WHERE organization_id = $1 AND created_at < $2
      RETURNING id
    `;

    const result = await this.db.query(query, [organizationId, beforeDate]);
    return result.rows.length;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      actorId: row.actor_id,
      actorType: row.actor_type,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValues: row.old_values,
      newValues: row.new_values,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceInfo: row.device_info,
      workerId: row.worker_id,
      agentId: row.agent_id,
      apiEndpoint: row.api_endpoint,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }
}

export default BusinessAuditRepository;