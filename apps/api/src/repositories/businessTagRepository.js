// Business Tag Repository

import { v4 as uuidv4 } from 'uuid';

class BusinessTagRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_tags (
        id, organization_id, name, slug, color, description, parent_tag_id,
        category, aliases, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.name,
      data.slug,
      data.color || '#6366f1',
      data.description || null,
      data.parentTagId || null,
      data.category || null,
      JSON.stringify(data.aliases || []),
      JSON.stringify(data.metadata || {}),
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_tags
      WHERE id = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findBySlug(slug, organizationId) {
    const query = `
      SELECT * FROM business_tags
      WHERE slug = $1 AND organization_id = $2
    `;

    const result = await this.db.query(query, [slug, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findAll(organizationId, filters = {}, limit = 100, offset = 0) {
    let query = `
      SELECT * FROM business_tags
      WHERE organization_id = $1
    `;
    const params = [organizationId];
    let paramIndex = 2;

    if (filters.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }

    if (filters.parentTagId !== undefined) {
      if (filters.parentTagId === null) {
        query += ` AND parent_tag_id IS NULL`;
      } else {
        query += ` AND parent_tag_id = $${paramIndex++}`;
        params.push(filters.parentTagId);
      }
    }

    if (filters.search) {
      query += ` AND (name ILIKE $${paramIndex++} OR description ILIKE $${paramIndex++})`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` ORDER BY usage_count DESC, name ASC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  async findSystemTags() {
    const query = `
      SELECT * FROM business_tags
      WHERE organization_id IS NULL AND is_system = true
      ORDER BY name ASC
    `;

    const result = await this.db.query(query);
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

    if (data.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      params.push(data.slug);
    }

    if (data.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      params.push(data.color);
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(data.description);
    }

    if (data.parentTagId !== undefined) {
      updates.push(`parent_tag_id = $${paramIndex++}`);
      params.push(data.parentTagId);
    }

    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      params.push(data.category);
    }

    if (data.aliases !== undefined) {
      updates.push(`aliases = $${paramIndex++}`);
      params.push(JSON.stringify(data.aliases));
    }

    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (updates.length === 0) {
      return this.findById(id, organizationId);
    }

    const query = `
      UPDATE business_tags
      SET ${updates.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async incrementUsage(tagId, organizationId) {
    const query = `
      UPDATE business_tags
      SET usage_count = usage_count + 1
      WHERE id = $1 AND organization_id = $2
      RETURNING usage_count
    `;

    const result = await this.db.query(query, [tagId, organizationId]);
    return result.rows[0] ? result.rows[0].usage_count : 0;
  }

  async decrementUsage(tagId, organizationId) {
    const query = `
      UPDATE business_tags
      SET usage_count = GREATEST(usage_count - 1, 0)
      WHERE id = $1 AND organization_id = $2
      RETURNING usage_count
    `;

    const result = await this.db.query(query, [tagId, organizationId]);
    return result.rows[0] ? result.rows[0].usage_count : 0;
  }

  async delete(id, organizationId) {
    const query = `
      DELETE FROM business_tags
      WHERE id = $1 AND organization_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows.length > 0;
  }

  async search(organizationId, searchTerm, limit = 20) {
    const query = `
      SELECT * FROM business_tags
      WHERE organization_id = $1
        AND (name ILIKE $2 OR aliases::text ILIKE $2)
      ORDER BY usage_count DESC
      LIMIT $3
    `;

    const result = await this.db.query(query, [organizationId, `%${searchTerm}%`, limit]);
    return result.rows.map(row => this.mapRow(row));
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      slug: row.slug,
      color: row.color,
      description: row.description,
      parentTagId: row.parent_tag_id,
      category: row.category,
      aliases: row.aliases || [],
      usageCount: row.usage_count,
      isSystem: row.is_system,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default BusinessTagRepository;