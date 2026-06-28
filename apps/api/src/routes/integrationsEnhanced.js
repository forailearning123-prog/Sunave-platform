// Integration Platform Enhanced Routes
// Complete API for Integration Platform (Prompt 25)

import express from 'express';
const router = express.Router();

// ─── Middleware ────────────────────────────────────────────────────────────────

import requireOrg from '../middleware/requireOrg';
import requirePermission from '../middleware/requirePermission';
import asyncHandler from '../middleware/asyncHandler';

// ─── Dependencies (injected via app.js) ────────────────────────────────────────

let db, integrationService, permissionService;

// ─── Webhook Endpoints ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/integrations/:integrationId/webhooks
 * @desc    Create webhook endpoint
 * @access  Private
 */
router.post('/:integrationId/webhooks', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const webhook = await integrationService.createWebhookEndpoint(
    integrationId,
    organizationId,
    req.body,
    userId
  );

  res.status(201).json({
    success: true,
    data: webhook
  });
}));

/**
 * @route   GET /api/integrations/:integrationId/webhooks
 * @desc    Get all webhooks for integration
 * @access  Private
 */
router.get('/:integrationId/webhooks', requireOrg, asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;

  const webhooks = await integrationService.getWebhooksByIntegration(integrationId, organizationId);

  res.json({
    success: true,
    data: webhooks
  });
}));

/**
 * @route   GET /api/integrations/webhooks/:webhookId
 * @desc    Get webhook by ID
 * @access  Private
 */
router.get('/webhooks/:webhookId', requireOrg, asyncHandler(async (req, res) => {
  const { webhookId } = req.params;
  const organizationId = req.org.id;

  const webhook = await integrationService.getWebhookEndpoint(webhookId, organizationId);

  res.json({
    success: true,
    data: webhook
  });
}));

/**
 * @route   PUT /api/integrations/webhooks/:webhookId
 * @desc    Update webhook endpoint
 * @access  Private
 */
router.put('/webhooks/:webhookId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { webhookId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const webhook = await integrationService.updateWebhookEndpoint(
    webhookId,
    organizationId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: webhook
  });
}));

/**
 * @route   DELETE /api/integrations/webhooks/:webhookId
 * @desc    Delete webhook endpoint
 * @access  Private
 */
router.delete('/webhooks/:webhookId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { webhookId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const deleted = await integrationService.deleteWebhookEndpoint(webhookId, organizationId, userId);

  res.json({
    success: true,
    data: { deleted }
  });
}));

/**
 * @route   GET /api/integrations/webhooks/:webhookId/logs
 * @desc    Get webhook logs
 * @access  Private
 */
router.get('/webhooks/:webhookId/logs', requireOrg, asyncHandler(async (req, res) => {
  const { webhookId } = req.params;
  const organizationId = req.org.id;
  const { limit = 100, offset = 0 } = req.query;

  const logs = await integrationService.getWebhookLogs(
    webhookId,
    organizationId,
    parseInt(limit),
    parseInt(offset)
  );

  res.json({
    success: true,
    data: logs,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// ─── Retry Policies ────────────────────────────────────────────────────────────

/**
 * @route   POST /api/integrations/:integrationId/retry-policies
 * @desc    Create retry policy
 * @access  Private
 */
router.post('/:integrationId/retry-policies', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const policy = await integrationService.createRetryPolicy(
    integrationId,
    organizationId,
    req.body,
    userId
  );

  res.status(201).json({
    success: true,
    data: policy
  });
}));

/**
 * @route   GET /api/integrations/:integrationId/retry-policies
 * @desc    Get retry policy for integration
 * @access  Private
 */
router.get('/:integrationId/retry-policies', requireOrg, asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;

  const policy = await integrationService.getRetryPolicyByIntegration(integrationId, organizationId);

  res.json({
    success: true,
    data: policy
  });
}));

/**
 * @route   GET /api/integrations/retry-policies/:policyId
 * @desc    Get retry policy by ID
 * @access  Private
 */
router.get('/retry-policies/:policyId', requireOrg, asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const organizationId = req.org.id;

  const policy = await integrationService.getRetryPolicy(policyId, organizationId);

  res.json({
    success: true,
    data: policy
  });
}));

/**
 * @route   PUT /api/integrations/retry-policies/:policyId
 * @desc    Update retry policy
 * @access  Private
 */
router.put('/retry-policies/:policyId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const policy = await integrationService.updateRetryPolicy(
    policyId,
    organizationId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: policy
  });
}));

/**
 * @route   DELETE /api/integrations/retry-policies/:policyId
 * @desc    Delete retry policy
 * @access  Private
 */
router.delete('/retry-policies/:policyId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { policyId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const deleted = await integrationService.deleteRetryPolicy(policyId, organizationId, userId);

  res.json({
    success: true,
    data: { deleted }
  });
}));

/**
 * @route   GET /api/integrations/retry-policies/organization
 * @desc    Get all retry policies for organization
 * @access  Private
 */
router.get('/retry-policies/organization', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;

  const policies = await integrationService.getRetryPoliciesByOrganization(organizationId);

  res.json({
    success: true,
    data: policies
  });
}));

// ─── Rate Limits ───────────────────────────────────────────────────────────────

/**
 * @route   POST /api/integrations/:integrationId/rate-limits
 * @desc    Create rate limit
 * @access  Private
 */
router.post('/:integrationId/rate-limits', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const rateLimit = await integrationService.createRateLimit(
    integrationId,
    organizationId,
    req.body,
    userId
  );

  res.status(201).json({
    success: true,
    data: rateLimit
  });
}));

/**
 * @route   GET /api/integrations/:integrationId/rate-limits
 * @desc    Get rate limit for integration
 * @access  Private
 */
router.get('/:integrationId/rate-limits', requireOrg, asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;

  const rateLimit = await integrationService.getRateLimitByIntegration(integrationId, organizationId);

  res.json({
    success: true,
    data: rateLimit
  });
}));

/**
 * @route   GET /api/integrations/rate-limits/:rateLimitId
 * @desc    Get rate limit by ID
 * @access  Private
 */
router.get('/rate-limits/:rateLimitId', requireOrg, asyncHandler(async (req, res) => {
  const { rateLimitId } = req.params;
  const organizationId = req.org.id;

  const rateLimit = await integrationService.getRateLimit(rateLimitId, organizationId);

  res.json({
    success: true,
    data: rateLimit
  });
}));

/**
 * @route   PUT /api/integrations/rate-limits/:rateLimitId
 * @desc    Update rate limit
 * @access  Private
 */
router.put('/rate-limits/:rateLimitId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { rateLimitId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const rateLimit = await integrationService.updateRateLimit(
    rateLimitId,
    organizationId,
    req.body,
    userId
  );

  res.json({
    success: true,
    data: rateLimit
  });
}));

/**
 * @route   DELETE /api/integrations/rate-limits/:rateLimitId
 * @desc    Delete rate limit
 * @access  Private
 */
router.delete('/rate-limits/:rateLimitId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { rateLimitId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const deleted = await integrationService.deleteRateLimit(rateLimitId, organizationId, userId);

  res.json({
    success: true,
    data: { deleted }
  });
}));

/**
 * @route   GET /api/integrations/rate-limits/organization
 * @desc    Get all rate limits for organization
 * @access  Private
 */
router.get('/rate-limits/organization', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;

  const rateLimits = await integrationService.getRateLimitsByOrganization(organizationId);

  res.json({
    success: true,
    data: rateLimits
  });
}));

// ─── Connection Templates ──────────────────────────────────────────────────────

/**
 * @route   POST /api/integrations/templates
 * @desc    Create connection template
 * @access  Private
 */
router.post('/templates', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const userId = req.auth.userId;

  const template = await integrationService.createConnectionTemplate(req.body, userId);

  res.status(201).json({
    success: true,
    data: template
  });
}));

/**
 * @route   GET /api/integrations/templates
 * @desc    Get connection templates
 * @access  Private
 */
router.get('/templates', requireOrg, asyncHandler(async (req, res) => {
  const { category, provider, isFeatured, isSystem, search, limit = 50, offset = 0 } = req.query;

  const templates = await integrationService.getConnectionTemplates({
    category,
    provider,
    isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
    isSystem: isSystem !== undefined ? isSystem === 'true' : undefined,
    search,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: templates,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * @route   GET /api/integrations/templates/:templateId
 * @desc    Get template by ID
 * @access  Private
 */
router.get('/templates/:templateId', requireOrg, asyncHandler(async (req, res) => {
  const { templateId } = req.params;

  const template = await integrationService.getConnectionTemplate(templateId);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found'
    });
  }

  res.json({
    success: true,
    data: template
  });
}));

/**
 * @route   PUT /api/integrations/templates/:templateId
 * @desc    Update connection template
 * @access  Private
 */
router.put('/templates/:templateId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const userId = req.auth.userId;

  const template = await integrationService.updateConnectionTemplate(templateId, req.body, userId);

  res.json({
    success: true,
    data: template
  });
}));

/**
 * @route   DELETE /api/integrations/templates/:templateId
 * @desc    Delete connection template
 * @access  Private
 */
router.delete('/templates/:templateId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const userId = req.auth.userId;

  const deleted = await integrationService.deleteConnectionTemplate(templateId, userId);

  res.json({
    success: true,
    data: { deleted }
  });
}));

// ─── Connector Metadata ────────────────────────────────────────────────────────

/**
 * @route   GET /api/integrations/connectors
 * @desc    Get all connector metadata
 * @access  Private
 */
router.get('/connectors', requireOrg, asyncHandler(async (req, res) => {
  const { category, isOfficial, search } = req.query;

  const connectors = await integrationService.getAllConnectorMetadata({
    category,
    isOfficial: isOfficial !== undefined ? isOfficial === 'true' : undefined,
    search
  });

  res.json({
    success: true,
    data: connectors
  });
}));

/**
 * @route   GET /api/integrations/connectors/:provider
 * @desc    Get connector metadata by provider
 * @access  Private
 */
router.get('/connectors/:provider', requireOrg, asyncHandler(async (req, res) => {
  const { provider } = req.params;

  const connector = await integrationService.getConnectorMetadata(provider);

  if (!connector) {
    return res.status(404).json({
      success: false,
      error: 'Connector not found'
    });
  }

  res.json({
    success: true,
    data: connector
  });
}));

// ─── Integration Events ────────────────────────────────────────────────────────

/**
 * @route   GET /api/integrations/:integrationId/events
 * @desc    Get integration events
 * @access  Private
 */
router.get('/:integrationId/events', requireOrg, asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;
  const { limit = 100, offset = 0 } = req.query;

  const events = await integrationService.getIntegrationEvents(
    integrationId,
    organizationId,
    parseInt(limit),
    parseInt(offset)
  );

  res.json({
    success: true,
    data: events,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * @route   GET /api/integrations/events/organization
 * @desc    Get all events for organization
 * @access  Private
 */
router.get('/events/organization', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;
  const { limit = 100, offset = 0 } = req.query;

  const events = await integrationService.getOrganizationEvents(
    organizationId,
    parseInt(limit),
    parseInt(offset)
  );

  res.json({
    success: true,
    data: events,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// ─── Request/Response Logs ─────────────────────────────────────────────────────

/**
 * @route   GET /api/integrations/:integrationId/logs/requests
 * @desc    Get request logs for integration
 * @access  Private
 */
router.get('/:integrationId/logs/requests', requireOrg, asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;
  const { limit = 100, offset = 0 } = req.query;

  const logs = await integrationService.getRequestLogs(
    integrationId,
    organizationId,
    parseInt(limit),
    parseInt(offset)
  );

  res.json({
    success: true,
    data: logs,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * @route   GET /api/integrations/:integrationId/logs/responses
 * @desc    Get response logs for integration
 * @access  Private
 */
router.get('/:integrationId/logs/responses', requireOrg, asyncHandler(async (req, res) => {
  const { integrationId } = req.params;
  const organizationId = req.org.id;
  const { limit = 100, offset = 0 } = req.query;

  const logs = await integrationService.getResponseLogs(
    integrationId,
    organizationId,
    parseInt(limit),
    parseInt(offset)
  );

  res.json({
    success: true,
    data: logs,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// ─── Statistics ────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/integrations/statistics
 * @desc    Get integration statistics for organization
 * @access  Private
 */
router.get('/statistics', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;

  const stats = await integrationService.getIntegrationStatistics(organizationId);

  res.json({
    success: true,
    data: stats
  });
}));

// ─── Health Checks ─────────────────────────────────────────────────────────────

/**
 * @route   POST /api/integrations/health/check-all
 * @desc    Check health of all integrations
 * @access  Private
 */
router.post('/health/check-all', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;

  const results = await integrationService.checkAllIntegrationsHealth(organizationId);

  res.json({
    success: true,
    data: results
  });
}));

// ─── Dependency Injection ──────────────────────────────────────────────────────

export default (dependencies) => {
  db = dependencies.db;
  integrationService = dependencies.integrationServiceEnhanced;
  permissionService = dependencies.permissionService;
  return router;
};