import { v4 as uuid } from 'uuid';

function toAttachment(row) {
  return {
    id:             row.id,
    organizationId: row.organization_id,
    entityType:     row.entity_type,
    entityId:       row.entity_id,
    name:           row.name,
    url:            row.url,
    mimeType:       row.mime_type,
    sizeBytes:      row.size_bytes,
    attachmentType: row.attachment_type,
    uploadedBy:     row.uploaded_by,
    createdAt:      row.created_at,
    uploaderName:   row.uploader_name ?? null
  };
}

export function createAttachmentRepository(pool) {
  return {
    async listAttachments(orgId, entityType, entityId) {
      const res = await pool.query(
        `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS uploader_name
         FROM attachments a
         LEFT JOIN users u ON u.id = a.uploaded_by
         WHERE a.organization_id = $1 AND a.entity_type = $2 AND a.entity_id = $3
         ORDER BY a.created_at DESC`,
        [orgId, entityType, entityId]
      );
      return res.rows.map(toAttachment);
    },

    async createAttachment(orgId, userId, input) {
      const id = uuid();
      const res = await pool.query(
        `INSERT INTO attachments
           (id, organization_id, entity_type, entity_id, name, url, mime_type, size_bytes, attachment_type, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [id, orgId, input.entityType, input.entityId,
         input.name, input.url, input.mimeType ?? '', input.sizeBytes ?? 0,
         input.attachmentType ?? 'file', userId]
      );
      return toAttachment(res.rows[0]);
    },

    async deleteAttachment(orgId, attachmentId, userId) {
      const res = await pool.query(
        `DELETE FROM attachments WHERE id = $1 AND organization_id = $2 AND uploaded_by = $3 RETURNING id`,
        [attachmentId, orgId, userId]
      );
      return !!res.rows[0];
    }
  };
}
