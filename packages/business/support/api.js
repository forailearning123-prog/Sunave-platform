const express = require('express');

function createSupportRouter(businessService, permService) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!req.org || !req.org.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context required' });
    }
    next();
  });

  // GET /api/support/tickets
  router.get('/tickets', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'support_ticket' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/support/articles
  router.get('/articles', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'knowledge_article' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createSupportRouter };
