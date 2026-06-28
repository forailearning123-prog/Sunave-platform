// Integration Framework Routes
// Epic 5: Plugin SDK & Integration Platform

import express from 'express';
const router = express.Router();

// ─── Middleware ────────────────────────────────────────────────────────────────

import requireOrg from '../middleware/requireOrg';
import requirePermission from '../middleware/requirePermission';
import asyncHandler from '../middleware/asyncHandler';

// ─── Dependencies (injected via app.js) ────────────────────────────────────────

let db, integrationService, permissionService;

// ─── Integration CRUD ──────────────────────────────────────────────────────────

/**
 * @route   GET /api/integrations
 * @desc    Get all integrations for organization
 * @access  Private
 */
router.get('/', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;
  const { provider, status, isEnabled, search, limit = 50, offset = 0 } = req.query;

  const integrations = await integrationService.getIntegrationsByOrganization(organizationId, {
    provider,
    status,
    isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
    search,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: integrations,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * @route   GET /api/integrations/:id
 * @desc    Get integration by ID
 * @access  Private
 */
router.get('/:id', requireOrg, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;

  const integration = await integrationService.getIntegration(id);
  
  if (!integration || integration.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Integration not found'
    });
  }

  res.json({
    success: true,
    data: integration
  });
}));

/**
 * @route   POST /api/integrations
 * @desc    Create new integration
 * @access  Private
 */
router.post('/', requireOrg, requirePermission('integrations.create'), asyncHandler(async (req, res) => {
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const integration = await integrationService.createIntegration(
    organizationId,
    req.body,
    userId
  );

  res.status(201).json({
    success: true,
    data: integration
  });
}));

/**
 * @route   PUT /api/integrations/:id
 * @desc    Update integration
 * @access  Private
 */
router.put('/:id', requireOrg, requirePermission('integrations.update'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const integration = await integrationService.getIntegration(id);
  
  if (!integration || integration.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Integration not found'
    });
  }

  const updated = await integrationService.updateIntegration(id, req.body, userId);

  res.json({
    success: true,
    data: updated
  });
}));

/**
 * @route   DELETE /api/integrations/:id
 * @desc    Delete integration
 * @access  Private
 */
router.delete('/:id', requireOrg, requirePermission('integrations.delete'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const integration = await integrationService.getIntegration(id);
  
  if (!integration || integration.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Integration not found'
    });
  }

  const deleted = await integrationService.deleteIntegration(id, userId);

  res.json({
    success: true,
    data: { deleted }
  });
}));

// ─── Integration Operations ────────────────────────────────────────────────────

/**
 * @route   POST /api/integrations/:id/test
 * @desc    Test integration connection
 * @access  Private
 */
router.post('/:id/test', requireOrg, requirePermission('integrations.manage'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;

  const result = await integrationService.testConnection(id, organizationId);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   POST /api/integrations/:id/connect
 * @desc    Connect integration
 * @access  Private
 */
router.post('/:id/connect', requireOrg, requirePermission('integrations.manage'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const result = await integrationService.connectIntegration(id, organizationId, userId);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   POST /api/integrations/:id/disconnect
 * @desc    Disconnect integration
 * @access  Private
 */
router.post('/:id/disconnect', requireOrg, requirePermission('integrations.manage'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const result = await integrationService.disconnectIntegration(id, organizationId, userId);

  res.json({
    success: true,
    data: { disconnected: result }
  });
}));

/**
 * @route   POST /api/integrations/:id/sync
 * @desc    Sync integration data
 * @access  Private
 */
router.post('/:id/sync', requireOrg, requirePermission('integrations.manage'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const result = await integrationService.syncIntegration(id, organizationId, userId);

  res.json({
    success: true,
    data: result
  });
}));

// ─── Integration Credentials ───────────────────────────────────────────────────

/**
 * @route   POST /api/integrations/:id/credentials
 * @desc    Create integration credential
 * @access  Private
 */
router.post('/:id/credentials', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;
  const { type, value, expiresAt } = req.body;

  const credential = await integrationService.createCredential(
    id,
    organizationId,
    { type, value, expiresAt },
    userId
  );

  res.status(201).json({
    success: true,
    data: credential
  });
}));

/**
 * @route   PUT /api/integrations/credentials/:credentialId
 * @desc    Update integration credential
 * @access  Private
 */
router.put('/credentials/:credentialId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { credentialId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;
  const { value } = req.body;

  // Get credential to find integration ID
  const credential = await integrationService.repository.findCredentialById(credentialId);
  if (!credential || credential.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Credential not found'
    });
  }

  const updated = await integrationService.updateCredential(
    credentialId,
    credential.integrationId,
    organizationId,
    value,
    userId
  );

  res.json({
    success: true,
    data: updated
  });
}));

/**
 * @route   DELETE /api/integrations/credentials/:credentialId
 * @desc    Delete integration credential
 * @access  Private
 */
router.delete('/credentials/:credentialId', requireOrg, requirePermission('integrations.configure'), asyncHandler(async (req, res) => {
  const { credentialId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  // Get credential to find integration ID
  const credential = await integrationService.repository.findCredentialById(credentialId);
  if (!credential || credential.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Credential not found'
    });
  }

  const deleted = await integrationService.deleteCredential(
    credentialId,
    credential.integrationId,
    organizationId,
    userId
  );

  res.json({
    success: true,
    data: { deleted }
  });
}));

// ─── Integration Health ────────────────────────────────────────────────────────

/**
 * @route   GET /api/integrations/health
 * @desc    Get integration health for organization
 * @access  Private
 */
router.get('/health/organization', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;

  const health = await integrationService.getIntegrationHealth(organizationId);

  res.json({
    success: true,
    data: health
  });
}));

/**
 * @route   POST /api/integrations/:id/health/check
 * @desc    Check integration health
 * @access  Private
 */
router.post('/:id/health/check', requireOrg, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;

  const integration = await integrationService.getIntegration(id);
  
  if (!integration || integration.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Integration not found'
    });
  }

  const health = await integrationService.checkIntegrationHealth(id);

  res.json({
    success: true,
    data: health
  });
}));

// ─── Provider Information ──────────────────────────────────────────────────────

/**
 * @route   GET /api/integrations/providers
 * @desc    Get available integration providers
 * @access  Private
 */
router.get('/providers/list', requireOrg, asyncHandler(async (req, res) => {
  const providers = [
    {
      id: 'github',
      name: 'GitHub',
      type: 'rest',
      authTypes: ['oauth2', 'api_key'],
      capabilities: ['repositories', 'issues', 'pull_requests', 'actions']
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      type: 'rest',
      authTypes: ['oauth2', 'api_key'],
      capabilities: ['repositories', 'issues', 'merge_requests', 'pipelines']
    },
    {
      id: 'jira',
      name: 'Jira',
      type: 'rest',
      authTypes: ['api_key', 'oauth2'],
      capabilities: ['issues', 'projects', 'workflows', 'boards']
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'webhook',
      authTypes: ['oauth2', 'api_key'],
      capabilities: ['messages', 'channels', 'users', 'files']
    },
    {
      id: 'microsoft_teams',
      name: 'Microsoft Teams',
      type: 'webhook',
      authTypes: ['oauth2'],
      capabilities: ['messages', 'channels', 'meetings']
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      type: 'rest',
      authTypes: ['oauth2', 'api_key'],
      capabilities: ['leads', 'contacts', 'opportunities', 'accounts']
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      type: 'rest',
      authTypes: ['api_key', 'oauth2'],
      capabilities: ['contacts', 'deals', 'companies', 'tickets']
    },
    {
      id: 'twilio',
      name: 'Twilio',
      type: 'rest',
      authTypes: ['api_key'],
      capabilities: ['sms', 'voice', 'whatsapp']
    },
    {
      id: 'custom',
      name: 'Custom Integration',
      type: 'rest',
      authTypes: ['api_key', 'oauth2', 'jwt', 'basic', 'none'],
      capabilities: ['custom']
    }
  ];

  res.json({
    success: true,
    data: providers
  });
}));

// ─── Dependency Injection ──────────────────────────────────────────────────────

export default (dependencies) => {
  db = dependencies.db;
  integrationService = dependencies.integrationService;
  permissionService = dependencies.permissionService;
  return router;
};