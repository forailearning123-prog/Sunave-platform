// Business Activity Repository

const { v4: uuidv4 } = require('uuid');

class BusinessActivityRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_activities (
        id, organization_id, object_id, activity_type, description,
        actor_id, actor_type, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.objectId,
      data.activityType,
      data.description || null,
      userId,
      data.actorType || 'user',
      JSON.stringify(data.metadata || {}),
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_activities
      WHERE id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByObject(objectId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM business_activities
      WHERE object_id = $1 AND organization_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [objectId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByOrganization(organizationId, filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT * FROM business_activities
      WHERE organization_id = $1
    `;
    const params = [organizationId];
    let paramIndex = 2;

    if (filters.activityType) {
      query += ` AND activity_type = $${paramIndex++}`;
      params.push(filters.activityType);
    }

    if (filters.actorId) {
      query += ` AND actor_id = $${paramIndex++}`;
      params.push(filters.actorId);
    }

    if (filters.startDate) {
      query += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  async deleteByObject(objectId, organizationId) {
    const query = `
      DELETE FROM business_activities
      WHERE object_id = $1 AND organization_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [objectId, organizationId]);
    return result.rows.length;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      objectId: row.object_id,
      activityType: row.activity_type,
      description: row.description,
      actorId: row.actor_id,
      actorType: row.actor_type,
      metadata: row.metadata || {},
      createdAt: row.created_at
    };
  }
}

module.exports = BusinessActivityRepository;