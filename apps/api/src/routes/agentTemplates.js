import { Router } from 'express';
// Agent Templates Routes
// Prompts 20-24: Complete Agent Operating System

export function buildAgentTemplatesRouter(agentService, permService) {
  const router = Router();

  // GET /api/agents/templates - List templates
  router.get('/', async (req, res) => {
    try {
      const { category, type, isSystem, isPublic, search, limit = 50, offset = 0 } = req.query;
      
      const templates = await agentService.getTemplates({
        category,
        type,
        isSystem: isSystem !== undefined ? isSystem === 'true' : undefined,
        isPublic: isPublic !== undefined ? isPublic === 'true' : undefined,
        search,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: templates });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/templates/system - Get system templates
  router.get('/system', async (req, res) => {
    try {
      const templates = await agentService.getSystemTemplates();
      res.json({ success: true, data: templates });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/templates/public - Get public templates
  router.get('/public', async (req, res) => {
    try {
      const { category, type, search, limit = 50, offset = 0 } = req.query;
      
      const templates = await agentService.getPublicTemplates({
        category,
        type,
        search,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      res.json({ success: true, data: templates });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // GET /api/agents/templates/:id - Get template by ID
  router.get('/:id', async (req, res) => {
    try {
      const template = await agentService.getTemplate(req.params.id);
      
      if (!template) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Template not found.' });
      }

      res.json({ success: true, data: template });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // POST /api/agents/templates - Create template
  router.post('/', async (req, res) => {
    try {
      const template = await agentService.createTemplate(req.body);
      res.status(201).json({ success: true, data: template });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // PUT /api/agents/templates/:id - Update template
  router.put('/:id', async (req, res) => {
    try {
      const template = await agentService.updateTemplate(req.params.id, req.body);
      
      if (!template) {
        return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Template not found.' });
      }

      res.json({ success: true, data: template });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  // DELETE /api/agents/templates/:id - Delete template
  router.delete('/:id', async (req, res) => {
    try {
      await agentService.deleteTemplate(req.params.id);
      res.json({ success: true, message: 'Template deleted successfully.' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  return router;
}