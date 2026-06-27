const express = require('express');

function createHrRouter(businessService, permService) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!req.org || !req.org.organizationId) {
      return res.status(400).json({ success: false, error: 'Organization context required' });
    }
    next();
  });

  // GET /api/hr/employees
  router.get('/employees', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'employee' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/hr/employees
  router.post('/employees', async (req, res) => {
    try {
      const payload = { ...req.body, objectType: 'employee' };
      const result = await businessService.objectRepo.create(req.org.organizationId, payload, req.auth.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/hr/departments
  router.get('/departments', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'department' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/hr/departments
  router.post('/departments', async (req, res) => {
    try {
      const payload = { ...req.body, objectType: 'department' };
      const result = await businessService.objectRepo.create(req.org.organizationId, payload, req.auth.userId);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/hr/recruitment
  router.get('/recruitment', async (req, res) => {
    try {
      const filters = { ...req.query, objectType: 'applicant' };
      const result = await businessService.objectRepo.findAll(req.org.organizationId, filters);
      res.json({ success: true, data: result.data, total: result.total });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = { createHrRouter };
