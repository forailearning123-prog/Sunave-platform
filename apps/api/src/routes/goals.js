import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { fail, ok } from '@sunave/core';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

function paginate(query) {
  return { page: Math.max(1, parseInt(query.page) || 1), limit: Math.min(100, parseInt(query.limit) || 50) };
}

export function buildGoalsRouter(goalRepo, projectRepo, milestoneRepo, taskRepo, commentRepo, activityRepo, orgRepo) {
  const router = Router();
  const read  = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
  const write = rateLimit({ windowMs: 15 * 60 * 1000, max: 150 });

  // ── GET /api/goals ─────────────────────────────────────────────────────────
  router.get('/', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { status, category, priority, ownerId, parentGoalId } = req.query;
    const { page, limit } = paginate(req.query);
    const result = await goalRepo.listGoals(req.org.id, {
      status, category, priority,
      ownerId: ownerId || undefined,
      parentGoalId: parentGoalId === 'null' ? null : parentGoalId,
      page, limit
    });
    return res.json(ok(result));
  });

  // ── GET /api/goals/tree ────────────────────────────────────────────────────
  router.get('/tree', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const tree = await goalRepo.getGoalTree(req.org.id);
    return res.json(ok({ tree }));
  });

  // ── POST /api/goals ────────────────────────────────────────────────────────
  router.post('/', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { title, description, status, priority, category, ownerId, visibility,
            startDate, targetDate, completionPct, budget, progressMethod, parentGoalId } = req.body;
    if (!title?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'title is required.'));

    const goal = await goalRepo.createGoal(req.org.id, req.auth.sub, {
      title: title.trim(), description, status, priority, category,
      ownerId, visibility, startDate, targetDate, completionPct, budget, progressMethod, parentGoalId
    });
    await activityRepo.record(req.org.id, req.auth.sub, 'goal', goal.id, 'goal.created', { title: goal.title });
    return res.status(201).json(ok({ goal }));
  });

  // ── GET /api/goals/:id ─────────────────────────────────────────────────────
  router.get('/:id', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const goal = await goalRepo.getGoalById(req.org.id, req.params.id);
    if (!goal) return res.status(404).json(fail('NOT_FOUND', 'Goal not found.'));
    return res.json(ok({ goal }));
  });

  // ── PUT /api/goals/:id ────────────────────────────────────────────────────
  router.put('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const goal = await goalRepo.updateGoal(req.org.id, req.params.id, req.body);
    if (!goal) return res.status(404).json(fail('NOT_FOUND', 'Goal not found.'));
    await activityRepo.record(req.org.id, req.auth.sub, 'goal', goal.id, 'goal.updated', { fields: Object.keys(req.body) });
    return res.json(ok({ goal }));
  });

  // ── DELETE /api/goals/:id (archive) ───────────────────────────────────────
  router.delete('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const goal = await goalRepo.archiveGoal(req.org.id, req.params.id);
    if (!goal) return res.status(404).json(fail('NOT_FOUND', 'Goal not found.'));
    await activityRepo.record(req.org.id, req.auth.sub, 'goal', goal.id, 'goal.archived', {});
    return res.json(ok({ goal }));
  });

  // ── GET /api/goals/:id/children ───────────────────────────────────────────
  router.get('/:id/children', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const children = await goalRepo.listChildGoals(req.org.id, req.params.id);
    return res.json(ok({ children }));
  });

  // ── GET /api/goals/:id/projects ───────────────────────────────────────────
  router.get('/:id/projects', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const result = await projectRepo.listProjects(req.org.id, { goalId: req.params.id });
    return res.json(ok(result));
  });

  // ── GET /api/goals/:id/milestones ─────────────────────────────────────────
  router.get('/:id/milestones', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const milestones = await milestoneRepo.listMilestones(req.org.id, { goalId: req.params.id });
    return res.json(ok({ milestones }));
  });

  // ── GET /api/goals/:id/tasks ──────────────────────────────────────────────
  router.get('/:id/tasks', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { page, limit } = paginate(req.query);
    const result = await taskRepo.listTasks(req.org.id, { goalId: req.params.id, page, limit });
    return res.json(ok(result));
  });

  // ── GET /api/goals/:id/activity ───────────────────────────────────────────
  router.get('/:id/activity', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { page, limit } = paginate(req.query);
    const activities = await activityRepo.listForEntity(req.org.id, 'goal', req.params.id, { page, limit });
    return res.json(ok({ activities }));
  });

  // ── GET /api/goals/:id/comments ───────────────────────────────────────────
  router.get('/:id/comments', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const comments = await commentRepo.listComments(req.org.id, 'goal', req.params.id);
    return res.json(ok({ comments }));
  });

  // ── POST /api/goals/:id/comments ──────────────────────────────────────────
  router.post('/:id/comments', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { content, parentCommentId } = req.body;
    if (!content?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'content is required.'));
    const comment = await commentRepo.createComment(req.org.id, req.auth.sub, {
      entityType: 'goal', entityId: req.params.id, content: content.trim(), parentCommentId
    });
    await activityRepo.record(req.org.id, req.auth.sub, 'goal', req.params.id, 'goal.commented', {});
    return res.status(201).json(ok({ comment }));
  });

  return router;
}
