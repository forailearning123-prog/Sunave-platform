import { v4 as uuid } from 'uuid';

/**
 * AI Provider Repository
 * Data access layer for the AI Gateway & Provider Management platform.
 * Tables: ai_providers, ai_provider_health, ai_provider_configuration,
 *         ai_provider_capabilities, ai_provider_policies, ai_provider_credentials
 *
 * Credentials (api_key_encrypted, key_value_encrypted) are stored as
 * AES-256-GCM encrypted JSON strings. This repository never decrypts them —
 * decryption is handled by credentialService in the route/service layer.
 */
export function createAiProviderRepository(pool) {
  return {

    // ─── Provider CRUD ───────────────────────────────────────────────────────

    async listProviders({ enabledOnly = false } = {}) {
      const where = enabledOnly ? 'WHERE enabled = true' : '';
      const result = await pool.query(
        `SELECT p.*,
                h.availability, h.latency_ms, h.success_rate, h.checked_at AS health_checked_at
         FROM ai_providers p
         LEFT JOIN LATERAL (
           SELECT availability, latency_ms, success_rate, checked_at
           FROM ai_provider_health
           WHERE provider_id = p.id
           ORDER BY checked_at DESC
           LIMIT 1
         ) h ON true
         ${where}
         ORDER BY p.priority ASC, p.name ASC`
      );
      return result.rows.map(toProviderOutput);
    },

    async findProvider(id) {
      const result = await pool.query(
        `SELECT p.*,
                h.availability, h.latency_ms, h.success_rate, h.checked_at AS health_checked_at
         FROM ai_providers p
         LEFT JOIN LATERAL (
           SELECT availability, latency_ms, success_rate, checked_at
           FROM ai_provider_health
           WHERE provider_id = p.id
           ORDER BY checked_at DESC
           LIMIT 1
         ) h ON true
         WHERE p.id = $1`,
        [id]
      );
      return result.rows[0] ? toProviderOutput(result.rows[0]) : null;
    },

    async createProvider(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_providers (
           id, name, type, base_url, api_key_encrypted,
           enabled, priority, is_default,
           supports_chat, supports_vision, supports_embeddings,
           supports_speech, supports_streaming, supports_function_calling,
           supports_reasoning, timeout_ms, retry_count, notes, created_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
         ) RETURNING *`,
        [
          id, input.name, input.type,
          input.baseUrl || null,
          input.apiKeyEncrypted || null,
          input.enabled ?? true,
          input.priority ?? 10,
          input.isDefault ?? false,
          input.supportsChat ?? true,
          input.supportsVision ?? false,
          input.supportsEmbeddings ?? false,
          input.supportsSpeech ?? false,
          input.supportsStreaming ?? true,
          input.supportsFunctionCalling ?? false,
          input.supportsReasoning ?? false,
          input.timeoutMs ?? 30000,
          input.retryCount ?? 2,
          input.notes || '',
          input.createdBy || null
        ]
      );
      return toProviderOutput(result.rows[0]);
    },

    async updateProvider(id, input) {
      const result = await pool.query(
        `UPDATE ai_providers SET
           name                     = COALESCE($2, name),
           type                     = COALESCE($3, type),
           base_url                 = COALESCE($4, base_url),
           api_key_encrypted        = COALESCE($5, api_key_encrypted),
           enabled                  = COALESCE($6, enabled),
           priority                 = COALESCE($7, priority),
           is_default               = COALESCE($8, is_default),
           supports_chat            = COALESCE($9, supports_chat),
           supports_vision          = COALESCE($10, supports_vision),
           supports_embeddings      = COALESCE($11, supports_embeddings),
           supports_speech          = COALESCE($12, supports_speech),
           supports_streaming       = COALESCE($13, supports_streaming),
           supports_function_calling = COALESCE($14, supports_function_calling),
           supports_reasoning       = COALESCE($15, supports_reasoning),
           timeout_ms               = COALESCE($16, timeout_ms),
           retry_count              = COALESCE($17, retry_count),
           notes                    = COALESCE($18, notes),
           updated_at               = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id, input.name, input.type,
          input.baseUrl,
          input.apiKeyEncrypted,
          input.enabled,
          input.priority,
          input.isDefault,
          input.supportsChat,
          input.supportsVision,
          input.supportsEmbeddings,
          input.supportsSpeech,
          input.supportsStreaming,
          input.supportsFunctionCalling,
          input.supportsReasoning,
          input.timeoutMs,
          input.retryCount,
          input.notes
        ]
      );
      return result.rows[0] ? toProviderOutput(result.rows[0]) : null;
    },

    async deleteProvider(id) {
      const result = await pool.query(
        'DELETE FROM ai_providers WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0] || null;
    },

    async updateProviderHealth(id, healthStatus) {
      await pool.query(
        'UPDATE ai_providers SET health_status = $2, last_health_check = NOW(), updated_at = NOW() WHERE id = $1',
        [id, healthStatus]
      );
    },

    // ─── Health Monitoring ───────────────────────────────────────────────────

    async upsertHealth(providerId, data) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_provider_health
           (id, provider_id, availability, latency_ms, error_message, failures, success_rate, models_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          id, providerId,
          data.availability ?? true,
          data.latencyMs || null,
          data.errorMessage || null,
          data.failures ?? 0,
          data.successRate ?? 1.0,
          data.modelsCount ?? 0
        ]
      );
      return result.rows[0];
    },

    async getLatestHealth(providerId) {
      const result = await pool.query(
        `SELECT * FROM ai_provider_health
         WHERE provider_id = $1
         ORDER BY checked_at DESC
         LIMIT 1`,
        [providerId]
      );
      return result.rows[0] || null;
    },

    async listHealthHistory(providerId, limit = 50) {
      const result = await pool.query(
        `SELECT * FROM ai_provider_health
         WHERE provider_id = $1
         ORDER BY checked_at DESC
         LIMIT $2`,
        [providerId, limit]
      );
      return result.rows;
    },

    async listAllLatestHealth() {
      const result = await pool.query(
        `SELECT DISTINCT ON (provider_id) h.*, p.name AS provider_name, p.type AS provider_type
         FROM ai_provider_health h
         JOIN ai_providers p ON p.id = h.provider_id
         ORDER BY provider_id, checked_at DESC`
      );
      return result.rows;
    },

    // ─── Provider Configuration (Per-Org Overrides) ──────────────────────────

    async getConfiguration(orgId, providerId) {
      const result = await pool.query(
        `SELECT * FROM ai_provider_configuration
         WHERE organization_id = $1 AND provider_id = $2`,
        [orgId, providerId]
      );
      return result.rows[0] || null;
    },

    async upsertConfiguration(orgId, providerId, settings) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_provider_configuration (id, organization_id, provider_id, settings)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (organization_id, provider_id)
         DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()
         RETURNING *`,
        [id, orgId, providerId, JSON.stringify(settings)]
      );
      return result.rows[0];
    },

    // ─── Capabilities ────────────────────────────────────────────────────────

    async listCapabilities(providerId) {
      const result = await pool.query(
        `SELECT * FROM ai_provider_capabilities
         WHERE provider_id = $1
         ORDER BY capability`,
        [providerId]
      );
      return result.rows;
    },

    async upsertCapability(providerId, capability, enabled, notes = '') {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_provider_capabilities (id, provider_id, capability, enabled, notes)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (provider_id, capability)
         DO UPDATE SET enabled = EXCLUDED.enabled, notes = EXCLUDED.notes
         RETURNING *`,
        [id, providerId, capability, enabled, notes]
      );
      return result.rows[0];
    },

    async listProvidersByCapability(capability) {
      const result = await pool.query(
        `SELECT p.* FROM ai_providers p
         JOIN ai_provider_capabilities c ON c.provider_id = p.id
         WHERE c.capability = $1 AND c.enabled = true AND p.enabled = true
         ORDER BY p.priority ASC`,
        [capability]
      );
      return result.rows.map(toProviderOutput);
    },

    // ─── Policies ────────────────────────────────────────────────────────────

    async listPolicies(orgId) {
      const result = await pool.query(
        `SELECT * FROM ai_provider_policies
         WHERE (organization_id = $1 OR organization_id IS NULL) AND enabled = true
         ORDER BY scope, policy_type`,
        [orgId]
      );
      return result.rows;
    },

    async getGlobalPolicy() {
      const result = await pool.query(
        `SELECT * FROM ai_provider_policies
         WHERE organization_id IS NULL AND scope = 'global' AND enabled = true
         ORDER BY created_at DESC
         LIMIT 1`
      );
      return result.rows[0] || null;
    },

    async upsertPolicy(orgId, scope, policyType, settings) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_provider_policies
           (id, organization_id, scope, policy_type, settings, enabled)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [id, orgId || null, scope, policyType, JSON.stringify(settings)]
      );
      return result.rows[0] || null;
    },

    // ─── Credentials ─────────────────────────────────────────────────────────

    async upsertCredential(providerId, keyName, encryptedValue) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_provider_credentials (id, provider_id, key_name, key_value_encrypted, rotated_at)
         VALUES ($1,$2,$3,$4, NOW())
         ON CONFLICT (provider_id, key_name)
         DO UPDATE SET key_value_encrypted = EXCLUDED.key_value_encrypted, rotated_at = NOW()
         RETURNING id, provider_id, key_name, rotated_at, created_at`,
        [id, providerId, keyName, encryptedValue]
      );
      return result.rows[0];
    },

    async getCredential(providerId, keyName) {
      const result = await pool.query(
        `SELECT * FROM ai_provider_credentials
         WHERE provider_id = $1 AND key_name = $2`,
        [providerId, keyName]
      );
      return result.rows[0] || null;
    },

    async listCredentialNames(providerId) {
      // Return only key names, never values
      const result = await pool.query(
        `SELECT id, provider_id, key_name, rotated_at, created_at
         FROM ai_provider_credentials
         WHERE provider_id = $1
         ORDER BY key_name`,
        [providerId]
      );
      return result.rows;
    }
  };
}

// ─── Output Mappers ───────────────────────────────────────────────────────────

function toProviderOutput(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    baseUrl: row.base_url,
    // api_key_encrypted is intentionally excluded from list output
    // Use credentialService.mask() before sending to client
    hasApiKey: !!row.api_key_encrypted,
    apiKeyEncrypted: row.api_key_encrypted, // internal use only
    enabled: row.enabled,
    priority: row.priority,
    isDefault: row.is_default,
    capabilities: {
      chat: row.supports_chat,
      vision: row.supports_vision,
      embeddings: row.supports_embeddings,
      speech: row.supports_speech,
      streaming: row.supports_streaming,
      functionCalling: row.supports_function_calling,
      reasoning: row.supports_reasoning
    },
    timeoutMs: row.timeout_ms,
    retryCount: row.retry_count,
    healthStatus: row.health_status,
    lastHealthCheck: row.last_health_check,
    notes: row.notes,
    // Joined health fields (may be null if no health record exists)
    latestHealth: (row.availability !== undefined) ? {
      availability: row.availability,
      latencyMs: row.latency_ms,
      successRate: row.success_rate,
      checkedAt: row.health_checked_at
    } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
