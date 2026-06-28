import { Router } from 'express';
// Agent Collaborations Routes
// Prompts 20-24: Complete Agent Operating System

export function buildAgentCollaborationsRouter(agentService, permService) {
  const router = Router();

  // GET /api/agents/:id/collaborations - Get agent collaborations
  router.get('/:id/collaborations', async (req, res) => {
    try {
      const { type, status, limit = 50, offset = 0 } = req.query;
      
      const collaborations = await agentService.getAgentCollaborations(req.params.id, {
        type,
        status,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: collaborations });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/:id/collaborations - Create collaboration
  router.post('/:id/collaborations', async (req, res) => {
    try {
      const { collaborationType, targetAgentId, context, input, priority } = req.body;
      
      const collaboration = await agentService.createCollaboration(req.params.id, req.org.id, {
        collaborationType,
        targetAgentId,
        context,
        input,
        priority
      });

      res.status(201).json({ success: true, data: collaboration });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // PUT /api/agents/collaborations/:id/status - Update collaboration status
  router.put('/collaborations/:id/status', async (req, res) => {
    try {
      const { status, output } = req.body;
      
      const collaboration = await agentService.updateCollaborationStatus(
        req.params.id,
        status,
        output
      );

      res.json({ success: true, data: collaboration });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  return router;
}