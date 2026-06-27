const express = require('express');

function createFinanceRouter(businessService, permService) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!req.org || !req.org.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context required' });
    }
    next();
  });

  // GET /api/finance/invoices
  router.get('/invoices', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'invoice' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/finance/invoices
  router.post('/invoices', async (req, res) => {
    try {
      const payload = { ...req.body, objectType: 'invoice' };
      const result = await businessService.objectRepo.create(req.org.organizationId, payload, req.auth.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/finance/expenses
  router.get('/expenses', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'expense' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/finance/expenses
  router.post('/expenses', async (req, res) => {
    try {
      const payload = { ...req.body, objectType: 'expense' };
      const result = await businessService.objectRepo.create(req.org.organizationId, payload, req.auth.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/finance/ledger
  router.get('/ledger', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'journal_entry' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createFinanceRouter };
