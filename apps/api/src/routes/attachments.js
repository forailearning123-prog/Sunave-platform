import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { fail, ok } from '@sunave/core';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

export function buildAttachmentsRouter(attachmentRepo, orgRepo) {
  const router = Router();
  const read  = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
  const write = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

  // GET /api/attachments?entityType=&entityId=
  router.get('/', read, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) return res.status(400).json(fail('VALIDATION_ERROR', 'entityType and entityId required.'));
    const attachments = await attachmentRepo.listAttachments(req.org.id, entityType, entityId);
    return res.json(ok({ attachments }));
  });

  // POST /api/attachments (register URL reference)
  router.post('/', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { entityType, entityId, name, url, mimeType, sizeBytes, attachmentType } = req.body;
    if (!entityType || !entityId || !name || !url) {
      return res.status(400).json(fail('VALIDATION_ERROR', 'entityType, entityId, name, and url are required.'));
    }
    const attachment = await attachmentRepo.createAttachment(req.org.id, req.auth.sub, {
      entityType, entityId, name, url, mimeType, sizeBytes, attachmentType
    });
    return res.status(201).json(ok({ attachment }));
  });

  // DELETE /api/attachments/:id
  router.delete('/:id', write, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const deleted = await attachmentRepo.deleteAttachment(req.org.id, req.params.id, req.auth.sub);
    if (!deleted) return res.status(404).json(fail('NOT_FOUND', 'Attachment not found or not your upload.'));
    return res.json(ok({ deleted: true }));
  });

  return router;
}
