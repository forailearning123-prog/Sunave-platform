// Business Favorite Repository

import { v4 as uuidv4 } from 'uuid';

class BusinessFavoriteRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_favorites (
        id, organization_id, user_id, object_id, created_at
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (organization_id, user_id, object_id) DO NOTHING
      RETURNING *
    `;

    const params = [id, data.organizationId, userId, data.objectId, now];
    const result = await this.db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_favorites
      WHERE id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByUser(userId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT f.*, bo.name as object_name, bo.object_type, bo.status as object_status
      FROM business_favorites f
      JOIN business_objects bo ON f.object_id = bo.id
      WHERE f.user_id = $1 AND f.organization_id = $2 AND bo.deleted_at IS NULL
      ORDER BY f.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [userId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findByObject(objectId, organizationId) {
    const query = `
      SELECT f.*, u.display_name as user_name, u.email as user_email
      FROM business_favorites f
      JOIN users u ON f.user_id = u.id
      WHERE f.object_id = $1 AND f.organization_id = $2
      ORDER BY f.created_at DESC
    `;

    const result = await this.db.query(query, [objectId, organizationId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async checkIfFavorited(userId, objectId, organizationId) {
    const query = `
      SELECT id FROM business_favorites
      WHERE user_id = $1 AND object_id = $2 AND organization_id = $3
    `;

    const result = await this.db.query(query, [userId, objectId, organizationId]);
    return result.rows.length > 0;
  }

  async delete(id, organizationId, userId) {
    const query = `
      DELETE FROM business_favorites
      WHERE id = $1 AND organization_id = $2 AND user_id = $3
      RETURNING id
    `;

    const result = await this.db.query(query, [id, organizationId, userId]);
    return result.rows.length > 0;
  }

  async deleteByObject(objectId, organizationId, userId) {
    const query = `
      DELETE FROM business_favorites
      WHERE object_id = $1 AND organization_id = $2 AND user_id = $3
      RETURNING id
    `;

    const result = await this.db.query(query, [objectId, organizationId, userId]);
    return result.rows.length > 0;
  }

  async getCount(objectId, organizationId) {
    const query = `
      SELECT COUNT(*) as count
      FROM business_favorites
      WHERE object_id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [objectId, organizationId]);
    return parseInt(result.rows[0].count);
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      objectId: row.object_id,
      createdAt: row.created_at,
      objectName: row.object_name,
      objectType: row.object_type,
      objectStatus: row.object_status,
      userName: row.user_name,
      userEmail: row.user_email
    };
  }
}

export default BusinessFavoriteRepository;