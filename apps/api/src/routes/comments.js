import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { fail, ok } from '@sunave/core';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

export function buildCommentsRouter(commentRepo, orgRepo) {
  const router = Router();
  const read  = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
  const write = rateLimit({ windowMs: 15 * 60 * 1000, max: 150 });

  // GET /api/comments/:id
  router.get('/:id', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const comment = await commentRepo.getCommentById(req.org.id, req.params.id);
    if (!comment) return res.status(404).json(fail('NOT_FOUND', 'Comment not found.'));
    return res.json(ok({ comment }));
  });

  // GET /api/comments/:id/replies
  router.get('/:id/replies', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const replies = await commentRepo.listReplies(req.org.id, req.params.id);
    return res.json(ok({ replies }));
  });

  // PUT /api/comments/:id
  router.put('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json(fail('VALIDATION_ERROR', 'content is required.'));
    const comment = await commentRepo.updateComment(req.org.id, req.params.id, req.auth.sub, content.trim());
    if (!comment) return res.status(404).json(fail('NOT_FOUND', 'Comment not found or not your comment.'));
    return res.json(ok({ comment }));
  });

  // DELETE /api/comments/:id
  router.delete('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const deleted = await commentRepo.deleteComment(req.org.id, req.params.id, req.auth.sub);
    if (!deleted) return res.status(404).json(fail('NOT_FOUND', 'Comment not found or not your comment.'));
    return res.json(ok({ deleted: true }));
  });

  return router;
}
