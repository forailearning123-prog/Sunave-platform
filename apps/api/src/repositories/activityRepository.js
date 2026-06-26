import { v4 as uuid } from 'uuid';

function toActivity(row) {
  return {
    id:             row.id,
    organizationId: row.organization_id,
    entityType:     row.entity_type,
    entityId:       row.entity_id,
    actorId:        row.actor_id,
    action:         row.action,
    metadata:       row.metadata,
    createdAt:      row.created_at,
    actorName:      row.actor_name ?? null,
    actorAvatar:    row.actor_avatar ?? null
  };
}

export function createActivityRepository(pool) {
  return {
    // Record a new activity event
    async record(orgId, actorId, entityType, entityId, action, metadata = {}) {
      try {
        await pool.query(
          `INSERT INTO activities (id, organization_id, entity_type, entity_id, actor_id, action, metadata)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [uuid(), orgId, entityType, entityId, actorId, action, JSON.stringify(metadata)]
        );
      } catch {
        // Activity recording must never break main flow
      }
    },

    // List activities for a specific entity
    async listForEntity(orgId, entityType, entityId, { page = 1, limit = 50 } = {}) {
      const offset = (page - 1) * limit;
      const res = await pool.query(
        `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS actor_name, u.avatar_url AS actor_avatar
         FROM activities a
         LEFT JOIN users u ON u.id = a.actor_id
         WHERE a.organization_id = $1 AND a.entity_type = $2 AND a.entity_id = $3
         ORDER BY a.created_at DESC
         LIMIT $4 OFFSET $5`,
        [orgId, entityType, entityId, limit, offset]
      );
      return res.rows.map(toActivity);
    },

    // List all org-wide activity (for the org activity feed)
    async listForOrg(orgId, { entityType, page = 1, limit = 50 } = {}) {
      const params = [orgId];
      let where = 'a.organization_id = $1';
      if (entityType) { where += ` AND a.entity_type = $2`; params.push(entityType); }
      const offset = (page - 1) * limit;
      params.push(limit, offset);

      const res = await pool.query(
        `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS actor_name, u.avatar_url AS actor_avatar
         FROM activities a
         LEFT JOIN users u ON u.id = a.actor_id
         WHERE ${where}
         ORDER BY a.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
      return res.rows.map(toActivity);
    }
  };
}
