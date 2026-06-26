import { v4 as uuid } from 'uuid';

function toComment(row) {
  return {
    id:              row.id,
    organizationId:  row.organization_id,
    entityType:      row.entity_type,
    entityId:        row.entity_id,
    authorId:        row.author_id,
    content:         row.content,
    parentCommentId: row.parent_comment_id,
    editedAt:        row.edited_at,
    createdAt:       row.created_at,
    authorName:      row.author_name ?? null,
    authorAvatar:    row.author_avatar ?? null,
    replyCount:      row.reply_count !== undefined ? Number(row.reply_count) : undefined
  };
}

export function createCommentRepository(pool) {
  const BASE = `
    SELECT c.*,
           CONCAT(u.first_name, ' ', u.last_name) AS author_name,
           u.avatar_url AS author_avatar,
           (SELECT COUNT(*) FROM comments r WHERE r.parent_comment_id = c.id) AS reply_count
    FROM comments c
    LEFT JOIN users u ON u.id = c.author_id`;

  return {
    async listComments(orgId, entityType, entityId, { parentCommentId = null } = {}) {
      const condition = parentCommentId === null
        ? 'c.parent_comment_id IS NULL'
        : `c.parent_comment_id = '${parentCommentId}'`;

      const res = await pool.query(
        `${BASE}
         WHERE c.organization_id = $1 AND c.entity_type = $2 AND c.entity_id = $3 AND ${condition}
         ORDER BY c.created_at ASC`,
        [orgId, entityType, entityId]
      );
      return res.rows.map(toComment);
    },

    async listReplies(orgId, parentCommentId) {
      const res = await pool.query(
        `${BASE} WHERE c.organization_id = $1 AND c.parent_comment_id = $2 ORDER BY c.created_at ASC`,
        [orgId, parentCommentId]
      );
      return res.rows.map(toComment);
    },

    async getCommentById(orgId, commentId) {
      const res = await pool.query(`${BASE} WHERE c.id = $1 AND c.organization_id = $2`, [commentId, orgId]);
      return res.rows[0] ? toComment(res.rows[0]) : null;
    },

    async createComment(orgId, userId, input) {
      const id = uuid();
      const res = await pool.query(
        `INSERT INTO comments (id, organization_id, entity_type, entity_id, author_id, content, parent_comment_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [id, orgId, input.entityType, input.entityId, userId, input.content, input.parentCommentId ?? null]
      );
      return toComment(res.rows[0]);
    },

    async updateComment(orgId, commentId, userId, content) {
      const res = await pool.query(
        `UPDATE comments SET content = $3, edited_at = NOW()
         WHERE id = $1 AND organization_id = $2 AND author_id = $4 RETURNING *`,
        [commentId, orgId, content, userId]
      );
      return res.rows[0] ? toComment(res.rows[0]) : null;
    },

    async deleteComment(orgId, commentId, userId) {
      const res = await pool.query(
        `DELETE FROM comments WHERE id = $1 AND organization_id = $2 AND author_id = $3 RETURNING id`,
        [commentId, orgId, userId]
      );
      return !!res.rows[0];
    }
  };
}
