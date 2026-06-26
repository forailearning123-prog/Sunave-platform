import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { ok } from '@sunave/core';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

function paginate(q) {
  return { page: Math.max(1, parseInt(q.page) || 1), limit: Math.min(100, parseInt(q.limit) || 50) };
}

export function buildActivityRouter(activityRepo, orgRepo) {
  const router = Router();
  const read = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });

  // GET /api/activity  — org-wide activity feed
  router.get('/', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { entityType } = req.query;
    const { page, limit } = paginate(req.query);
    const activities = await activityRepo.listForOrg(req.org.id, { entityType, page, limit });
    return res.json(ok({ activities }));
  });

  // GET /api/activity/:type/:id — activity for a specific entity
  router.get('/:type/:id', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { page, limit } = paginate(req.query);
    const activities = await activityRepo.listForEntity(req.org.id, req.params.type, req.params.id, { page, limit });
    return res.json(ok({ activities }));
  });

  return router;
}
