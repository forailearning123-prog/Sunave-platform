import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { fail, ok } from '@sunave/core';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

function paginate(q) {
  return { page: Math.max(1, parseInt(q.page) || 1), limit: Math.min(200, parseInt(q.limit) || 100) };
}

export function buildTasksRouter(taskRepo, commentRepo, activityRepo, orgRepo) {
  const router = Router();
  const read  = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
  const write = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

  // ── GET /api/tasks ────────────────────────────────────────────────────────
  router.get('/', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { projectId, goalId, milestoneId, assigneeId, status, priority } = req.query;
    const { page, limit } = paginate(req.query);
    const result = await taskRepo.listTasks(req.org.id, {
      projectId, goalId, milestoneId, assigneeId, status, priority,
      parentTaskId: req.query.parentTaskId === undefined ? null : req.query.parentTaskId,
      page, limit
    });
    return res.json(ok(result));
  });

  // ── GET /api/tasks/overdue ────────────────────────────────────────────────
  router.get('/overdue', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const tasks = await taskRepo.listOverdueTasks(req.org.id, parseInt(req.query.limit) || 20);
    return res.json(ok({ tasks }));
  });

  // ── POST /api/tasks ───────────────────────────────────────────────────────
  router.post('/', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { title, description, status, priority, assigneeId, estimateHours,
            startDate, dueDate, projectId, goalId, milestoneId, parentTaskId } = req.body;
    if (!title?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'title is required.'));

    const task = await taskRepo.createTask(req.org.id, req.auth.sub, {
      title: title.trim(), description, status, priority, assigneeId, estimateHours,
      startDate, dueDate, projectId, goalId, milestoneId, parentTaskId,
      reporterId: req.auth.sub
    });
    await activityRepo.record(req.org.id, req.auth.sub, 'task', task.id, 'task.created',
      { title: task.title, projectId: task.projectId });
    return res.status(201).json(ok({ task }));
  });

  // ── GET /api/tasks/:id ────────────────────────────────────────────────────
  router.get('/:id', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const task = await taskRepo.getTaskById(req.org.id, req.params.id);
    if (!task) return res.status(404).json(fail('NOT_FOUND', 'Task not found.'));
    return res.json(ok({ task }));
  });

  // ── GET /api/tasks/:id/subtasks ───────────────────────────────────────────
  router.get('/:id/subtasks', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const subtasks = await taskRepo.listSubtasks(req.org.id, req.params.id);
    return res.json(ok({ subtasks }));
  });

  // ── PUT /api/tasks/:id ────────────────────────────────────────────────────
  router.put('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const task = await taskRepo.updateTask(req.org.id, req.params.id, req.body);
    if (!task) return res.status(404).json(fail('NOT_FOUND', 'Task not found.'));
    await activityRepo.record(req.org.id, req.auth.sub, 'task', task.id, 'task.updated', { fields: Object.keys(req.body) });
    return res.json(ok({ task }));
  });

  // ── POST /api/tasks/:id/move (Kanban drag-drop) ───────────────────────────
  router.post('/:id/move', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { status, position } = req.body;
    if (!status) return res.status(400).json(fail('VALIDATION_ERROR', 'status is required.'));
    const task = await taskRepo.moveTask(req.org.id, req.params.id, status, position ?? 0);
    if (!task) return res.status(404).json(fail('NOT_FOUND', 'Task not found.'));
    await activityRepo.record(req.org.id, req.auth.sub, 'task', task.id, 'task.moved', { status });
    return res.json(ok({ task }));
  });

  // ── DELETE /api/tasks/:id ─────────────────────────────────────────────────
  router.delete('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const deleted = await taskRepo.deleteTask(req.org.id, req.params.id);
    if (!deleted) return res.status(404).json(fail('NOT_FOUND', 'Task not found.'));
    return res.json(ok({ deleted: true }));
  });

  // ── GET /api/tasks/:id/comments ───────────────────────────────────────────
  router.get('/:id/comments', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const comments = await commentRepo.listComments(req.org.id, 'task', req.params.id);
    return res.json(ok({ comments }));
  });

  // ── POST /api/tasks/:id/comments ──────────────────────────────────────────
  router.post('/:id/comments', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { content, parentCommentId } = req.body;
    if (!content?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'content is required.'));
    const comment = await commentRepo.createComment(req.org.id, req.auth.sub, {
      entityType: 'task', entityId: req.params.id, content: content.trim(), parentCommentId
    });
    await activityRepo.record(req.org.id, req.auth.sub, 'task', req.params.id, 'task.commented', {});
    return res.status(201).json(ok({ comment }));
  });

  // ── GET /api/tasks/:id/activity ───────────────────────────────────────────
  router.get('/:id/activity', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { page, limit } = paginate(req.query);
    const activities = await activityRepo.listForEntity(req.org.id, 'task', req.params.id, { page, limit });
    return res.json(ok({ activities }));
  });

  return router;
}
