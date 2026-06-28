import { fail, ok } from '@sunave/core';
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

export function buildPromptsRouter(promptRepo) {
  const router = Router();

  // ─── GET /api/prompts ──────────────────────────────────────────────────
  router.get('/', requireAuth, requireOrg(), async (req, res) => {
    try {
      const { categoryId, status, search, tags, limit, offset } = req.query;
      const prompts = await promptRepo.listTemplates({
        organizationId: req.org.id, categoryId, status, search,
        tags: tags ? tags.split(',') : undefined,
        limit: Math.min(Number(limit) || 50, 200), offset: Number(offset) || 0
      });
      const categories = await promptRepo.listCategories();
      return res.json(ok({ prompts, total: prompts.length, categories }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list prompts.'));
    }
  });

  // ─── POST /api/prompts ─────────────────────────────────────────────────
  router.post('/', requireAuth, requireOrg(), async (req, res) => {
    const { name, description, categoryId, template, variables, capabilities, systemPrompt, outputFormat, runtimePolicies, tags, status } = req.body || {};
    if (!name || !template) {
      return res.status(400).json(fail('VALIDATION_ERROR', 'name and template are required.'));
    }
    try {
      const prompt = await promptRepo.createTemplate({
        organizationId: req.org.id, name, description, categoryId, template, variables,
        capabilities, systemPrompt, outputFormat, runtimePolicies, tags, status, createdBy: req.auth.sub
      });
      await promptRepo.createVersion({ promptId: prompt.id, version: '1.0', template, variables, systemPrompt, runtimePolicies, changelog: 'Initial version.', createdBy: req.auth.sub });
      return res.status(201).json(ok({ prompt }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to create prompt.'));
    }
  });

  // ─── GET /api/prompts/:id ──────────────────────────────────────────────
  router.get('/:id', requireAuth, requireOrg(), async (req, res) => {
    try {
      const prompt = await promptRepo.findTemplate(req.params.id);
      if (!prompt) return res.status(404).json(fail('NOT_FOUND', 'Prompt not found.'));
      const versions = await promptRepo.listVersions(req.params.id);
      return res.json(ok({ prompt, versions }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load prompt.'));
    }
  });

  // ─── PUT /api/prompts/:id ──────────────────────────────────────────────
  router.put('/:id', requireAuth, requireOrg(), async (req, res) => {
    try {
      const prompt = await promptRepo.updateTemplate(req.params.id, req.body);
      if (!prompt) return res.status(404).json(fail('NOT_FOUND', 'Prompt not found.'));
      return res.json(ok({ prompt }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update prompt.'));
    }
  });

  // ─── DELETE /api/prompts/:id ──────────────────────────────────────────
  router.delete('/:id', requireAuth, requireOrg(), async (req, res) => {
    try {
      const deleted = await promptRepo.deleteTemplate(req.params.id);
      if (!deleted) return res.status(404).json(fail('NOT_FOUND', 'Prompt not found or is a system prompt.'));
      return res.json(ok({ message: 'Prompt deleted.' }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to delete prompt.'));
    }
  });

  // ─── POST /api/prompts/:id/publish ─────────────────────────────────────
  router.post('/:id/publish', requireAuth, requireOrg(), async (req, res) => {
    try {
      const prompt = await promptRepo.publishTemplate(req.params.id);
      if (!prompt) return res.status(404).json(fail('NOT_FOUND', 'Prompt not found.'));
      await promptRepo.createVersion({ promptId: prompt.id, version: prompt.version, template: prompt.template, variables: prompt.variables, systemPrompt: prompt.systemPrompt, runtimePolicies: prompt.runtimePolicies, changelog: 'Published.', createdBy: req.auth.sub });
      return res.json(ok({ prompt }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to publish prompt.'));
    }
  });

  // ─── POST /api/prompts/:id/clone ───────────────────────────────────────
  router.post('/:id/clone', requireAuth, requireOrg(), async (req, res) => {
    try {
      const prompt = await promptRepo.cloneTemplate(req.params.id, req.body.name, req.auth.sub);
      if (!prompt) return res.status(404).json(fail('NOT_FOUND', 'Prompt not found.'));
      return res.status(201).json(ok({ prompt }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to clone prompt.'));
    }
  });

  // ─── POST /api/prompts/:id/rollback ──────────────────────────────────
  router.post('/:id/rollback', requireAuth, requireOrg(), async (req, res) => {
    const { versionId } = req.body || {};
    if (!versionId) return res.status(400).json(fail('VALIDATION_ERROR', 'versionId is required.'));
    try {
      const prompt = await promptRepo.rollbackToVersion(req.params.id, versionId);
      if (!prompt) return res.status(404).json(fail('NOT_FOUND', 'Prompt or version not found.'));
      return res.json(ok({ prompt }));
    } catch (err) {
      console.error(JSON.stringify({ timestamp: new Date().toISOString(), level: "error", message: .message, stack: .stack }));
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to rollback prompt.'));
    }
  });

  // ─── GET /api/prompts/categories ─────────────────────────────────────
  router.get('/categories', requireAuth, requireOrg(), async (_req, res) => {
    try {
      const categories = await promptRepo.listCategories();
      return res.json(ok({ categories }));
    } catch (err) {
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list categories.'));
    }
  });

  // ─── GET /api/prompts/:id/versions ────────────────────────────────────
  router.get('/:id/versions', requireAuth, requireOrg(), async (req, res) => {
    try {
      const versions = await promptRepo.listVersions(req.params.id);
      return res.json(ok({ versions }));
    } catch (err) {
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list versions.'));
    }
  });

  // ─── POST /api/prompts/:id/save-new-version ─────────────────────────
  router.post('/:id/save-new-version', requireAuth, requireOrg(), async (req, res) => {
    const { changelog } = req.body || {};
    const prompt = await promptRepo.findTemplate(req.params.id);
    if (!prompt) return res.status(404).json(fail('NOT_FOUND', 'Prompt not found.'));
    try {
      const newVersion = `${(parseFloat(prompt.version) + 0.1).toFixed(1)}`;
      await promptRepo.updateTemplate(req.params.id, { version: newVersion });
      const version = await promptRepo.createVersion({
        promptId: req.params.id, version: newVersion,
        template: prompt.template, variables: prompt.variables,
        systemPrompt: prompt.systemPrompt, runtimePolicies: prompt.runtimePolicies,
        changelog: changelog || `Version ${newVersion}`, createdBy: req.auth.sub
      });
      return res.status(201).json(ok({ version }));
    } catch (err) {
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to save version.'));
    }
  });

  return router;
}