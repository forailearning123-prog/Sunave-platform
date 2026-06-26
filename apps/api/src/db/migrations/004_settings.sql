-- Settings & Configuration Engine
-- Migration 004 — runs exactly once via schema_migrations tracking

-- ─── System Settings (global defaults per category) ───────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY,
  category VARCHAR(60) NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category)
);

-- ─── Feature Flags ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  flag_type VARCHAR(20) NOT NULL DEFAULT 'boolean',
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_flags_flag_type_check CHECK (flag_type IN ('boolean','percentage','org_rollout','role_rollout'))
);

-- ─── Feature Flag Assignments (org / role overrides) ──────────────────────────
CREATE TABLE IF NOT EXISTS feature_flag_assignments (
  id UUID PRIMARY KEY,
  flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
  scope VARCHAR(20) NOT NULL,
  scope_id VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_flag_assignments_scope_check CHECK (scope IN ('organization','role','user')),
  UNIQUE (flag_id, scope, scope_id)
);

-- ─── Configuration Cache (persistent layer — future Redis companion) ──────────
CREATE TABLE IF NOT EXISTS configuration_cache (
  id UUID PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL UNIQUE,
  cache_value JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(key);
CREATE INDEX IF NOT EXISTS idx_feature_flag_assignments_flag_id ON feature_flag_assignments(flag_id);
CREATE INDEX IF NOT EXISTS idx_configuration_cache_key ON configuration_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_configuration_cache_expires ON configuration_cache(expires_at);

-- ─── Seed: System Settings defaults ───────────────────────────────────────────
INSERT INTO system_settings (id, category, settings) VALUES
  ('dd000001-0000-0000-0000-000000000001', 'general', '{"platformName":"Sunave","supportEmail":"","maintenanceMode":false}'),
  ('dd000001-0000-0000-0000-000000000002', 'appearance', '{"defaultTheme":"system","allowUserTheme":true,"accentColor":"#6366f1","compactLayout":false}'),
  ('dd000001-0000-0000-0000-000000000003', 'localization', '{"defaultLanguage":"en","defaultTimezone":"UTC","defaultDateFormat":"YYYY-MM-DD","defaultTimeFormat":"HH:mm","defaultCurrency":"USD"}'),
  ('dd000001-0000-0000-0000-000000000004', 'security', '{"passwordMinLength":10,"passwordRequireUppercase":true,"passwordRequireLowercase":true,"passwordRequireNumber":true,"passwordRequireSpecial":true,"sessionTimeoutMinutes":15,"maxActiveSessions":5,"accountLockoutEnabled":true,"maxLoginAttempts":5,"lockoutDurationMinutes":30,"allowedDomains":[],"auditLoggingEnabled":true,"apiAccessEnabled":true}'),
  ('dd000001-0000-0000-0000-000000000005', 'notifications', '{"emailEnabled":true,"inAppEnabled":true,"smsEnabled":false,"pushEnabled":false}'),
  ('dd000001-0000-0000-0000-000000000006', 'storage', '{"defaultQuotaBytes":5368709120,"allowedMimeTypes":[],"maxFileSizeBytes":104857600}'),
  ('dd000001-0000-0000-0000-000000000007', 'ai', '{"gatewayUrl":"","defaultProvider":"","reasoningPolicy":"auto","visionPolicy":"auto","speechPolicy":"auto","embeddingPolicy":"auto","fallbackPolicy":"error","costPolicy":"default"}'),
  ('dd000001-0000-0000-0000-000000000008', 'voice', '{"sttProvider":"","ttsProvider":"","defaultLanguage":"en"}'),
  ('dd000001-0000-0000-0000-000000000009', 'email', '{"smtpHost":"","smtpPort":587,"smtpSecure":true,"fromAddress":"","fromName":"Sunave"}'),
  ('dd000001-0000-0000-0000-000000000010', 'api', '{"rateLimitEnabled":true,"defaultRateLimit":1000,"webhooksEnabled":false}'),
  ('dd000001-0000-0000-0000-000000000011', 'billing', '{"currency":"USD","taxEnabled":false,"trialDays":14}'),
  ('dd000001-0000-0000-0000-000000000012', 'audit', '{"retentionDays":90,"logLevel":"standard"}'),
  ('dd000001-0000-0000-0000-000000000013', 'branding', '{"logoUrl":"","faviconUrl":"","primaryColor":"#6366f1","secondaryColor":"#8b5cf6"}'),
  ('dd000001-0000-0000-0000-000000000014', 'integrations', '{"slackEnabled":false,"teamsEnabled":false,"webhooksEnabled":false}'),
  ('dd000001-0000-0000-0000-000000000015', 'plugins', '{"marketplaceEnabled":false,"allowPrivatePlugins":false}'),
  ('dd000001-0000-0000-0000-000000000016', 'marketplace', '{"enabled":false,"featuredPlugins":[]}'),
  ('dd000001-0000-0000-0000-000000000017', 'system', '{"version":"0.1.0","buildId":"","debugMode":false,"maintenanceMode":false}');

-- ─── Seed: Feature Flags ───────────────────────────────────────────────────────
INSERT INTO feature_flags (id, key, name, description, flag_type, enabled) VALUES
  ('ee000001-0000-0000-0000-000000000001', 'ai_enabled',              'AI Features',              'Enable AI gateway and AI-powered features',         'boolean', false),
  ('ee000001-0000-0000-0000-000000000002', 'marketplace_enabled',     'Marketplace',              'Enable the plugin marketplace',                     'boolean', false),
  ('ee000001-0000-0000-0000-000000000003', 'plugins_enabled',         'Plugins',                  'Enable plugin installation and runtime',             'boolean', false),
  ('ee000001-0000-0000-0000-000000000004', 'voice_enabled',           'Voice Features',           'Enable voice input and text-to-speech features',    'boolean', false),
  ('ee000001-0000-0000-0000-000000000005', 'workers_enabled',         'Workers',                  'Enable background worker execution',                'boolean', false),
  ('ee000001-0000-0000-0000-000000000006', 'agents_enabled',          'AI Agents',                'Enable AI agent creation and management',           'boolean', false),
  ('ee000001-0000-0000-0000-000000000007', 'knowledge_enabled',       'Knowledge Base',           'Enable knowledge base and RAG features',            'boolean', false),
  ('ee000001-0000-0000-0000-000000000008', 'documents_enabled',       'Documents',                'Enable document management and processing',         'boolean', false),
  ('ee000001-0000-0000-0000-000000000009', 'audit_enabled',           'Audit Logging',            'Enable detailed audit log tracking',                'boolean', true),
  ('ee000001-0000-0000-0000-000000000010', 'experimental_features',   'Experimental Features',    'Enable experimental and beta features',             'boolean', false);
