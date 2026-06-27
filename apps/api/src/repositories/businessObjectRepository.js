// Business Object Repository
// Handles all database operations for business objects

const { v4: uuidv4 } = require('uuid');

class BusinessObjectRepository {
  constructor(db) {
    this.db = db;
  }

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_objects (
        id, organization_id, object_type, name, description, status,
        owner_id, created_by, updated_by, created_at, updated_at,
        version, visibility, tags, custom_fields, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.objectType,
      data.name,
      data.description || null,
      data.status || 'draft',
      data.ownerId || null,
      userId,
      userId,
      now,
      now,
      1,
      data.visibility || 'organization',
      JSON.stringify(data.tags || []),
      JSON.stringify(data.customFields || {}),
      JSON.stringify(data.metadata || {})
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_objects
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByIds(ids, organizationId) {
    const query = `
      SELECT * FROM business_objects
      WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [ids, organizationId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findAll(organizationId, filters = {}) {
    let query = `
      SELECT * FROM business_objects
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;
    const params = [organizationId];
    let paramIndex = 2;

    // Apply filters
    if (filters.objectType) {
      query += ` AND object_type = $${paramIndex++}`;
      params.push(filters.objectType);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters.ownerId) {
      query += ` AND owner_id = $${paramIndex++}`;
      params.push(filters.ownerId);
    }

    if (filters.visibility) {
      query += ` AND visibility = $${paramIndex++}`;
      params.push(filters.visibility);
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Sorting
    const sortBy = filters.sortBy || 'created_at';
    const sortOrder = filters.sortOrder || 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    return {
      data: result.rows.map(row => this.mapRow(row)),
      total: result.rows.length
    };
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

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }

    if (data.ownerId !== undefined) {
      updates.push(`owner_id = $${paramIndex++}`);
      params.push(data.ownerId);
    }

    if (data.visibility !== undefined) {
      updates.push(`visibility = $${paramIndex++}`);
      params.push(data.visibility);
    }

    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      params.push(JSON.stringify(data.tags));
    }

    if (data.customFields !== undefined) {
      updates.push(`custom_fields = $${paramIndex++}`);
      params.push(JSON.stringify(data.customFields));
    }

    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    updates.push(`updated_by = $${paramIndex++}`);
    params.push(userId);
    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);
    updates.push(`version = version + 1`);

    if (updates.length === 0) {
      return this.findById(id, organizationId);
    }

    const query = `
      UPDATE business_objects
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async delete(id, organizationId, userId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_objects
      SET deleted_at = $1, updated_by = $2, updated_at = $3
      WHERE id = $4 AND organization_id = $5 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, userId, now, id, organizationId]);
    return result.rows.length > 0;
  }

  async archive(id, organizationId, userId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_objects
      SET archived_at = $1, updated_by = $2, updated_at = $3, status = 'archived'
      WHERE id = $4 AND organization_id = $5 AND archived_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, userId, now, id, organizationId]);
    return result.rows.length > 0;
  }

  async restore(id, organizationId, userId) {
    const now = new Date().toISOString();

    const query = `
      UPDATE business_objects
      SET archived_at = NULL, updated_by = $1, updated_at = $2, status = 'draft'
      WHERE id = $3 AND organization_id = $4 AND archived_at IS NOT NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [userId, now, id, organizationId]);
    return result.rows.length > 0;
  }

  // ============================================
  // SEARCH
  // ============================================

  async search(organizationId, searchTerm, filters = {}) {
    const query = `
      SELECT * FROM business_objects
      WHERE organization_id = $1
        AND deleted_at IS NULL
        AND (
          name ILIKE $2
          OR description ILIKE $2
          OR tags::text ILIKE $2
        )
    `;

    const params = [organizationId, `%${searchTerm}%`];
    let paramIndex = 3;

    if (filters.objectType) {
      query += ` AND object_type = $${paramIndex++}`;
      params.push(filters.objectType);
    }

    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      objectType: row.object_type,
      name: row.name,
      description: row.description,
      status: row.status,
      ownerId: row.owner_id,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      visibility: row.visibility,
      tags: row.tags || [],
      customFields: row.custom_fields || {},
      metadata: row.metadata || {},
      archivedAt: row.archived_at,
      deletedAt: row.deleted_at
    };
  }
}

module.exports = BusinessObjectRepository;