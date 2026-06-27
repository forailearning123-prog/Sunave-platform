-- Plugin Platform Migration
-- Migration 013 — Epic 5: Plugin SDK & Integration Platform
-- Tables: plugins, plugin_versions, plugin_installations, plugin_permissions,
--         plugin_configurations, plugin_dependencies, plugin_health,
--         plugin_events, marketplace_items, marketplace_reviews,
--         integrations, integration_credentials, integration_health

-- ─── Plugins ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugins (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  display_name      VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  author            VARCHAR(300) NOT NULL,
  organization      VARCHAR(300),
  version           VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  category          VARCHAR(40) NOT NULL
                    CHECK (category IN (
                      'business','ai','worker','agent','dashboard',
                      'integration','automation','knowledge','document',
                      'analytics','voice','communication','developer',
                      'security','marketplace','custom'
                    )),
  license           VARCHAR(100) DEFAULT 'MIT',
  homepage          TEXT,
  repository        TEXT,
  documentation     TEXT,
  icon              VARCHAR(100) DEFAULT 'puzzle',
  banner            TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','testing','published','deprecated','archived')),
  visibility        VARCHAR(20) NOT NULL DEFAULT 'private'
                    CHECK (visibility IN ('private','organization','public')),
  compatibility     JSONB DEFAULT '{}',
  minimum_platform_version VARCHAR(40) DEFAULT '1.0.0',
  permissions       JSONB DEFAULT '[]',
  dependencies      JSONB DEFAULT '[]',
  peer_dependencies JSONB DEFAULT '[]',
  required_capabilities JSONB DEFAULT '[]',
  required_workers  JSONB DEFAULT '[]',
  required_agents   JSONB DEFAULT '[]',
  required_settings JSONB DEFAULT '[]',
  configuration_schema JSONB DEFAULT '{}',
  entry_point       VARCHAR(500) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_org ON plugins(organization_id);
CREATE INDEX IF NOT EXISTS idx_plugin_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugin_status ON plugins(status);
CREATE INDEX IF NOT EXISTS idx_plugin_visibility ON plugins(visibility);
CREATE INDEX IF NOT EXISTS idx_plugin_created ON plugins(created_at DESC);

-- ─── Plugin Versions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  version           VARCHAR(40) NOT NULL,
  changelog         TEXT,
  manifest          JSONB NOT NULL DEFAULT '{}',
  is_current        BOOLEAN NOT NULL DEFAULT false,
  published_at      TIMESTAMPTZ,
  published_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plugin_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plugin_version_plugin ON plugin_versions(plugin_id, version);
CREATE INDEX IF NOT EXISTS idx_plugin_version_current ON plugin_versions(plugin_id, is_current) WHERE is_current = true;

-- ─── Plugin Installations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_installations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  plugin_version_id UUID NOT NULL REFERENCES plugin_versions(id) ON DELETE RESTRICT,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  installed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'installed'
                    CHECK (status IN ('installed','enabled','disabled','error','updating','archived')),
  configuration     JSONB DEFAULT '{}',
  enabled_at        TIMESTAMPTZ,
  disabled_at       TIMESTAMPTZ,
  last_health_check TIMESTAMPTZ,
  installed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plugin_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_install_org ON plugin_installations(organization_id);
CREATE INDEX IF NOT EXISTS idx_plugin_install_plugin ON plugin_installations(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_install_status ON plugin_installations(status);

-- ─── Plugin Permissions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_permissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  installation_id   UUID REFERENCES plugin_installations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  permission        VARCHAR(100) NOT NULL,
  description       TEXT,
  granted           BOOLEAN NOT NULL DEFAULT true,
  granted_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  granted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plugin_id, installation_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_plugin_perm_plugin ON plugin_permissions(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_perm_org ON plugin_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_plugin_perm_install ON plugin_permissions(installation_id);

-- ─── Plugin Configurations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_configurations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  installation_id   UUID NOT NULL REFERENCES plugin_installations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  config_key         VARCHAR(200) NOT NULL,
  config_value       JSONB NOT NULL DEFAULT '{}',
  is_sensitive      BOOLEAN NOT NULL DEFAULT false,
  updated_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(installation_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_plugin_config_install ON plugin_configurations(installation_id);
CREATE INDEX IF NOT EXISTS idx_plugin_config_org ON plugin_configurations(organization_id);

-- ─── Plugin Dependencies ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_dependencies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  depends_on_plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  version_constraint VARCHAR(100) DEFAULT '*',
  is_optional       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plugin_id, depends_on_plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_dep_plugin ON plugin_dependencies(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_dep_depends ON plugin_dependencies(depends_on_plugin_id);

-- ─── Plugin Health ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_health (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  installation_id   UUID NOT NULL REFERENCES plugin_installations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status            VARCHAR(20) NOT NULL DEFAULT 'healthy'
                    CHECK (status IN ('healthy','degraded','unhealthy','error','unknown')),
  last_check_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at   TIMESTAMPTZ,
  last_error_at     TIMESTAMPTZ,
  last_error_message TEXT,
  metrics           JSONB DEFAULT '{}',
  uptime_percentage NUMERIC(5,2) DEFAULT 100.00,
  check_count       INTEGER NOT NULL DEFAULT 0,
  error_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_health_install ON plugin_health(installation_id);
CREATE INDEX IF NOT EXISTS idx_plugin_health_org ON plugin_health(organization_id);
CREATE INDEX IF NOT EXISTS idx_plugin_health_status ON plugin_health(status);
CREATE INDEX IF NOT EXISTS idx_plugin_health_check ON plugin_health(last_check_at DESC);

-- ─── Plugin Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plugin_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID REFERENCES plugins(id) ON DELETE CASCADE,
  installation_id   UUID REFERENCES plugin_installations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type        VARCHAR(100) NOT NULL,
  event_data        JSONB DEFAULT '{}',
  level             VARCHAR(20) NOT NULL DEFAULT 'info'
                    CHECK (level IN ('debug','info','warning','error','critical')),
  message           TEXT,
  triggered_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plugin_event_plugin ON plugin_events(plugin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_event_install ON plugin_events(installation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_event_org ON plugin_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_event_type ON plugin_events(event_type);
CREATE INDEX IF NOT EXISTS idx_plugin_event_level ON plugin_events(level);

-- ─── Marketplace Items ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id         UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  short_description VARCHAR(500) NOT NULL DEFAULT '',
  category          VARCHAR(40) NOT NULL,
  icon              VARCHAR(100) DEFAULT 'puzzle',
  thumbnail         TEXT,
  documentation_url TEXT,
  version           VARCHAR(40) NOT NULL,
  changelog         TEXT,
  tags              TEXT[] DEFAULT '{}',
  dependencies      JSONB DEFAULT '[]',
  compatibility     JSONB DEFAULT '{}',
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  install_count     INTEGER NOT NULL DEFAULT 0,
  rating_average    NUMERIC(3,2) DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available','unavailable','deprecated','removed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_items(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_featured ON marketplace_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_items(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_rating ON marketplace_items(rating_average DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_installs ON marketplace_items(install_count DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_tags ON marketplace_items USING gin(tags);

-- ─── Marketplace Reviews ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review            TEXT,
  helpful_count     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_review_item ON marketplace_reviews(marketplace_item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_review_user ON marketplace_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_review_org ON marketplace_reviews(organization_id);

-- ─── Integrations ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plugin_id         UUID REFERENCES plugins(id) ON DELETE SET NULL,
  name              VARCHAR(300) NOT NULL,
  display_name      VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  provider          VARCHAR(100) NOT NULL
                    CHECK (provider IN (
                      'github','gitlab','azure_devops','jira','confluence',
                      'slack','microsoft_teams','google_workspace','microsoft_365',
                      'outlook','gmail','sap','salesforce','hubspot','servicenow',
                      'twilio','whatsapp','telegram','discord','custom'
                    )),
  integration_type  VARCHAR(40) NOT NULL DEFAULT 'rest'
                    CHECK (integration_type IN ('rest','graphql','webhook','grpc','soap')),
  auth_type         VARCHAR(40) NOT NULL DEFAULT 'api_key'
                    CHECK (auth_type IN ('oauth2','api_key','jwt','basic','none')),
  configuration     JSONB DEFAULT '{}',
  status            VARCHAR(20) NOT NULL DEFAULT 'inactive'
                    CHECK (status IN ('active','inactive','error','pending','disabled')),
  is_enabled        BOOLEAN NOT NULL DEFAULT false,
  last_sync_at      TIMESTAMPTZ,
  last_error_at     TIMESTAMPTZ,
  last_error_message TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_plugin ON integrations(plugin_id);
CREATE INDEX IF NOT EXISTS idx_integration_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integration_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integration_enabled ON integrations(is_enabled);

-- ─── Integration Credentials ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_credentials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credential_type   VARCHAR(40) NOT NULL
                    CHECK (credential_type IN ('api_key','oauth_token','jwt','basic_auth','certificate')),
  encrypted_value   TEXT NOT NULL,
  iv                VARCHAR(100) NOT NULL,
  auth_tag          VARCHAR(100) NOT NULL,
  expires_at        TIMESTAMPTZ,
  last_used_at      TIMESTAMPTZ,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_cred_integration ON integration_credentials(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_cred_org ON integration_credentials(organization_id);

-- ─── Integration Health ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_health (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id    UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status            VARCHAR(20) NOT NULL DEFAULT 'unknown'
                    CHECK (status IN ('healthy','degraded','unhealthy','unknown')),
  last_check_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_success_at   TIMESTAMPTZ,
  last_error_at     TIMESTAMPTZ,
  last_error_message TEXT,
  response_time_ms  INTEGER,
  metrics           JSONB DEFAULT '{}',
  check_count       INTEGER NOT NULL DEFAULT 0,
  error_count       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_health_integration ON integration_health(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_org ON integration_health(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_health_status ON integration_health(status);
CREATE INDEX IF NOT EXISTS idx_integration_health_check ON integration_health(last_check_at DESC);

-- ─── Track schema migration ─────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, applied_at) VALUES ('013_plugin_platform', NOW());