import { v4 as uuid } from 'uuid';

/**
 * AI Model Repository
 * Data access layer for the AI Model Registry.
 * Tables: ai_models, ai_model_capabilities, ai_capabilities
 */
export function createAiModelRepository(pool) {
  return {

    // ─── Model CRUD ───────────────────────────────────────────────────────

    async listModels({ enabledOnly = false, providerId = null } = {}) {
      const conditions = [];
      const params = [];
      let idx = 1;

      if (enabledOnly) {
        conditions.push(`m.enabled = true`);
      }
      if (providerId) {
        conditions.push(`m.provider_id = $${idx++}`);
        params.push(providerId);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT m.*, p.name AS provider_name, p.type AS provider_type
         FROM ai_models m
         JOIN ai_providers p ON p.id = m.provider_id
         ${where}
         ORDER BY m.created_at DESC`,
        params
      );
      return result.rows.map(toModelOutput);
    },

    async findModel(id) {
      const result = await pool.query(
        `SELECT m.*, p.name AS provider_name, p.type AS provider_type
         FROM ai_models m
         JOIN ai_providers p ON p.id = m.provider_id
         WHERE m.id = $1`,
        [id]
      );
      return result.rows[0] ? toModelOutput(result.rows[0]) : null;
    },

    async findModelByExternalId(providerId, externalId) {
      const result = await pool.query(
        `SELECT m.*, p.name AS provider_name, p.type AS provider_type
         FROM ai_models m
         JOIN ai_providers p ON p.id = m.provider_id
         WHERE m.provider_id = $1 AND m.external_id = $2`,
        [providerId, externalId]
      );
      return result.rows[0] ? toModelOutput(result.rows[0]) : null;
    },

    async createModel(input) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_models (
           id, provider_id, name, display_name, version,
           enabled, is_default, context_window, max_output_tokens,
           supports_reasoning, supports_coding, supports_vision,
           supports_speech, supports_embeddings, supports_streaming,
           supports_function_calling, supports_json,
           supports_image_generation, supports_audio_generation, supports_video_generation,
           estimated_cost_input, estimated_cost_output, average_latency_ms,
           status, metadata, external_id
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
         ) RETURNING *`,
        [
          id, input.providerId, input.name, input.displayName || input.name, input.version || '1.0',
          input.enabled ?? true, input.isDefault ?? false,
          input.contextWindow ?? 4096, input.maxOutputTokens ?? 2048,
          input.supportsReasoning ?? false, input.supportsCoding ?? false, input.supportsVision ?? false,
          input.supportsSpeech ?? false, input.supportsEmbeddings ?? false, input.supportsStreaming ?? true,
          input.supportsFunctionCalling ?? false, input.supportsJson ?? false,
          input.supportsImageGeneration ?? false, input.supportsAudioGeneration ?? false, input.supportsVideoGeneration ?? false,
          input.estimatedCostInput ?? 0, input.estimatedCostOutput ?? 0, input.averageLatencyMs || null,
          input.status || 'active', JSON.stringify(input.metadata || {}), input.externalId || null
        ]
      );
      return toModelOutput(result.rows[0]);
    },

    async updateModel(id, input) {
      const result = await pool.query(
        `UPDATE ai_models SET
           name                      = COALESCE($2, name),
           display_name              = COALESCE($3, display_name),
           version                   = COALESCE($4, version),
           enabled                   = COALESCE($5, enabled),
           is_default                = COALESCE($6, is_default),
           context_window            = COALESCE($7, context_window),
           max_output_tokens         = COALESCE($8, max_output_tokens),
           supports_reasoning        = COALESCE($9, supports_reasoning),
           supports_coding           = COALESCE($10, supports_coding),
           supports_vision           = COALESCE($11, supports_vision),
           supports_speech           = COALESCE($12, supports_speech),
           supports_embeddings       = COALESCE($13, supports_embeddings),
           supports_streaming        = COALESCE($14, supports_streaming),
           supports_function_calling = COALESCE($15, supports_function_calling),
           supports_json             = COALESCE($16, supports_json),
           supports_image_generation = COALESCE($17, supports_image_generation),
           supports_audio_generation = COALESCE($18, supports_audio_generation),
           supports_video_generation = COALESCE($19, supports_video_generation),
           estimated_cost_input      = COALESCE($20, estimated_cost_input),
           estimated_cost_output     = COALESCE($21, estimated_cost_output),
           average_latency_ms        = COALESCE($22, average_latency_ms),
           status                    = COALESCE($23, status),
           metadata                  = CASE WHEN $24 IS NOT NULL THEN $24::jsonb ELSE metadata END,
           external_id               = COALESCE($25, external_id),
           updated_at                = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          id, input.name, input.displayName, input.version,
          input.enabled, input.isDefault,
          input.contextWindow, input.maxOutputTokens,
          input.supportsReasoning, input.supportsCoding, input.supportsVision,
          input.supportsSpeech, input.supportsEmbeddings, input.supportsStreaming,
          input.supportsFunctionCalling, input.supportsJson,
          input.supportsImageGeneration, input.supportsAudioGeneration, input.supportsVideoGeneration,
          input.estimatedCostInput, input.estimatedCostOutput, input.averageLatencyMs,
          input.status, input.metadata ? JSON.stringify(input.metadata) : null, input.externalId
        ]
      );
      return result.rows[0] ? toModelOutput(result.rows[0]) : null;
    },

    async deleteModel(id) {
      const result = await pool.query(
        'DELETE FROM ai_models WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0] || null;
    },

    async setDefaultModel(providerId, modelId) {
      // Unset all defaults for this provider
      await pool.query(
        `UPDATE ai_models SET is_default = false WHERE provider_id = $1`,
        [providerId]
      );
      // Set the new default
      await pool.query(
        `UPDATE ai_models SET is_default = true WHERE id = $1`,
        [modelId]
      );
    },

    async countModelsByProvider(providerId) {
      const result = await pool.query(
        `SELECT COUNT(*)::int AS count FROM ai_models WHERE provider_id = $1`,
        [providerId]
      );
      return result.rows[0].count;
    },

    // ─── Model Discovery & Sync ───────────────────────────────────────────

    async upsertModelByExternalId(providerId, input) {
      const existing = await this.findModelByExternalId(providerId, input.externalId);
      if (existing) {
        return this.updateModel(existing.id, input);
      }
      return this.createModel({ ...input, providerId });
    },

    async refreshModelMetadata(id, metadata) {
      const result = await pool.query(
        `UPDATE ai_models SET metadata = COALESCE(metadata, '{}') || $2::jsonb, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, JSON.stringify(metadata)]
      );
      return result.rows[0] ? toModelOutput(result.rows[0]) : null;
    },

    async refreshModelPricing(id, costInput, costOutput) {
      const result = await pool.query(
        `UPDATE ai_models SET estimated_cost_input = $2, estimated_cost_output = $3, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [id, costInput, costOutput]
      );
      return result.rows[0] ? toModelOutput(result.rows[0]) : null;
    },

    async enableModel(id) {
      await pool.query(
        `UPDATE ai_models SET enabled = true, updated_at = NOW() WHERE id = $1`,
        [id]
      );
    },

    async disableModel(id) {
      await pool.query(
        `UPDATE ai_models SET enabled = false, updated_at = NOW() WHERE id = $1`,
        [id]
      );
    },

    // ─── Model Capabilities ──────────────────────────────────────────────

    async listModelCapabilities(modelId) {
      const result = await pool.query(
        `SELECT mc.*, c.name AS capability_name, c.display_name, c.description, c.category, c.icon
         FROM ai_model_capabilities mc
         JOIN ai_capabilities c ON c.id = mc.capability_id
         WHERE mc.model_id = $1
         ORDER BY mc.priority ASC, c.name ASC`,
        [modelId]
      );
      return result.rows;
    },

    async addModelCapability(modelId, capabilityId, { enabled = true, priority = 10, config = {} } = {}) {
      const id = uuid();
      const result = await pool.query(
        `INSERT INTO ai_model_capabilities (id, model_id, capability_id, enabled, priority, config)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (model_id, capability_id)
         DO UPDATE SET enabled = EXCLUDED.enabled, priority = EXCLUDED.priority, config = EXCLUDED.config
         RETURNING *`,
        [id, modelId, capabilityId, enabled, priority, JSON.stringify(config)]
      );
      return result.rows[0];
    },

    async removeModelCapability(modelId, capabilityId) {
      await pool.query(
        `DELETE FROM ai_model_capabilities WHERE model_id = $1 AND capability_id = $2`,
        [modelId, capabilityId]
      );
    },

    async enableModelCapability(modelId, capabilityId) {
      await pool.query(
        `UPDATE ai_model_capabilities SET enabled = true WHERE model_id = $1 AND capability_id = $2`,
        [modelId, capabilityId]
      );
    },

    async disableModelCapability(modelId, capabilityId) {
      await pool.query(
        `UPDATE ai_model_capabilities SET enabled = false WHERE model_id = $1 AND capability_id = $2`,
        [modelId, capabilityId]
      );
    }
  };
}

function toModelOutput(row) {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerType: row.provider_type,
    name: row.name,
    displayName: row.display_name,
    version: row.version,
    enabled: row.enabled,
    isDefault: row.is_default,
    contextWindow: row.context_window,
    maxOutputTokens: row.max_output_tokens,
    supports: {
      reasoning: row.supports_reasoning,
      coding: row.supports_coding,
      vision: row.supports_vision,
      speech: row.supports_speech,
      embeddings: row.supports_embeddings,
      streaming: row.supports_streaming,
      functionCalling: row.supports_function_calling,
      json: row.supports_json,
      imageGeneration: row.supports_image_generation,
      audioGeneration: row.supports_audio_generation,
      videoGeneration: row.supports_video_generation
    },
    estimatedCostInput: Number(row.estimated_cost_input),
    estimatedCostOutput: Number(row.estimated_cost_output),
    averageLatencyMs: row.average_latency_ms,
    status: row.status,
    metadata: row.metadata,
    externalId: row.external_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}