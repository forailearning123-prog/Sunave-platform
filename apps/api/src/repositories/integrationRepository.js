// Integration Repository
// Data access layer for integration framework

import { v4 as uuidv4 } from 'uuid';

class IntegrationRepository {
  constructor(db) {
    this.db = db;
  }

  // ─── Integration CRUD ────────────────────────────────────────────────────────

  async create(integrationData) {
    const id = integrationData.id || uuidv4();
    const query = `
      INSERT INTO integrations (
        id, organization_id, plugin_id, name, display_name, description,
        provider, integration_type, auth_type, configuration, status,
        is_enabled, last_sync_at, last_error_at, last_error_message,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      integrationData.organizationId,
      integrationData.pluginId || null,
      integrationData.name,
      integrationData.displayName || integrationData.name,
      integrationData.description || '',
      integrationData.provider,
      integrationData.integrationType || 'rest',
      integrationData.authType || 'api_key',
      JSON.stringify(integrationData.configuration || {}),
      integrationData.status || 'inactive',
      integrationData.isEnabled || false,
      integrationData.lastSyncAt || null,
      integrationData.lastErrorAt || null,
      integrationData.lastErrorMessage || null,
      integrationData.createdBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToIntegration(result.rows[0]);
  }

  async findById(id) {
    const query = 'SELECT * FROM integrations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToIntegration(result.rows[0]) : null;
  }

  async findByOrganization(organizationId, filters = {}) {
    let query = 'SELECT * FROM integrations WHERE organization_id = $1';
    const params = [organizationId];
    let paramCount = 1;

    if (filters.provider) {
      paramCount++;
      query += ` AND provider = $${paramCount}`;
      params.push(filters.provider);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    if (filters.isEnabled !== undefined) {
      paramCount++;
      query += ` AND is_enabled = $${paramCount}`;
      params.push(filters.isEnabled);
    }

    if (filters.search) {
      paramCount++;
      query += ` AND (name ILIKE $${paramCount} OR display_name ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY created_at DESC';

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
    return result.rows.map(row => this.mapRowToIntegration(row));
  }

  async update(id, updates) {
    const allowedFields = [
      'name', 'display_name', 'description', 'provider', 'integration_type',
      'auth_type', 'configuration', 'status', 'is_enabled', 'last_sync_at',
      'last_error_at', 'last_error_message'
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
      UPDATE integrations 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToIntegration(result.rows[0]) : null;
  }

  async delete(id) {
    const query = 'DELETE FROM integrations WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  async exists(id) {
    const query = 'SELECT EXISTS(SELECT 1 FROM integrations WHERE id = $1)';
    const result = await this.db.query(query, [id]);
    return result.rows[0].exists;
  }

  // ─── Integration Credentials ─────────────────────────────────────────────────

  async createCredential(credentialData) {
    const id = credentialData.id || uuidv4();
    const query = `
      INSERT INTO integration_credentials (
        id, integration_id, organization_id, credential_type,
        encrypted_value, iv, auth_tag, expires_at, last_used_at,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      ) RETURNING *
    `;
    
    const params = [
      id,
      credentialData.integrationId,
      credentialData.organizationId,
      credentialData.credentialType,
      JSON.stringify(credentialData.encryptedValue),
      credentialData.iv,
      credentialData.authTag,
      credentialData.expiresAt || null,
      credentialData.lastUsedAt || null,
      credentialData.createdBy || null
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToCredential(result.rows[0]);
  }

  async findCredentialById(id) {
    const query = 'SELECT * FROM integration_credentials WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rows[0] ? this.mapRowToCredential(result.rows[0]) : null;
  }

  async findCredentialsByIntegration(integrationId) {
    const query = `
      SELECT * FROM integration_credentials 
      WHERE integration_id = $1
    `;
    const result = await this.db.query(query, [integrationId]);
    return result.rows.map(row => this.mapRowToCredential(row));
  }

  async findCredentialByIntegrationAndType(integrationId, credentialType) {
    const query = `
      SELECT * FROM integration_credentials 
      WHERE integration_id = $1 AND credential_type = $2
    `;
    const result = await this.db.query(query, [integrationId, credentialType]);
    return result.rows[0] ? this.mapRowToCredential(result.rows[0]) : null;
  }

  async updateCredential(id, updates) {
    const allowedFields = [
      'encrypted_value', 'iv', 'auth_tag', 'expires_at', 'last_used_at'
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
      UPDATE integration_credentials 
      SET ${setClause.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, params);
    return result.rows[0] ? this.mapRowToCredential(result.rows[0]) : null;
  }

  async deleteCredential(id) {
    const query = 'DELETE FROM integration_credentials WHERE id = $1 RETURNING id';
    const result = await this.db.query(query, [id]);
    return result.rows.length > 0;
  }

  // ─── Integration Health ──────────────────────────────────────────────────────

  async createOrUpdateHealth(healthData) {
    const query = `
      INSERT INTO integration_health (
        integration_id, organization_id, status, last_check_at,
        last_success_at, last_error_at, last_error_message,
        response_time_ms, metrics, check_count, error_count, updated_at
      ) VALUES (
        $1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, NOW()
      ) ON CONFLICT (integration_id) 
      DO UPDATE SET 
        status = EXCLUDED.status,
        last_check_at = EXCLUDED.last_check_at,
        last_success_at = EXCLUDED.last_success_at,
        last_error_at = EXCLUDED.last_error_at,
        last_error_message = EXCLUDED.last_error_message,
        response_time_ms = EXCLUDED.response_time_ms,
        metrics = EXCLUDED.metrics,
        check_count = EXCLUDED.check_count,
        error_count = EXCLUDED.error_count,
        updated_at = NOW()
      RETURNING *
    `;
    
    const params = [
      healthData.integrationId,
      healthData.organizationId,
      healthData.status,
      healthData.lastSuccessAt,
      healthData.lastErrorAt,
      healthData.lastErrorMessage,
      healthData.responseTimeMs,
      JSON.stringify(healthData.metrics || {}),
      healthData.checkCount || 0,
      healthData.errorCount || 0
    ];
    
    const result = await this.db.query(query, params);
    return this.mapRowToHealth(result.rows[0]);
  }

  async findHealthByIntegration(integrationId) {
    const query = `
      SELECT * FROM integration_health WHERE integration_id = $1
    `;
    const result = await this.db.query(query, [integrationId]);
    return result.rows[0] ? this.mapRowToHealth(result.rows[0]) : null;
  }

  async findHealthByOrganization(organizationId) {
    const query = `
      SELECT ih.*, i.name as integration_name, i.provider
      FROM integration_health ih
      JOIN integrations i ON ih.integration_id = i.id
      WHERE ih.organization_id = $1
      ORDER BY ih.last_check_at DESC
    `;
    const result = await this.db.query(query, [organizationId]);
    return result.rows.map(row => ({
      ...this.mapRowToHealth(row),
      integrationName: row.integration_name,
      provider: row.provider
    }));
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────────

  mapRowToIntegration(row) {
    return {
      id: row.id,
      organizationId: row.organization_id,
      pluginId: row.plugin_id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      provider: row.provider,
      integrationType: row.integration_type,
      authType: row.auth_type,
      configuration: row.configuration,
      status: row.status,
      isEnabled: row.is_enabled,
      lastSyncAt: row.last_sync_at,
      lastErrorAt: row.last_error_at,
      lastErrorMessage: row.last_error_message,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToCredential(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      credentialType: row.credential_type,
      encryptedValue: row.encrypted_value,
      iv: row.iv,
      authTag: row.auth_tag,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  mapRowToHealth(row) {
    return {
      id: row.id,
      integrationId: row.integration_id,
      organizationId: row.organization_id,
      status: row.status,
      lastCheckAt: row.last_check_at,
      lastSuccessAt: row.last_success_at,
      lastErrorAt: row.last_error_at,
      lastErrorMessage: row.last_error_message,
      responseTimeMs: row.response_time_ms,
      metrics: row.metrics,
      checkCount: row.check_count,
      errorCount: row.error_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default IntegrationRepository;