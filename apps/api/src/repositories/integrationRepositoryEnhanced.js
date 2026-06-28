// Integration Repository Enhanced
// Data access layer for enhanced integration platform features

import { v4 as uuidv4 } from 'uuid';

class IntegrationRepositoryEnhanced {
  constructor(db) {
    this.db = db;
  }

  // ─── Webhook Endpoints ────────────────────────────────────────────────────────

  async createWebhookEndpoint(webhookData) {
    const id = webhookData.id || uuidv4();
    const query = `
      INSERT INTO webhook_endpoints (
        id, integration_id, organization_id, name, description,
        event_type, path, secret, headers, is_enabled, status,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      webhookData.integrationId,
      webhookData.organizationId,
      webhookData.name,
      webhookData.description || '',
      webhookData.eventType || 'incoming',
      webhookData.path,
      webhookData.secret || null,
      JSON.stringify(webhookData.headers || {}),
      webhookData.isEnabled || false,
      webhookData.status || 'inactive',
      webhookData.createdBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToWebhookEndpoint(result.rows[0]);
  }

  async findWebhookById(id) {
    const query = 'SELECT * FROM webhook_endpoints WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToWebhookEndpoint(result.rows[0]) : null;
  }

  async findWebhooksByIntegration(integrationId) {
    const query = 'SELECT * FROM webhook_endpoints WHERE integration_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [integrationId]);
    return result.rows.map(row => this.mapRowToWebhookEndpoint(row));
  }

  async findWebhooksByOrganization(organizationId) {
    const query = 'SELECT * FROM webhook_endpoints WHERE organization_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToWebhookEndpoint(row));
  }

  async updateWebhookEndpoint(id, updates) {
    const allowedFields = [
      'name', 'description', 'event_type', 'path', 'secret', 'headers',
      'is_enabled', 'status', 'last_triggered_at', 'trigger_count', 'error_count'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE webhook_endpoints 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToWebhookEndpoint(result.rows[0]) : null;
  }

  async deleteWebhookEndpoint(id) {
    const query = 'DELETE FROM webhook_endpoints WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  // ─── Webhook Logs ─────────────────────────────────────────────────────────────

  async createWebhookLog(logData) {
    const id = logData.id || uuidv4();
    const query = `
      INSERT INTO webhook_logs (
        id, webhook_id, integration_id, organization_id, event_type,
        method, headers, payload, response_status, response_body,
        error, duration_ms, retry_count, signature_valid, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      logData.webhookId,
      logData.integrationId,
      logData.organizationId,
      logData.eventType,
      logData.method || 'POST',
      JSON.stringify(logData.headers || {}),
      JSON.stringify(logData.payload || {}),
      logData.responseStatus || null,
      logData.responseBody ? JSON.stringify(logData.responseBody) : null,
      logData.error || null,
      logData.durationMs || 0,
      logData.retryCount || 0,
      logData.signatureValid || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToWebhookLog(result.rows[0]);
  }

  async findWebhookLogsByWebhook(webhookId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM webhook_logs 
      WHERE webhook_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [webhookId, limit, offset]);
    return result.rows.map(row => this.mapRowToWebhookLog(row));
  }

  async findWebhookLogsByIntegration(integrationId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM webhook_logs 
      WHERE integration_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [integrationId, limit, offset]);
    return result.rows.map(row => this.mapRowToWebhookLog(row));
  }

  // ─── Retry Policies ──────────────────────────────────────────────────────────

  async createRetryPolicy(policyData) {
    const id = policyData.id || uuidv4();
    const query = `
      INSERT INTO retry_policies (
        id, integration_id, organization_id, name, strategy,
        max_retries, initial_delay_ms, max_delay_ms, backoff_multiplier,
        circuit_breaker_threshold, circuit_breaker_timeout_ms,
        retryable_status_codes, retryable_errors, is_enabled,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      policyData.integrationId,
      policyData.organizationId,
      policyData.name,
      policyData.strategy || 'exponential_backoff',
      policyData.maxRetries || 3,
      policyData.initialDelayMs || 1000,
      policyData.maxDelayMs || 30000,
      policyData.backoffMultiplier || 2.0,
      policyData.circuitBreakerThreshold || 5,
      policyData.circuitBreakerTimeoutMs || 60000,
      policyData.retryableStatusCodes || [408, 429, 500, 502, 503, 504],
      policyData.retryableErrors || ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
      policyData.isEnabled !== undefined ? policyData.isEnabled : true,
      policyData.createdBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToRetryPolicy(result.rows[0]);
  }

  async findRetryPolicyById(id) {
    const query = 'SELECT * FROM retry_policies WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToRetryPolicy(result.rows[0]) : null;
  }

  async findRetryPolicyByIntegration(integrationId) {
    const query = 'SELECT * FROM retry_policies WHERE integration_id = $1';
    const result = await this.db.query(query, [integrationId]);
    return result.rows[0] ? this.mapRowToRetryPolicy(result.rows[0]) : null;
  }

  async findRetryPoliciesByOrganization(organizationId) {
    const query = 'SELECT * FROM retry_policies WHERE organization_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToRetryPolicy(row));
  }

  async updateRetryPolicy(id, updates) {
    const allowedFields = [
      'name', 'strategy', 'max_retries', 'initial_delay_ms', 'max_delay_ms',
      'backoff_multiplier', 'circuit_breaker_threshold', 'circuit_breaker_timeout_ms',
      'retryable_status_codes', 'retryable_errors', 'is_enabled'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(Array.isArray(value) ? value : value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE retry_policies 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToRetryPolicy(result.rows[0]) : null;
  }

  async deleteRetryPolicy(id) {
    const query = 'DELETE FROM retry_policies WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  // ─── Rate Limits ──────────────────────────────────────────────────────────────

  async createRateLimit(rateLimitData) {
    const id = rateLimitData.id || uuidv4();
    const query = `
      INSERT INTO rate_limits (
        id, integration_id, organization_id, scope, max_requests,
        window_ms, burst_size, queue_enabled, queue_max_size, handle_429,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      rateLimitData.integrationId,
      rateLimitData.organizationId,
      rateLimitData.scope || 'connector',
      rateLimitData.maxRequests || 100,
      rateLimitData.windowMs || 60000,
      rateLimitData.burstSize || 10,
      rateLimitData.queueEnabled !== undefined ? rateLimitData.queueEnabled : true,
      rateLimitData.queueMaxSize || 1000,
      rateLimitData.handle429 || 'queue'
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToRateLimit(result.rows[0]);
  }

  async findRateLimitById(id) {
    const query = 'SELECT * FROM rate_limits WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToRateLimit(result.rows[0]) : null;
  }

  async findRateLimitByIntegration(integrationId) {
    const query = 'SELECT * FROM rate_limits WHERE integration_id = $1';
    const result = await this.db.query(query, [integrationId]);
    return result.rows[0] ? this.mapRowToRateLimit(result.rows[0]) : null;
  }

  async findRateLimitsByOrganization(organizationId) {
    const query = 'SELECT * FROM rate_limits WHERE organization_id = $1 ORDER BY created_at DESC';
    const result = await this.db.query(query, [organizationId]);
    return result.rows.map(row => this.mapRowToRateLimit(row));
  }

  async updateRateLimit(id, updates) {
    const allowedFields = [
      'scope', 'max_requests', 'window_ms', 'burst_size',
      'queue_enabled', 'queue_max_size', 'handle_429'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE rate_limits 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToRateLimit(result.rows[0]) : null;
  }

  async deleteRateLimit(id) {
    const query = 'DELETE FROM rate_limits WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  // ─── Connection Templates ─────────────────────────────────────────────────────

  async createConnectionTemplate(templateData) {
    const id = templateData.id || uuidv4();
    const query = `
      INSERT INTO connection_templates (
        id, name, display_name, description, category, provider,
        integration_type, auth_type, configuration, auth_configuration,
        capabilities, is_system, is_featured, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      templateData.name,
      templateData.displayName || templateData.name,
      templateData.description || '',
      templateData.category,
      templateData.provider,
      templateData.integrationType || 'rest',
      templateData.authType || 'api_key',
      JSON.stringify(templateData.configuration || {}),
      JSON.stringify(templateData.authConfiguration || {}),
      templateData.capabilities || [],
      templateData.isSystem || false,
      templateData.isFeatured || false
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToConnectionTemplate(result.rows[0]);
  }

  async findConnectionTemplateById(id) {
    const query = 'SELECT * FROM connection_templates WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToConnectionTemplate(result.rows[0]) : null;
  }

  async findConnectionTemplates(filters = {}) {
    let query = 'SELECT * FROM connection_templates WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.provider) {
      paramCount++;
      query += ` AND provider = $${paramCount}`;
      params.push(filters.provider);
    }

    if (filters.isFeatured !== undefined) {
      paramCount++;
      query += ` AND is_featured = $${paramCount}`;
      params.push(filters.isFeatured);
    }

    if (filters.isSystem !== undefined) {
      paramCount++;
      query += ` AND is_system = $${paramCount}`;
      params.push(filters.isSystem);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY is_featured DESC, install_count DESC, rating DESC';

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToConnectionTemplate(row));
  }

  async updateConnectionTemplate(id, updates) {
    const allowedFields = [
      'name', 'display_name', 'description', 'category', 'provider',
      'integration_type', 'auth_type', 'configuration', 'auth_configuration',
      'capabilities', 'is_featured', 'install_count', 'rating'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(id);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE connection_templates 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToConnectionTemplate(result.rows[0]) : null;
  }

  async deleteConnectionTemplate(id) {
    const query = 'DELETE FROM connection_templates WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  // ─── Connector Metadata ───────────────────────────────────────────────────────

  async createConnectorMetadata(metadataData) {
    const id = metadataData.id || uuidv4();
    const query = `
      INSERT INTO connector_metadata (
        id, provider, name, display_name, description, category,
        icon, auth_types, integration_types, capabilities,
        configuration_schema, auth_schema, is_official, version,
        documentation_url, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      metadataData.provider,
      metadataData.name,
      metadataData.displayName || metadataData.name,
      metadataData.description || '',
      metadataData.category,
      metadataData.icon || 'puzzle',
      metadataData.authTypes || [],
      metadataData.integrationTypes || [],
      metadataData.capabilities || [],
      JSON.stringify(metadataData.configurationSchema || {}),
      JSON.stringify(metadataData.authSchema || {}),
      metadataData.isOfficial || false,
      metadataData.version || '1.0.0',
      metadataData.documentationUrl || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToConnectorMetadata(result.rows[0]);
  }

  async findConnectorMetadataByProvider(provider) {
    const query = 'SELECT * FROM connector_metadata WHERE provider = $1';
    const result = await this.db.query(query, [provider]);
    return result.rows[0] ? this.mapRowToConnectorMetadata(result.rows[0]) : null;
  }

  async findAllConnectorMetadata(filters = {}) {
    let query = 'SELECT * FROM connector_metadata WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.isOfficial !== undefined) {
      paramCount++;
      query += ` AND is_official = $${paramCount}`;
      params.push(filters.isOfficial);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY is_official DESC, name ASC';

    const result = await this.db.query(query, params);
    return result.rows.map(row => this.mapRowToConnectorMetadata(row));
  }

  async updateConnectorMetadata(provider, updates) {
    const allowedFields = [
      'name', 'display_name', 'description', 'category', 'icon',
      'auth_types', 'integration_types', 'capabilities',
      'configuration_schema', 'auth_schema', 'is_official',
      'version', 'documentation_url'
    ];

    const setClause = [];
    const params = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
      if (allowedFields.includes(dbKey)) {
        paramCount++;
        setClause.push(`${dbKey} = $${paramCount}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (setClause.length === 0) return null;

    paramCount++;
    params.push(provider);
    setClause.push(`updated_at = NOW()`);

    const query = `
      UPDATE connector_metadata 
      SET ${setClause.join(', ')}
      WHERE provider = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToConnectorMetadata(result.rows[0]) : null;
  }

  // ─── Integration Events ───────────────────────────────────────────────────────

  async createIntegrationEvent(eventData) {
    const id = eventData.id || uuidv4();
    const query = `
      INSERT INTO integration_events (
        id, integration_id, organization_id, event_type, level,
        message, event_data, triggered_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      eventData.integrationId || null,
      eventData.organizationId,
      eventData.eventType,
      eventData.level || 'info',
      eventData.message,
      JSON.stringify(eventData.eventData || {}),
      eventData.triggeredBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToIntegrationEvent(result.rows[0]);
  }

  async findIntegrationEventsByIntegration(integrationId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM integration_events 
      WHERE integration_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [integrationId, limit, offset]);
    return result.rows.map(row => this.mapRowToIntegrationEvent(row));
  }

  async findIntegrationEventsByOrganization(organizationId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM integration_events 
      WHERE organization_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [organizationId, limit, offset]);
    return result.rows.map(row => this.mapRowToIntegrationEvent(row));
  }

  // ─── Request/Response Logs ────────────────────────────────────────────────────

  async createRequestLog(logData) {
    const id = logData.id || uuidv4();
    const query = `
      INSERT INTO request_logs (
        id, integration_id, organization_id, method, url,
        headers, body, query_params, retry_policy_id, rate_limit_id, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      logData.integrationId,
      logData.organizationId,
      logData.method,
      logData.url,
      JSON.stringify(logData.headers || {}),
      logData.body ? JSON.stringify(logData.body) : null,
      JSON.stringify(logData.queryParams || {}),
      logData.retryPolicyId || null,
      logData.rateLimitId || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToRequestLog(result.rows[0]);
  }

  async createResponseLog(logData) {
    const id = logData.id || uuidv4();
    const query = `
      INSERT INTO response_logs (
        id, integration_id, organization_id, request_log_id, status_code,
        headers, body, duration_ms, retry_count, error, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      logData.integrationId,
      logData.organizationId,
      logData.requestLogId || null,
      logData.statusCode,
      JSON.stringify(logData.headers || {}),
      logData.body ? JSON.stringify(logData.body) : null,
      logData.durationMs,
      logData.retryCount || 0,
      logData.error || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToResponseLog(result.rows[0]);
  }

  async findRequestLogsByIntegration(integrationId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM request_logs 
      WHERE integration_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [integrationId, limit, offset]);
    return result.rows.map(row => this.mapRowToRequestLog(row));
  }

  async findResponseLogsByIntegration(integrationId, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM response_logs 
      WHERE integration_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await this.db.query(query, [integrationId, limit, offset]);
    return result.rows.map(row => this.mapRowToResponseLog(row));
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────────

  mapRowToWebhookEndpoint(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      name: row.name,
      description: row.description,
      eventType: row.event_type,
      path: row.path,
      secret: row.secret,
      headers: row.headers,
      isEnabled: row.is_enabled,
      status: row.status,
      lastTriggeredAt: row.last_triggered_at,
      triggerCount: row.trigger_count,
      errorCount: row.error_count,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToWebhookLog(row) {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      eventType: row.event_type,
      method: row.method,
      headers: row.headers,
      payload: row.payload,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      error: row.error,
      durationMs: row.duration_ms,
      retryCount: row.retry_count,
      signatureValid: row.signature_valid,
      createdAt: row.created_at
    };
  }

  mapRowToRetryPolicy(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      name: row.name,
      strategy: row.strategy,
      maxRetries: row.max_retries,
      initialDelayMs: row.initial_delay_ms,
      maxDelayMs: row.max_delay_ms,
      backoffMultiplier: parseFloat(row.backoff_multiplier),
      circuitBreakerThreshold: row.circuit_breaker_threshold,
      circuitBreakerTimeoutMs: row.circuit_breaker_timeout_ms,
      retryableStatusCodes: row.retryable_status_codes,
      retryableErrors: row.retryable_errors,
      isEnabled: row.is_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToRateLimit(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      scope: row.scope,
      maxRequests: row.max_requests,
      windowMs: row.window_ms,
      burstSize: row.burst_size,
      queueEnabled: row.queue_enabled,
      queueMaxSize: row.queue_max_size,
      handle429: row.handle_429,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToConnectionTemplate(row) {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      provider: row.provider,
      integrationType: row.integration_type,
      authType: row.auth_type,
      configuration: row.configuration,
      authConfiguration: row.auth_configuration,
      capabilities: row.capabilities,
      isSystem: row.is_system,
      isFeatured: row.is_featured,
      installCount: row.install_count,
      rating: parseFloat(row.rating),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToConnectorMetadata(row) {
    return {
      id: row.id,
      provider: row.provider,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      category: row.category,
      icon: row.icon,
      authTypes: row.auth_types,
      integrationTypes: row.integration_types,
      capabilities: row.capabilities,
      configurationSchema: row.configuration_schema,
      authSchema: row.auth_schema,
      isOfficial: row.is_official,
      version: row.version,
      documentationUrl: row.documentation_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToIntegrationEvent(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      eventType: row.event_type,
      level: row.level,
      message: row.message,
      eventData: row.event_data,
      triggeredBy: row.triggered_by,
      createdAt: row.created_at
    };
  }

  mapRowToRequestLog(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      method: row.method,
      url: row.url,
      headers: row.headers,
      body: row.body,
      queryParams: row.query_params,
      retryPolicyId: row.retry_policy_id,
      rateLimitId: row.rate_limit_id,
      createdAt: row.created_at
    };
  }

  mapRowToResponseLog(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      requestLogId: row.request_log_id,
      statusCode: row.status_code,
      headers: row.headers,
      body: row.body,
      durationMs: row.duration_ms,
      retryCount: row.retry_count,
      error: row.error,
      createdAt: row.created_at
    };
  }
}

export default IntegrationRepositoryEnhanced;