import { v4 as uuid } from 'uuid';

function toProject(row) {
  return {
    id:             row.id,
    goalId:         row.goal_id,
    organizationId: row.organization_id,
    name:           row.name,
    description:    row.description,
    status:         row.status,
    priority:       row.priority,
    ownerId:        row.owner_id,
    budget:         row.budget,
    budgetSpent:    row.budget_spent,
    health:         row.health,
    startDate:      row.start_date,
    endDate:        row.end_date,
    completionPct:  row.completion_pct,
    visibility:     row.visibility,
    color:          row.color,
    icon:           row.icon,
    createdBy:      row.created_by,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
    // Joined fields
    ownerName:      row.owner_name ?? null,
    goalTitle:      row.goal_title ?? null,
    taskCount:      row.task_count !== undefined ? Number(row.task_count) : undefined,
    openTaskCount:  row.open_task_count !== undefined ? Number(row.open_task_count) : undefined
  };
}

export function createProjectRepository(pool) {
  const BASE_SELECT = `
    SELECT p.*,
           CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
           g.title AS goal_title,
           (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) AS task_count,
           (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status NOT IN ('done','cancelled')) AS open_task_count
    FROM projects p
    LEFT JOIN users u ON u.id = p.owner_id
    LEFT JOIN goals g ON g.id = p.goal_id`;

  return {
    async listProjects(orgId, { status, goalId, ownerId, health, page = 1, limit = 50 } = {}) {
      const conditions = ['p.organization_id = $1'];
      const params = [orgId];
      let i = 2;

      if (status)  { conditions.push(`p.status = $${i++}`);   params.push(status); }
      if (goalId)  { conditions.push(`p.goal_id = $${i++}`);  params.push(goalId); }
      if (ownerId) { conditions.push(`p.owner_id = $${i++}`); params.push(ownerId); }
      if (health)  { conditions.push(`p.health = $${i++}`);   params.push(health); }

      const offset = (page - 1) * limit;
      const where = conditions.join(' AND ');

      const [dataRes, countRes] = await Promise.all([
        pool.query(`${BASE_SELECT} WHERE ${where} ORDER BY p.updated_at DESC LIMIT $${i} OFFSET $${i+1}`,
          [...params, limit, offset]),
        pool.query(`SELECT COUNT(*) FROM projects p WHERE ${where}`, params)
      ]);

      return {
        items: dataRes.rows.map(toProject),
        total: Number(countRes.rows[0].count),
        page, limit
      };
    },

    async getProjectById(orgId, projectId) {
      const res = await pool.query(
        `${BASE_SELECT} WHERE p.id = $1 AND p.organization_id = $2`,
        [projectId, orgId]
      );
      return res.rows[0] ? toProject(res.rows[0]) : null;
    },

    async createProject(orgId, userId, input) {
      const id = uuid();
      const res = await pool.query(
        `INSERT INTO projects
           (id, goal_id, organization_id, name, description, status, priority,
            owner_id, budget, health, start_date, end_date, completion_pct,
            visibility, color, icon, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          id,
          input.goalId ?? null, orgId,
          input.name, input.description ?? '',
          input.status ?? 'planning', input.priority ?? 'medium',
          input.ownerId ?? userId,
          input.budget ?? null,
          input.health ?? 'on_track',
          input.startDate ?? null, input.endDate ?? null,
          input.completionPct ?? 0,
          input.visibility ?? 'organization',
          input.color ?? '#6366f1',
          input.icon ?? '📁',
          userId
        ]
      );
      return toProject(res.rows[0]);
    },

    async updateProject(orgId, projectId, input) {
      const res = await pool.query(
        `UPDATE projects SET
           goal_id        = COALESCE($3, goal_id),
           name           = COALESCE($4, name),
           description    = COALESCE($5, description),
           status         = COALESCE($6, status),
           priority       = COALESCE($7, priority),
           owner_id       = COALESCE($8, owner_id),
           budget         = COALESCE($9, budget),
           budget_spent   = COALESCE($10, budget_spent),
           health         = COALESCE($11, health),
           start_date     = COALESCE($12, start_date),
           end_date       = COALESCE($13, end_date),
           completion_pct = COALESCE($14, completion_pct),
           visibility     = COALESCE($15, visibility),
           color          = COALESCE($16, color),
           icon           = COALESCE($17, icon),
           updated_at     = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          projectId, orgId,
          input.goalId !== undefined ? input.goalId : null,
          input.name ?? null, input.description ?? null,
          input.status ?? null, input.priority ?? null,
          input.ownerId ?? null,
          input.budget !== undefined ? input.budget : null,
          input.budgetSpent !== undefined ? input.budgetSpent : null,
          input.health ?? null,
          input.startDate ?? null, input.endDate ?? null,
          input.completionPct !== undefined ? input.completionPct : null,
          input.visibility ?? null,
          input.color ?? null, input.icon ?? null
        ]
      );
      return res.rows[0] ? toProject(res.rows[0]) : null;
    },

    async archiveProject(orgId, projectId) {
      const res = await pool.query(
        `UPDATE projects SET status = 'archived', updated_at = NOW()
         WHERE id = $1 AND organization_id = $2 RETURNING *`,
        [projectId, orgId]
      );
      return res.rows[0] ? toProject(res.rows[0]) : null;
    },

    async deleteProject(orgId, projectId) {
      const res = await pool.query(
        `DELETE FROM projects WHERE id = $1 AND organization_id = $2 RETURNING id`,
        [projectId, orgId]
      );
      return !!res.rows[0];
    }
  };
}
