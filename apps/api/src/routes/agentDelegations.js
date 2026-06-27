// Agent Delegations Routes
// Prompts 20-24: Complete Agent Operating System

export function buildAgentDelegationsRouter(agentService, permService) {
  const router = require('express').Router();

  // GET /api/agents/:id/delegations - Get agent delegations
  router.get('/:id/delegations', async (req, res) => {
    try {
      const { type, executionId, goalId, taskId, status, limit = 50, offset = 0 } = req.query;
      
      const delegations = await agentService.getAgentDelegations(req.params.id, {
        type,
        executionId,
        goalId,
        taskId,
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: delegations });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/delegations - Create delegation
  router.post('/:id/delegations', async (req, res) => {
    try {
      const {
        executionId,
        goalId,
        taskId,
        fromAgentId,
        toAgentId,
        toWorkerId,
        delegationType,
        context,
        input,
        priority,
        requiresApproval
      } = req.body;
      
      const delegation = await agentService.createDelegation(req.params.id, req.org.id, {
        executionId,
        goalId,
        taskId,
        fromAgentId,
        toAgentId,
        toWorkerId,
        delegationType,
        context,
        input,
        priority,
        requiresApproval
      });

      res.status(201).json({ success: true, data: delegation });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // PUT /api/agents/delegations/:id/status - Update delegation status
  router.put('/delegations/:id/status', async (req, res) => {
    try {
      const { status, output } = req.body;
      
      const delegation = await agentService.updateDelegationStatus(
        req.params.id,
        status,
        output
      );

      res.json({ success: true, data: delegation });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/delegations/:id/approve - Approve delegation
  router.post('/delegations/:id/approve', async (req, res) => {
    try {
      const delegation = await agentService.approveDelegation(req.params.id, req.auth.userId);
      res.json({ success: true, data: delegation });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  return router;
}