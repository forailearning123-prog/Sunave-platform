// Plugin Service
// Business logic layer for plugin platform

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { PluginManifest, PluginDependency, EventBus, HealthStatus, InstallationStatus } = require('packages/types/plugins');

class PluginService {
  constructor(db, permissionService, configurationService, aiGatewayService) {
    this.db = db;
    this.permissionService = permissionService;
    this.configurationService = configurationService;
    this.aiGatewayService = aiGatewayService;
    this.repository = new (require('../repositories/pluginRepository'))(db);
    this.eventBus = new EventBus();
    this.loadedPlugins = new Map(); // pluginId -> plugin instance
    this.pluginCache = new Map(); // Cache for plugin data
  }

  // ─── Plugin Lifecycle ────────────────────────────────────────────────────────

  async createPlugin(organizationId, pluginData, userId) {
    // Validate manifest
    const manifest = new PluginManifest(pluginData);
    const validation = manifest.validate();
    if (!validation.valid) {
      throw new Error(`Invalid plugin manifest: ${validation.errors.join(', ')}`);
    }

    // Check for duplicate name
    const existing = await this.repository.findByName(manifest.name, organizationId);
    if (existing) {
      throw new Error(`Plugin with name "${manifest.name}" already exists`);
    }

    // Create plugin
    const plugin = await this.repository.create({
      ...pluginData,
      organizationId,
      status: 'draft'
    });

    // Create initial version
    await this.repository.createVersion({
      pluginId: plugin.id,
      version: plugin.version,
      manifest: manifest.toJSON(),
      isCurrent: true
    });

    // Emit event
    await this.emitEvent('plugin.created', {
      pluginId: plugin.id,
      pluginName: plugin.name,
      version: plugin.version
    }, organizationId, userId);

    return plugin;
  }

  async updatePlugin(pluginId, updates, userId) {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Prevent updates to published plugins
    if (plugin.status === 'published') {
      throw new Error('Cannot update published plugin. Create a new version instead.');
    }

    const updated = await this.repository.update(pluginId, updates);

    // Emit event
    await this.emitEvent('plugin.updated', {
      pluginId: plugin.id,
      changes: Object.keys(updates)
    }, plugin.organizationId, userId);

    return updated;
  }

  async publishPlugin(pluginId, userId) {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    if (plugin.status === 'published') {
      throw new Error('Plugin is already published');
    }

    // Validate manifest
    const manifest = new PluginManifest(plugin);
    const validation = manifest.validate();
    if (!validation.valid) {
      throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
    }

    // Update status
    const updated = await this.repository.update(pluginId, {
      status: 'published'
    });

    // Create marketplace item
    await this.repository.createMarketplaceItem({
      pluginId: plugin.id,
      name: plugin.displayName,
      description: plugin.description,
      shortDescription: plugin.description.substring(0, 500),
      category: plugin.category,
      icon: plugin.icon,
      version: plugin.version,
      tags: [],
      dependencies: plugin.dependencies,
      compatibility: plugin.compatibility
    });

    // Emit event
    await this.emitEvent('plugin.published', {
      pluginId: plugin.id,
      pluginName: plugin.name,
      version: plugin.version
    }, plugin.organizationId, userId);

    return updated;
  }

  async deletePlugin(pluginId, userId) {
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Check for installations
    const installations = await this.repository.findInstallationsByOrganization(plugin.organizationId);
    const hasInstallations = installations.some(i => i.pluginId === pluginId);
    
    if (hasInstallations) {
      throw new Error('Cannot delete plugin with active installations');
    }

    const deleted = await this.repository.delete(pluginId);

    // Emit event
    await this.emitEvent('plugin.deleted', {
      pluginId: plugin.id,
      pluginName: plugin.name
    }, plugin.organizationId, userId);

    return deleted;
  }

  // ─── Plugin Installation ─────────────────────────────────────────────────────

  async installPlugin(pluginId, organizationId, userId, configuration = {}) {
    // Get plugin
    const plugin = await this.repository.findById(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Check if already installed
    const existing = await this.repository.findInstallationByPluginAndOrg(pluginId, organizationId);
    if (existing) {
      throw new Error('Plugin is already installed');
    }

    // Validate permissions
    await this.validatePluginPermissions(plugin, organizationId);

    // Resolve dependencies
    await this.resolveDependencies(plugin, organizationId);

    // Get current version
    const currentVersion = await this.repository.findCurrentVersion(pluginId);
    if (!currentVersion) {
      throw new Error('Plugin has no published version');
    }

    // Create installation
    const installation = await this.repository.createInstallation({
      pluginId,
      pluginVersionId: currentVersion.id,
      organizationId,
      installedBy: userId,
      status: InstallationStatus.INSTALLED,
      configuration
    });

    // Create permissions
    for (const permission of plugin.permissions) {
      await this.repository.createPermission({
        pluginId,
        installationId: installation.id,
        organizationId,
        permission: permission.name,
        description: permission.description,
        granted: true
      });
    }

    // Initialize health
    await this.repository.createOrUpdateHealth({
      pluginId,
      installationId: installation.id,
      organizationId,
      status: HealthStatus.HEALTHY
    });

    // Increment install count
    const marketplaceItem = await this.repository.findMarketplaceItems({ pluginId });
    if (marketplaceItem.length > 0) {
      await this.repository.incrementInstallCount(marketplaceItem[0].id);
    }

    // Emit event
    await this.emitEvent('plugin.installed', {
      pluginId: plugin.id,
      installationId: installation.id,
      pluginName: plugin.name,
      version: currentVersion.version
    }, organizationId, userId);

    return installation;
  }

  async enablePlugin(installationId, userId) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    if (installation.status === InstallationStatus.ENABLED) {
      throw new Error('Plugin is already enabled');
    }

    const updated = await this.repository.updateInstallation(installationId, {
      status: InstallationStatus.ENABLED,
      enabledAt: new Date().toISOString()
    });

    // Load plugin into runtime
    await this.loadPlugin(installationId);

    // Emit event
    await this.emitEvent('plugin.enabled', {
      installationId: installation.id,
      pluginId: installation.pluginId
    }, installation.organizationId, userId);

    return updated;
  }

  async disablePlugin(installationId, userId) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    if (installation.status === InstallationStatus.DISABLED) {
      throw new Error('Plugin is already disabled');
    }

    const updated = await this.repository.updateInstallation(installationId, {
      status: InstallationStatus.DISABLED,
      disabledAt: new Date().toISOString()
    });

    // Unload plugin from runtime
    await this.unloadPlugin(installationId);

    // Emit event
    await this.emitEvent('plugin.disabled', {
      installationId: installation.id,
      pluginId: installation.pluginId
    }, installation.organizationId, userId);

    return updated;
  }

  async uninstallPlugin(installationId, userId) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    // Unload plugin
    await this.unloadPlugin(installationId);

    // Delete installation
    const deleted = await this.repository.deleteInstallation(installationId);

    // Emit event
    await this.emitEvent('plugin.uninstalled', {
      installationId: installation.id,
      pluginId: installation.pluginId
    }, installation.organizationId, userId);

    return deleted;
  }

  async upgradePlugin(installationId, targetVersion, userId) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    // Get target version
    const plugin = await this.repository.findById(installation.pluginId);
    const versions = await this.repository.findVersionsByPlugin(installation.pluginId);
    const version = versions.find(v => v.version === targetVersion);
    
    if (!version) {
      throw new Error('Version not found');
    }

    // Update installation
    const updated = await this.repository.updateInstallation(installationId, {
      pluginVersionId: version.id,
      status: InstallationStatus.UPDATING
    });

    // Reload plugin
    await this.unloadPlugin(installationId);
    await this.loadPlugin(installationId);

    // Update status back to enabled
    await this.repository.updateInstallation(installationId, {
      status: InstallationStatus.ENABLED
    });

    // Emit event
    await this.emitEvent('plugin.upgraded', {
      installationId: installation.id,
      pluginId: installation.pluginId,
      version: targetVersion
    }, installation.organizationId, userId);

    return updated;
  }

  // ─── Plugin Configuration ────────────────────────────────────────────────────

  async updatePluginConfiguration(installationId, configKey, configValue, userId, isSensitive = false) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    // Encrypt sensitive values
    let finalValue = configValue;
    if (isSensitive && typeof configValue === 'string') {
      finalValue = await this.encryptValue(configValue);
    }

    const config = await this.repository.setConfiguration({
      pluginId: installation.pluginId,
      installationId,
      organizationId: installation.organizationId,
      configKey,
      configValue: finalValue,
      isSensitive,
      updatedBy: userId
    });

    // Emit event
    await this.emitEvent('plugin.configuration.updated', {
      installationId,
      pluginId: installation.pluginId,
      configKey
    }, installation.organizationId, userId);

    return config;
  }

  async getPluginConfiguration(installationId, configKey = null) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    if (configKey) {
      const config = await this.repository.findConfigurationByKey(installationId, configKey);
      if (!config) return null;
      
      // Decrypt sensitive values
      if (config.isSensitive) {
        config.configValue = await this.decryptValue(config.configValue);
      }
      return config;
    }

    const configs = await this.repository.findConfigurationsByInstallation(installationId);
    
    // Decrypt sensitive values
    for (const config of configs) {
      if (config.isSensitive) {
        config.configValue = await this.decryptValue(config.configValue);
      }
    }

    return configs;
  }

  // ─── Plugin Permissions ──────────────────────────────────────────────────────

  async updatePluginPermission(permissionId, updates, userId) {
    const permission = await this.repository.updatePermission(permissionId, updates);
    if (!permission) {
      throw new Error('Permission not found');
    }

    // Emit event
    await this.emitEvent('plugin.permission.updated', {
      permissionId: permission.id,
      pluginId: permission.pluginId,
      granted: updates.granted
    }, permission.organizationId, userId);

    return permission;
  }

  async getPluginPermissions(installationId) {
    return await this.repository.findPermissionsByInstallation(installationId);
  }

  // ─── Plugin Health ───────────────────────────────────────────────────────────

  async checkPluginHealth(installationId) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    const plugin = await this.repository.findById(installation.pluginId);
    
    // Perform health check
    let healthStatus = HealthStatus.HEALTHY;
    let errorMessage = null;
    let metrics = {};

    try {
      // Try to load plugin if not loaded
      if (!this.loadedPlugins.has(installationId)) {
        await this.loadPlugin(installationId);
      }

      // Get plugin instance
      const pluginInstance = this.loadedPlugins.get(installationId);
      
      // Call health check if plugin implements it
      if (pluginInstance && typeof pluginInstance.healthCheck === 'function') {
        const result = await pluginInstance.healthCheck();
        healthStatus = result.status || HealthStatus.HEALTHY;
        metrics = result.metrics || {};
        errorMessage = result.error;
      }
    } catch (error) {
      healthStatus = HealthStatus.UNHEALTHY;
      errorMessage = error.message;
    }

    // Update health record
    const health = await this.repository.createOrUpdateHealth({
      pluginId: installation.pluginId,
      installationId,
      organizationId: installation.organizationId,
      status: healthStatus,
      lastSuccessAt: healthStatus === HealthStatus.HEALTHY ? new Date().toISOString() : null,
      lastErrorAt: healthStatus !== HealthStatus.HEALTHY ? new Date().toISOString() : null,
      lastErrorMessage: errorMessage,
      metrics,
      checkCount: 1,
      errorCount: healthStatus !== HealthStatus.HEALTHY ? 1 : 0
    });

    // Update installation
    await this.repository.updateInstallation(installationId, {
      lastHealthCheck: new Date().toISOString()
    });

    return health;
  }

  async getPluginHealth(organizationId) {
    return await this.repository.findHealthByOrganization(organizationId);
  }

  // ─── Plugin Events ───────────────────────────────────────────────────────────

  async emitEvent(eventType, eventData, organizationId, triggeredBy = null, pluginId = null, installationId = null) {
    const event = await this.repository.createEvent({
      pluginId,
      installationId,
      organizationId,
      eventType,
      eventData,
      level: 'info',
      triggeredBy
    });

    // Emit to event bus
    this.eventBus.emit(eventType, eventData, pluginId);

    return event;
  }

  async getPluginEvents(organizationId, filters = {}) {
    return await this.repository.findEventsByOrganization(organizationId, filters);
  }

  onEvent(eventType, callback, pluginId = null) {
    this.eventBus.on(eventType, callback, pluginId);
  }

  offEvent(eventType, callback, pluginId = null) {
    this.eventBus.off(eventType, callback, pluginId);
  }

  // ─── Plugin Runtime ──────────────────────────────────────────────────────────

  async loadPlugin(installationId) {
    const installation = await this.repository.findInstallationById(installationId);
    if (!installation) {
      throw new Error('Installation not found');
    }

    const plugin = await this.repository.findById(installation.pluginId);
    const version = await this.repository.findVersionById(installation.pluginVersionId);
    
    if (!plugin || !version) {
      throw new Error('Plugin or version not found');
    }

    // Create plugin context
    const context = {
      pluginId: plugin.id,
      installationId,
      organizationId: installation.organizationId,
      config: installation.configuration,
      runtime: this.createRuntimeContext(installationId),
      sdk: null // Will be set after SDK creation
    };

    // Create SDK
    const sdk = new PluginManifest({ ...plugin, sdk: null }).constructor.sdk || 
                this.createSDK(context);
    context.sdk = sdk;

    // Load plugin implementation (in real scenario, this would load from entry point)
    // For now, we'll create a mock plugin instance
    const pluginInstance = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      context,
      sdk,
      
      async initialize() {
        // Plugin initialization logic
        return true;
      },
      
      async healthCheck() {
        return {
          status: HealthStatus.HEALTHY,
          metrics: {
            uptime: process.uptime(),
            memory: process.memoryUsage()
          }
        };
      },
      
      async shutdown() {
        // Plugin cleanup logic
        return true;
      }
    };

    // Initialize plugin
    await pluginInstance.initialize();

    // Store in runtime
    this.loadedPlugins.set(installationId, pluginInstance);

    return pluginInstance;
  }

  async unloadPlugin(installationId) {
    const pluginInstance = this.loadedPlugins.get(installationId);
    if (!pluginInstance) {
      return false;
    }

    // Shutdown plugin
    if (typeof pluginInstance.shutdown === 'function') {
      await pluginInstance.shutdown();
    }

    // Remove from runtime
    this.loadedPlugins.delete(installationId);

    return true;
  }

  createRuntimeContext(installationId) {
    return {
      getConfig: async (pluginId, key, defaultValue) => {
        const config = await this.repository.findConfigurationByKey(installationId, key);
        return config ? config.configValue : defaultValue;
      },
      
      setConfig: async (pluginId, key, value) => {
        // Implementation
        return true;
      },
      
      getAllConfig: async (pluginId) => {
        const configs = await this.repository.findConfigurationsByInstallation(installationId);
        return configs.reduce((acc, config) => {
          acc[config.configKey] = config.configValue;
          return acc;
        }, {});
      },
      
      deleteConfig: async (pluginId, key) => {
        // Implementation
        return true;
      },
      
      // Stub implementations for other APIs
      storageGet: async () => null,
      storageSet: async () => true,
      storageDelete: async () => true,
      storageList: async () => [],
      executeAI: async () => ({}),
      executeWorker: async () => ({}),
      getWorker: async () => null,
      listWorkers: async () => [],
      executeAgent: async () => ({}),
      getAgent: async () => null,
      listAgents: async () => [],
      executeWorkflow: async () => ({}),
      getWorkflow: async () => null,
      listWorkflows: async () => [],
      registerWidget: () => true,
      unregisterWidget: () => true,
      getWidgets: () => [],
      emitEvent: () => true,
      onEvent: () => true,
      offEvent: () => true,
      search: async () => [],
      knowledgeIndex: async () => true,
      knowledgeRetrieve: async () => [],
      processDocument: async () => ({}),
      chunkDocument: async () => [],
      sendNotification: async () => true,
      broadcastNotification: async () => true,
      log: () => true,
      getSetting: async () => null,
      setSetting: async () => true,
      getCurrentUser: async () => ({}),
      getOrganization: async () => ({}),
      hasPermission: async () => true,
      requirePermission: async () => true,
      getOrganizationMembers: async () => [],
      getOrganizationTeams: async () => []
    };
  }

  createSDK(context) {
    return new PluginManifest({ sdk: null }).constructor.sdk || 
           require('packages/types/plugins').PluginSDK;
  }

  // ─── Marketplace ─────────────────────────────────────────────────────────────

  async getMarketplaceItems(filters = {}) {
    return await this.repository.findMarketplaceItems(filters);
  }

  async getMarketplaceItem(id) {
    return await this.repository.findMarketplaceItemById(id);
  }

  async createMarketplaceReview(marketplaceItemId, userId, organizationId, rating, review) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const marketplaceReview = await this.repository.createReview({
      marketplaceItemId,
      userId,
      organizationId,
      rating,
      review
    });

    // Update marketplace item rating
    const reviews = await this.repository.findReviewsByMarketplaceItem(marketplaceItemId);
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await this.repository.updateMarketplaceItem(marketplaceItemId, {
      ratingAverage: Math.round(avgRating * 100) / 100,
      ratingCount: reviews.length
    });

    return marketplaceReview;
  }

  async getMarketplaceReviews(marketplaceItemId) {
    return await this.repository.findReviewsByMarketplaceItem(marketplaceItemId);
  }

  // ─── Integrations ────────────────────────────────────────────────────────────

  async createIntegration(organizationId, integrationData, userId) {
    // Integration creation logic
    // This would be expanded with full integration management
    return {
      id: uuidv4(),
      organizationId,
      ...integrationData,
      createdBy: userId,
      createdAt: new Date().toISOString()
    };
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  async validatePluginPermissions(plugin, organizationId) {
    // Validate that the organization has granted necessary permissions
    for (const permission of plugin.permissions) {
      const hasPermission = await this.permissionService.hasPermission(
        permission.name,
        organizationId
      );
      
      if (!hasPermission && !permission.optional) {
        throw new Error(`Required permission not granted: ${permission.name}`);
      }
    }
  }

  async resolveDependencies(plugin, organizationId) {
    const dependencies = await this.repository.findDependenciesByPlugin(plugin.id);
    
    for (const dep of dependencies) {
      // Check if dependency is installed
      const depInstallation = await this.repository.findInstallationByPluginAndOrg(
        dep.dependsOnPluginId,
        organizationId
      );

      if (!depInstallation && !dep.isOptional) {
        throw new Error(`Required dependency not installed: ${dep.dependsOnName}`);
      }

      if (depInstallation) {
        // Validate version constraint
        const depPlugin = await this.repository.findById(dep.dependsOnPluginId);
        const currentVersion = await this.repository.findCurrentVersion(dep.dependsOnPluginId);
        
        if (currentVersion && !dep.satisfiesVersion(currentVersion.version)) {
          throw new Error(
            `Dependency version mismatch: ${dep.dependsOnName} ` +
            `requires ${dep.versionConstraint} but ${currentVersion.version} is installed`
          );
        }
      }
    }
  }

  async encryptValue(value) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.PLUGIN_ENCRYPTION_KEY || 'dev-key-change-in-production',
      'salt',
      32
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  async decryptValue(encryptedData) {
    if (typeof encryptedData === 'string') {
      return encryptedData; // Not encrypted
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.PLUGIN_ENCRYPTION_KEY || 'dev-key-change-in-production',
      'salt',
      32
    );
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // ─── Plugin Queries ──────────────────────────────────────────────────────────

  async getPlugin(pluginId) {
    return await this.repository.findById(pluginId);
  }

  async getPluginsByOrganization(organizationId, filters = {}) {
    return await this.repository.findByOrganization(organizationId, filters);
  }

  async getInstallation(installationId) {
    return await this.repository.findInstallationById(installationId);
  }

  async getInstallationsByOrganization(organizationId, filters = {}) {
    return await this.repository.findInstallationsByOrganization(organizationId, filters);
  }

  async getPluginVersions(pluginId) {
    return await this.repository.findVersionsByPlugin(pluginId);
  }
}

module.exports = PluginService;