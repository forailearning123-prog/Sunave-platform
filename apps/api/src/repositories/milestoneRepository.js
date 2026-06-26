import { v4 as uuid } from 'uuid';

function toMilestone(row) {
  return {
    id:             row.id,
    projectId:      row.project_id,
    goalId:         row.goal_id,
    organizationId: row.organization_id,
    title:          row.title,
    description:    row.description,
    status:         row.status,
    dueDate:        row.due_date,
    completedAt:    row.completed_at,
    ownerId:        row.owner_id,
    progress:       row.progress,
    createdBy:      row.created_by,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
    ownerName:      row.owner_name ?? null,
    projectName:    row.project_name ?? null
  };
}

export function createMilestoneRepository(pool) {
  const BASE = `
    SELECT m.*,
           CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
           p.name AS project_name
    FROM milestones m
    LEFT JOIN users u ON u.id = m.owner_id
    LEFT JOIN projects p ON p.id = m.project_id`;

  return {
    async listMilestones(orgId, { projectId, goalId, status } = {}) {
      const conditions = ['m.organization_id = $1'];
      const params = [orgId];
      let i = 2;
      if (projectId) { conditions.push(`m.project_id = $${i++}`); params.push(projectId); }
      if (goalId)    { conditions.push(`m.goal_id = $${i++}`);    params.push(goalId); }
      if (status)    { conditions.push(`m.status = $${i++}`);     params.push(status); }
      const res = await pool.query(`${BASE} WHERE ${conditions.join(' AND ')} ORDER BY m.due_date ASC NULLS LAST`, params);
      return res.rows.map(toMilestone);
    },

    async getMilestoneById(orgId, id) {
      const res = await pool.query(`${BASE} WHERE m.id = $1 AND m.organization_id = $2`, [id, orgId]);
      return res.rows[0] ? toMilestone(res.rows[0]) : null;
    },

    async createMilestone(orgId, userId, input) {
      const id = uuid();
      const res = await pool.query(
        `INSERT INTO milestones
           (id, project_id, goal_id, organization_id, title, description, status, due_date, owner_id, progress, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [id, input.projectId ?? null, input.goalId ?? null, orgId,
         input.title, input.description ?? '',
         input.status ?? 'pending', input.dueDate ?? null,
         input.ownerId ?? userId, input.progress ?? 0, userId]
      );
      return toMilestone(res.rows[0]);
    },

    async updateMilestone(orgId, id, input) {
      const completedAt = input.status === 'completed' ? 'NOW()' : null;
      const res = await pool.query(
        `UPDATE milestones SET
           title        = COALESCE($3, title),
           description  = COALESCE($4, description),
           status       = COALESCE($5, status),
           due_date     = COALESCE($6, due_date),
           owner_id     = COALESCE($7, owner_id),
           progress     = COALESCE($8, progress),
           completed_at = CASE WHEN $5 = 'completed' THEN NOW() ELSE completed_at END,
           updated_at   = NOW()
         WHERE id = $1 AND organization_id = $2 RETURNING *`,
        [id, orgId,
         input.title ?? null, input.description ?? null,
         input.status ?? null, input.dueDate ?? null,
         input.ownerId ?? null,
         input.progress !== undefined ? input.progress : null]
      );
      return res.rows[0] ? toMilestone(res.rows[0]) : null;
    },

    async deleteMilestone(orgId, id) {
      const res = await pool.query(
        `DELETE FROM milestones WHERE id = $1 AND organization_id = $2 RETURNING id`, [id, orgId]
      );
      return !!res.rows[0];
    }
  };
}
