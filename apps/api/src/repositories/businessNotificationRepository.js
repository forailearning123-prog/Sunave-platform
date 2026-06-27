// Business Notification Repository

const { v4: uuidv4 } = require('uuid');

class BusinessNotificationRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_notifications (
        id, organization_id, user_id, notification_type, title, message, priority,
        channel, object_type, object_id, action_url, is_read, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.userId,
      data.notificationType,
      data.title,
      data.message || null,
      data.priority || 'normal',
      data.channel || 'in_app',
      data.objectType || null,
      data.objectId || null,
      data.actionUrl || null,
      false,
      JSON.stringify(data.metadata || {}),
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_notifications
      WHERE id = $1 AND organization_id = $2 AND archived_at IS NULL
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByUser(userId, organizationId, filters = {}, limit = 50, offset = 0) {
    let query = `
      SELECT * FROM business_notifications
      WHERE user_id = $1 AND organization_id = $2 AND archived_at IS NULL
    `;
    const params = [userId, organizationId];
    let paramIndex = 3;

    if (filters.isRead !== undefined) {
      query += ` AND is_read = $${paramIndex++}`;
      params.push(filters.isRead);
    }

    if (filters.notificationType) {
      query += ` AND notification_type = $${paramIndex++}`;
      params.push(filters.notificationType);
    }

    if (filters.priority) {
      query += ` AND priority = $${paramIndex++}`;
      params.push(filters.priority);
    }

    query += ` ORDER BY created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  async markAsRead(id, organizationId, userId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_notifications
      SET is_read = true, read_at = $1
      WHERE id = $2 AND organization_id = $3 AND user_id = $4 AND archived_at IS NULL
      RETURNING *
    `;

    const result = await this.db.query(query, [now, id, organizationId, userId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async markAllAsRead(userId, organizationId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_notifications
      SET is_read = true, read_at = $1
      WHERE user_id = $2 AND organization_id = $3 AND is_read = false AND archived_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, userId, organizationId]);
    return result.rows.length;
  }

  async getUnreadCount(userId, organizationId) {
    const query = `
      SELECT COUNT(*) as count
      FROM business_notifications
      WHERE user_id = $1 AND organization_id = $2 AND is_read = false AND archived_at IS NULL
    `;

    const result = await this.db.query(query, [userId, organizationId]);
    return parseInt(result.rows[0].count);
  }

  async delete(id, organizationId, userId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_notifications
      SET archived_at = $1
      WHERE id = $2 AND organization_id = $3 AND user_id = $4 AND archived_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, id, organizationId, userId]);
    return result.rows.length > 0;
  }

  async deleteAll(userId, organizationId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_notifications
      SET archived_at = $1
      WHERE user_id = $2 AND organization_id = $3 AND archived_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, userId, organizationId]);
    return result.rows.length;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      userId: row.user_id,
      notificationType: row.notification_type,
      title: row.title,
      message: row.message,
      priority: row.priority,
      channel: row.channel,
      objectType: row.object_type,
      objectId: row.object_id,
      actionUrl: row.action_url,
      isRead: row.is_read,
      readAt: row.read_at,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      archivedAt: row.archived_at
    };
  }
}

module.exports = BusinessNotificationRepository;