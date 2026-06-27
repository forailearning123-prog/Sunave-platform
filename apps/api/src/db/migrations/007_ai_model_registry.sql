-- AI Model Registry & Platform Management Migration
-- Migration 007 — runs exactly once via schema_migrations tracking
-- Tables: ai_models, ai_capabilities, ai_model_capabilities, ai_usage,
--         ai_token_usage, ai_cost_summary, ai_budget

-- ─── AI Models Registry ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_models (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id               UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  name                      VARCHAR(200) NOT NULL,
  display_name              VARCHAR(300),
  version                   VARCHAR(60) NOT NULL DEFAULT '1.0',
  enabled                   BOOLEAN NOT NULL DEFAULT true,
  is_default                BOOLEAN NOT NULL DEFAULT false,
  context_window            INTEGER NOT NULL DEFAULT 4096,
  max_output_tokens         INTEGER NOT NULL DEFAULT 2048,
  -- Capability flags
  supports_reasoning        BOOLEAN NOT NULL DEFAULT false,
  supports_coding           BOOLEAN NOT NULL DEFAULT false,
  supports_vision           BOOLEAN NOT NULL DEFAULT false,
  supports_speech           BOOLEAN NOT NULL DEFAULT false,
  supports_embeddings       BOOLEAN NOT NULL DEFAULT false,
  supports_streaming        BOOLEAN NOT NULL DEFAULT true,
  supports_function_calling BOOLEAN NOT NULL DEFAULT false,
  supports_json             BOOLEAN NOT NULL DEFAULT false,
  supports_image_generation BOOLEAN NOT NULL DEFAULT false,
  supports_audio_generation BOOLEAN NOT NULL DEFAULT false,
  supports_video_generation BOOLEAN NOT NULL DEFAULT false,
  -- Cost estimation (USD per 1K tokens/units)
  estimated_cost_input      NUMERIC(12,8) NOT NULL DEFAULT 0,
  estimated_cost_output     NUMERIC(12,8) NOT NULL DEFAULT 0,
  average_latency_ms        INTEGER,
  -- Operational
  status                    VARCHAR(20) NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','deprecated','beta','experimental','retired')),
  metadata                  JSONB DEFAULT '{}',
  external_id               VARCHAR(200),
  -- Audit
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_ai_models_provider   ON ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_enabled     ON ai_models(enabled, status);
CREATE INDEX IF NOT EXISTS idx_ai_models_default     ON ai_models(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_ai_models_capabilities ON ai_models USING gin (
  (supports_reasoning::int, supports_coding::int, supports_vision::int,
   supports_speech::int, supports_embeddings::int, supports_streaming::int,
   supports_function_calling::int, supports_json::int, supports_image_generation::int,
   supports_audio_generation::int, supports_video_generation::int)
);

-- ─── AI Capabilities Registry (Master Capability List) ─────────────────────────
CREATE TABLE IF NOT EXISTS ai_capabilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(80) NOT NULL UNIQUE,
  display_name  VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  category      VARCHAR(60) NOT NULL DEFAULT 'general'
                  CHECK (category IN (
                    'generation','reasoning','coding','vision','speech',
                    'audio','video','understanding','analysis','embeddings',
                    'planning','general'
                  )),
  icon          VARCHAR(40) DEFAULT 'code',
  enabled       BOOLEAN NOT NULL DEFAULT true,
  is_system     BOOLEAN NOT NULL DEFAULT false,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_capabilities_category ON ai_capabilities(category);
CREATE INDEX IF NOT EXISTS idx_ai_capabilities_enabled  ON ai_capabilities(enabled);

-- ─── AI Model ↔ Capability Mapping ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_model_capabilities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id      UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
  capability_id UUID NOT NULL REFERENCES ai_capabilities(id) ON DELETE CASCADE,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  priority      SMALLINT NOT NULL DEFAULT 10,
  config        JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (model_id, capability_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_caps_model      ON ai_model_capabilities(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_caps_capability ON ai_model_capabilities(capability_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_caps_enabled    ON ai_model_capabilities(model_id, capability_id) WHERE enabled = true;

-- ─── AI Usage Tracking (Aggregated) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  provider_id     UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  model_id        UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  capability_id   UUID REFERENCES ai_capabilities(id) ON DELETE SET NULL,
  -- Usage counts
  request_count   BIGINT NOT NULL DEFAULT 0,
  input_tokens    BIGINT NOT NULL DEFAULT 0,
  output_tokens   BIGINT NOT NULL DEFAULT 0,
  total_tokens    BIGINT NOT NULL DEFAULT 0,
  -- Timing
  total_latency_ms BIGINT NOT NULL DEFAULT 0,
  avg_latency_ms  INTEGER,
  -- Status
  success_count   BIGINT NOT NULL DEFAULT 0,
  error_count     BIGINT NOT NULL DEFAULT 0,
  -- Period
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  period_type     VARCHAR(20) NOT NULL DEFAULT 'daily'
                    CHECK (period_type IN ('daily','weekly','monthly','yearly')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider_id, model_id, capability_id, period_start, period_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_org   ON ai_usage(organization_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage(model_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_prov  ON ai_usage(provider_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_period ON ai_usage(period_start, period_type);

-- ─── AI Token Usage (Granular per-request tracking) ───────────────────────────
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  provider_id     UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_id        UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  capability_id   UUID REFERENCES ai_capabilities(id) ON DELETE SET NULL,
  session_id      VARCHAR(120),
  request_id      VARCHAR(120),
  -- Token counts
  prompt_tokens   INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens    INTEGER NOT NULL DEFAULT 0,
  -- Cost
  estimated_cost_usd NUMERIC(16,8) NOT NULL DEFAULT 0,
  actual_cost_usd    NUMERIC(16,8),
  -- Performance
  latency_ms      INTEGER,
  success         BOOLEAN NOT NULL DEFAULT true,
  error_message   TEXT,
  -- Period
  usage_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_org  ON ai_token_usage(organization_id, usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_date ON ai_token_usage(usage_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_req  ON ai_token_usage(request_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_session ON ai_token_usage(session_id);

-- ─── AI Cost Summary ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_cost_summary (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id     UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  model_id        UUID REFERENCES ai_models(id) ON DELETE SET NULL,
  -- Cost totals
  estimated_cost  NUMERIC(16,8) NOT NULL DEFAULT 0,
  actual_cost     NUMERIC(16,8),
  currency        VARCHAR(3) NOT NULL DEFAULT 'USD',
  token_count     BIGINT NOT NULL DEFAULT 0,
  request_count   BIGINT NOT NULL DEFAULT 0,
  -- Period
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  period_type     VARCHAR(20) NOT NULL DEFAULT 'daily'
                    CHECK (period_type IN ('daily','weekly','monthly','yearly')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider_id, model_id, period_start, period_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_cost_org   ON ai_cost_summary(organization_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_model ON ai_cost_summary(model_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_cost_period ON ai_cost_summary(period_start, period_type);

-- ─── AI Budget Configuration ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_budgets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(200) NOT NULL,
  -- Budget scope
  scope           VARCHAR(30) NOT NULL DEFAULT 'organization'
                    CHECK (scope IN ('organization','provider','model','capability','user')),
  scope_id        UUID,
  -- Budget limits
  monthly_limit   NUMERIC(16,8),
  yearly_limit    NUMERIC(16,8),
  token_limit     BIGINT,
  request_limit   BIGINT,
  -- Alerting
  alert_threshold NUMERIC(5,2) NOT NULL DEFAULT 80.00
                    CHECK (alert_threshold BETWEEN 1 AND 100),
  alert_emails    TEXT[] DEFAULT '{}',
  -- Status
  enabled         BOOLEAN NOT NULL DEFAULT true,
  -- Audit
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_budgets_org ON ai_budgets(organization_id);

-- ─── Seed System Capabilities ──────────────────────────────────────────────────
INSERT INTO ai_capabilities (id, name, display_name, description, category, icon, enabled, is_system) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'chat',             'Chat',                'General conversation and Q&A', 'general', 'message-circle', true, true),
  ('a0000000-0000-4000-8000-000000000002', 'reasoning',        'Reasoning',           'Logical reasoning and problem solving', 'reasoning', 'brain', true, true),
  ('a0000000-0000-4000-8000-000000000003', 'coding',           'Coding',              'Code generation and software development', 'coding', 'code', true, true),
  ('a0000000-0000-4000-8000-000000000004', 'planning',         'Planning',            'Task and project planning', 'planning', 'clipboard-list', true, true),
  ('a0000000-0000-4000-8000-000000000005', 'vision',           'Vision',              'Image understanding and analysis', 'vision', 'eye', true, true),
  ('a0000000-0000-4000-8000-000000000006', 'ocr',              'OCR',                 'Optical character recognition', 'vision', 'scan-text', true, true),
  ('a0000000-0000-4000-8000-000000000007', 'speech',           'Speech',              'Speech recognition and synthesis', 'speech', 'volume-2', true, true),
  ('a0000000-0000-4000-8000-000000000008', 'translation',      'Translation',         'Language translation', 'understanding', 'languages', true, true),
  ('a0000000-0000-4000-8000-000000000009', 'summarization',    'Summarization',       'Content summarization', 'understanding', 'file-text', true, true),
  ('a0000000-0000-4000-8000-000000000010', 'embeddings',       'Embeddings',          'Vector embeddings generation', 'embeddings', 'layers', true, true),
  ('a0000000-0000-4000-8000-000000000011', 'research',         'Research',            'Deep research and analysis', 'analysis', 'search', true, true),
  ('a0000000-0000-4000-8000-000000000012', 'document-analysis', 'Document Analysis',  'Document parsing and analysis', 'analysis', 'file-text', true, true),
  ('a0000000-0000-4000-8000-000000000013', 'sql',              'SQL',                 'SQL query generation and analysis', 'coding', 'database', true, true),
  ('a0000000-0000-4000-8000-000000000014', 'data-analysis',    'Data Analysis',       'Data analysis and insights', 'analysis', 'bar-chart-3', true, true),
  ('a0000000-0000-4000-8000-000000000015', 'image-generation', 'Image Generation',    'Image generation', 'generation', 'image', true, true),
  ('a0000000-0000-4000-8000-000000000016', 'video-generation', 'Video Generation',    'Video generation', 'video', 'film', true, true),
  ('a0000000-0000-4000-8000-000000000017', 'audio-generation', 'Audio Generation',    'Audio generation', 'audio', 'music', true, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed Model Policies Configuration Table ───────────────────────────────────
-- Extend ai_provider_policies to include model-level policy support
-- Re-insert with extended policy_type list if needed (handled via migration)

-- ─── Seed: Default AI Models for Sunave Local Provider ─────────────────────────
INSERT INTO ai_models (id, provider_id, name, display_name, version, enabled, is_default,
  context_window, max_output_tokens, supports_reasoning, supports_coding, supports_vision,
  supports_speech, supports_embeddings, supports_streaming, supports_function_calling,
  supports_json, supports_image_generation, supports_audio_generation, supports_video_generation,
  estimated_cost_input, estimated_cost_output, status, external_id)
SELECT
  'b0000000-0000-4000-8000-000000000001', id, 'sunave-local-v1', 'Sunave Local v1', '1.0', true, true,
  8192, 2048, true, true, false, false, true, true, true, true, false, false, false,
  0, 0, 'active', 'sunave-local-v1'
FROM ai_providers WHERE type = 'sunave_local'
ON CONFLICT (provider_id, name, version) DO NOTHING;

INSERT INTO ai_models (id, provider_id, name, display_name, version, enabled, is_default,
  context_window, max_output_tokens, supports_reasoning, supports_coding, supports_vision,
  supports_speech, supports_embeddings, supports_streaming, supports_function_calling,
  supports_json, supports_image_generation, supports_audio_generation, supports_video_generation,
  estimated_cost_input, estimated_cost_output, status, external_id)
SELECT
  'b0000000-0000-4000-8000-000000000002', id, 'sunave-local-mini', 'Sunave Local Mini', '1.0', true, false,
  4096, 1024, false, true, false, false, true, true, false, true, false, false, false,
  0, 0, 'active', 'sunave-local-mini'
FROM ai_providers WHERE type = 'sunave_local'
ON CONFLICT (provider_id, name, version) DO NOTHING;

-- ─── Seed: Model ↔ Capability Mappings for Sunave Local ────────────────────────
INSERT INTO ai_model_capabilities (id, model_id, capability_id, enabled, priority)
SELECT
  gen_random_uuid(), m.id, c.id, true, 10
FROM ai_models m, ai_capabilities c
WHERE m.provider_id = (SELECT id FROM ai_providers WHERE type = 'sunave_local' LIMIT 1)
  AND c.name IN ('chat', 'embeddings', 'summarization')
  AND NOT EXISTS (
    SELECT 1 FROM ai_model_capabilities mc WHERE mc.model_id = m.id AND mc.capability_id = c.id
  );

INSERT INTO ai_model_capabilities (id, model_id, capability_id, enabled, priority)
SELECT
  gen_random_uuid(), m.id, c.id, true, 10
FROM ai_models m, ai_capabilities c
WHERE m.provider_id = (SELECT id FROM ai_providers WHERE type = 'sunave_local' LIMIT 1)
  AND m.name = 'sunave-local-v1'
  AND c.name IN ('reasoning', 'coding', 'function_calling', 'data-analysis', 'sql')
  AND NOT EXISTS (
    SELECT 1 FROM ai_model_capabilities mc WHERE mc.model_id = m.id AND mc.capability_id = c.id
  );

-- ─── Update existing ai_provider_policies CHECK constraint to include new types ──
-- Note: This requires dropping and recreating the constraint. Since we're in a migration
-- and the table may have data, we use a safe approach.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'ai_provider_policies_policy_type_check'
  ) THEN
    ALTER TABLE ai_provider_policies DROP CONSTRAINT ai_provider_policies_policy_type_check;
  END IF;
END $$;

ALTER TABLE ai_provider_policies ADD CONSTRAINT ai_provider_policies_policy_type_check
  CHECK (policy_type IN (
    'lowest_cost','highest_quality','fastest','balanced',
    'local_only','cloud_only','local_first','cloud_first',
    'capability_preferred','org_override','user_override',
    'fallback','circuit_breaker','retry_strategy','cost_limit',
    'emergency_fallback'
  ));

-- ─── Seed: Extended Routing Policies ──────────────────────────────────────────
INSERT INTO ai_provider_policies (id, organization_id, scope, policy_type, settings, enabled)
SELECT g.id, NULL, 'global', g.type,
  jsonb_build_object('description', g.desc), true
FROM (VALUES
  ('00000000-0000-0000-0000-000000000b01'::uuid, 'local_first', 'Prefer local providers before cloud. Fallback to cloud if local unavailable.'),
  ('00000000-0000-0000-0000-000000000b02'::uuid, 'lowest_cost', 'Route to the provider with lowest cost for the capability.'),
  ('00000000-0000-0000-0000-000000000b03'::uuid, 'highest_quality', 'Route to the highest quality provider for the capability.'),
  ('00000000-0000-0000-0000-000000000b04'::uuid, 'fastest', 'Route to the fastest available provider.'),
  ('00000000-0000-0000-0000-000000000b05'::uuid, 'balanced', 'Balance between cost, quality, and speed.')
) AS g(id, type, desc)
ON CONFLICT (id) DO NOTHING;