import { fail, ok } from '@sunave/core';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

export function buildConversationsRouter(conversationRepo, runtimeService) {
  const router = Router();

  // ─── GET /api/conversations ─────────────────────────────────────────────
  router.get('/', requireAuth, requireOrg(), async (req, res) => {
    try {
      const { type, status, search, tags, pinned, favorite, limit, offset } = req.query;
      const conversations = await conversationRepo.listConversations({
        organizationId: req.org.id, userId: req.auth.sub,
        type, status, search, tags: tags ? tags.split(',') : undefined,
        pinned: pinned === 'true', favorite: favorite === 'true',
        limit: Math.min(Number(limit) || 50, 200), offset: Number(offset) || 0
      });
      const counts = await conversationRepo.getConversationCounts(req.org.id);
      return res.json(ok({ conversations, total: conversations.length, counts }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list conversations.'));
    }
  });

  // ─── POST /api/conversations ───────────────────────────────────────────
  router.post('/', requireAuth, requireOrg(), async (req, res) => {
    const { title, description, type, status, context, systemPrompt, capability, modelPolicy, tags } = req.body || {};
    try {
      const conversation = await conversationRepo.createConversation({
        organizationId: req.org.id, userId: req.auth.sub,
        title, description, type, status, context, systemPrompt, capability, modelPolicy, tags
      });
      return res.status(201).json(ok({ conversation }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to create conversation.'));
    }
  });

  // ─── GET /api/conversations/:id ─────────────────────────────────────────
  router.get('/:id', requireAuth, requireOrg(), async (req, res) => {
    try {
      const conversation = await conversationRepo.findConversation(req.params.id);
      if (!conversation) return res.status(404).json(fail('NOT_FOUND', 'Conversation not found.'));
      return res.json(ok({ conversation }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load conversation.'));
    }
  });

  // ─── PUT /api/conversations/:id ─────────────────────────────────────────
  router.put('/:id', requireAuth, requireOrg(), async (req, res) => {
    try {
      const conversation = await conversationRepo.updateConversation(req.params.id, req.body);
      if (!conversation) return res.status(404).json(fail('NOT_FOUND', 'Conversation not found.'));
      return res.json(ok({ conversation }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update conversation.'));
    }
  });

  // ─── DELETE /api/conversations/:id ─────────────────────────────────────
  router.delete('/:id', requireAuth, requireOrg(), async (req, res) => {
    try {
      await conversationRepo.deleteConversation(req.params.id);
      return res.json(ok({ message: 'Conversation deleted.' }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to delete conversation.'));
    }
  });

  // ─── POST /api/conversations/:id/duplicate ─────────────────────────────
  router.post('/:id/duplicate', requireAuth, requireOrg(), async (req, res) => {
    try {
      const conv = await conversationRepo.duplicateConversation(req.params.id, req.auth.sub, req.org.id);
      if (!conv) return res.status(404).json(fail('NOT_FOUND', 'Conversation not found.'));
      return res.status(201).json(ok({ conversation: conv }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to duplicate conversation.'));
    }
  });

  // ─── POST /api/conversations/:id/pin ──────────────────────────────────
  router.post('/:id/pin', requireAuth, requireOrg(), async (req, res) => {
    try {
      await conversationRepo.togglePin(req.params.id, req.body.pinned ?? true);
      return res.json(ok({ message: 'Pin status updated.' }));
    } catch (err) {
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update pin.'));
    }
  });

  // ─── POST /api/conversations/:id/favorite ──────────────────────────────
  router.post('/:id/favorite', requireAuth, requireOrg(), async (req, res) => {
    try {
      await conversationRepo.toggleFavorite(req.params.id, req.body.favorite ?? true);
      return res.json(ok({ message: 'Favorite status updated.' }));
    } catch (err) {
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update favorite.'));
    }
  });

  // ─── GET /api/conversations/:id/messages ───────────────────────────────
  router.get('/:id/messages', requireAuth, requireOrg(), async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const messages = await conversationRepo.listMessages(req.params.id, {
        limit: Math.min(Number(limit) || 100, 500), offset: Number(offset) || 0
      });
      return res.json(ok({ messages, total: messages.length }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load messages.'));
    }
  });

  // ─── POST /api/conversations/:id/messages ──────────────────────────────
  router.post('/:id/messages', requireAuth, requireOrg(), async (req, res) => {
    const { role, content, attachments, metadata, toolCalls, provider, model } = req.body || {};
    if (!role || !content) {
      return res.status(400).json(fail('VALIDATION_ERROR', 'role and content are required.'));
    }
    try {
      const message = await conversationRepo.createMessage(req.params.id, {
        role, content, attachments, metadata, toolCalls, provider, model
      });
      return res.status(201).json(ok({ message }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to create message.'));
    }
  });

  return router;
}