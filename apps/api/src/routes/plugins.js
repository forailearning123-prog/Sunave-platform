// Plugin Platform Routes
// Epic 5: Plugin SDK & Integration Platform

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ─── Middleware ────────────────────────────────────────────────────────────────

const requireOrg = require('../middleware/requireOrg');
const requirePermission = require('../middleware/requirePermission');
const asyncHandler = require('../middleware/asyncHandler');

// ─── Dependencies (injected via app.js) ────────────────────────────────────────

let db, pluginService, permissionService;

// ─── Plugin CRUD ──────────────────────────────────────────────────────────────

/**
 * @route   GET /api/plugins
 * @desc    Get all plugins for organization
 * @access  Private
 */
router.get('/', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;
  const { category, status, search, limit = 50, offset = 0 } = req.query;

  const plugins = await pluginService.getPluginsByOrganization(organizationId, {
    category,
    status,
    search,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    success: true,
    data: plugins,
    meta: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

/**
 * @route   GET /api/plugins/:id
 * @desc    Get plugin by ID
 * @access  Private
 */
router.get('/:id', requireOrg, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;

  const plugin = await pluginService.getPlugin(id);
  
  if (!plugin || plugin.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Plugin not found'
    });
  }

  res.json({
    success: true,
    data: plugin
  });
}));

/**
 * @route   POST /api/plugins
 * @desc    Create new plugin
 * @access  Private
 */
router.post('/', requireOrg, requirePermission('plugins.create'), asyncHandler(async (req, res) => {
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const plugin = await pluginService.createPlugin(organizationId, req.body, userId);

  res.status(201).json({
    success: true,
    data: plugin
  });
}));

/**
 * @route   PUT /api/plugins/:id
 * @desc    Update plugin
 * @access  Private
 */
router.put('/:id', requireOrg, requirePermission('plugins.update'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const plugin = await pluginService.getPlugin(id);
  
  if (!plugin || plugin.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Plugin not found'
    });
  }

  const updated = await pluginService.updatePlugin(id, req.body, userId);

  res.json({
    success: true,
    data: updated
  });
}));

/**
 * @route   DELETE /api/plugins/:id
 * @desc    Delete plugin
 * @access  Private
 */
router.delete('/:id', requireOrg, requirePermission('plugins.delete'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const plugin = await pluginService.getPlugin(id);
  
  if (!plugin || plugin.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Plugin not found'
    });
  }

  const deleted = await pluginService.deletePlugin(id, userId);

  res.json({
    success: true,
    data: { deleted }
  });
}));

/**
 * @route   POST /api/plugins/:id/publish
 * @desc    Publish plugin
 * @access  Private
 */
router.post('/:id/publish', requireOrg, requirePermission('plugins.publish'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const plugin = await pluginService.getPlugin(id);
  
  if (!plugin || plugin.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Plugin not found'
    });
  }

  const published = await pluginService.publishPlugin(id, userId);

  res.json({
    success: true,
    data: published
  });
}));

// ─── Plugin Versions ───────────────────────────────────────────────────────────

/**
 * @route   GET /api/plugins/:id/versions
 * @desc    Get plugin versions
 * @access  Private
 */
router.get('/:id/versions', requireOrg, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.org.id;

  const plugin = await pluginService.getPlugin(id);
  
  if (!plugin || plugin.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Plugin not found'
    });
  }

  const versions = await pluginService.getPluginVersions(id);

  res.json({
    success: true,
    data: versions
  });
}));

// ─── Plugin Installation ───────────────────────────────────────────────────────

/**
 * @route   POST /api/plugins/install
 * @desc    Install plugin
 * @access  Private
 */
router.post('/install', requireOrg, requirePermission('plugins.install'), asyncHandler(async (req, res) => {
  const organizationId = req.org.id;
  const userId = req.auth.userId;
  const { pluginId, configuration = {} } = req.body;

  const installation = await pluginService.installPlugin(
    pluginId,
    organizationId,
    userId,
    configuration
  );

  res.status(201).json({
    success: true,
    data: installation
  });
}));

/**
 * @route   POST /api/plugins/:installationId/enable
 * @desc    Enable plugin
 * @access  Private
 */
router.post('/:installationId/enable', requireOrg, requirePermission('plugins.manage'), asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const updated = await pluginService.enablePlugin(installationId, userId);

  res.json({
    success: true,
    data: updated
  });
}));

/**
 * @route   POST /api/plugins/:installationId/disable
 * @desc    Disable plugin
 * @access  Private
 */
router.post('/:installationId/disable', requireOrg, requirePermission('plugins.manage'), asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const updated = await pluginService.disablePlugin(installationId, userId);

  res.json({
    success: true,
    data: updated
  });
}));

/**
 * @route   DELETE /api/plugins/:installationId/uninstall
 * @desc    Uninstall plugin
 * @access  Private
 */
router.delete('/:installationId/uninstall', requireOrg, requirePermission('plugins.manage'), asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const deleted = await pluginService.uninstallPlugin(installationId, userId);

  res.json({
    success: true,
    data: { deleted }
  });
}));

/**
 * @route   POST /api/plugins/:installationId/upgrade
 * @desc    Upgrade plugin to specific version
 * @access  Private
 */
router.post('/:installationId/upgrade', requireOrg, requirePermission('plugins.manage'), asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;
  const { targetVersion } = req.body;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const updated = await pluginService.upgradePlugin(installationId, targetVersion, userId);

  res.json({
    success: true,
    data: updated
  });
}));

// ─── Plugin Configuration ──────────────────────────────────────────────────────

/**
 * @route   GET /api/plugins/:installationId/configuration
 * @desc    Get plugin configuration
 * @access  Private
 */
router.get('/:installationId/configuration', requireOrg, asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;
  const { configKey } = req.query;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const config = await pluginService.getPluginConfiguration(installationId, configKey);

  res.json({
    success: true,
    data: config
  });
}));

/**
 * @route   PUT /api/plugins/:installationId/configuration
 * @desc    Update plugin configuration
 * @access  Private
 */
router.put('/:installationId/configuration', requireOrg, requirePermission('plugins.configure'), asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;
  const { configKey, configValue, isSensitive = false } = req.body;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const config = await pluginService.updatePluginConfiguration(
    installationId,
    configKey,
    configValue,
    userId,
    isSensitive
  );

  res.json({
    success: true,
    data: config
  });
}));

// ─── Plugin Permissions ────────────────────────────────────────────────────────

/**
 * @route   GET /api/plugins/:installationId/permissions
 * @desc    Get plugin permissions
 * @access  Private
 */
router.get('/:installationId/permissions', requireOrg, asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const permissions = await pluginService.getPluginPermissions(installationId);

  res.json({
    success: true,
    data: permissions
  });
}));

/**
 * @route   PUT /api/plugins/permissions/:permissionId
 * @desc    Update plugin permission
 * @access  Private
 */
router.put('/permissions/:permissionId', requireOrg, requirePermission('plugins.configure'), asyncHandler(async (req, res) => {
  const { permissionId } = req.params;
  const organizationId = req.org.id;
  const userId = req.auth.userId;
  const { granted } = req.body;

  const permission = await pluginService.updatePluginPermission(permissionId, { granted }, userId);

  res.json({
    success: true,
    data: permission
  });
}));

// ─── Plugin Health ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/plugins/health
 * @desc    Get plugin health for organization
 * @access  Private
 */
router.get('/health/organization', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;

  const health = await pluginService.getPluginHealth(organizationId);

  res.json({
    success: true,
    data: health
  });
}));

/**
 * @route   POST /api/plugins/:installationId/health/check
 * @desc    Check plugin health
 * @access  Private
 */
router.post('/:installationId/health/check', requireOrg, asyncHandler(async (req, res) => {
  const { installationId } = req.params;
  const organizationId = req.org.id;

  const installation = await pluginService.getInstallation(installationId);
  
  if (!installation || installation.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Installation not found'
    });
  }

  const health = await pluginService.checkPluginHealth(installationId);

  res.json({
    success: true,
    data: health
  });
}));

// ─── Plugin Events ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/plugins/events
 * @desc    Get plugin events for organization
 * @access  Private
 */
router.get('/events/organization', requireOrg, asyncHandler(async (req, res) => {
  const organizationId = req.org.id;
  const { level, pluginId, limit = 50 } = req.query;

  const events = await pluginService.getPluginEvents(organizationId, {
    level,
    pluginId,
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    data: events
  });
}));

/**
 * @route   GET /api/plugins/:pluginId/events
 * @desc    Get events for specific plugin
 * @access  Private
 */
router.get('/:pluginId/events', requireOrg, asyncHandler(async (req, res) => {
  const { pluginId } = req.params;
  const organizationId = req.org.id;
  const { level, installationId, limit = 50 } = req.query;

  const plugin = await pluginService.getPlugin(pluginId);
  
  if (!plugin || plugin.organizationId !== organizationId) {
    return res.status(404).json({
      success: false,
      error: 'Plugin not found'
    });
  }

  const events = await pluginService.getPluginEvents(organizationId, {
    pluginId,
    level,
    installationId,
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    data: events
  });
}));

// ─── SDK Information ───────────────────────────────────────────────────────────

/**
 * @route   GET /api/plugins/sdk
 * @desc    Get plugin SDK information
 * @access  Private
 */
router.get('/sdk/info', requireOrg, asyncHandler(async (req, res) => {
  const sdkInfo = {
    version: '1.0.0',
    apis: [
      { name: 'config', description: 'Plugin configuration management' },
      { name: 'storage', description: 'Key-value storage for plugins' },
      { name: 'ai', description: 'AI capability execution' },
      { name: 'workers', description: 'Worker execution and management' },
      { name: 'agents', description: 'Agent execution and management' },
      { name: 'workflows', description: 'Workflow execution and management' },
      { name: 'dashboard', description: 'Dashboard widget registration' },
      { name: 'events', description: 'Event publishing and subscription' },
      { name: 'search', description: 'Search capabilities' },
      { name: 'knowledge', description: 'Knowledge base operations' },
      { name: 'documents', description: 'Document processing' },
      { name: 'notifications', description: 'Notification sending' },
      { name: 'logging', description: 'Structured logging' },
      { name: 'settings', description: 'Settings access' },
      { name: 'auth', description: 'Authentication context' },
      { name: 'rbac', description: 'Role-based access control' },
      { name: 'organization', description: 'Organization context' }
    ],
    lifecycle: [
      'install',
      'enable',
      'disable',
      'configure',
      'upgrade',
      'downgrade',
      'reload',
      'restart',
      'uninstall',
      'archive',
      'delete',
      'rollback',
      'healthCheck'
    ],
    permissions: [
      'read_settings',
      'write_settings',
      'read_ai',
      'execute_ai',
      'read_workers',
      'execute_workers',
      'read_agents',
      'execute_agents',
      'read_files',
      'write_files',
      'read_knowledge',
      'write_knowledge',
      'read_crm',
      'write_crm',
      'external_network',
      'webhooks',
      'secrets',
      'marketplace'
    ]
  };

  res.json({
    success: true,
    data: sdkInfo
  });
}));

// ─── Dependency Injection ──────────────────────────────────────────────────────

module.exports = (dependencies) => {
  db = dependencies.db;
  pluginService = dependencies.pluginService;
  permissionService = dependencies.permissionService;
  return router;
};