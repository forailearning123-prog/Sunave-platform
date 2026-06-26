import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { fail, ok } from '@sunave/core';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

function paginate(q) {
  return { page: Math.max(1, parseInt(q.page) || 1), limit: Math.min(100, parseInt(q.limit) || 50) };
}

export function buildProjectsRouter(projectRepo, milestoneRepo, taskRepo, commentRepo, activityRepo, orgRepo) {
  const router = Router();
  const read  = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
  const write = rateLimit({ windowMs: 15 * 60 * 1000, max: 150 });

  // ── GET /api/projects ─────────────────────────────────────────────────────
  router.get('/', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { status, goalId, ownerId, health } = req.query;
    const { page, limit } = paginate(req.query);
    const result = await projectRepo.listProjects(req.org.id, { status, goalId, ownerId, health, page, limit });
    return res.json(ok(result));
  });

  // ── POST /api/projects ────────────────────────────────────────────────────
  router.post('/', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { name, goalId, description, status, priority, ownerId, budget, health,
            startDate, endDate, completionPct, visibility, color, icon } = req.body;
    if (!name?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'name is required.'));

    const project = await projectRepo.createProject(req.org.id, req.auth.sub, {
      name: name.trim(), goalId, description, status, priority, ownerId,
      budget, health, startDate, endDate, completionPct, visibility, color, icon
    });
    await activityRepo.record(req.org.id, req.auth.sub, 'project', project.id, 'project.created', { name: project.name });
    return res.status(201).json(ok({ project }));
  });

  // ── GET /api/projects/:id ─────────────────────────────────────────────────
  router.get('/:id', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const project = await projectRepo.getProjectById(req.org.id, req.params.id);
    if (!project) return res.status(404).json(fail('NOT_FOUND', 'Project not found.'));
    return res.json(ok({ project }));
  });

  // ── PUT /api/projects/:id ─────────────────────────────────────────────────
  router.put('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const project = await projectRepo.updateProject(req.org.id, req.params.id, req.body);
    if (!project) return res.status(404).json(fail('NOT_FOUND', 'Project not found.'));
    await activityRepo.record(req.org.id, req.auth.sub, 'project', project.id, 'project.updated', { fields: Object.keys(req.body) });
    return res.json(ok({ project }));
  });

  // ── DELETE /api/projects/:id ──────────────────────────────────────────────
  router.delete('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const project = await projectRepo.archiveProject(req.org.id, req.params.id);
    if (!project) return res.status(404).json(fail('NOT_FOUND', 'Project not found.'));
    await activityRepo.record(req.org.id, req.auth.sub, 'project', project.id, 'project.archived', {});
    return res.json(ok({ project }));
  });

  // ── GET /api/projects/:id/milestones ──────────────────────────────────────
  router.get('/:id/milestones', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const milestones = await milestoneRepo.listMilestones(req.org.id, { projectId: req.params.id });
    return res.json(ok({ milestones }));
  });

  // ── GET /api/projects/:id/tasks ───────────────────────────────────────────
  router.get('/:id/tasks', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { status, priority, assigneeId } = req.query;
    const { page, limit } = paginate(req.query);
    const result = await taskRepo.listTasks(req.org.id, {
      projectId: req.params.id, status, priority, assigneeId, parentTaskId: null, page, limit
    });
    return res.json(ok(result));
  });

  // ── GET /api/projects/:id/activity ───────────────────────────────────────
  router.get('/:id/activity', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { page, limit } = paginate(req.query);
    const activities = await activityRepo.listForEntity(req.org.id, 'project', req.params.id, { page, limit });
    return res.json(ok({ activities }));
  });

  // ── GET /api/projects/:id/comments ───────────────────────────────────────
  router.get('/:id/comments', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const comments = await commentRepo.listComments(req.org.id, 'project', req.params.id);
    return res.json(ok({ comments }));
  });

  // ── POST /api/projects/:id/comments ──────────────────────────────────────
  router.post('/:id/comments', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { content, parentCommentId } = req.body;
    if (!content?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'content is required.'));
    const comment = await commentRepo.createComment(req.org.id, req.auth.sub, {
      entityType: 'project', entityId: req.params.id, content: content.trim(), parentCommentId
    });
    return res.status(201).json(ok({ comment }));
  });

  return router;
}
