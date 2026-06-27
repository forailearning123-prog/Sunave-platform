// Plugin Platform Type Definitions
// Epic 5: Plugin SDK & Integration Platform

// ─── Enums ─────────────────────────────────────────────────────────────────────

const PluginStatus = {
  DRAFT: 'draft',
  TESTING: 'testing',
  PUBLISHED: 'published',
  DEPRECATED: 'deprecated',
  ARCHIVED: 'archived'
};

const PluginCategory = {
  BUSINESS: 'business',
  AI: 'ai',
  WORKER: 'worker',
  AGENT: 'agent',
  DASHBOARD: 'dashboard',
  INTEGRATION: 'integration',
  AUTOMATION: 'automation',
  KNOWLEDGE: 'knowledge',
  DOCUMENT: 'document',
  ANALYTICS: 'analytics',
  VOICE: 'voice',
  COMMUNICATION: 'communication',
  DEVELOPER: 'developer',
  SECURITY: 'security',
  MARKETPLACE: 'marketplace',
  CUSTOM: 'custom'
};

const InstallationStatus = {
  INSTALLED: 'installed',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ERROR: 'error',
  UPDATING: 'updating',
  ARCHIVED: 'archived'
};

const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  ERROR: 'error',
  UNKNOWN: 'unknown'
};

const IntegrationProvider = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  AZURE_DEVOPS: 'azure_devops',
  JIRA: 'jira',
  CONFLUENCE: 'confluence',
  SLACK: 'slack',
  MICROSOFT_TEAMS: 'microsoft_teams',
  GOOGLE_WORKSPACE: 'google_workspace',
  MICROSOFT_365: 'microsoft_365',
  OUTLOOK: 'outlook',
  GMAIL: 'gmail',
  SAP: 'sap',
  SALESFORCE: 'salesforce',
  HUBSPOT: 'hubspot',
  SERVICENOW: 'servicenow',
  TWILIO: 'twilio',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram',
  DISCORD: 'discord',
  CUSTOM: 'custom'
};

const IntegrationType = {
  REST: 'rest',
  GRAPHQL: 'graphql',
  WEBHOOK: 'webhook',
  GRPC: 'grpc',
  SOAP: 'soap'
};

const AuthType = {
  OAUTH2: 'oauth2',
  API_KEY: 'api_key',
  JWT: 'jwt',
  BASIC: 'basic',
  NONE: 'none'
};

const EventLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// ─── Core Classes ──────────────────────────────────────────────────────────────

class PluginManifest {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.displayName = data.displayName || data.name || '';
    this.description = data.description || '';
    this.author = data.author || '';
    this.organization = data.organization || '';
    this.version = data.version || '1.0.0';
    this.category = data.category || PluginCategory.CUSTOM;
    this.license = data.license || 'MIT';
    this.homepage = data.homepage || null;
    this.repository = data.repository || null;
    this.documentation = data.documentation || null;
    this.icon = data.icon || 'puzzle';
    this.banner = data.banner || null;
    this.status = data.status || PluginStatus.DRAFT;
    this.compatibility = data.compatibility || {};
    this.minimumPlatformVersion = data.minimumPlatformVersion || '1.0.0';
    this.permissions = data.permissions || [];
    this.dependencies = data.dependencies || [];
    this.peerDependencies = data.peerDependencies || [];
    this.requiredCapabilities = data.requiredCapabilities || [];
    this.requiredWorkers = data.requiredWorkers || [];
    this.requiredAgents = data.requiredAgents || [];
    this.requiredSettings = data.requiredSettings || [];
    this.configurationSchema = data.configurationSchema || {};
    this.entryPoint = data.entryPoint || '';
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim() === '') {
      errors.push('Plugin name is required');
    }
    
    if (!this.displayName || this.displayName.trim() === '') {
      errors.push('Plugin display name is required');
    }
    
    if (!this.version || !this.isValidVersion(this.version)) {
      errors.push('Valid version is required (semver)');
    }
    
    if (!this.entryPoint || this.entryPoint.trim() === '') {
      errors.push('Entry point is required');
    }
    
    if (!Object.values(PluginCategory).includes(this.category)) {
      errors.push('Invalid plugin category');
    }
    
    if (!Object.values(PluginStatus).includes(this.status)) {
      errors.push('Invalid plugin status');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  isValidVersion(version) {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
    return semverRegex.test(version);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      author: this.author,
      organization: this.organization,
      version: this.version,
      category: this.category,
      license: this.license,
      homepage: this.homepage,
      repository: this.repository,
      documentation: this.documentation,
      icon: this.icon,
      banner: this.banner,
      status: this.status,
      compatibility: this.compatibility,
      minimumPlatformVersion: this.minimumPlatformVersion,
      permissions: this.permissions,
      dependencies: this.dependencies,
      peerDependencies: this.peerDependencies,
      requiredCapabilities: this.requiredCapabilities,
      requiredWorkers: this.requiredWorkers,
      requiredAgents: this.requiredAgents,
      requiredSettings: this.requiredSettings,
      configurationSchema: this.configurationSchema,
      entryPoint: this.entryPoint,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class PluginDependency {
  constructor(data = {}) {
    this.pluginId = data.pluginId || null;
    this.dependsOnPluginId = data.dependsOnPluginId || null;
    this.versionConstraint = data.versionConstraint || '*';
    this.isOptional = data.isOptional || false;
    this.createdAt = data.createdAt || null;
  }

  satisfiesVersion(availableVersion) {
    // Simple semver constraint matching
    // Supports: *, exact, >=, <=, >, <, ^, ~
    if (this.versionConstraint === '*') return true;
    
    const constraint = this.versionConstraint.trim();
    
    // Exact match
    if (constraint === availableVersion) return true;
    
    // Range operators
    if (constraint.startsWith('>=')) {
      return this.compareVersions(availableVersion, constraint.slice(2)) >= 0;
    }
    if (constraint.startsWith('<=')) {
      return this.compareVersions(availableVersion, constraint.slice(2)) <= 0;
    }
    if (constraint.startsWith('>')) {
      return this.compareVersions(availableVersion, constraint.slice(1)) > 0;
    }
    if (constraint.startsWith('<')) {
      return this.compareVersions(availableVersion, constraint.slice(1)) < 0;
    }
    if (constraint.startsWith('^')) {
      const major = availableVersion.split('.')[0];
      const constraintMajor = constraint.slice(1).split('.')[0];
      return major === constraintMajor;
    }
    if (constraint.startsWith('~')) {
      const [major, minor] = availableVersion.split('.');
      const [cMajor, cMinor] = constraint.slice(1).split('.');
      return major === cMajor && minor === cMinor;
    }
    
    return false;
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      const diff = (parts1[i] || 0) - (parts2[i] || 0);
      if (diff !== 0) return diff;
    }
    
    return 0;
  }
}

class PluginPermission {
  constructor(data = {}) {
    this.id = data.id || null;
    this.pluginId = data.pluginId || null;
    this.installationId = data.installationId || null;
    this.organizationId = data.organizationId || null;
    this.permission = data.permission || '';
    this.description = data.description || '';
    this.granted = data.granted !== undefined ? data.granted : true;
    this.grantedBy = data.grantedBy || null;
    this.grantedAt = data.grantedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      pluginId: this.pluginId,
      installationId: this.installationId,
      organizationId: this.organizationId,
      permission: this.permission,
      description: this.description,
      granted: this.granted,
      grantedBy: this.grantedBy,
      grantedAt: this.grantedAt
    };
  }
}

class PluginConfiguration {
  constructor(data = {}) {
    this.id = data.id || null;
    this.pluginId = data.pluginId || null;
    this.installationId = data.installationId || null;
    this.organizationId = data.organizationId || null;
    this.configKey = data.configKey || '';
    this.configValue = data.configValue || {};
    this.isSensitive = data.isSensitive || false;
    this.updatedBy = data.updatedBy || null;
    this.updatedAt = data.updatedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      pluginId: this.pluginId,
      installationId: this.installationId,
      organizationId: this.organizationId,
      configKey: this.configKey,
      configValue: this.isSensitive ? '***REDACTED***' : this.configValue,
      isSensitive: this.isSensitive,
      updatedBy: this.updatedBy,
      updatedAt: this.updatedAt
    };
  }
}

class PluginHealth {
  constructor(data = {}) {
    this.id = data.id || null;
    this.pluginId = data.pluginId || null;
    this.installationId = data.installationId || null;
    this.organizationId = data.organizationId || null;
    this.status = data.status || HealthStatus.UNKNOWN;
    this.lastCheckAt = data.lastCheckAt || null;
    this.lastSuccessAt = data.lastSuccessAt || null;
    this.lastErrorAt = data.lastErrorAt || null;
    this.lastErrorMessage = data.lastErrorMessage || null;
    this.metrics = data.metrics || {};
    this.uptimePercentage = data.uptimePercentage || 100.0;
    this.checkCount = data.checkCount || 0;
    this.errorCount = data.errorCount || 0;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  getHealthScore() {
    if (this.checkCount === 0) return 100;
    const successRate = ((this.checkCount - this.errorCount) / this.checkCount) * 100;
    return Math.round(successRate * 100) / 100;
  }

  toJSON() {
    return {
      id: this.id,
      pluginId: this.pluginId,
      installationId: this.installationId,
      organizationId: this.organizationId,
      status: this.status,
      lastCheckAt: this.lastCheckAt,
      lastSuccessAt: this.lastSuccessAt,
      lastErrorAt: this.lastErrorAt,
      lastErrorMessage: this.lastErrorMessage,
      metrics: this.metrics,
      uptimePercentage: this.uptimePercentage,
      checkCount: this.checkCount,
      errorCount: this.errorCount,
      healthScore: this.getHealthScore(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class PluginEvent {
  constructor(data = {}) {
    this.id = data.id || null;
    this.pluginId = data.pluginId || null;
    this.installationId = data.installationId || null;
    this.organizationId = data.organizationId || null;
    this.eventType = data.eventType || '';
    this.eventData = data.eventData || {};
    this.level = data.level || EventLevel.INFO;
    this.message = data.message || '';
    this.triggeredBy = data.triggeredBy || null;
    this.createdAt = data.createdAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      pluginId: this.pluginId,
      installationId: this.installationId,
      organizationId: this.organizationId,
      eventType: this.eventType,
      eventData: this.eventData,
      level: this.level,
      message: this.message,
      triggeredBy: this.triggeredBy,
      createdAt: this.createdAt
    };
  }
}

class Integration {
  constructor(data = {}) {
    this.id = data.id || null;
    this.organizationId = data.organizationId || null;
    this.pluginId = data.pluginId || null;
    this.name = data.name || '';
    this.displayName = data.displayName || data.name || '';
    this.description = data.description || '';
    this.provider = data.provider || IntegrationProvider.CUSTOM;
    this.integrationType = data.integrationType || IntegrationType.REST;
    this.authType = data.authType || AuthType.API_KEY;
    this.configuration = data.configuration || {};
    this.status = data.status || 'inactive';
    this.isEnabled = data.isEnabled || false;
    this.lastSyncAt = data.lastSyncAt || null;
    this.lastErrorAt = data.lastErrorAt || null;
    this.lastErrorMessage = data.lastErrorMessage || null;
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      organizationId: this.organizationId,
      pluginId: this.pluginId,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      provider: this.provider,
      integrationType: this.integrationType,
      authType: this.authType,
      configuration: this.configuration,
      status: this.status,
      isEnabled: this.isEnabled,
      lastSyncAt: this.lastSyncAt,
      lastErrorAt: this.lastErrorAt,
      lastErrorMessage: this.lastErrorMessage,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class IntegrationCredential {
  constructor(data = {}) {
    this.id = data.id || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.credentialType = data.credentialType || AuthType.API_KEY;
    this.encryptedValue = data.encryptedValue || '';
    this.iv = data.iv || '';
    this.authTag = data.authTag || '';
    this.expiresAt = data.expiresAt || null;
    this.lastUsedAt = data.lastUsedAt || null;
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      integrationId: this.integrationId,
      organizationId: this.organizationId,
      credentialType: this.credentialType,
      encryptedValue: '***REDACTED***',
      iv: '***REDACTED***',
      authTag: '***REDACTED***',
      expiresAt: this.expiresAt,
      lastUsedAt: this.lastUsedAt,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class IntegrationHealth {
  constructor(data = {}) {
    this.id = data.id || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.status = data.status || HealthStatus.UNKNOWN;
    this.lastCheckAt = data.lastCheckAt || null;
    this.lastSuccessAt = data.lastSuccessAt || null;
    this.lastErrorAt = data.lastErrorAt || null;
    this.lastErrorMessage = data.lastErrorMessage || null;
    this.responseTimeMs = data.responseTimeMs || null;
    this.metrics = data.metrics || {};
    this.checkCount = data.checkCount || 0;
    this.errorCount = data.errorCount || 0;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  getHealthScore() {
    if (this.checkCount === 0) return 100;
    const successRate = ((this.checkCount - this.errorCount) / this.checkCount) * 100;
    return Math.round(successRate * 100) / 100;
  }

  toJSON() {
    return {
      id: this.id,
      integrationId: this.integrationId,
      organizationId: this.organizationId,
      status: this.status,
      lastCheckAt: this.lastCheckAt,
      lastSuccessAt: this.lastSuccessAt,
      lastErrorAt: this.lastErrorAt,
      lastErrorMessage: this.lastErrorMessage,
      responseTimeMs: this.responseTimeMs,
      metrics: this.metrics,
      checkCount: this.checkCount,
      errorCount: this.errorCount,
      healthScore: this.getHealthScore(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ─── SDK API Interfaces ─────────────────────────────────────────────────────────

class PluginSDK {
  constructor(context) {
    this.context = context;
    this.config = new PluginConfigAPI(context);
    this.storage = new PluginStorageAPI(context);
    this.ai = new PluginAIAPI(context);
    this.workers = new PluginWorkerAPI(context);
    this.agents = new PluginAgentAPI(context);
    this.workflows = new PluginWorkflowAPI(context);
    this.dashboard = new PluginDashboardAPI(context);
    this.events = new PluginEventAPI(context);
    this.search = new PluginSearchAPI(context);
    this.knowledge = new PluginKnowledgeAPI(context);
    this.documents = new PluginDocumentAPI(context);
    this.notifications = new PluginNotificationAPI(context);
    this.logging = new PluginLoggingAPI(context);
    this.settings = new PluginSettingsAPI(context);
    this.auth = new PluginAuthAPI(context);
    this.rbac = new PluginRBACAPI(context);
    this.organization = new PluginOrganizationAPI(context);
  }
}

class PluginConfigAPI {
  constructor(context) {
    this.context = context;
  }

  get(key, defaultValue = null) {
    // Implementation will be provided by runtime
    return this.context.runtime.getConfig(this.context.pluginId, key, defaultValue);
  }

  set(key, value) {
    return this.context.runtime.setConfig(this.context.pluginId, key, value);
  }

  getAll() {
    return this.context.runtime.getAllConfig(this.context.pluginId);
  }

  delete(key) {
    return this.context.runtime.deleteConfig(this.context.pluginId, key);
  }
}

class PluginStorageAPI {
  constructor(context) {
    this.context = context;
  }

  async get(key) {
    return this.context.runtime.storageGet(this.context.pluginId, key);
  }

  async set(key, value, ttl = null) {
    return this.context.runtime.storageSet(this.context.pluginId, key, value, ttl);
  }

  async delete(key) {
    return this.context.runtime.storageDelete(this.context.pluginId, key);
  }

  async list(prefix = '') {
    return this.context.runtime.storageList(this.context.pluginId, prefix);
  }
}

class PluginAIAPI {
  constructor(context) {
    this.context = context;
  }

  async execute(capability, params = {}) {
    return this.context.runtime.executeAI(this.context.pluginId, capability, params);
  }

  async chat(messages, options = {}) {
    return this.context.runtime.executeAI(this.context.pluginId, 'chat', { messages, ...options });
  }

  async embed(text) {
    return this.context.runtime.executeAI(this.context.pluginId, 'embed', { text });
  }
}

class PluginWorkerAPI {
  constructor(context) {
    this.context = context;
  }

  async execute(workerId, inputs = {}) {
    return this.context.runtime.executeWorker(this.context.pluginId, workerId, inputs);
  }

  async getWorker(workerId) {
    return this.context.runtime.getWorker(this.context.pluginId, workerId);
  }

  async listWorkers(filter = {}) {
    return this.context.runtime.listWorkers(this.context.pluginId, filter);
  }
}

class PluginAgentAPI {
  constructor(context) {
    this.context = context;
  }

  async execute(agentId, inputs = {}) {
    return this.context.runtime.executeAgent(this.context.pluginId, agentId, inputs);
  }

  async getAgent(agentId) {
    return this.context.runtime.getAgent(this.context.pluginId, agentId);
  }

  async listAgents(filter = {}) {
    return this.context.runtime.listAgents(this.context.pluginId, filter);
  }
}

class PluginWorkflowAPI {
  constructor(context) {
    this.context = context;
  }

  async execute(workflowId, inputs = {}) {
    return this.context.runtime.executeWorkflow(this.context.pluginId, workflowId, inputs);
  }

  async getWorkflow(workflowId) {
    return this.context.runtime.getWorkflow(this.context.pluginId, workflowId);
  }

  async listWorkflows(filter = {}) {
    return this.context.runtime.listWorkflows(this.context.pluginId, filter);
  }
}

class PluginDashboardAPI {
  constructor(context) {
    this.context = context;
  }

  registerWidget(widget) {
    return this.context.runtime.registerWidget(this.context.pluginId, widget);
  }

  unregisterWidget(widgetId) {
    return this.context.runtime.unregisterWidget(this.context.pluginId, widgetId);
  }

  getWidgets() {
    return this.context.runtime.getWidgets(this.context.pluginId);
  }
}

class PluginEventAPI {
  constructor(context) {
    this.context = context;
  }

  emit(eventType, data = {}) {
    return this.context.runtime.emitEvent(this.context.pluginId, eventType, data);
  }

  on(eventType, callback) {
    return this.context.runtime.onEvent(this.context.pluginId, eventType, callback);
  }

  off(eventType, callback) {
    return this.context.runtime.offEvent(this.context.pluginId, eventType, callback);
  }
}

class PluginSearchAPI {
  constructor(context) {
    this.context = context;
  }

  async search(query, options = {}) {
    return this.context.runtime.search(this.context.pluginId, query, options);
  }
}

class PluginKnowledgeAPI {
  constructor(context) {
    this.context = context;
  }

  async index(sourceId, content) {
    return this.context.runtime.knowledgeIndex(this.context.pluginId, sourceId, content);
  }

  async retrieve(query, options = {}) {
    return this.context.runtime.knowledgeRetrieve(this.context.pluginId, query, options);
  }
}

class PluginDocumentAPI {
  constructor(context) {
    this.context = context;
  }

  async process(documentId, options = {}) {
    return this.context.runtime.processDocument(this.context.pluginId, documentId, options);
  }

  async chunk(documentId, strategy = 'semantic') {
    return this.context.runtime.chunkDocument(this.context.pluginId, documentId, strategy);
  }
}

class PluginNotificationAPI {
  constructor(context) {
    this.context = context;
  }

  async send(userId, message, channel = 'in_app') {
    return this.context.runtime.sendNotification(this.context.pluginId, userId, message, channel);
  }

  async broadcast(message, audience = {}) {
    return this.context.runtime.broadcastNotification(this.context.pluginId, message, audience);
  }
}

class PluginLoggingAPI {
  constructor(context) {
    this.context = context;
  }

  debug(message, data = {}) {
    return this.context.runtime.log(this.context.pluginId, 'debug', message, data);
  }

  info(message, data = {}) {
    return this.context.runtime.log(this.context.pluginId, 'info', message, data);
  }

  warn(message, data = {}) {
    return this.context.runtime.log(this.context.pluginId, 'warning', message, data);
  }

  error(message, data = {}) {
    return this.context.runtime.log(this.context.pluginId, 'error', message, data);
  }

  critical(message, data = {}) {
    return this.context.runtime.log(this.context.pluginId, 'critical', message, data);
  }
}

class PluginSettingsAPI {
  constructor(context) {
    this.context = context;
  }

  async get(key, defaultValue = null) {
    return this.context.runtime.getSetting(this.context.pluginId, key, defaultValue);
  }

  async set(key, value) {
    return this.context.runtime.setSetting(this.context.pluginId, key, value);
  }
}

class PluginAuthAPI {
  constructor(context) {
    this.context = context;
  }

  async getCurrentUser() {
    return this.context.runtime.getCurrentUser(this.context.pluginId);
  }

  async getOrganization() {
    return this.context.runtime.getOrganization(this.context.pluginId);
  }
}

class PluginRBACAPI {
  constructor(context) {
    this.context = context;
  }

  async hasPermission(permission) {
    return this.context.runtime.hasPermission(this.context.pluginId, permission);
  }

  async requirePermission(permission) {
    return this.context.runtime.requirePermission(this.context.pluginId, permission);
  }
}

class PluginOrganizationAPI {
  constructor(context) {
    this.context = context;
  }

  async getMembers() {
    return this.context.runtime.getOrganizationMembers(this.context.pluginId);
  }

  async getTeams() {
    return this.context.runtime.getOrganizationTeams(this.context.pluginId);
  }
}

// ─── Event Bus Types ────────────────────────────────────────────────────────────

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.middleware = [];
  }

  on(eventType, callback, pluginId = null) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push({ callback, pluginId });
  }

  off(eventType, callback, pluginId = null) {
    if (!this.listeners.has(eventType)) return;
    
    const listeners = this.listeners.get(eventType);
    const index = listeners.findIndex(
      l => l.callback === callback && l.pluginId === pluginId
    );
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  emit(eventType, data = {}, sourcePluginId = null) {
    const event = {
      type: eventType,
      data,
      sourcePluginId,
      timestamp: new Date().toISOString()
    };

    // Run middleware
    for (const middleware of this.middleware) {
      const result = middleware(event);
      if (result === false) return; // Middleware blocked the event
    }

    // Notify listeners
    if (this.listeners.has(eventType)) {
      for (const { callback, pluginId } of this.listeners.get(eventType)) {
        // Don't send event back to source plugin
        if (pluginId && pluginId === sourcePluginId) continue;
        
        try {
          callback(event);
        } catch (error) {
          console.error(`Event listener error for ${eventType}:`, error);
        }
      }
    }
  }

  use(middleware) {
    this.middleware.push(middleware);
  }

  removeAllListeners(eventType = null) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }
}

// ─── Integration Framework Types ───────────────────────────────────────────────

class IntegrationProvider {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.displayName = data.displayName || data.name || '';
    this.type = data.type || IntegrationType.REST;
    this.authType = data.authType || AuthType.API_KEY;
    this.configuration = data.configuration || {};
    this.capabilities = data.capabilities || [];
    this.isActive = data.isActive || false;
  }

  async connect(credentials) {
    // Implementation provided by integration plugin
    throw new Error('Connect not implemented');
  }

  async disconnect() {
    // Implementation provided by integration plugin
    throw new Error('Disconnect not implemented');
  }

  async test() {
    // Implementation provided by integration plugin
    throw new Error('Test not implemented');
  }

  async sync() {
    // Implementation provided by integration plugin
    throw new Error('Sync not implemented');
  }
}

// ─── Marketplace Types ─────────────────────────────────────────────────────────

class MarketplaceItem {
  constructor(data = {}) {
    this.id = data.id || null;
    this.pluginId = data.pluginId || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.shortDescription = data.shortDescription || '';
    this.category = data.category || PluginCategory.CUSTOM;
    this.icon = data.icon || 'puzzle';
    this.thumbnail = data.thumbnail || null;
    this.documentationUrl = data.documentationUrl || null;
    this.version = data.version || '1.0.0';
    this.changelog = data.changelog || '';
    this.tags = data.tags || [];
    this.dependencies = data.dependencies || [];
    this.compatibility = data.compatibility || {};
    this.isFeatured = data.isFeatured || false;
    this.isVerified = data.isVerified || false;
    this.installCount = data.installCount || 0;
    this.ratingAverage = data.ratingAverage || 0;
    this.ratingCount = data.ratingCount || 0;
    this.status = data.status || 'available';
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      pluginId: this.pluginId,
      name: this.name,
      description: this.description,
      shortDescription: this.shortDescription,
      category: this.category,
      icon: this.icon,
      thumbnail: this.thumbnail,
      documentationUrl: this.documentationUrl,
      version: this.version,
      changelog: this.changelog,
      tags: this.tags,
      dependencies: this.dependencies,
      compatibility: this.compatibility,
      isFeatured: this.isFeatured,
      isVerified: this.isVerified,
      installCount: this.installCount,
      ratingAverage: this.ratingAverage,
      ratingCount: this.ratingCount,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class MarketplaceReview {
  constructor(data = {}) {
    this.id = data.id || null;
    this.marketplaceItemId = data.marketplaceItemId || null;
    this.userId = data.userId || null;
    this.organizationId = data.organizationId || null;
    this.rating = data.rating || 0;
    this.review = data.review || '';
    this.helpfulCount = data.helpfulCount || 0;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }

  toJSON() {
    return {
      id: this.id,
      marketplaceItemId: this.marketplaceItemId,
      userId: this.userId,
      organizationId: this.organizationId,
      rating: this.rating,
      review: this.review,
      helpfulCount: this.helpfulCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Enums
  PluginStatus,
  PluginCategory,
  InstallationStatus,
  HealthStatus,
  IntegrationProvider,
  IntegrationType,
  AuthType,
  EventLevel,
  
  // Core Classes
  PluginManifest,
  PluginDependency,
  PluginPermission,
  PluginConfiguration,
  PluginHealth,
  PluginEvent,
  Integration,
  IntegrationCredential,
  IntegrationHealth,
  
  // SDK Classes
  PluginSDK,
  PluginConfigAPI,
  PluginStorageAPI,
  PluginAIAPI,
  PluginWorkerAPI,
  PluginAgentAPI,
  PluginWorkflowAPI,
  PluginDashboardAPI,
  PluginEventAPI,
  PluginSearchAPI,
  PluginKnowledgeAPI,
  PluginDocumentAPI,
  PluginNotificationAPI,
  PluginLoggingAPI,
  PluginSettingsAPI,
  PluginAuthAPI,
  PluginRBACAPI,
  PluginOrganizationAPI,
  
  // Framework Classes
  EventBus,
  IntegrationProvider,
  MarketplaceItem,
  MarketplaceReview
};