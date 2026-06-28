import { fail, ok } from '@sunave/core';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

export function buildRuntimeRouter(runtimeService, runtimeRepo) {
  const router = Router();

  // ─── POST /api/runtime/chat ────────────────────────────────────────────
  router.post('/chat', requireAuth, requireOrg(), async (req, res) => {
    const { capability = 'chat', prompt, systemPrompt, messages, conversationId, promptId, variables, runtimePolicies } = req.body || {};

    if (!prompt && !messages) {
      return res.status(400).json(fail('VALIDATION_ERROR', 'prompt or messages is required.'));
    }

    try {
      const context = runtimeService.buildRuntimeContext(req);
      const result = await runtimeService.execute(capability, {
        organizationId: req.org.id,
        userId: req.auth.sub,
        conversationId,
        promptId,
        prompt,
        systemPrompt,
        messages,
        variables
      }, { runtimePolicies, ...context });

      return res.json(ok(result));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('EXECUTION_ERROR', err.message));
    }
  });

  // ─── POST /api/runtime/execute ─────────────────────────────────────────
  router.post('/execute', requireAuth, requireOrg(), async (req, res) => {
    const { capability = 'chat', prompt, systemPrompt, messages, conversationId, promptId, variables, runtimePolicies } = req.body || {};

    if (!prompt && !messages) {
      return res.status(400).json(fail('VALIDATION_ERROR', 'prompt or messages is required.'));
    }

    try {
      const context = runtimeService.buildRuntimeContext(req);
      const result = await runtimeService.execute(capability, {
        organizationId: req.org.id,
        userId: req.auth.sub,
        conversationId,
        promptId,
        prompt,
        systemPrompt,
        messages,
        variables
      }, { runtimePolicies, ...context });

      return res.json(ok(result));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('EXECUTION_ERROR', err.message));
    }
  });

  // ─── POST /api/runtime/stream ─────────────────────────────────────────
  router.post('/stream', requireAuth, requireOrg(), async (req, res) => {
    const { capability = 'chat', prompt, messages, conversationId, promptId, variables, runtimePolicies } = req.body || {};

    try {
      const context = runtimeService.buildRuntimeContext(req);

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const params = {
        organizationId: req.org.id, userId: req.auth.sub,
        conversationId, promptId, prompt, messages, variables
      };

      const result = await runtimeService.execute(capability, params, {
        runtimePolicies: { ...runtimePolicies, streaming: true }, ...context
      });

      res.write(`data: ${JSON.stringify(result)}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  });

  // ─── GET /api/runtime/executions ───────────────────────────────────────
  router.get('/executions', requireAuth, requireOrg(), async (req, res) => {
    try {
      const { conversationId, capability, status, limit, offset } = req.query;
      const executions = await runtimeRepo.listExecutions({
        organizationId: req.org.id, userId: req.auth.sub, conversationId, capability, status,
        limit: Math.min(Number(limit) || 50, 200), offset: Number(offset) || 0
      });
      return res.json(ok({ executions, total: executions.length }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list executions.'));
    }
  });

  // ─── GET /api/runtime/executions/:id ──────────────────────────────────
  router.get('/executions/:id', requireAuth, requireOrg(), async (req, res) => {
    try {
      const execution = await runtimeRepo.findExecution(req.params.id);
      if (!execution) return res.status(404).json(fail('NOT_FOUND', 'Execution not found.'));
      const logs = await runtimeRepo.listLogs({ executionId: req.params.id });
      return res.json(ok({ execution, logs }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load execution.'));
    }
  });

  // ─── GET /api/runtime/stats ───────────────────────────────────────────
  router.get('/stats', requireAuth, requireOrg(), async (req, res) => {
    try {
      const stats = await runtimeService.getStats(req.org.id);
      return res.json(ok(stats));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load stats.'));
    }
  });

  return router;
}