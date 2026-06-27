// Agent Approvals Routes
// Prompts 20-24: Complete Agent Operating System

export function buildAgentApprovalsRouter(agentService, permService) {
  const router = require('express').Router();

  // GET /api/agents/:id/approvals - Get agent approvals
  router.get('/:id/approvals', async (req, res) => {
    try {
      const { type, status, limit = 50, offset = 0 } = req.query;
      
      const approvals = await agentService.getAgentApprovals(req.params.id, {
        type,
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: approvals });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/approvals/pending - Get pending approvals for current user
  router.get('/approvals/pending', async (req, res) => {
    try {
      const approvals = await agentService.getPendingApprovals(req.auth.userId);
      res.json({ success: true, data: approvals });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/approvals - Create approval request
  router.post('/:id/approvals', async (req, res) => {
    try {
      const {
        executionId,
        goalId,
        taskId,
        delegationId,
        approvalType,
        title,
        description,
        context,
        input,
        priority,
        expiresAt
      } = req.body;
      
      const approval = await agentService.createApproval(req.params.id, req.org.id, {
        executionId,
        goalId,
        taskId,
        delegationId,
        approvalType,
        title,
        description,
        context,
        input,
        priority,
        requestedBy: req.auth.userId,
        expiresAt
      });

      res.status(201).json({ success: true, data: approval });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/approvals/:id/approve - Approve request
  router.post('/approvals/:id/approve', async (req, res) => {
    try {
      const approval = await agentService.approveApproval(req.params.id, req.auth.userId);
      res.json({ success: true, data: approval });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/approvals/:id/reject - Reject request
  router.post('/approvals/:id/reject', async (req, res) => {
    try {
      const { rejectionReason } = req.body;
      const approval = await agentService.rejectApproval(req.params.id, req.auth.userId, rejectionReason);
      res.json({ success: true, data: approval });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  return router;
}