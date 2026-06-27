// Integration Service Enhanced
// Business logic layer for enhanced integration platform features

const crypto = require('crypto');
const { 
  ConnectorCategory, 
  AuthType, 
  IntegrationType, 
  ConnectionStatus,
  HealthStatus,
  WebhookEventType,
  WebhookStatus,
  RetryStrategy,
  RateLimitScope,
  EventLevel
} = require('packages/types/integrations');

class IntegrationServiceEnhanced {
  constructor(db, permissionService, configurationService) {
    this.db = db;
    this.permissionService = permissionService;
    this.configurationService = configurationService;
    this.repository = new (require('../repositories/integrationRepositoryEnhanced'))(db);
    this.baseRepository = new (require('../repositories/integrationRepository'))(db);
    this.connectors = new Map(); // Registered connector implementations
    this.connectionPool = new Map(); // Active connections
    this.rateLimitWindows = new Map(); // Rate limiting state
  }

  // ─── Webhook Management ──────────────────────────────────────────────────────

  async createWebhookEndpoint(integrationId, organizationId, webhookData, userId) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const webhook = await this.repository.createWebhookEndpoint({
      ...webhookData,
      integrationId,
      organizationId,
      createdBy: userId
    });

    await this.emitEvent('webhook.created', {
      webhookId: webhook.id,
      integrationId,
      eventType: webhook.eventType
    }, organizationId, userId);

    return webhook;
  }

  async getWebhookEndpoint(webhookId, organizationId) {
    const webhook = await this.repository.findWebhookById(webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new Error('Webhook not found');
    }
    return webhook;
  }

  async getWebhooksByIntegration(integrationId, organizationId) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }
    return await this.repository.findWebhooksByIntegration(integrationId);
  }

  async getWebhooksByOrganization(organizationId) {
    return await this.repository.findWebhooksByOrganization(organizationId);
  }

  async updateWebhookEndpoint(webhookId, organizationId, updates, userId) {
    const webhook = await this.repository.findWebhookById(webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new Error('Webhook not found');
    }

    const updated = await this.repository.updateWebhookEndpoint(webhookId, updates);

    await this.emitEvent('webhook.updated', {
      webhookId,
      integrationId: webhook.integrationId,
      changes: Object.keys(updates)
    }, organizationId, userId);

    return updated;
  }

  async deleteWebhookEndpoint(webhookId, organizationId, userId) {
    const webhook = await this.repository.findWebhookById(webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new Error('Webhook not found');
    }

    const deleted = await this.repository.deleteWebhookEndpoint(webhookId);

    await this.emitEvent('webhook.deleted', {
      webhookId,
      integrationId: webhook.integrationId
    }, organizationId, userId);

    return deleted;
  }

  async getWebhookLogs(webhookId, organizationId, limit = 100, offset = 0) {
    const webhook = await this.repository.findWebhookById(webhookId);
    if (!webhook || webhook.organizationId !== organizationId) {
      throw new Error('Webhook not found');
    }

    return await this.repository.findWebhookLogsByWebhook(webhookId, limit, offset);
  }

  async logWebhookRequest(webhookId, integrationId, organizationId, requestData, responseData) {
    const log = await this.repository.createWebhookLog({
      webhookId,
      integrationId,
      organizationId,
      eventType: requestData.eventType || 'request',
      method: requestData.method || 'POST',
      headers: requestData.headers || {},
      payload: requestData.payload || {},
      responseStatus: responseData?.status,
      responseBody: responseData?.body,
      error: responseData?.error,
      durationMs: responseData?.durationMs || 0,
      retryCount: requestData.retryCount || 0,
      signatureValid: requestData.signatureValid
    });

    // Update webhook stats
    await this.repository.updateWebhookEndpoint(webhookId, {
      lastTriggeredAt: new Date().toISOString(),
      triggerCount: (await this.repository.findWebhookById(webhookId)).triggerCount + 1,
      errorCount: responseData?.error ? (await this.repository.findWebhookById(webhookId)).errorCount + 1 : (await this.repository.findWebhookById(webhookId)).errorCount
    });

    return log;
  }

  // ─── Retry Policy Management ─────────────────────────────────────────────────

  async createRetryPolicy(integrationId, organizationId, policyData, userId) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const policy = await this.repository.createRetryPolicy({
      ...policyData,
      integrationId,
      organizationId,
      createdBy: userId
    });

    await this.emitEvent('retry_policy.created', {
      policyId: policy.id,
      integrationId,
      strategy: policy.strategy
    }, organizationId, userId);

    return policy;
  }

  async getRetryPolicy(policyId, organizationId) {
    const policy = await this.repository.findRetryPolicyById(policyId);
    if (!policy || policy.organizationId !== organizationId) {
      throw new Error('Retry policy not found');
    }
    return policy;
  }

  async getRetryPolicyByIntegration(integrationId, organizationId) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }
    return await this.repository.findRetryPolicyByIntegration(integrationId);
  }

  async getRetryPoliciesByOrganization(organizationId) {
    return await this.repository.findRetryPoliciesByOrganization(organizationId);
  }

  async updateRetryPolicy(policyId, organizationId, updates, userId) {
    const policy = await this.repository.findRetryPolicyById(policyId);
    if (!policy || policy.organizationId !== organizationId) {
      throw new Error('Retry policy not found');
    }

    const updated = await this.repository.updateRetryPolicy(policyId, updates);

    await this.emitEvent('retry_policy.updated', {
      policyId,
      integrationId: policy.integrationId,
      changes: Object.keys(updates)
    }, organizationId, userId);

    return updated;
  }

  async deleteRetryPolicy(policyId, organizationId, userId) {
    const policy = await this.repository.findRetryPolicyById(policyId);
    if (!policy || policy.organizationId !== organizationId) {
      throw new Error('Retry policy not found');
    }

    const deleted = await this.repository.deleteRetryPolicy(policyId);

    await this.emitEvent('retry_policy.deleted', {
      policyId,
      integrationId: policy.integrationId
    }, organizationId, userId);

    return deleted;
  }

  // ─── Rate Limit Management ───────────────────────────────────────────────────

  async createRateLimit(integrationId, organizationId, rateLimitData, userId) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const rateLimit = await this.repository.createRateLimit({
      ...rateLimitData,
      integrationId,
      organizationId
    });

    await this.emitEvent('rate_limit.created', {
      rateLimitId: rateLimit.id,
      integrationId,
      scope: rateLimit.scope
    }, organizationId, userId);

    return rateLimit;
  }

  async getRateLimit(rateLimitId, organizationId) {
    const rateLimit = await this.repository.findRateLimitById(rateLimitId);
    if (!rateLimit || rateLimit.organizationId !== organizationId) {
      throw new Error('Rate limit not found');
    }
    return rateLimit;
  }

  async getRateLimitByIntegration(integrationId, organizationId) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }
    return await this.repository.findRateLimitByIntegration(integrationId);
  }

  async getRateLimitsByOrganization(organizationId) {
    return await this.repository.findRateLimitsByOrganization(organizationId);
  }

  async updateRateLimit(rateLimitId, organizationId, updates, userId) {
    const rateLimit = await this.repository.findRateLimitById(rateLimitId);
    if (!rateLimit || rateLimit.organizationId !== organizationId) {
      throw new Error('Rate limit not found');
    }

    const updated = await this.repository.updateRateLimit(rateLimitId, updates);

    await this.emitEvent('rate_limit.updated', {
      rateLimitId,
      integrationId: rateLimit.integrationId,
      changes: Object.keys(updates)
    }, organizationId, userId);

    return updated;
  }

  async deleteRateLimit(rateLimitId, organizationId, userId) {
    const rateLimit = await this.repository.findRateLimitById(rateLimitId);
    if (!rateLimit || rateLimit.organizationId !== organizationId) {
      throw new Error('Rate limit not found');
    }

    const deleted = await this.repository.deleteRateLimit(rateLimitId);

    await this.emitEvent('rate_limit.deleted', {
      rateLimitId,
      integrationId: rateLimit.integrationId
    }, organizationId, userId);

    return deleted;
  }

  // ─── Connection Template Management ──────────────────────────────────────────

  async createConnectionTemplate(templateData, userId) {
    const template = await this.repository.createConnectionTemplate(templateData);

    await this.emitEvent('template.created', {
      templateId: template.id,
      provider: template.provider,
      category: template.category
    }, null, userId);

    return template;
  }

  async getConnectionTemplate(templateId) {
    return await this.repository.findConnectionTemplateById(templateId);
  }

  async getConnectionTemplates(filters = {}) {
    return await this.repository.findConnectionTemplates(filters);
  }

  async updateConnectionTemplate(templateId, updates, userId) {
    const template = await this.repository.findConnectionTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const updated = await this.repository.updateConnectionTemplate(templateId, updates);

    await this.emitEvent('template.updated', {
      templateId,
      changes: Object.keys(updates)
    }, null, userId);

    return updated;
  }

  async deleteConnectionTemplate(templateId, userId) {
    const template = await this.repository.findConnectionTemplateById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const deleted = await this.repository.deleteConnectionTemplate(templateId);

    await this.emitEvent('template.deleted', {
      templateId,
      provider: template.provider
    }, null, userId);

    return deleted;
  }

  // ─── Connector Metadata Management ───────────────────────────────────────────

  async registerConnectorMetadata(metadataData, userId) {
    const metadata = await this.repository.createConnectorMetadata(metadataData);

    await this.emitEvent('connector.registered', {
      provider: metadata.provider,
      category: metadata.category
    }, null, userId);

    return metadata;
  }

  async getConnectorMetadata(provider) {
    return await this.repository.findConnectorMetadataByProvider(provider);
  }

  async getAllConnectorMetadata(filters = {}) {
    return await this.repository.findAllConnectorMetadata(filters);
  }

  async updateConnectorMetadata(provider, updates, userId) {
    const metadata = await this.repository.findConnectorMetadataByProvider(provider);
    if (!metadata) {
      throw new Error('Connector metadata not found');
    }

    const updated = await this.repository.updateConnectorMetadata(provider, updates);

    await this.emitEvent('connector.updated', {
      provider,
      changes: Object.keys(updates)
    }, null, userId);

    return updated;
  }

  // ─── Integration Events ──────────────────────────────────────────────────────

  async getIntegrationEvents(integrationId, organizationId, limit = 100, offset = 0) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    return await this.repository.findIntegrationEventsByIntegration(integrationId, limit, offset);
  }

  async getOrganizationEvents(organizationId, limit = 100, offset = 0) {
    return await this.repository.findIntegrationEventsByOrganization(organizationId, limit, offset);
  }

  // ─── Request/Response Logging ────────────────────────────────────────────────

  async logRequest(integrationId, organizationId, requestData) {
    const log = await this.repository.createRequestLog({
      integrationId,
      organizationId,
      method: requestData.method,
      url: requestData.url,
      headers: requestData.headers || {},
      body: requestData.body,
      queryParams: requestData.queryParams || {},
      retryPolicyId: requestData.retryPolicyId,
      rateLimitId: requestData.rateLimitId
    });

    return log;
  }

  async logResponse(integrationId, organizationId, responseData, requestLogId = null) {
    const log = await this.repository.createResponseLog({
      integrationId,
      organizationId,
      requestLogId,
      statusCode: responseData.statusCode,
      headers: responseData.headers || {},
      body: responseData.body,
      durationMs: responseData.durationMs,
      retryCount: responseData.retryCount || 0,
      error: responseData.error
    });

    return log;
  }

  async getRequestLogs(integrationId, organizationId, limit = 100, offset = 0) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    return await this.repository.findRequestLogsByIntegration(integrationId, limit, offset);
  }

  async getResponseLogs(integrationId, organizationId, limit = 100, offset = 0) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    return await this.repository.findResponseLogsByIntegration(integrationId, limit, offset);
  }

  // ─── Connector Registry ──────────────────────────────────────────────────────

  registerConnector(providerName, connectorImplementation) {
    if (!connectorImplementation.metadata || !connectorImplementation.metadata().provider) {
      throw new Error('Connector must implement metadata() method with provider field');
    }

    this.connectors.set(providerName, connectorImplementation);

    // Auto-register metadata if not exists
    const metadata = connectorImplementation.metadata();
    this.repository.findConnectorMetadataByProvider(providerName)
      .then(existing => {
        if (!existing) {
          return this.registerConnectorMetadata({
            provider: metadata.provider,
            name: metadata.name,
            displayName: metadata.displayName,
            description: metadata.description,
            category: metadata.category,
            icon: metadata.icon,
            authTypes: metadata.authTypes,
            integrationTypes: metadata.integrationTypes,
            capabilities: metadata.capabilities,
            configurationSchema: metadata.configurationSchema,
            authSchema: metadata.authSchema,
            isOfficial: metadata.isOfficial || false,
            version: metadata.version || '1.0.0',
            documentationUrl: metadata.documentationUrl
          }, null);
        }
      })
      .catch(err => console.error('Failed to auto-register connector metadata:', err));
  }

  getConnector(providerName) {
    return this.connectors.get(providerName);
  }

  getRegisteredConnectors() {
    return Array.from(this.connectors.keys());
  }

  // ─── Connection Pool Management ──────────────────────────────────────────────

  async getConnection(integrationId, organizationId) {
    const integration = await this.baseRepository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const poolKey = `${organizationId}:${integrationId}`;
    
    if (this.connectionPool.has(poolKey)) {
      return this.connectionPool.get(poolKey);
    }

    // Create new connection
    const connector = this.connectors.get(integration.provider);
    if (!connector) {
      throw new Error(`No connector registered for provider: ${integration.provider}`);
    }

    const credential = await this.baseRepository.getCredential(integrationId, organizationId);
    
    const connection = await connector.connect(integration, credential?.decryptedValue);
    this.connectionPool.set(poolKey, connection);

    return connection;
  }

  async releaseConnection(integrationId, organizationId) {
    const poolKey = `${organizationId}:${integrationId}`;
    
    if (this.connectionPool.has(poolKey)) {
      const connection = this.connectionPool.get(poolKey);
      const connector = this.connectors.get((await this.baseRepository.findById(integrationId)).provider);
      
      if (connector && typeof connector.disconnect === 'function') {
        await connector.disconnect(connection);
      }
      
      this.connectionPool.delete(poolKey);
    }
  }

  // ─── Rate Limiting ───────────────────────────────────────────────────────────

  async checkRateLimit(integrationId, organizationId) {
    const rateLimit = await this.getRateLimitByIntegration(integrationId, organizationId);
    
    if (!rateLimit || !rateLimit.queueEnabled) {
      return { allowed: true };
    }

    const windowKey = `${integrationId}:${Math.floor(Date.now() / rateLimit.windowMs)}`;
    const currentCount = this.rateLimitWindows.get(windowKey) || 0;

    if (currentCount >= rateLimit.maxRequests) {
      if (rateLimit.handle429 === 'queue') {
        return { 
          allowed: false, 
          action: 'queue',
          retryAfter: rateLimit.windowMs
        };
      } else if (rateLimit.handle429 === 'reject') {
        return { 
          allowed: false, 
          action: 'reject',
          retryAfter: rateLimit.windowMs
        };
      } else {
        return { 
          allowed: true, 
          action: 'throttle',
          delay: rateLimit.windowMs / rateLimit.maxRequests
        };
      }
    }

    this.rateLimitWindows.set(windowKey, currentCount + 1);

    // Clean up old windows
    for (const [key] of this.rateLimitWindows) {
      const [keyIntegrationId, keyWindow] = key.split(':');
      if (keyIntegrationId === integrationId && parseInt(keyWindow) < Math.floor(Date.now() / rateLimit.windowMs) - 1) {
        this.rateLimitWindows.delete(key);
      }
    }

    return { allowed: true };
  }

  // ─── Retry Logic ─────────────────────────────────────────────────────────────

  async executeWithRetry(integrationId, organizationId, requestFn, options = {}) {
    const retryPolicy = options.retryPolicy || await this.getRetryPolicyByIntegration(integrationId, organizationId);
    
    if (!retryPolicy || !retryPolicy.isEnabled) {
      return await requestFn();
    }

    let lastError;
    let attempt = 0;

    while (attempt <= retryPolicy.maxRetries) {
      try {
        // Check rate limit
        const rateLimitCheck = await this.checkRateLimit(integrationId, organizationId);
        if (!rateLimitCheck.allowed) {
          if (rateLimitCheck.action === 'queue') {
            await new Promise(resolve => setTimeout(resolve, rateLimitCheck.retryAfter));
            continue;
          } else if (rateLimitCheck.action === 'reject') {
            throw new Error('Rate limit exceeded');
          } else if (rateLimitCheck.action === 'throttle') {
            await new Promise(resolve => setTimeout(resolve, rateLimitCheck.delay));
          }
        }

        const result = await requestFn();
        
        // Log success
        if (options.logRequest) {
          await this.logRequest(integrationId, organizationId, options.logRequest);
        }
        if (options.logResponse) {
          await this.logResponse(integrationId, organizationId, {
            ...options.logResponse,
            statusCode: result.status || 200,
            retryCount: attempt
          });
        }

        return result;
      } catch (error) {
        lastError = error;
        attempt++;

        // Check if error is retryable
        const isRetryableStatus = retryPolicy.retryableStatusCodes.includes(error.statusCode);
        const isRetryableError = retryPolicy.retryableErrors.some(errType => error.message.includes(errType));

        if (!isRetryableStatus && !isRetryableError) {
          throw error;
        }

        if (attempt > retryPolicy.maxRetries) {
          break;
        }

        // Calculate delay
        let delay;
        if (retryPolicy.strategy === RetryStrategy.LINEAR) {
          delay = retryPolicy.initialDelayMs * attempt;
        } else if (retryPolicy.strategy === RetryStrategy.EXPONENTIAL_BACKOFF) {
          delay = Math.min(
            retryPolicy.initialDelayMs * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
            retryPolicy.maxDelayMs
          );
        } else if (retryPolicy.strategy === RetryStrategy.CIRCUIT_BREAKER) {
          // Circuit breaker logic would go here
          delay = retryPolicy.initialDelayMs * attempt;
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Log final failure
    if (options.logRequest) {
      await this.logRequest(integrationId, organizationId, options.logRequest);
    }
    if (options.logResponse) {
      await this.logResponse(integrationId, organizationId, {
        ...options.logResponse,
        statusCode: lastError.statusCode || 500,
        error: lastError.message,
        retryCount: attempt - 1
      });
    }

    throw lastError;
  }

  // ─── Event Emission ──────────────────────────────────────────────────────────

  async emitEvent(eventType, eventData, organizationId, triggeredBy = null) {
    const event = await this.repository.createIntegrationEvent({
      integrationId: eventData.integrationId || null,
      organizationId,
      eventType,
      level: EventLevel.INFO,
      message: eventData.message || eventType,
      eventData,
      triggeredBy
    });

    // TODO: Publish to event bus when available
    console.log(`[Integration Event] ${eventType}:`, eventData);

    return event;
  }

  // ─── Health Monitoring ───────────────────────────────────────────────────────

  async checkAllIntegrationsHealth(organizationId) {
    const integrations = await this.baseRepository.findByOrganization(organizationId, {
      isEnabled: true
    });

    const results = [];
    for (const integration of integrations) {
      try {
        const health = await this.baseRepository.checkIntegrationHealth(integration.id);
        results.push(health);
      } catch (error) {
        console.error(`Health check failed for integration ${integration.id}:`, error);
      }
    }

    return results;
  }

  // ─── Statistics ──────────────────────────────────────────────────────────────

  async getIntegrationStatistics(organizationId) {
    const integrations = await this.baseRepository.findByOrganization(organizationId);
    const health = await this.baseRepository.findHealthByOrganization(organizationId);
    const events = await this.repository.findIntegrationEventsByOrganization(organizationId, 100);

    const stats = {
      total: integrations.length,
      active: integrations.filter(i => i.status === ConnectionStatus.ACTIVE).length,
      inactive: integrations.filter(i => i.status === ConnectionStatus.INACTIVE).length,
      error: integrations.filter(i => i.status === ConnectionStatus.ERROR).length,
      health: {
        healthy: health.filter(h => h.status === HealthStatus.HEALTHY).length,
        degraded: health.filter(h => h.status === HealthStatus.DEGRADED).length,
        unhealthy: health.filter(h => h.status === HealthStatus.UNHEALTHY).length,
        unknown: health.filter(h => h.status === HealthStatus.UNKNOWN).length
      },
      recentEvents: events.slice(0, 10),
      providers: [...new Set(integrations.map(i => i.provider))]
    };

    return stats;
  }
}

module.exports = IntegrationServiceEnhanced;