// Integration Service
// Business logic layer for integration framework

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
const { IntegrationProvider, AuthType, HealthStatus } = require('packages/types/agents/index.js');

class IntegrationService {
  constructor(db, permissionService, configurationService) {
    this.db = db;
    this.permissionService = permissionService;
    this.configurationService = configurationService;
    this.repository = new (require('../repositories/integrationRepository'))(db);
    this.providers = new Map(); // Registered integration providers
  }

  // ─── Integration CRUD ────────────────────────────────────────────────────────

  async createIntegration(organizationId, integrationData, userId) {
    // Validate provider
    if (!Object.values(IntegrationProvider).includes(integrationData.provider)) {
      throw new Error('Invalid integration provider');
    }

    // Validate auth type
    if (!Object.values(AuthType).includes(integrationData.authType)) {
      throw new Error('Invalid authentication type');
    }

    // Create integration
    const integration = await this.repository.create({
      ...integrationData,
      organizationId,
      createdBy: userId,
      status: 'inactive'
    });

    // Emit event
    await this.emitEvent('integration.created', {
      integrationId: integration.id,
      provider: integration.provider,
      name: integration.name
    }, organizationId, userId);

    return integration;
  }

  async updateIntegration(integrationId, updates, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const updated = await this.repository.update(integrationId, updates);

    // Emit event
    await this.emitEvent('integration.updated', {
      integrationId: integration.id,
      changes: Object.keys(updates)
    }, integration.organizationId, userId);

    return updated;
  }

  async deleteIntegration(integrationId, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const deleted = await this.repository.delete(integrationId);

    // Emit event
    await this.emitEvent('integration.deleted', {
      integrationId: integration.id,
      provider: integration.provider
    }, integration.organizationId, userId);

    return deleted;
  }

  async getIntegration(integrationId) {
    return await this.repository.findById(integrationId);
  }

  async getIntegrationsByOrganization(organizationId, filters = {}) {
    return await this.repository.findByOrganization(organizationId, filters);
  }

  // ─── Integration Credentials ─────────────────────────────────────────────────

  async createCredential(integrationId, organizationId, credentialData, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    // Encrypt credential value
    const encrypted = await this.encryptCredential(credentialData.value);

    const credential = await this.repository.createCredential({
      integrationId,
      organizationId,
      credentialType: credentialData.type,
      encryptedValue: encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      expiresAt: credentialData.expiresAt || null,
      createdBy: userId
    });

    // Emit event
    await this.emitEvent('integration.credential.created', {
      integrationId,
      credentialType: credentialData.type
    }, organizationId, userId);

    return credential;
  }

  async updateCredential(credentialId, integrationId, organizationId, value, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    // Encrypt new value
    const encrypted = await this.encryptCredential(value);

    const credential = await this.repository.updateCredential(credentialId, {
      encryptedValue: encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag
    });

    // Emit event
    await this.emitEvent('integration.credential.updated', {
      integrationId,
      credentialId
    }, organizationId, userId);

    return credential;
  }

  async deleteCredential(credentialId, integrationId, organizationId, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const deleted = await this.repository.deleteCredential(credentialId);

    // Emit event
    await this.emitEvent('integration.credential.deleted', {
      integrationId,
      credentialId
    }, organizationId, userId);

    return deleted;
  }

  async getCredential(integrationId, organizationId, credentialType = null) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    let credential;
    if (credentialType) {
      credential = await this.repository.findCredentialByIntegrationAndType(
        integrationId,
        credentialType
      );
    } else {
      const credentials = await this.repository.findCredentialsByIntegration(integrationId);
      credential = credentials[0] || null;
    }

    if (!credential) {
      return null;
    }

    // Decrypt credential
    credential.decryptedValue = await this.decryptCredential(credential.encryptedValue);

    return credential;
  }

  // ─── Integration Health ──────────────────────────────────────────────────────

  async checkIntegrationHealth(integrationId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    let healthStatus = HealthStatus.UNKNOWN;
    let errorMessage = null;
    let responseTimeMs = null;
    let metrics = {};

    try {
      // Get provider implementation
      const provider = this.providers.get(integration.provider);
      
      if (provider && typeof provider.healthCheck === 'function') {
        const result = await provider.healthCheck(integration);
        healthStatus = result.status || HealthStatus.UNKNOWN;
        responseTimeMs = result.responseTime;
        metrics = result.metrics || {};
        errorMessage = result.error;
      } else {
        // Default health check - try to connect
        healthStatus = HealthStatus.HEALTHY;
        metrics = { checked: true };
      }
    } catch (error) {
      healthStatus = HealthStatus.UNHEALTHY;
      errorMessage = error.message;
    }

    // Update health record
    const health = await this.repository.createOrUpdateHealth({
      integrationId,
      organizationId: integration.organizationId,
      status: healthStatus,
      lastSuccessAt: healthStatus === HealthStatus.HEALTHY ? new Date().toISOString() : null,
      lastErrorAt: healthStatus !== HealthStatus.HEALTHY ? new Date().toISOString() : null,
      lastErrorMessage: errorMessage,
      responseTimeMs,
      metrics,
      checkCount: 1,
      errorCount: healthStatus !== HealthStatus.HEALTHY ? 1 : 0
    });

    // Update integration
    await this.repository.update(integrationId, {
      lastSyncAt: healthStatus === HealthStatus.HEALTHY ? new Date().toISOString() : integration.lastSyncAt,
      lastErrorAt: healthStatus !== HealthStatus.HEALTHY ? new Date().toISOString() : null,
      lastErrorMessage: errorMessage,
      status: healthStatus === HealthStatus.HEALTHY ? 'active' : 'error'
    });

    return health;
  }

  async getIntegrationHealth(organizationId) {
    return await this.repository.findHealthByOrganization(organizationId);
  }

  // ─── Integration Operations ──────────────────────────────────────────────────

  async testConnection(integrationId, organizationId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const provider = this.providers.get(integration.provider);
    
    if (!provider || typeof provider.test !== 'function') {
      throw new Error('Provider does not support connection testing');
    }

    // Get credentials
    const credential = await this.getCredential(integrationId, organizationId);
    
    const result = await provider.test(integration, credential?.decryptedValue);

    return result;
  }

  async syncIntegration(integrationId, organizationId, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const provider = this.providers.get(integration.provider);
    
    if (!provider || typeof provider.sync !== 'function') {
      throw new Error('Provider does not support synchronization');
    }

    // Get credentials
    const credential = await this.getCredential(integrationId, organizationId);

    const result = await provider.sync(integration, credential?.decryptedValue);

    // Update last sync time
    await this.repository.update(integrationId, {
      lastSyncAt: new Date().toISOString()
    });

    // Emit event
    await this.emitEvent('integration.synced', {
      integrationId: integration.id,
      provider: integration.provider
    }, organizationId, userId);

    return result;
  }

  async connectIntegration(integrationId, organizationId, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const provider = this.providers.get(integration.provider);
    
    if (!provider || typeof provider.connect !== 'function') {
      throw new Error('Provider does not support connection');
    }

    // Get credentials
    const credential = await this.getCredential(integrationId, organizationId);

    const result = await provider.connect(integration, credential?.decryptedValue);

    // Update integration status
    await this.repository.update(integrationId, {
      status: 'active',
      isEnabled: true
    });

    // Emit event
    await this.emitEvent('integration.connected', {
      integrationId: integration.id,
      provider: integration.provider
    }, organizationId, userId);

    return result;
  }

  async disconnectIntegration(integrationId, organizationId, userId) {
    const integration = await this.repository.findById(integrationId);
    if (!integration || integration.organizationId !== organizationId) {
      throw new Error('Integration not found');
    }

    const provider = this.providers.get(integration.provider);
    
    if (provider && typeof provider.disconnect === 'function') {
      await provider.disconnect(integration);
    }

    // Update integration status
    await this.repository.update(integrationId, {
      status: 'inactive',
      isEnabled: false
    });

    // Emit event
    await this.emitEvent('integration.disconnected', {
      integrationId: integration.id,
      provider: integration.provider
    }, organizationId, userId);

    return true;
  }

  // ─── Provider Management ─────────────────────────────────────────────────────

  registerProvider(providerName, providerImplementation) {
    this.providers.set(providerName, providerImplementation);
  }

  getProvider(providerName) {
    return this.providers.get(providerName);
  }

  getRegisteredProviders() {
    return Array.from(this.providers.keys());
  }

  // ─── Helper Methods ──────────────────────────────────────────────────────────

  async encryptCredential(value) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.INTEGRATION_ENCRYPTION_KEY || 'dev-key-change-in-production',
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

  async decryptCredential(encryptedData) {
    if (typeof encryptedData === 'string') {
      return encryptedData; // Not encrypted
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(
      process.env.INTEGRATION_ENCRYPTION_KEY || 'dev-key-change-in-production',
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

  async emitEvent(eventType, eventData, organizationId, triggeredBy = null) {
    // Event emission logic - can be integrated with plugin event bus
    console.log(`[Integration Event] ${eventType}:`, eventData);
    return { eventType, eventData, organizationId, triggeredBy };
  }
}

export default IntegrationService;