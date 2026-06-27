-- Integration Platform Enhanced Schema
-- Migration 014 — Epic 5: Complete Integration Platform
-- Adds: webhook_endpoints, webhook_logs, retry_policies, rate_limits,
--       connection_templates, connector_metadata, integration_events,
--       request_logs, response_logs

-- ─── Webhook Endpoints ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  event_type        VARCHAR(20) NOT NULL DEFAULT 'incoming'
                    CHECK (event_type IN ('incoming', 'outgoing')),
  path              VARCHAR(500) NOT NULL,
  secret            VARCHAR(200),
  headers           JSONB DEFAULT '{}',
  is_enabled        BOOLEAN NOT NULL DEFAULT false,
  status            VARCHAR(20) NOT NULL DEFAULT 'inactive'
                    CHECK (status IN ('active', 'inactive', 'error')),
  last_triggered_at TIMESTAMPTZ,
  trigger_count     INTEGER NOT NULL DEFAULT 0,
  error_count       INTEGER NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_integration ON webhook_endpoints(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_org ON webhook_endpoints(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_status ON webhook_endpoints(status);
CREATE INDEX IF NOT EXISTS idx_webhook_enabled ON webhook_endpoints(is_enabled);

-- ─── Webhook Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id        UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  integration_id    UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type        VARCHAR(100) NOT NULL,
  method            VARCHAR(10) NOT NULL DEFAULT 'POST',
  headers           JSONB DEFAULT '{}',
  payload           JSONB DEFAULT '{}',
  response_status   INTEGER,
  response_body     JSONB,
  error             TEXT,
  duration_ms       INTEGER NOT NULL DEFAULT 0,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  signature_valid   BOOLEAN,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_webhook ON webhook_logs(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_integration ON webhook_logs(integration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_log_org ON webhook_logs(organization_id, created_at DESC);

-- ─── Retry Policies ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retry_policies (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id            UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                      VARCHAR(300) NOT NULL,
  strategy                  VARCHAR(40) NOT NULL DEFAULT 'exponential_backoff'
                            CHECK (strategy IN ('linear', 'exponential_backoff', 'circuit_breaker')),
  max_retries               INTEGER NOT NULL DEFAULT 3,
  initial_delay_ms          INTEGER NOT NULL DEFAULT 1000,
  max_delay_ms              INTEGER NOT NULL DEFAULT 30000,
  backoff_multiplier        NUMERIC(5,2) NOT NULL DEFAULT 2.0,
  circuit_breaker_threshold INTEGER NOT NULL DEFAULT 5,
  circuit_breaker_timeout_ms INTEGER NOT NULL DEFAULT 60000,
  retryable_status_codes    INTEGER[] DEFAULT ARRAY[408, 429, 500, 502, 503, 504],
  retryable_errors          TEXT[] DEFAULT ARRAY['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
  is_enabled                BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retry_policy_integration ON retry_policies(integration_id);
CREATE INDEX IF NOT EXISTS idx_retry_policy_org ON retry_policies(organization_id);

-- ─── Rate Limits ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope             VARCHAR(20) NOT NULL DEFAULT 'connector'
                    CHECK (scope IN ('global', 'connector', 'organization')),
  max_requests      INTEGER NOT NULL DEFAULT 100,
  window_ms         INTEGER NOT NULL DEFAULT 60000,
  burst_size        INTEGER NOT NULL DEFAULT 10,
  queue_enabled     BOOLEAN NOT NULL DEFAULT true,
  queue_max_size    INTEGER NOT NULL DEFAULT 1000,
  handle_429        VARCHAR(20) NOT NULL DEFAULT 'queue'
                    CHECK (handle_429 IN ('queue', 'reject', 'throttle')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_integration ON rate_limits(integration_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_org ON rate_limits(organization_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_scope ON rate_limits(scope);

-- ─── Connection Templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connection_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(200) NOT NULL,
  display_name          VARCHAR(300) NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  category              VARCHAR(40) NOT NULL
                        CHECK (category IN (
                          'communication', 'development', 'productivity', 'storage',
                          'erp', 'crm', 'database', 'cloud', 'analytics',
                          'monitoring', 'identity', 'custom'
                        )),
  provider              VARCHAR(100) NOT NULL,
  integration_type      VARCHAR(40) NOT NULL DEFAULT 'rest'
                        CHECK (integration_type IN ('rest', 'graphql', 'webhook', 'grpc', 'soap', 'database', 'filesystem')),
  auth_type             VARCHAR(40) NOT NULL DEFAULT 'api_key'
                        CHECK (auth_type IN ('oauth2', 'api_key', 'bearer_token', 'jwt', 'basic', 'custom_headers', 'client_certificate', 'none')),
  configuration         JSONB DEFAULT '{}',
  auth_configuration    JSONB DEFAULT '{}',
  capabilities          TEXT[] DEFAULT '{}',
  is_system             BOOLEAN NOT NULL DEFAULT false,
  is_featured           BOOLEAN NOT NULL DEFAULT false,
  install_count         INTEGER NOT NULL DEFAULT 0,
  rating                NUMERIC(3,2) DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conn_template_category ON connection_templates(category);
CREATE INDEX IF NOT EXISTS idx_conn_template_provider ON connection_templates(provider);
CREATE INDEX IF NOT EXISTS idx_conn_template_featured ON connection_templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_conn_template_system ON connection_templates(is_system);

-- ─── Connector Metadata ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS connector_metadata (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              VARCHAR(100) NOT NULL UNIQUE,
  name                  VARCHAR(200) NOT NULL,
  display_name          VARCHAR(300) NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  category              VARCHAR(40) NOT NULL
                        CHECK (category IN (
                          'communication', 'development', 'productivity', 'storage',
                          'erp', 'crm', 'database', 'cloud', 'analytics',
                          'monitoring', 'identity', 'custom'
                        )),
  icon                  VARCHAR(100) DEFAULT 'puzzle',
  auth_types            TEXT[] DEFAULT '{}',
  integration_types     TEXT[] DEFAULT '{}',
  capabilities          TEXT[] DEFAULT '{}',
  configuration_schema  JSONB DEFAULT '{}',
  auth_schema           JSONB DEFAULT '{}',
  is_official           BOOLEAN NOT NULL DEFAULT false,
  version               VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  documentation_url     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connector_metadata_provider ON connector_metadata(provider);
CREATE INDEX IF NOT EXISTS idx_connector_metadata_category ON connector_metadata(category);
CREATE INDEX IF NOT EXISTS idx_connector_metadata_official ON connector_metadata(is_official);

-- ─── Integration Events ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type        VARCHAR(100) NOT NULL,
  level             VARCHAR(20) NOT NULL DEFAULT 'info'
                    CHECK (level IN ('debug', 'info', 'warning', 'error', 'critical')),
  message           TEXT NOT NULL,
  event_data        JSONB DEFAULT '{}',
  triggered_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_event_integration ON integration_events(integration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_event_org ON integration_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_event_type ON integration_events(event_type);
CREATE INDEX IF NOT EXISTS idx_integration_event_level ON integration_events(level);
CREATE INDEX IF NOT EXISTS idx_integration_event_created ON integration_events(created_at DESC);

-- ─── Request Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS request_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  method            VARCHAR(10) NOT NULL,
  url               TEXT NOT NULL,
  headers           JSONB DEFAULT '{}',
  body              JSONB,
  query_params      JSONB DEFAULT '{}',
  retry_policy_id   UUID REFERENCES retry_policies(id) ON DELETE SET NULL,
  rate_limit_id     UUID REFERENCES rate_limits(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_log_integration ON request_logs(integration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_log_org ON request_logs(organization_id, created_at DESC);

-- ─── Response Logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS response_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_log_id    UUID REFERENCES request_logs(id) ON DELETE SET NULL,
  status_code       INTEGER NOT NULL,
  headers           JSONB DEFAULT '{}',
  body              JSONB,
  duration_ms       INTEGER NOT NULL,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_log_integration ON response_logs(integration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_response_log_org ON response_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_response_log_request ON response_logs(request_log_id);

-- ─── Track schema migration ─────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at) VALUES ('014_integration_platform_enhanced', NOW());