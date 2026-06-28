import express from 'express';

function createScmRouter(businessService, permService) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!req.org || !req.org.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context required' });
    }
    next();
  });

  // GET /api/scm/purchase-orders
  router.get('/purchase-orders', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'purchase_order' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/scm/inventory
  router.get('/inventory', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'inventory_item' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/scm/assets
  router.get('/assets', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'asset' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export { createScmRouter };
