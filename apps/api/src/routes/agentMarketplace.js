import { Router } from 'express';
// Agent Marketplace Routes
// Prompts 20-24: Complete Agent Operating System

export function buildAgentMarketplaceRouter(agentService, permService) {
  const router = Router();

  // GET /api/agents/marketplace - List marketplace items
  router.get('/', async (req, res) => {
    try {
      const { category, type, isFeatured, search, limit = 50, offset = 0 } = req.query;
      
      const items = await agentService.getMarketplaceItems({
        category,
        type,
        isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
        search,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: items });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/marketplace/featured - Get featured items
  router.get('/featured', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      
      const items = await agentService.getFeaturedMarketplaceItems(parseInt(limit, 10));

      res.json({ success: true, data: items });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/marketplace/:id - Get marketplace item
  router.get('/:id', async (req, res) => {
    try {
      const item = await agentService.getMarketplaceItem(req.params.id);
      
      if (!item) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Marketplace item not found.' });
      }

      res.json({ success: true, data: item });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/marketplace/:id/download - Download marketplace item
  router.post('/:id/download', async (req, res) => {
    try {
      const item = await agentService.downloadMarketplaceItem(req.params.id);
      res.json({ success: true, data: item });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/marketplace/publish - Publish agent to marketplace
  router.post('/publish', async (req, res) => {
    try {
      const { agentId, ...marketplaceData } = req.body;
      
      const item = await agentService.publishToMarketplace(agentId, req.org.id, marketplaceData);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  return router;
}