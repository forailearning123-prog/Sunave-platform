import { fail, ok } from '@sunave/core';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

const VALID_CAPABILITIES = [
  'reasoning','coding','vision','speech','translation','ocr',
  'embeddings','summarization','planning','classification',
  'extraction','generation','function_calling','chat',
  'research','document-analysis','sql','data-analysis',
  'image-generation','video-generation','audio-generation'
];

const VALID_PROVIDER_TYPES = [
  'sunave_local','openai','anthropic','gemini','vertex_ai',
  'azure_openai','openrouter','litellm','ollama','custom'
];

const VALID_ROUTING_POLICIES = [
  'lowest_cost','highest_quality','fastest','balanced',
  'local_only','cloud_only','local_first','cloud_first',
  'capability_preferred','org_override','user_override',
  'emergency_fallback'
];

const VALID_MODEL_STATUSES = ['active','deprecated','beta','experimental','retired'];
const VALID_CAPABILITY_CATEGORIES = ['generation','reasoning','coding','vision','speech','audio','video','understanding','analysis','embeddings','planning','general'];
const VALID_PERIOD_TYPES = ['daily','weekly','monthly','yearly'];
const VALID_BUDGET_SCOPES = ['organization','provider','model','capability','user'];

/**
 * AI Gateway & Provider Management Router
 * Prompt 9-12: Full AI Provider & Model Registry Platform
 */
export function buildAiRouter(
  aiProviderRepo, aiGatewayService, credentialService, orgRepo, permService,
  aiModelRepo, aiCapabilityRepo, aiUsageRepo
) {
  const router = Router();

  const readLimit  = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
  const writeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
  const testLimit  = rateLimit({ windowMs: 15 * 60 * 1000, max: 30,  standardHeaders: true, legacyHeaders: false });

  // ─── Helper: Strip encrypted fields for API responses ────────────────────
  function sanitizeProvider(p) {
    const { apiKeyEncrypted, ...safe } = p;
    return {
      ...safe,
      apiKey: credentialService.toApiSafe(apiKeyEncrypted)
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROVIDER ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/providers ────────────────────────────────────────────────
  router.get('/providers', readLimit, requireAuth, requireOrg(orgRepo), async (_req, res) => {
    try {
      const providers = await aiProviderRepo.listProviders();
      return res.status(200).json(ok({ providers: providers.map(sanitizeProvider) }));
    } catch (err) {
      console.error('[ai/providers GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list providers.'));
    }
  });

  // ─── GET /api/ai/providers/:id ────────────────────────────────────────────
  router.get('/providers/:id', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const provider = await aiProviderRepo.findProvider(req.params.id);
      if (!provider) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));

      const capabilities = await aiProviderRepo.listCapabilities(provider.id);
      const credentialNames = await aiProviderRepo.listCredentialNames(provider.id);
      const models = await aiModelRepo.listModels({ providerId: provider.id });

      return res.status(200).json(ok({
        provider: sanitizeProvider(provider),
        capabilities,
        credentials: credentialNames,
        models
      }));
    } catch (err) {
      console.error('[ai/providers/:id GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load provider.'));
    }
  });

  // ─── POST /api/ai/providers ───────────────────────────────────────────────
  router.post('/providers', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const {
        name, type, baseUrl, apiKey, enabled, priority, isDefault,
        supportsChat, supportsVision, supportsEmbeddings, supportsSpeech,
        supportsStreaming, supportsFunctionCalling, supportsReasoning,
        timeoutMs, retryCount, notes
      } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'name is required.'));
      }
      if (!type || !VALID_PROVIDER_TYPES.includes(type)) {
        return res.status(400).json(fail('VALIDATION_ERROR', `type must be one of: ${VALID_PROVIDER_TYPES.join(', ')}.`));
      }

      try {
        const apiKeyEncrypted = apiKey ? credentialService.encrypt(apiKey) : null;
        const provider = await aiProviderRepo.createProvider({
          name: name.trim(), type, baseUrl, apiKeyEncrypted,
          enabled: enabled ?? true,
          priority: priority ?? 10,
          isDefault: isDefault ?? false,
          supportsChat: supportsChat ?? true,
          supportsVision: supportsVision ?? false,
          supportsEmbeddings: supportsEmbeddings ?? false,
          supportsSpeech: supportsSpeech ?? false,
          supportsStreaming: supportsStreaming ?? true,
          supportsFunctionCalling: supportsFunctionCalling ?? false,
          supportsReasoning: supportsReasoning ?? false,
          timeoutMs: timeoutMs ?? 30000,
          retryCount: retryCount ?? 2,
          notes: notes || '',
          createdBy: req.auth.sub
        });

        return res.status(201).json(ok({ provider: sanitizeProvider(provider) }));
      } catch (err) {
        console.error('[ai/providers POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to create provider.'));
      }
    }
  );

  // ─── PUT /api/ai/providers/:id ────────────────────────────────────────────
  router.put('/providers/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const existing = await aiProviderRepo.findProvider(id);
      if (!existing) {
        return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));
      }

      const {
        name, type, baseUrl, apiKey, enabled, priority, isDefault,
        supportsChat, supportsVision, supportsEmbeddings, supportsSpeech,
        supportsStreaming, supportsFunctionCalling, supportsReasoning,
        timeoutMs, retryCount, notes
      } = req.body || {};

      if (type && !VALID_PROVIDER_TYPES.includes(type)) {
        return res.status(400).json(fail('VALIDATION_ERROR', `type must be one of: ${VALID_PROVIDER_TYPES.join(', ')}.`));
      }

      try {
        let apiKeyEncrypted;
        if (apiKey !== undefined) {
          apiKeyEncrypted = apiKey ? credentialService.encrypt(apiKey) : null;
        }

        const updated = await aiProviderRepo.updateProvider(id, {
          name: name?.trim(), type, baseUrl, apiKeyEncrypted,
          enabled, priority, isDefault,
          supportsChat, supportsVision, supportsEmbeddings,
          supportsSpeech, supportsStreaming, supportsFunctionCalling,
          supportsReasoning, timeoutMs, retryCount, notes
        });

        return res.status(200).json(ok({ provider: sanitizeProvider(updated) }));
      } catch (err) {
        console.error('[ai/providers PUT]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update provider.'));
      }
    }
  );

  // ─── DELETE /api/ai/providers/:id ────────────────────────────────────────
  router.delete('/providers/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const existing = await aiProviderRepo.findProvider(id);
      if (!existing) {
        return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));
      }
      if (existing.type === 'sunave_local' && existing.isDefault) {
        return res.status(409).json(fail('CONFLICT', 'Cannot delete the default Sunave Local provider.'));
      }

      try {
        await aiProviderRepo.deleteProvider(id);
        return res.status(200).json(ok({ message: 'Provider deleted.' }));
      } catch (err) {
        console.error('[ai/providers DELETE]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to delete provider.'));
      }
    }
  );

  // ─── POST /api/ai/providers/test ─────────────────────────────────────────
  router.post('/providers/test', testLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { providerId, type } = req.body || {};

      try {
        let providerType = type;
        if (providerId) {
          const p = await aiProviderRepo.findProvider(providerId);
          if (!p) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));
          providerType = p.type;
        }

        const stubs = aiGatewayService.getProviderStubs();
        const stub = stubs[providerType] || stubs.sunave_local;
        const healthResult = await stub.health();
        const models = await stub.models();

        if (providerId) {
          await aiProviderRepo.upsertHealth(providerId, {
            availability: healthResult.available,
            latencyMs: healthResult.latencyMs,
            failures: healthResult.available ? 0 : 1,
            successRate: healthResult.available ? 1.0 : 0.0,
            modelsCount: models.length
          });
          const status = healthResult.available ? 'healthy' : 'offline';
          await aiProviderRepo.updateProviderHealth(providerId, status);
        }

        return res.status(200).json(ok({
          connected: healthResult.available,
          latencyMs: healthResult.latencyMs,
          modelsFound: models.length,
          models: models.slice(0, 10),
          mock: true
        }));
      } catch (err) {
        console.error('[ai/providers/test POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Connection test failed.'));
      }
    }
  );

  // ─── POST /api/ai/providers/sync ─────────────────────────────────────────
  router.post('/providers/sync', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { providerId } = req.body || {};
      if (!providerId) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'providerId is required.'));
      }

      const provider = await aiProviderRepo.findProvider(providerId);
      if (!provider) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));

      try {
        const stubs = aiGatewayService.getProviderStubs();
        const stub = stubs[provider.type] || stubs.sunave_local;
        const models = await stub.models();

        // Upsert discovered models into the model registry
        const syncedModels = [];
        for (const model of models) {
          const synced = await aiModelRepo.upsertModelByExternalId(providerId, {
            name: model.name,
            displayName: model.name,
            externalId: model.id,
            version: '1.0',
            enabled: true,
            status: 'active'
          });
          syncedModels.push(synced);
        }

        return res.status(200).json(ok({
          providerId,
          providerName: provider.name,
          modelsFound: models.length,
          modelsSynced: syncedModels.length,
          syncedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error('[ai/providers/sync POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Model sync failed.'));
      }
    }
  );

  // ─── GET /api/ai/providers/:id/health ────────────────────────────────────
  router.get('/providers/:id/health', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const provider = await aiProviderRepo.findProvider(req.params.id);
      if (!provider) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));

      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const history = await aiProviderRepo.listHealthHistory(provider.id, limit);

      return res.status(200).json(ok({
        providerId: provider.id,
        providerName: provider.name,
        currentStatus: provider.healthStatus,
        history
      }));
    } catch (err) {
      console.error('[ai/providers/:id/health GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load health history.'));
    }
  });

  // ─── PUT /api/ai/providers/:id/capabilities ──────────────────────────────
  router.put('/providers/:id/capabilities', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const provider = await aiProviderRepo.findProvider(id);
      if (!provider) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));

      const { capabilities } = req.body || {};
      if (!Array.isArray(capabilities)) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'capabilities must be an array of { capability, enabled }.'));
      }

      try {
        const updated = await Promise.all(
          capabilities.map(({ capability, enabled, notes }) => {
            if (!VALID_CAPABILITIES.includes(capability)) return null;
            return aiProviderRepo.upsertCapability(id, capability, !!enabled, notes || '');
          })
        );
        return res.status(200).json(ok({ capabilities: updated.filter(Boolean) }));
      } catch (err) {
        console.error('[ai/providers/:id/capabilities PUT]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update capabilities.'));
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MODEL ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/models ───────────────────────────────────────────────────
  router.get('/models', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const { enabledOnly, providerId } = req.query;
      const models = await aiModelRepo.listModels({
        enabledOnly: enabledOnly === 'true',
        providerId: providerId || null
      });
      return res.status(200).json(ok({ models, total: models.length }));
    } catch (err) {
      console.error('[ai/models GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list models.'));
    }
  });

  // ─── GET /api/ai/models/:id ───────────────────────────────────────────────
  router.get('/models/:id', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const model = await aiModelRepo.findModel(req.params.id);
      if (!model) return res.status(404).json(fail('NOT_FOUND', 'Model not found.'));

      const capabilities = await aiModelRepo.listModelCapabilities(model.id);
      return res.status(200).json(ok({ model, capabilities }));
    } catch (err) {
      console.error('[ai/models/:id GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load model.'));
    }
  });

  // ─── POST /api/ai/models ──────────────────────────────────────────────────
  router.post('/models', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const {
        providerId, name, displayName, version, enabled, isDefault,
        contextWindow, maxOutputTokens,
        supportsReasoning, supportsCoding, supportsVision, supportsSpeech,
        supportsEmbeddings, supportsStreaming, supportsFunctionCalling, supportsJson,
        supportsImageGeneration, supportsAudioGeneration, supportsVideoGeneration,
        estimatedCostInput, estimatedCostOutput, averageLatencyMs,
        status, externalId
      } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'name is required.'));
      }
      if (!providerId) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'providerId is required.'));
      }

      const provider = await aiProviderRepo.findProvider(providerId);
      if (!provider) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));

      if (status && !VALID_MODEL_STATUSES.includes(status)) {
        return res.status(400).json(fail('VALIDATION_ERROR', `status must be one of: ${VALID_MODEL_STATUSES.join(', ')}.`));
      }

      try {
        const model = await aiModelRepo.createModel({
          providerId, name: name.trim(), displayName, version,
          enabled: enabled ?? true, isDefault: isDefault ?? false,
          contextWindow: contextWindow ?? 4096, maxOutputTokens: maxOutputTokens ?? 2048,
          supportsReasoning: supportsReasoning ?? false,
          supportsCoding: supportsCoding ?? false,
          supportsVision: supportsVision ?? false,
          supportsSpeech: supportsSpeech ?? false,
          supportsEmbeddings: supportsEmbeddings ?? false,
          supportsStreaming: supportsStreaming ?? true,
          supportsFunctionCalling: supportsFunctionCalling ?? false,
          supportsJson: supportsJson ?? false,
          supportsImageGeneration: supportsImageGeneration ?? false,
          supportsAudioGeneration: supportsAudioGeneration ?? false,
          supportsVideoGeneration: supportsVideoGeneration ?? false,
          estimatedCostInput: estimatedCostInput ?? 0,
          estimatedCostOutput: estimatedCostOutput ?? 0,
          averageLatencyMs: averageLatencyMs || null,
          status: status || 'active',
          externalId: externalId || null
        });

        return res.status(201).json(ok({ model }));
      } catch (err) {
        console.error('[ai/models POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to create model.'));
      }
    }
  );

  // ─── PUT /api/ai/models/:id ───────────────────────────────────────────────
  router.put('/models/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const existing = await aiModelRepo.findModel(id);
      if (!existing) return res.status(404).json(fail('NOT_FOUND', 'Model not found.'));

      const {
        name, displayName, version, enabled, isDefault,
        contextWindow, maxOutputTokens,
        supportsReasoning, supportsCoding, supportsVision, supportsSpeech,
        supportsEmbeddings, supportsStreaming, supportsFunctionCalling, supportsJson,
        supportsImageGeneration, supportsAudioGeneration, supportsVideoGeneration,
        estimatedCostInput, estimatedCostOutput, averageLatencyMs,
        status, externalId
      } = req.body || {};

      if (status && !VALID_MODEL_STATUSES.includes(status)) {
        return res.status(400).json(fail('VALIDATION_ERROR', `status must be one of: ${VALID_MODEL_STATUSES.join(', ')}.`));
      }

      try {
        const updated = await aiModelRepo.updateModel(id, {
          name, displayName, version, enabled, isDefault,
          contextWindow, maxOutputTokens,
          supportsReasoning, supportsCoding, supportsVision, supportsSpeech,
          supportsEmbeddings, supportsStreaming, supportsFunctionCalling, supportsJson,
          supportsImageGeneration, supportsAudioGeneration, supportsVideoGeneration,
          estimatedCostInput, estimatedCostOutput, averageLatencyMs,
          status, externalId
        });

        return res.status(200).json(ok({ model: updated }));
      } catch (err) {
        console.error('[ai/models PUT]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update model.'));
      }
    }
  );

  // ─── DELETE /api/ai/models/:id ────────────────────────────────────────────
  router.delete('/models/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const existing = await aiModelRepo.findModel(id);
      if (!existing) return res.status(404).json(fail('NOT_FOUND', 'Model not found.'));

      try {
        await aiModelRepo.deleteModel(id);
        return res.status(200).json(ok({ message: 'Model deleted.' }));
      } catch (err) {
        console.error('[ai/models DELETE]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to delete model.'));
      }
    }
  );

  // ─── POST /api/ai/models/refresh ──────────────────────────────────────────
  router.post('/models/refresh', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      try {
        const providers = await aiProviderRepo.listProviders({ enabledOnly: true });
        const stubs = aiGatewayService.getProviderStubs();
        let totalSynced = 0;

        for (const provider of providers) {
          const stub = stubs[provider.type] || stubs.sunave_local;
          const models = await stub.models();

          for (const model of models) {
            await aiModelRepo.upsertModelByExternalId(provider.id, {
              name: model.name,
              displayName: model.name,
              externalId: model.id,
              version: '1.0',
              enabled: true,
              status: 'active'
            });
            totalSynced++;
          }
        }

        return res.status(200).json(ok({
          providersScanned: providers.length,
          modelsSynced: totalSynced,
          refreshedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error('[ai/models/refresh POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Model refresh failed.'));
      }
    }
  );

  // ─── PUT /api/ai/models/:id/capabilities ──────────────────────────────────
  router.put('/models/:id/capabilities', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const model = await aiModelRepo.findModel(id);
      if (!model) return res.status(404).json(fail('NOT_FOUND', 'Model not found.'));

      const { capabilities } = req.body || {};
      if (!Array.isArray(capabilities)) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'capabilities must be an array of { capabilityId, enabled, priority }.'));
      }

      try {
        const updated = await Promise.all(
          capabilities.map(({ capabilityId, enabled, priority, config }) => {
            return aiModelRepo.addModelCapability(id, capabilityId, { enabled, priority, config });
          })
        );
        return res.status(200).json(ok({ capabilities: updated }));
      } catch (err) {
        console.error('[ai/models/:id/capabilities PUT]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update model capabilities.'));
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/capabilities ─────────────────────────────────────────────
  router.get('/capabilities', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const { enabledOnly, category } = req.query;
      const capabilities = await aiCapabilityRepo.listCapabilities({
        enabledOnly: enabledOnly === 'true',
        category: category || null
      });
      const categories = await aiCapabilityRepo.getCapabilityCategories();
      const capabilityMap = aiGatewayService.getCapabilityMap();
      const policies = aiGatewayService.getRoutingPolicies();

      return res.status(200).json(ok({
        capabilities,
        categories,
        providerCapabilityMap: capabilityMap,
        routingPolicies: policies
      }));
    } catch (err) {
      console.error('[ai/capabilities GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load capabilities.'));
    }
  });

  // ─── PUT /api/ai/capabilities ─────────────────────────────────────────────
  router.put('/capabilities', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { capabilities } = req.body || {};
      if (!Array.isArray(capabilities)) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'capabilities must be an array.'));
      }

      try {
        const updated = await Promise.all(
          capabilities.map(async (cap) => {
            if (cap.id) {
              return aiCapabilityRepo.updateCapability(cap.id, cap);
            }
            return aiCapabilityRepo.createCapability(cap);
          })
        );
        return res.status(200).json(ok({ capabilities: updated }));
      } catch (err) {
        console.error('[ai/capabilities PUT]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update capabilities.'));
      }
    }
  );

  // ─── POST /api/ai/capabilities ────────────────────────────────────────────
  router.post('/capabilities', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { name, displayName, description, category, icon, enabled } = req.body || {};

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'name is required.'));
      }
      if (category && !VALID_CAPABILITY_CATEGORIES.includes(category)) {
        return res.status(400).json(fail('VALIDATION_ERROR', `category must be one of: ${VALID_CAPABILITY_CATEGORIES.join(', ')}.`));
      }

      try {
        const capability = await aiCapabilityRepo.createCapability({
          name: name.trim(), displayName, description, category, icon, enabled
        });
        return res.status(201).json(ok({ capability }));
      } catch (err) {
        console.error('[ai/capabilities POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to create capability.'));
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // POLICY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/policies ─────────────────────────────────────────────────
  router.get('/policies', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const policies = await aiProviderRepo.listPolicies(req.org.id);
      const availablePolicies = aiGatewayService.getRoutingPolicies();
      return res.status(200).json(ok({ policies, availablePolicies }));
    } catch (err) {
      console.error('[ai/policies GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load policies.'));
    }
  });

  // ─── PUT /api/ai/policies ─────────────────────────────────────────────────
  router.put('/policies', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { policies } = req.body || {};
      if (!Array.isArray(policies)) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'policies must be an array.'));
      }

      try {
        const updated = await Promise.all(
          policies.map(({ scope, policyType, settings, enabled }) => {
            return aiProviderRepo.upsertPolicy(
              req.org.id, scope || 'organization', policyType, { ...settings, enabled }
            );
          })
        );
        return res.status(200).json(ok({ policies: updated }));
      } catch (err) {
        console.error('[ai/policies PUT]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update policies.'));
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/health ───────────────────────────────────────────────────
  router.get('/health', readLimit, requireAuth, requireOrg(orgRepo), async (_req, res) => {
    try {
      const health = await aiGatewayService.health();
      return res.status(200).json(ok({ health }));
    } catch (err) {
      console.error('[ai/health GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Health check failed.'));
    }
  });

  // ─── GET /api/ai/health/summary ───────────────────────────────────────────
  router.get('/health/summary', readLimit, requireAuth, requireOrg(orgRepo), async (_req, res) => {
    try {
      const providers = await aiProviderRepo.listProviders();
      const latestHealth = await aiProviderRepo.listAllLatestHealth();

      const healthy = providers.filter(p => p.healthStatus === 'healthy').length;
      const degraded = providers.filter(p => p.healthStatus === 'degraded').length;
      const offline = providers.filter(p => p.healthStatus === 'offline').length;
      const unknown = providers.filter(p => p.healthStatus === 'unknown').length;

      return res.status(200).json(ok({
        summary: { total: providers.length, healthy, degraded, offline, unknown },
        providers: providers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          healthStatus: p.healthStatus,
          lastHealthCheck: p.lastHealthCheck,
          latestHealth: p.latestHealth
        })),
        healthHistory: latestHealth
      }));
    } catch (err) {
      console.error('[ai/health/summary GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load health summary.'));
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // USAGE & STATISTICS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/statistics ───────────────────────────────────────────────
  router.get('/statistics', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const { startDate, endDate, groupBy } = req.query;
      const orgId = req.org.id;

      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      const start = startDate || defaultStart.toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      const usageStats = await aiUsageRepo.getUsageStats({
        organizationId: orgId, startDate: start, endDate: end, groupBy: groupBy || 'day'
      });
      const costStats = await aiUsageRepo.getCostStats({
        organizationId: orgId, startDate: start, endDate: end, groupBy: groupBy || 'day'
      });
      const dashboardStats = await aiUsageRepo.getDashboardStats(orgId, start, end);
      const topModels = await aiUsageRepo.getTopModels(orgId, 10);
      const topProviders = await aiUsageRepo.getTopProviders(orgId, 10);
      const recentFailures = await aiUsageRepo.getRecentFailures(orgId, 10);
      const monthlyCost = await aiUsageRepo.getMonthlyCost(orgId);

      return res.status(200).json(ok({
        period: { start, end },
        summary: dashboardStats,
        usage: usageStats,
        costs: costStats,
        monthlyCost,
        topModels,
        topProviders,
        recentFailures
      }));
    } catch (err) {
      console.error('[ai/statistics GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load statistics.'));
    }
  });

  // ─── GET /api/ai/usage ────────────────────────────────────────────────────
  router.get('/usage', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const { providerId, modelId, startDate, endDate, limit, offset } = req.query;
      const usage = await aiUsageRepo.listTokenUsage({
        organizationId: req.org.id,
        providerId: providerId || null,
        modelId: modelId || null,
        startDate: startDate || null,
        endDate: endDate || null,
        limit: Math.min(Number(limit) || 50, 200),
        offset: Number(offset) || 0
      });

      return res.status(200).json(ok({ usage, total: usage.length }));
    } catch (err) {
      console.error('[ai/usage GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load usage data.'));
    }
  });

  // ─── GET /api/ai/costs ────────────────────────────────────────────────────
  router.get('/costs', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const { providerId, modelId, startDate, endDate, groupBy } = req.query;
      const orgId = req.org.id;

      const defaultStart = new Date();
      defaultStart.setDate(defaultStart.getDate() - 30);
      const start = startDate || defaultStart.toISOString().split('T')[0];
      const end = endDate || new Date().toISOString().split('T')[0];

      const costStats = await aiUsageRepo.getCostStats({
        organizationId: orgId,
        providerId: providerId || null,
        modelId: modelId || null,
        startDate: start, endDate: end,
        groupBy: groupBy || 'day'
      });
      const monthlyCost = await aiUsageRepo.getMonthlyCost(orgId);

      return res.status(200).json(ok({
        period: { start, end },
        costs: costStats,
        monthlyCost
      }));
    } catch (err) {
      console.error('[ai/costs GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load cost data.'));
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUDGET ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/budgets ──────────────────────────────────────────────────
  router.get('/budgets', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const budgets = await aiUsageRepo.listBudgets(req.org.id);
      return res.status(200).json(ok({ budgets }));
    } catch (err) {
      console.error('[ai/budgets GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list budgets.'));
    }
  });

  // ─── POST /api/ai/budgets ─────────────────────────────────────────────────
  router.post('/budgets', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const {
        name, scope, scopeId, monthlyLimit, yearlyLimit,
        tokenLimit, requestLimit, alertThreshold, alertEmails, enabled
      } = req.body || {};

      if (!name) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'name is required.'));
      }
      if (scope && !VALID_BUDGET_SCOPES.includes(scope)) {
        return res.status(400).json(fail('VALIDATION_ERROR', `scope must be one of: ${VALID_BUDGET_SCOPES.join(', ')}.`));
      }

      try {
        const budget = await aiUsageRepo.createBudget({
          organizationId: req.org.id, name, scope, scopeId,
          monthlyLimit, yearlyLimit, tokenLimit, requestLimit,
          alertThreshold, alertEmails, enabled, createdBy: req.auth.sub
        });
        return res.status(201).json(ok({ budget }));
      } catch (err) {
        console.error('[ai/budgets POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to create budget.'));
      }
    }
  );

  // ─── PUT /api/ai/budgets/:id ──────────────────────────────────────────────
  router.put('/budgets/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const existing = await aiUsageRepo.findBudget(id);
      if (!existing) return res.status(404).json(fail('NOT_FOUND', 'Budget not found.'));

      try {
        const budget = await aiUsageRepo.updateBudget(id, req.body);
        return res.status(200).json(ok({ budget }));
      } catch (err) {
        console.error('[ai/budgets PUT]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to update budget.'));
      }
    }
  );

  // ─── DELETE /api/ai/budgets/:id ───────────────────────────────────────────
  router.delete('/budgets/:id', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { id } = req.params;
      const existing = await aiUsageRepo.findBudget(id);
      if (!existing) return res.status(404).json(fail('NOT_FOUND', 'Budget not found.'));

      try {
        await aiUsageRepo.deleteBudget(id);
        return res.status(200).json(ok({ message: 'Budget deleted.' }));
      } catch (err) {
        console.error('[ai/budgets DELETE]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to delete budget.'));
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // CREDENTIAL ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── POST /api/ai/credentials/:providerId ────────────────────────────────
  router.post('/credentials/:providerId', writeLimit, requireAuth, requireOrg(orgRepo),
    permService.requirePermission('platform.manage'), async (req, res) => {
      const { providerId } = req.params;
      const { keyName, keyValue } = req.body || {};

      if (!keyName || !keyValue) {
        return res.status(400).json(fail('VALIDATION_ERROR', 'keyName and keyValue are required.'));
      }

      const provider = await aiProviderRepo.findProvider(providerId);
      if (!provider) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));

      try {
        const encrypted = credentialService.encrypt(keyValue);
        const stored = await aiProviderRepo.upsertCredential(providerId, keyName, encrypted);
        return res.status(200).json(ok({
          id: stored.id,
          providerId: stored.provider_id,
          keyName: stored.key_name,
          rotatedAt: stored.rotated_at,
          createdAt: stored.created_at
        }));
      } catch (err) {
        console.error('[ai/credentials POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to store credential.'));
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // GATEWAY TEST ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── POST /api/ai/test ────────────────────────────────────────────────────
  router.post('/test', testLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { capability = 'chat', messages, routingPolicy } = req.body || {};

    if (capability && !VALID_CAPABILITIES.includes(capability)) {
      return res.status(400).json(fail('INVALID_CAPABILITY', `capability must be one of: ${VALID_CAPABILITIES.join(', ')}.`));
    }
    if (routingPolicy && !VALID_ROUTING_POLICIES.includes(routingPolicy)) {
      return res.status(400).json(fail('INVALID_POLICY', `routingPolicy must be one of: ${VALID_ROUTING_POLICIES.join(', ')}.`));
    }

    try {
      const testMessages = messages && messages.length > 0
        ? messages
        : [{ role: 'user', content: 'Hello! This is a gateway test.' }];

      const result = await aiGatewayService.chat(capability, testMessages, { routingPolicy });
      return res.status(200).json(ok({
        test: true,
        capability,
        routingPolicy: routingPolicy || 'local_first',
        result
      }));
    } catch (err) {
      console.error('[ai/test POST]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Gateway test failed.'));
    }
  });

  // ─── POST /api/ai/estimate-cost ──────────────────────────────────────────
  router.post('/estimate-cost', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    const { capability = 'chat', estimatedTokens = 1000, preferredProviderType } = req.body || {};

    if (!VALID_CAPABILITIES.includes(capability)) {
      return res.status(400).json(fail('INVALID_CAPABILITY', `capability must be one of: ${VALID_CAPABILITIES.join(', ')}.`));
    }

    try {
      const estimate = await aiGatewayService.estimateCost(capability, estimatedTokens, preferredProviderType);
      return res.status(200).json(ok({ estimate }));
    } catch (err) {
      console.error('[ai/estimate-cost POST]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Cost estimation failed.'));
    }
  });

  return router;
}