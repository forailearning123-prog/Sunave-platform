import { v4 as uuid } from 'uuid';

function toTask(row) {
  return {
    id:             row.id,
    organizationId: row.organization_id,
    title:          row.title,
    description:    row.description,
    status:         row.status,
    priority:       row.priority,
    assigneeId:     row.assignee_id,
    reporterId:     row.reporter_id,
    estimateHours:  row.estimate_hours,
    actualHours:    row.actual_hours,
    startDate:      row.start_date,
    dueDate:        row.due_date,
    completedAt:    row.completed_at,
    projectId:      row.project_id,
    goalId:         row.goal_id,
    milestoneId:    row.milestone_id,
    parentTaskId:   row.parent_task_id,
    position:       row.position,
    createdBy:      row.created_by,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
    // Joined
    assigneeName:   row.assignee_name ?? null,
    reporterName:   row.reporter_name ?? null,
    projectName:    row.project_name ?? null,
    subtaskCount:   row.subtask_count !== undefined ? Number(row.subtask_count) : undefined
  };
}

export function createTaskRepository(pool) {
  const BASE = `
    SELECT t.*,
           CONCAT(a.first_name, ' ', a.last_name) AS assignee_name,
           CONCAT(r.first_name, ' ', r.last_name)  AS reporter_name,
           p.name AS project_name,
           (SELECT COUNT(*) FROM tasks st WHERE st.parent_task_id = t.id) AS subtask_count
    FROM tasks t
    LEFT JOIN users a ON a.id = t.assignee_id
    LEFT JOIN users r ON r.id = t.reporter_id
    LEFT JOIN projects p ON p.id = t.project_id`;

  return {
    async listTasks(orgId, { projectId, goalId, milestoneId, assigneeId, status, priority, parentTaskId, page = 1, limit = 100 } = {}) {
      const conditions = ['t.organization_id = $1'];
      const params = [orgId];
      let i = 2;

      if (projectId)    { conditions.push(`t.project_id = $${i++}`);     params.push(projectId); }
      if (goalId)       { conditions.push(`t.goal_id = $${i++}`);        params.push(goalId); }
      if (milestoneId)  { conditions.push(`t.milestone_id = $${i++}`);   params.push(milestoneId); }
      if (assigneeId)   { conditions.push(`t.assignee_id = $${i++}`);    params.push(assigneeId); }
      if (status)       { conditions.push(`t.status = $${i++}`);         params.push(status); }
      if (priority)     { conditions.push(`t.priority = $${i++}`);       params.push(priority); }
      if (parentTaskId !== undefined) {
        if (parentTaskId === null) conditions.push('t.parent_task_id IS NULL');
        else { conditions.push(`t.parent_task_id = $${i++}`); params.push(parentTaskId); }
      }

      const offset = (page - 1) * limit;
      const where = conditions.join(' AND ');

      const [dataRes, countRes] = await Promise.all([
        pool.query(`${BASE} WHERE ${where} ORDER BY t.position ASC, t.created_at ASC LIMIT $${i} OFFSET $${i+1}`,
          [...params, limit, offset]),
        pool.query(`SELECT COUNT(*) FROM tasks t WHERE ${where}`, params)
      ]);

      return {
        items: dataRes.rows.map(toTask),
        total: Number(countRes.rows[0].count),
        page, limit
      };
    },

    async getTaskById(orgId, taskId) {
      const res = await pool.query(`${BASE} WHERE t.id = $1 AND t.organization_id = $2`, [taskId, orgId]);
      return res.rows[0] ? toTask(res.rows[0]) : null;
    },

    async listSubtasks(orgId, parentTaskId) {
      const res = await pool.query(`${BASE} WHERE t.organization_id = $1 AND t.parent_task_id = $2 ORDER BY t.position ASC`,
        [orgId, parentTaskId]);
      return res.rows.map(toTask);
    },

    async createTask(orgId, userId, input) {
      const id = uuid();
      // Get max position in the column for ordering
      const posRes = await pool.query(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks WHERE organization_id = $1 AND project_id IS NOT DISTINCT FROM $2 AND status = $3`,
        [orgId, input.projectId ?? null, input.status ?? 'todo']
      );
      const position = posRes.rows[0].next_pos;

      const res = await pool.query(
        `INSERT INTO tasks
           (id, organization_id, title, description, status, priority,
            assignee_id, reporter_id, estimate_hours, start_date, due_date,
            project_id, goal_id, milestone_id, parent_task_id, position, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          id, orgId,
          input.title, input.description ?? '',
          input.status ?? 'todo', input.priority ?? 'medium',
          input.assigneeId ?? null, input.reporterId ?? userId,
          input.estimateHours ?? null,
          input.startDate ?? null, input.dueDate ?? null,
          input.projectId ?? null, input.goalId ?? null,
          input.milestoneId ?? null, input.parentTaskId ?? null,
          position, userId
        ]
      );
      return toTask(res.rows[0]);
    },

    async updateTask(orgId, taskId, input) {
      const completedCond = input.status === 'done' ? 'NOW()' : null;
      const res = await pool.query(
        `UPDATE tasks SET
           title          = COALESCE($3, title),
           description    = COALESCE($4, description),
           status         = COALESCE($5, status),
           priority       = COALESCE($6, priority),
           assignee_id    = COALESCE($7, assignee_id),
           estimate_hours = COALESCE($8, estimate_hours),
           actual_hours   = COALESCE($9, actual_hours),
           start_date     = COALESCE($10, start_date),
           due_date       = COALESCE($11, due_date),
           milestone_id   = COALESCE($12, milestone_id),
           position       = COALESCE($13, position),
           completed_at   = CASE WHEN $5 = 'done' AND completed_at IS NULL THEN NOW() ELSE completed_at END,
           updated_at     = NOW()
         WHERE id = $1 AND organization_id = $2
         RETURNING *`,
        [
          taskId, orgId,
          input.title ?? null, input.description ?? null,
          input.status ?? null, input.priority ?? null,
          input.assigneeId !== undefined ? input.assigneeId : null,
          input.estimateHours !== undefined ? input.estimateHours : null,
          input.actualHours !== undefined ? input.actualHours : null,
          input.startDate ?? null, input.dueDate ?? null,
          input.milestoneId !== undefined ? input.milestoneId : null,
          input.position !== undefined ? input.position : null
        ]
      );
      return res.rows[0] ? toTask(res.rows[0]) : null;
    },

    async deleteTask(orgId, taskId) {
      const res = await pool.query(
        `DELETE FROM tasks WHERE id = $1 AND organization_id = $2 RETURNING id`, [taskId, orgId]
      );
      return !!res.rows[0];
    },

    // Move task to different status column (Kanban drag-and-drop)
    async moveTask(orgId, taskId, newStatus, newPosition) {
      const res = await pool.query(
        `UPDATE tasks SET status = $3, position = $4, updated_at = NOW()
         WHERE id = $1 AND organization_id = $2 RETURNING *`,
        [taskId, orgId, newStatus, newPosition]
      );
      return res.rows[0] ? toTask(res.rows[0]) : null;
    },

    // List overdue tasks for an org
    async listOverdueTasks(orgId, limit = 20) {
      const res = await pool.query(
        `${BASE}
         WHERE t.organization_id = $1
           AND t.status NOT IN ('done','cancelled')
           AND t.due_date < CURRENT_DATE
         ORDER BY t.due_date ASC LIMIT $2`,
        [orgId, limit]
      );
      return res.rows.map(toTask);
    }
  };
}
