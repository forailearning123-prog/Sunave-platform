import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { fail, ok } from '@sunave/core';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

export function buildMilestonesRouter(milestoneRepo, activityRepo, orgRepo) {
  const router = Router();
  const read  = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
  const write = rateLimit({ windowMs: 15 * 60 * 1000, max: 150 });

  router.get('/', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { projectId, goalId, status } = req.query;
    const milestones = await milestoneRepo.listMilestones(req.org.id, { projectId, goalId, status });
    return res.json(ok({ milestones }));
  });

  router.post('/', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { title, projectId, goalId, description, status, dueDate, ownerId, progress } = req.body;
    if (!title?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'title is required.'));
    const milestone = await milestoneRepo.createMilestone(req.org.id, req.auth.sub, {
      title: title.trim(), projectId, goalId, description, status, dueDate, ownerId, progress
    });
    await activityRepo.record(req.org.id, req.auth.sub, 'milestone', milestone.id, 'milestone.created', { title: milestone.title });
    return res.status(201).json(ok({ milestone }));
  });

  router.get('/:id', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const milestone = await milestoneRepo.getMilestoneById(req.org.id, req.params.id);
    if (!milestone) return res.status(404).json(fail('NOT_FOUND', 'Milestone not found.'));
    return res.json(ok({ milestone }));
  });

  router.put('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const milestone = await milestoneRepo.updateMilestone(req.org.id, req.params.id, req.body);
    if (!milestone) return res.status(404).json(fail('NOT_FOUND', 'Milestone not found.'));
    await activityRepo.record(req.org.id, req.auth.sub, 'milestone', milestone.id, 'milestone.updated', { fields: Object.keys(req.body) });
    return res.json(ok({ milestone }));
  });

  router.delete('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const ok_ = await milestoneRepo.deleteMilestone(req.org.id, req.params.id);
    if (!ok_) return res.status(404).json(fail('NOT_FOUND', 'Milestone not found.'));
    return res.json(ok({ deleted: true }));
  });

  return router;
}
