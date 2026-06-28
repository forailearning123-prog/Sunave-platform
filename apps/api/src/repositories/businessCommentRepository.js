// Business Comment Repository

import { v4 as uuidv4 } from 'uuid';

class BusinessCommentRepository {
  constructor(db) {
    this.db = db;
  }

  async create(data, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_comments (
        id, organization_id, object_id, parent_comment_id, content, content_type,
        author_id, is_resolved, is_pinned, is_edited, reactions, attachments, metadata,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const params = [
      id,
      data.organizationId,
      data.objectId,
      data.parentCommentId || null,
      data.content,
      data.contentType || 'markdown',
      userId,
      false,
      false,
      false,
      JSON.stringify(data.reactions || {}),
      JSON.stringify(data.attachments || []),
      JSON.stringify(data.metadata || {}),
      now,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapRow(result.rows[0]);
  }

  async findById(id, organizationId) {
    const query = `
      SELECT * FROM business_comments
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
    `;

    const result = await this.db.query(query, [id, organizationId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async findByObject(objectId, organizationId, limit = 50, offset = 0) {
    const query = `
      SELECT c.*, u.display_name as author_name, u.email as author_email
      FROM business_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.object_id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL
        AND c.parent_comment_id IS NULL
      ORDER BY c.is_pinned DESC, c.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await this.db.query(query, [objectId, organizationId, limit, offset]);
    return result.rows.map(row => this.mapRow(row));
  }

  async findReplies(commentId, organizationId) {
    const query = `
      SELECT c.*, u.display_name as author_name, u.email as author_email
      FROM business_comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.parent_comment_id = $1 AND c.organization_id = $2 AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `;

    const result = await this.db.query(query, [commentId, organizationId]);
    return result.rows.map(row => this.mapRow(row));
  }

  async update(id, organizationId, data, userId) {
    const now = new Date().toISOString();

    const updates = [];
    const params = [id, organizationId];
    let paramIndex = 3;

    if (data.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      params.push(data.content);
    }

    if (data.isResolved !== undefined) {
      updates.push(`is_resolved = $${paramIndex++}`);
      params.push(data.isResolved);
    }

    if (data.isPinned !== undefined) {
      updates.push(`is_pinned = $${paramIndex++}`);
      params.push(data.isPinned);
    }

    if (data.reactions !== undefined) {
      updates.push(`reactions = $${paramIndex++}`);
      params.push(JSON.stringify(data.reactions));
    }

    updates.push(`is_edited = true`);
    updates.push(`edited_at = $${paramIndex++}`);
    params.push(now);
    updates.push(`updated_at = $${paramIndex++}`);
    params.push(now);

    if (updates.length === 0) {
      return this.findById(id, organizationId);
    }

    const query = `
      UPDATE business_comments
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
      UPDATE business_comments
      SET deleted_at = $1
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await this.db.query(query, [now, id, organizationId]);
    return result.rows.length > 0;
  }

  async addMention(commentId, mentionData, userId) {
    const id = uuidv4();
    const now = new Date().toISOString();

    const query = `
      INSERT INTO business_mentions (
        id, organization_id, comment_id, mentioned_type, mentioned_id, mentioned_name, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      id,
      mentionData.organizationId,
      commentId,
      mentionData.mentionedType,
      mentionData.mentionedId,
      mentionData.mentionedName || null,
      now
    ];

    const result = await this.db.query(query, params);
    return this.mapMentionRow(result.rows[0]);
  }

  async findMentions(commentId, organizationId) {
    const query = `
      SELECT * FROM business_mentions
      WHERE comment_id = $1 AND organization_id = $2
      ORDER BY created_at ASC
    `;

    const result = await this.db.query(query, [commentId, organizationId]);
    return result.rows.map(row => this.mapMentionRow(row));
  }

  async deleteMentions(commentId, organizationId) {
    const query = `
      DELETE FROM business_mentions
      WHERE comment_id = $1 AND organization_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [commentId, organizationId]);
    return result.rows.length;
  }

  mapRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      objectId: row.object_id,
      parentCommentId: row.parent_comment_id,
      content: row.content,
      contentType: row.content_type,
      authorId: row.author_id,
      authorName: row.author_name,
      authorEmail: row.author_email,
      isResolved: row.is_resolved,
      isPinned: row.is_pinned,
      isEdited: row.is_edited,
      editedAt: row.edited_at,
      reactions: row.reactions || {},
      attachments: row.attachments || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at
    };
  }

  mapMentionRow(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      commentId: row.comment_id,
      mentionedType: row.mentioned_type,
      mentionedId: row.mentioned_id,
      mentionedName: row.mentioned_name,
      createdAt: row.created_at
    };
  }
}

export default BusinessCommentRepository;