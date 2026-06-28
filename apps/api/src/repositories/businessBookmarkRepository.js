// Business Bookmark Repository

import { v4 as uuidv4 } from 'uuid';

class BusinessBookmarkRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_bookmarks (
        id, organization_id, user_id, name, description, object_type, object_id,
        filter_criteria, is_shared, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      userId,
      data.name,
      data.description || null,
      data.objectType || null,
      data.objectId || null,
      JSON.stringify(data.filterCriteria || {}),
      data.isShared || false,
      JSON.stringify(data.metadata || {}),
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_bookmarks
      WHERE id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByUser(userId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT * FROM business_bookmarks
      WHERE user_id = $1 AND organization_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [userId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findShared(organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT b.*, u.display_name as user_name, u.email as user_email
      FROM business_bookmarks b
      JOIN users u ON b.user_id = u.id
      WHERE b.organization_id = $1 AND b.is_shared = true
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await this.db.query(query, [organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async update(id, organizationId, data, userId) {
    const now = new Date().toISOString();

    const updates = [];
    const params = [id, organizationId];
    let paramIndex = 3;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (data.objectType !== undefined) {
      updates.push(`object_type = $${paramIndex++}`);
      params.push(data.objectType);
    }

    if (data.objectId !== undefined) {
      updates.push(`object_id = $${paramIndex++}`);
      params.push(data.objectId);
    }

    if (data.filterCriteria !== undefined) {
      updates.push(`filter_criteria = $${paramIndex++}`);
      params.push(JSON.stringify(data.filterCriteria));
    }

    if (data.isShared !== undefined) {
      updates.push(`is_shared = $${paramIndex++}`);
      params.push(data.isShared);
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (updates.length === 0) {
      return this.findById(id, organizationId);
    }

    const query = `
      UPDATE business_bookmarks
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id, organizationId, userId) {
    const query = `
      DELETE FROM business_bookmarks
      WHERE id = $1 AND organization_id = $2 AND user_id = $3
      RETURNING id
    `;

    const result = await this.db.query(query, [id, organizationId, userId]);
    return result.rows.length > 0;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      objectType: row.object_type,
      objectId: row.object_id,
      filterCriteria: row.filter_criteria || {},
      isShared: row.is_shared,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userName: row.user_name,
      userEmail: row.user_email
    };
  }
}

export default BusinessBookmarkRepository;