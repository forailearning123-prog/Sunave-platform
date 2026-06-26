import { v4 as uuid } from 'uuid';

function toGoal(row) {
  return {
    id:               row.id,
    organizationId:   row.organization_id,
    title:            row.title,
    description:      row.description,
    status:           row.status,
    priority:         row.priority,
    category:         row.category,
    ownerId:          row.owner_id,
    visibility:       row.visibility,
    startDate:        row.start_date,
    targetDate:       row.target_date,
    completionPct:    row.completion_pct,
    budget:           row.budget,
    budgetSpent:      row.budget_spent,
    progressMethod:   row.progress_method,
    parentGoalId:     row.parent_goal_id,
    createdBy:        row.created_by,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
    // Joined fields
    ownerName:        row.owner_name ?? null,
    childCount:       row.child_count !== undefined ? Number(row.child_count) : undefined,
    projectCount:     row.project_count !== undefined ? Number(row.project_count) : undefined
  };
}

export function createGoalRepository(pool) {
  return {
    // ── List ────────────────────────────────────────────────────────────────

    async listGoals(orgId, { status, category, priority, ownerId, parentGoalId, page = 1, limit = 50 } = {}) {
      const conditions = ['g.organization_id = $1'];
      const params = [orgId];
      let i = 2;

      if (status)       { conditions.push(`g.status = $${i++}`);         params.push(status); }
      if (category)     { conditions.push(`g.category = $${i++}`);       params.push(category); }
      if (priority)     { conditions.push(`g.priority = $${i++}`);       params.push(priority); }
      if (ownerId)      { conditions.push(`g.owner_id = $${i++}`);       params.push(ownerId); }
      if (parentGoalId !== undefined) {
        if (parentGoalId === null) conditions.push('g.parent_goal_id IS NULL');
        else { conditions.push(`g.parent_goal_id = $${i++}`); params.push(parentGoalId); }
      }

      const offset = (page - 1) * limit;
      const where = conditions.join(' AND ');

      const [dataRes, countRes] = await Promise.all([
        pool.query(
          `SELECT g.*,
                  CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
                  (SELECT COUNT(*) FROM goals c WHERE c.parent_goal_id = g.id) AS child_count,
                  (SELECT COUNT(*) FROM projects p WHERE p.goal_id = g.id) AS project_count
           FROM goals g
           LEFT JOIN users u ON u.id = g.owner_id
           WHERE ${where}
           ORDER BY g.created_at DESC
           LIMIT $${i} OFFSET $${i+1}`,
          [...params, limit, offset]
        ),
        pool.query(`SELECT COUNT(*) FROM goals g WHERE ${where}`, params)
      ]);

      return {
        items: dataRes.rows.map(toGoal),
        total: Number(countRes.rows[0].count),
        page,
        limit
      };
    },

    // ── Get single ──────────────────────────────────────────────────────────

    async getGoalById(orgId, goalId) {
      const res = await pool.query(
        `SELECT g.*,
                CONCAT(u.first_name, ' ', u.last_name) AS owner_name,
                (SELECT COUNT(*) FROM goals c WHERE c.parent_goal_id = g.id) AS child_count,
                (SELECT COUNT(*) FROM projects p WHERE p.goal_id = g.id) AS project_count
         FROM goals g
         LEFT JOIN users u ON u.id = g.owner_id
         WHERE g.id = $1 AND g.organization_id = $2`,
        [goalId, orgId]
      );
      return res.rows[0] ? toGoal(res.rows[0]) : null;
    },

    // ── Tree ────────────────────────────────────────────────────────────────

    async getGoalTree(orgId) {
      // Returns all goals; caller assembles the tree
      const res = await pool.query(
        `SELECT g.*,
                CONCAT(u.first_name, ' ', u.last_name) AS owner_name
         FROM goals g
         LEFT JOIN users u ON u.id = g.owner_id
         WHERE g.organization_id = $1
         ORDER BY g.created_at ASC`,
        [orgId]
      );
      const goals = res.rows.map(toGoal);
      // Assemble tree
      const map = {};
      for (const g of goals) { map[g.id] = { ...g, children: [] }; }
      const roots = [];
      for (const g of Object.values(map)) {
        if (g.parentGoalId && map[g.parentGoalId]) map[g.parentGoalId].children.push(g);
        else roots.push(g);
      }
      return roots;
    },

    // ── Child goals ─────────────────────────────────────────────────────────

    async listChildGoals(orgId, parentGoalId) {
      const res = await pool.query(
        `SELECT g.*, CONCAT(u.first_name, ' ', u.last_name) AS owner_name
         FROM goals g
         LEFT JOIN users u ON u.id = g.owner_id
         WHERE g.organization_id = $1 AND g.parent_goal_id = $2
         ORDER BY g.created_at ASC`,
        [orgId, parentGoalId]
      );
      return res.rows.map(toGoal);
    },

    // ── Create ──────────────────────────────────────────────────────────────

    async createGoal(orgId, userId, input) {
      const id = uuid();
      const res = await pool.query(
        `INSERT INTO goals
           (id, organization_id, title, description, status, priority, category,
            owner_id, visibility, start_date, target_date, completion_pct,
            budget, progress_method, parent_goal_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         RETURNING *`,
        [
          id, orgId,
          input.title, input.description ?? '',
          input.status ?? 'draft', input.priority ?? 'medium',
          input.category ?? 'business',
          input.ownerId ?? userId,
          input.visibility ?? 'organization',
          input.startDate ?? null, input.targetDate ?? null,
          input.completionPct ?? 0,
          input.budget ?? null,
          input.progressMethod ?? 'manual',
          input.parentGoalId ?? null,
          userId
        ]
      );
      return toGoal(res.rows[0]);
    },

    // ── Update ──────────────────────────────────────────────────────────────

    async updateGoal(orgId, goalId, input) {
      const res = await pool.query(
        `UPDATE goals SET
           title           = COALESCE($3, title),
           description     = COALESCE($4, description),
           status          = COALESCE($5, status),
           priority        = COALESCE($6, priority),
           category        = COALESCE($7, category),
           owner_id        = COALESCE($8, owner_id),
           visibility      = COALESCE($9, visibility),
           start_date      = COALESCE($10, start_date),
           target_date     = COALESCE($11, target_date),
           completion_pct  = COALESCE($12, completion_pct),
           budget          = COALESCE($13, budget),
           budget_spent    = COALESCE($14, budget_spent),
           progress_method = COALESCE($15, progress_method),
           parent_goal_id  = COALESCE($16, parent_goal_id),
           updated_at      = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          goalId, orgId,
          input.title ?? null, input.description ?? null,
          input.status ?? null, input.priority ?? null,
          input.category ?? null, input.ownerId ?? null,
          input.visibility ?? null,
          input.startDate ?? null, input.targetDate ?? null,
          input.completionPct !== undefined ? input.completionPct : null,
          input.budget !== undefined ? input.budget : null,
          input.budgetSpent !== undefined ? input.budgetSpent : null,
          input.progressMethod ?? null,
          input.parentGoalId !== undefined ? input.parentGoalId : null
        ]
      );
      return res.rows[0] ? toGoal(res.rows[0]) : null;
    },

    // ── Archive (soft delete) ────────────────────────────────────────────────

    async archiveGoal(orgId, goalId) {
      const res = await pool.query(
        `UPDATE goals SET status = 'archived', updated_at = NOW()
         WHERE id = $1 AND organization_id = $2 RETURNING *`,
        [goalId, orgId]
      );
      return res.rows[0] ? toGoal(res.rows[0]) : null;
    },

    // ── Hard delete ──────────────────────────────────────────────────────────

    async deleteGoal(orgId, goalId) {
      const res = await pool.query(
        `DELETE FROM goals WHERE id = $1 AND organization_id = $2 RETURNING id`,
        [goalId, orgId]
      );
      return !!res.rows[0];
    }
  };
}
