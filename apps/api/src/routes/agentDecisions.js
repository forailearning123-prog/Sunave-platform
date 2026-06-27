// Agent Decisions Routes
// Prompts 20-24: Complete Agent Operating System

export function buildAgentDecisionsRouter(agentService, permService) {
  const router = require('express').Router();

  // GET /api/agents/:id/decisions - Get agent decisions
  router.get('/:id/decisions', async (req, res) => {
    try {
      const { type, executionId, goalId, taskId, limit = 50, offset = 0 } = req.query;
      
      const decisions = await agentService.getAgentDecisions(req.params.id, {
        type,
        executionId,
        goalId,
        taskId,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: decisions });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/decisions - Create decision
  router.post('/:id/decisions', async (req, res) => {
    try {
      const { executionId, goalId, taskId, type, reasoning, context, input, output, confidence } = req.body;
      
      const decision = await agentService.createDecision(req.params.id, req.org.id, {
        executionId,
        goalId,
        taskId,
        type,
        reasoning,
        context,
        input,
        output,
        confidence
      });

      res.status(201).json({ success: true, data: decision });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/decisions/:id/approve - Approve decision
  router.post('/decisions/:id/approve', async (req, res) => {
    try {
      const decision = await agentService.approveDecision(req.params.id, req.auth.userId);
      res.json({ success: true, data: decision });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/decisions/:id/reject - Reject decision
  router.post('/decisions/:id/reject', async (req, res) => {
    try {
      const decision = await agentService.rejectDecision(req.params.id, req.auth.userId);
      res.json({ success: true, data: decision });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  return router;
}