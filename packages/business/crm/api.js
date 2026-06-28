import express from 'express';

function createCrmRouter(businessService, permService) {
  const router = express.Router();

  // Lead Lifecycle: New, Qualified, Contacted, Proposal, Negotiation, Won, Lost, Archived
  // Opportunity Management: Expected Revenue, Probability, Expected Close, Competitors, Products
  
  router.use((req, res, next) => {
    // Middleware to ensure organization context
    if (!req.org || !req.org.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context required' });
    }
    next();
  });

  // GET /api/crm/leads
  router.get('/leads', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'lead' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/crm/leads
  router.post('/leads', async (req, res) => {
    try {
      const payload = { ...req.body, objectType: 'lead' };
      const result = await businessService.objectRepo.create(req.org.organizationId, payload, req.auth.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/crm/accounts
  router.get('/accounts', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'account' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/crm/accounts
  router.post('/accounts', async (req, res) => {
    try {
      const payload = { ...req.body, objectType: 'account' };
      const result = await businessService.objectRepo.create(req.org.organizationId, payload, req.auth.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/crm/opportunities
  router.get('/opportunities', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'opportunity' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/crm/opportunities
  router.post('/opportunities', async (req, res) => {
    try {
      const payload = { ...req.body, objectType: 'opportunity' };
      const result = await businessService.objectRepo.create(req.org.organizationId, payload, req.auth.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Pipeline Dashboard / Forecast / Timeline
  router.get('/pipeline', async (req, res) => {
    try {
      // stub pipeline data leveraging business_objects
      const filters = { objectType: 'opportunity', status: 'active' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      
      const pipeline = {
        totalRevenue: result.data.reduce((acc, opp) => acc + (opp.custom_fields?.expected_revenue || 0), 0),
        opportunities: result.data,
        stages: {
          proposal: result.data.filter(o => o.status === 'proposal').length,
          negotiation: result.data.filter(o => o.status === 'negotiation').length,
          won: result.data.filter(o => o.status === 'won').length
        }
      };
      res.json({ success: true, data: pipeline });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export { createCrmRouter };
