// Integration Platform Type Definitions
// Prompt 25: Complete Integration Platform Framework

// ─── Enums ─────────────────────────────────────────────────────────────────────

const ConnectorCategory = {
  COMMUNICATION: 'communication',
  DEVELOPMENT: 'development',
  PRODUCTIVITY: 'productivity',
  STORAGE: 'storage',
  ERP: 'erp',
  CRM: 'crm',
  DATABASE: 'database',
  CLOUD: 'cloud',
  ANALYTICS: 'analytics',
  MONITORING: 'monitoring',
  IDENTITY: 'identity',
  CUSTOM: 'custom'
};

const AuthType = {
  OAUTH2: 'oauth2',
  API_KEY: 'api_key',
  BEARER_TOKEN: 'bearer_token',
  JWT: 'jwt',
  BASIC: 'basic',
  CUSTOM_HEADERS: 'custom_headers',
  CLIENT_CERTIFICATE: 'client_certificate',
  NONE: 'none'
};

const IntegrationType = {
  REST: 'rest',
  GRAPHQL: 'graphql',
  WEBHOOK: 'webhook',
  GRPC: 'grpc',
  SOAP: 'soap',
  DATABASE: 'database',
  FILESYSTEM: 'filesystem'
};

const ConnectionStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  PENDING: 'pending',
  DISABLED: 'disabled',
  CONNECTING: 'connecting',
  DEGRADED: 'degraded'
};

const HealthStatus = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

const WebhookEventType = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing'
};

const WebhookStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error'
};

const RetryStrategy = {
  LINEAR: 'linear',
  EXPONENTIAL_BACKOFF: 'exponential_backoff',
  CIRCUIT_BREAKER: 'circuit_breaker'
};

const RateLimitScope = {
  GLOBAL: 'global',
  CONNECTOR: 'connector',
  ORGANIZATION: 'organization'
};

const EventLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// ─── Core Interfaces ────────────────────────────────────────────────────────────

/**
 * Base Connector Interface - All connectors must implement these methods
 */
class ConnectorInterface {
  /**
   * Initialize connection to external system
   * @param {Object} connection - Connection configuration
   * @returns {Promise<Object>} Connection result
   */
  async connect(connection) {
    throw new Error('connect() must be implemented');
  }

  /**
   * Close connection to external system
   * @param {Object} connection - Connection configuration
   * @returns {Promise<Object>} Disconnection result
   */
  async disconnect(connection) {
    throw new Error('disconnect() must be implemented');
  }

  /**
   * Authenticate with external system
   * @param {Object} connection - Connection configuration
   * @param {Object} credentials - Decrypted credentials
   * @returns {Promise<Object>} Authentication result
   */
  async authenticate(connection, credentials) {
    throw new Error('authenticate() must be implemented');
  }

  /**
   * Refresh authentication token
   * @param {Object} connection - Connection configuration
   * @param {Object} credentials - Current credentials
   * @returns {Promise<Object>} New credentials
   */
  async refresh(connection, credentials) {
    throw new Error('refresh() must be implemented');
  }

  /**
   * Test connection to external system
   * @param {Object} connection - Connection configuration
   * @param {Object} credentials - Decrypted credentials
   * @returns {Promise<Object>} Test result
   */
  async test(connection, credentials) {
    throw new Error('test() must be implemented');
  }

  /**
   * Execute request to external system
   * @param {Object} connection - Connection configuration
   * @param {Object} request - Request configuration
   * @returns {Promise<Object>} Response from external system
   */
  async execute(connection, request) {
    throw new Error('execute() must be implemented');
  }

  /**
   * Check health of connection
   * @param {Object} connection - Connection configuration
   * @returns {Promise<Object>} Health status
   */
  async health(connection) {
    throw new Error('health() must be implemented');
  }

  /**
   * Get connector metadata
   * @returns {Object} Connector metadata
   */
  metadata() {
    throw new Error('metadata() must be implemented');
  }

  /**
   * Get connector capabilities
   * @returns {Object} Supported capabilities
   */
  capabilities() {
    throw new Error('capabilities() must be implemented');
  }
}

// ─── Domain Classes ─────────────────────────────────────────────────────────────

class IntegrationConnection {
  constructor(data = {}) {
    this.id = data.id || null;
    this.organizationId = data.organizationId || null;
    this.pluginId = data.pluginId || null;
    this.name = data.name || '';
    this.displayName = data.displayName || data.name || '';
    this.description = data.description || '';
    this.provider = data.provider || '';
    this.integrationType = data.integrationType || IntegrationType.REST;
    this.authType = data.authType || AuthType.API_KEY;
    this.configuration = data.configuration || {};
    this.status = data.status || ConnectionStatus.INACTIVE;
    this.isEnabled = data.isEnabled || false;
    this.lastSyncAt = data.lastSyncAt || null;
    this.lastErrorAt = data.lastErrorAt || null;
    this.lastErrorMessage = data.lastErrorMessage || null;
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
}

class IntegrationCredential {
  constructor(data = {}) {
    this.id = data.id || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.credentialType = data.credentialType || AuthType.API_KEY;
    this.encryptedValue = data.encryptedValue || null;
    this.iv = data.iv || null;
    this.authTag = data.authTag || null;
    this.expiresAt = data.expiresAt || null;
    this.lastUsedAt = data.lastUsedAt || null;
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
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
}

class WebhookEndpoint {
  constructor(data = {}) {
    this.id = data.id || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.eventType = data.eventType || WebhookEventType.INCOMING;
    this.path = data.path || '';
    this.secret = data.secret || null;
    this.headers = data.headers || {};
    this.isEnabled = data.isEnabled || false;
    this.status = data.status || WebhookStatus.INACTIVE;
    this.lastTriggeredAt = data.lastTriggeredAt || null;
    this.triggerCount = data.triggerCount || 0;
    this.errorCount = data.errorCount || 0;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
}

class WebhookLog {
  constructor(data = {}) {
    this.id = data.id || null;
    this.webhookId = data.webhookId || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.eventType = data.eventType || '';
    this.method = data.method || 'POST';
    this.headers = data.headers || {};
    this.payload = data.payload || {};
    this.responseStatus = data.responseStatus || null;
    this.responseBody = data.responseBody || null;
    this.error = data.error || null;
    this.durationMs = data.durationMs || 0;
    this.retryCount = data.retryCount || 0;
    this.signatureValid = data.signatureValid || null;
    this.createdAt = data.createdAt || null;
  }
}

class RetryPolicy {
  constructor(data = {}) {
    this.id = data.id || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.name = data.name || '';
    this.strategy = data.strategy || RetryStrategy.EXPONENTIAL_BACKOFF;
    this.maxRetries = data.maxRetries || 3;
    this.initialDelayMs = data.initialDelayMs || 1000;
    this.maxDelayMs = data.maxDelayMs || 30000;
    this.backoffMultiplier = data.backoffMultiplier || 2;
    this.circuitBreakerThreshold = data.circuitBreakerThreshold || 5;
    this.circuitBreakerTimeoutMs = data.circuitBreakerTimeoutMs || 60000;
    this.retryableStatusCodes = data.retryableStatusCodes || [408, 429, 500, 502, 503, 504];
    this.retryableErrors = data.retryableErrors || ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
    this.isEnabled = data.isEnabled || true;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
}

class RateLimit {
  constructor(data = {}) {
    this.id = data.id || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.scope = data.scope || RateLimitScope.CONNECTOR;
    this.maxRequests = data.maxRequests || 100;
    this.windowMs = data.windowMs || 60000;
    this.burstSize = data.burstSize || 10;
    this.queueEnabled = data.queueEnabled || true;
    this.queueMaxSize = data.queueMaxSize || 1000;
    this.handle429 = data.handle429 || 'queue';
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
}

class ConnectionTemplate {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.displayName = data.displayName || data.name || '';
    this.description = data.description || '';
    this.category = data.category || ConnectorCategory.CUSTOM;
    this.provider = data.provider || '';
    this.integrationType = data.integrationType || IntegrationType.REST;
    this.authType = data.authType || AuthType.API_KEY;
    this.configuration = data.configuration || {};
    this.authConfiguration = data.authConfiguration || {};
    this.capabilities = data.capabilities || [];
    this.isSystem = data.isSystem || false;
    this.isFeatured = data.isFeatured || false;
    this.installCount = data.installCount || 0;
    this.rating = data.rating || 0;
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
}

class ConnectorMetadata {
  constructor(data = {}) {
    this.id = data.id || null;
    this.provider = data.provider || '';
    this.name = data.name || '';
    this.displayName = data.displayName || data.name || '';
    this.description = data.description || '';
    this.category = data.category || ConnectorCategory.CUSTOM;
    this.icon = data.icon || 'puzzle';
    this.authTypes = data.authTypes || [AuthType.API_KEY];
    this.integrationTypes = data.integrationTypes || [IntegrationType.REST];
    this.capabilities = data.capabilities || [];
    this.configurationSchema = data.configurationSchema || {};
    this.authSchema = data.authSchema || {};
    this.isOfficial = data.isOfficial || false;
    this.version = data.version || '1.0.0';
    this.documentationUrl = data.documentationUrl || '';
    this.createdAt = data.createdAt || null;
    this.updatedAt = data.updatedAt || null;
  }
}

class IntegrationEvent {
  constructor(data = {}) {
    this.id = data.id || null;
    this.integrationId = data.integrationId || null;
    this.organizationId = data.organizationId || null;
    this.eventType = data.eventType || '';
    this.level = data.level || EventLevel.INFO;
    this.message = data.message || '';
    this.eventData = data.eventData || {};
    this.triggeredBy = data.triggeredBy || null;
    this.createdAt = data.createdAt || null;
  }
}

// ─── Exports ────────────────────────────────────────────────────────────────────

export { // Enums
  ConnectorCategory,
  AuthType,
  IntegrationType,
  ConnectionStatus,
  HealthStatus,
  WebhookEventType,
  WebhookStatus,
  RetryStrategy,
  RateLimitScope,
  EventLevel,
  
  // Interfaces
  ConnectorInterface,
  
  // Domain Classes
  IntegrationConnection,
  IntegrationCredential,
  IntegrationHealth,
  WebhookEndpoint,
  WebhookLog,
  RetryPolicy,
  RateLimit,
  ConnectionTemplate,
  ConnectorMetadata,
  IntegrationEvent
 };