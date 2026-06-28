import express from 'express';

function createCollaborationRouter(businessService, permService) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!req.org || !req.org.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context required' });
    }
    next();
  });

  // GET /api/collaboration/meetings
  router.get('/meetings', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'meeting' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/collaboration/spaces
  router.get('/spaces', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'space' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export { createCollaborationRouter };
