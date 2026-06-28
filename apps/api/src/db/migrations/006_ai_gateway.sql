-- AI Gateway & Provider Management Migration
-- Migration 006 — runs exactly once via schema_migrations tracking
-- Tables: ai_providers, ai_provider_health, ai_provider_configuration,
--         ai_provider_capabilities, ai_provider_policies, ai_provider_credentials

-- ─── AI Providers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_providers (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 VARCHAR(120) NOT NULL,
  type                 VARCHAR(40) NOT NULL
                         CHECK (type IN (
                           'sunave_local','openai','anthropic','gemini',
                           'vertex_ai','azure_openai','openrouter',
                           'litellm','ollama','custom'
                         )),
  base_url             TEXT,
  -- api_key stored as AES-256-GCM encrypted JSON; never stored in plaintext
  api_key_encrypted    TEXT,
  enabled              BOOLEAN NOT NULL DEFAULT true,
  priority             SMALLINT NOT NULL DEFAULT 10,
  is_default           BOOLEAN NOT NULL DEFAULT false,
  -- Capability flags (fast lookup without joining capabilities table)
  supports_chat        BOOLEAN NOT NULL DEFAULT true,
  supports_vision      BOOLEAN NOT NULL DEFAULT false,
  supports_embeddings  BOOLEAN NOT NULL DEFAULT false,
  supports_speech      BOOLEAN NOT NULL DEFAULT false,
  supports_streaming   BOOLEAN NOT NULL DEFAULT true,
  supports_function_calling BOOLEAN NOT NULL DEFAULT false,
  supports_reasoning   BOOLEAN NOT NULL DEFAULT false,
  -- Operational settings
  timeout_ms           INTEGER NOT NULL DEFAULT 30000,
  retry_count          SMALLINT NOT NULL DEFAULT 2,
  -- Health cache (denormalized for fast reads)
  health_status        VARCHAR(20) NOT NULL DEFAULT 'unknown'
                         CHECK (health_status IN ('healthy','degraded','offline','unknown')),
  last_health_check    TIMESTAMPTZ,
  -- Metadata
  notes                TEXT NOT NULL DEFAULT '',
  created_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_type     ON ai_providers(type);
CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled  ON ai_providers(enabled, priority);
CREATE INDEX IF NOT EXISTS idx_ai_providers_default  ON ai_providers(is_default) WHERE is_default = true;

-- ─── AI Provider Health (Time-Series) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_provider_health (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  availability   BOOLEAN NOT NULL DEFAULT true,
  latency_ms     INTEGER,
  error_message  TEXT,
  failures       SMALLINT NOT NULL DEFAULT 0,
  success_rate   NUMERIC(5,4) NOT NULL DEFAULT 1.0
                   CHECK (success_rate BETWEEN 0 AND 1),
  models_count   SMALLINT NOT NULL DEFAULT 0,
  checked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_health_provider ON ai_provider_health(provider_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_provider_health_time     ON ai_provider_health(checked_at DESC);

-- ─── AI Provider Configuration (Per-Org Overrides) ───────────────────────────
CREATE TABLE IF NOT EXISTS ai_provider_configuration (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  -- Org-level settings override global provider settings
  settings        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_provider_config_org ON ai_provider_configuration(organization_id);

-- ─── AI Provider Capabilities (Detailed Capability Matrix) ───────────────────
CREATE TABLE IF NOT EXISTS ai_provider_capabilities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  capability   VARCHAR(60) NOT NULL
                 CHECK (capability IN (
                   'reasoning','coding','vision','speech','translation',
                   'ocr','embeddings','summarization','planning',
                   'classification','extraction','generation','function_calling',
                   'streaming','fine_tuning','moderation'
                 )),
  enabled      BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT NOT NULL DEFAULT '',
  UNIQUE (provider_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_ai_capabilities_provider ON ai_provider_capabilities(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_capabilities_cap      ON ai_provider_capabilities(capability) WHERE enabled = true;

-- ─── AI Provider Policies (Routing Policies) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_provider_policies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  -- NULL org_id = global policy
  scope           VARCHAR(30) NOT NULL DEFAULT 'global'
                    CHECK (scope IN ('global','organization','capability','user')),
  scope_key       VARCHAR(120),
  -- Policy type defines how routing decision is made
  policy_type     VARCHAR(40) NOT NULL
                    CHECK (policy_type IN (
                      'lowest_cost','highest_quality','fastest',
                      'local_first','cloud_first','org_override',
                      'fallback','circuit_breaker','retry_strategy',
                      'cost_limit'
                    )),
  -- JSON settings for the policy (provider_id, threshold, max_cost, etc.)
  settings        JSONB NOT NULL DEFAULT '{}',
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_policies_org   ON ai_provider_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_policies_scope ON ai_provider_policies(scope, scope_key);

-- ─── AI Provider Credentials (Encrypted Key Store) ───────────────────────────
-- Separate from ai_providers.api_key_encrypted for multi-key providers
-- and credential rotation support.
CREATE TABLE IF NOT EXISTS ai_provider_credentials (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  key_name            VARCHAR(120) NOT NULL,
  -- AES-256-GCM encrypted JSON { iv, tag, ciphertext }
  key_value_encrypted TEXT NOT NULL,
  rotated_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_id, key_name)
);

CREATE INDEX IF NOT EXISTS idx_ai_credentials_provider ON ai_provider_credentials(provider_id);

-- ─── Seed: Default Sunave Local Provider ─────────────────────────────────────
INSERT INTO ai_providers (
  id, name, type, enabled, priority, is_default,
  supports_chat, supports_vision, supports_embeddings,
  supports_speech, supports_streaming, supports_function_calling,
  supports_reasoning, health_status, notes
) VALUES (
  '00000000-0000-0000-0000-000000000a01',
  'Sunave Local',
  'sunave_local',
  true, 1, true,
  true, false, true,
  false, true, false,
  false, 'healthy',
  'Built-in local provider. No external API required.'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: Default Routing Policy (Local First) ───────────────────────────────
INSERT INTO ai_provider_policies (
  id, organization_id, scope, policy_type, settings, enabled
) VALUES (
  '00000000-0000-0000-0000-000000000b01',
  NULL, 'global', 'local_first',
  '{"description": "Prefer local providers before cloud. Fallback to cloud if local unavailable."}',
  true
)
ON CONFLICT (id) DO NOTHING;
