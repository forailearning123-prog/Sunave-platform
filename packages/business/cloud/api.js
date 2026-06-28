import express from 'express';

function createCloudRouter(businessService, permService) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!req.org || !req.org.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context required' });
    }
    next();
  });

  // GET /api/cloud/marketplace
  router.get('/marketplace', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'marketplace_item' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export { createCloudRouter };
