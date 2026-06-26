import { fail, ok } from '@sunave/core';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';

const VALID_CAPABILITIES = [
  'reasoning','coding','vision','speech','translation','ocr',
  'embeddings','summarization','planning','classification',
  'extraction','generation','function_calling','chat'
];

const VALID_PROVIDER_TYPES = [
  'sunave_local','openai','anthropic','gemini','vertex_ai',
  'azure_openai','openrouter','litellm','ollama','custom'
];

const VALID_ROUTING_POLICIES = [
  'lowest_cost','highest_quality','fastest','local_first','cloud_first','org_override'
];

/**
 * AI Gateway & Provider Management Router
 * Prompt 9: GET /api/ai/providers, /health, /models, POST /api/ai/test
 * Prompt 10: Provider CRUD, test, sync-models, policies, capabilities
 */
export function buildAiRouter(aiProviderRepo, aiGatewayService, credentialService, orgRepo, permService) {
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
  // PROMPT 9 — AI GATEWAY ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── GET /api/ai/providers ────────────────────────────────────────────────
  // List all providers with health summary. No credentials exposed.
  router.get('/providers', readLimit, requireAuth, requireOrg(orgRepo), async (_req, res) => {
    try {
      const providers = await aiProviderRepo.listProviders();
      return res.status(200).json(ok({ providers: providers.map(sanitizeProvider) }));
    } catch (err) {
      console.error('[ai/providers GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list providers.'));
    }
  });

  // ─── GET /api/ai/health ───────────────────────────────────────────────────
  // Gateway-level health check across all providers. Updates health DB records.
  router.get('/health', readLimit, requireAuth, requireOrg(orgRepo), async (_req, res) => {
    try {
      const health = await aiGatewayService.health();
      return res.status(200).json(ok({ health }));
    } catch (err) {
      console.error('[ai/health GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Health check failed.'));
    }
  });

  // ─── GET /api/ai/models ───────────────────────────────────────────────────
  // List all available models from all enabled providers.
  router.get('/models', readLimit, requireAuth, requireOrg(orgRepo), async (_req, res) => {
    try {
      const result = await aiGatewayService.listModels();
      return res.status(200).json(ok(result));
    } catch (err) {
      console.error('[ai/models GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to list models.'));
    }
  });

  // ─── POST /api/ai/test ────────────────────────────────────────────────────
  // Test the gateway with a mock capability request.
  // Body: { capability, messages, routingPolicy }
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

  // ─── GET /api/ai/capabilities ─────────────────────────────────────────────
  // List all capabilities and which provider types support them.
  router.get('/capabilities', readLimit, requireAuth, requireOrg(orgRepo), async (_req, res) => {
    try {
      const capabilityMap = aiGatewayService.getCapabilityMap();
      const policies = aiGatewayService.getRoutingPolicies();
      return res.status(200).json(ok({ capabilities: capabilityMap, routingPolicies: policies }));
    } catch (err) {
      console.error('[ai/capabilities GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load capabilities.'));
    }
  });

  // ─── POST /api/ai/estimate-cost ──────────────────────────────────────────
  // Estimate cost for a capability request. Body: { capability, estimatedTokens }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT 10 — AI PROVIDER MANAGEMENT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── POST /api/ai/providers ───────────────────────────────────────────────
  // Create a new provider. Admin-only. Encrypts API key if provided.
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
        // Encrypt API key before storing
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
  // Update a provider. Admin-only.
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
        // Only re-encrypt if a new key is provided
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
  // Delete a provider. Admin-only. Cannot delete seeded Sunave Local.
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
  // Test connection to a specific provider. Body: { providerId } or { type, baseUrl, apiKey }
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

        // Run health check via gateway (uses mock stub)
        const stubs = aiGatewayService.getProviderStubs();
        const stub = stubs[providerType] || stubs.sunave_local;
        const healthResult = await stub.health();
        const models = await stub.models();

        // Record health in DB if testing an existing provider
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

  // ─── POST /api/ai/providers/sync-models ──────────────────────────────────
  // Sync model list for a provider. Body: { providerId }
  router.post('/providers/sync-models', writeLimit, requireAuth, requireOrg(orgRepo),
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

        return res.status(200).json(ok({
          providerId,
          providerName: provider.name,
          modelsFound: models.length,
          models,
          mock: true,
          syncedAt: new Date().toISOString()
        }));
      } catch (err) {
        console.error('[ai/providers/sync-models POST]', err);
        return res.status(500).json(fail('INTERNAL_ERROR', 'Model sync failed.'));
      }
    }
  );

  // ─── GET /api/ai/providers/:id ────────────────────────────────────────────
  // Get single provider detail.
  router.get('/providers/:id', readLimit, requireAuth, requireOrg(orgRepo), async (req, res) => {
    try {
      const provider = await aiProviderRepo.findProvider(req.params.id);
      if (!provider) return res.status(404).json(fail('NOT_FOUND', 'Provider not found.'));

      const capabilities = await aiProviderRepo.listCapabilities(provider.id);
      const credentialNames = await aiProviderRepo.listCredentialNames(provider.id);

      return res.status(200).json(ok({
        provider: sanitizeProvider(provider),
        capabilities,
        credentials: credentialNames // names only, no values
      }));
    } catch (err) {
      console.error('[ai/providers/:id GET]', err);
      return res.status(500).json(fail('INTERNAL_ERROR', 'Failed to load provider.'));
    }
  });

  // ─── GET /api/ai/providers/:id/health ────────────────────────────────────
  // Health history for a specific provider.
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
  // Update capability matrix for a provider. Admin-only.
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

  // ─── GET /api/ai/policies ─────────────────────────────────────────────────
  // Get routing policies for the current org.
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

  // ─── POST /api/ai/credentials/:providerId ────────────────────────────────
  // Store/rotate a named credential for a provider. Admin-only.
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
        // Return only metadata, never the raw or encrypted value
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

  return router;
}
