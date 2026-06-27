-- AI Runtime Platform Migration
-- Migration 008 — runs exactly once via schema_migrations tracking
-- Tables: conversations, conversation_messages, prompt_templates,
--         prompt_categories, prompt_versions, runtime_executions, runtime_logs

-- ─── Conversation Engine ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(300) NOT NULL DEFAULT 'New Conversation',
  description       TEXT NOT NULL DEFAULT '',
  type              VARCHAR(40) NOT NULL DEFAULT 'chat'
                      CHECK (type IN (
                        'chat','assistant','worker','agent','workflow',
                        'plugin','research','support','development'
                      )),
  status            VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('draft','active','paused','archived','deleted')),
  context           JSONB DEFAULT '{}',
  system_prompt     TEXT,
  capability        VARCHAR(80),
  model_policy      JSONB DEFAULT '{}',
  pinned            BOOLEAN NOT NULL DEFAULT false,
  favorite          BOOLEAN NOT NULL DEFAULT false,
  tags              TEXT[] DEFAULT '{}',
  metadata          JSONB DEFAULT '{}',
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_org       ON conversations(organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_user      ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_status    ON conversations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_conv_type      ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conv_tags      ON conversations USING gin(tags);

-- ─── Conversation Messages ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role              VARCHAR(20) NOT NULL
                      CHECK (role IN ('system','user','assistant','tool','developer','runtime')),
  content           TEXT NOT NULL,
  attachments       JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  tool_calls        JSONB DEFAULT '[]',
  execution_time_ms INTEGER,
  token_usage       JSONB DEFAULT '{}',
  provider          VARCHAR(60),
  model             VARCHAR(200),
  input_cost_usd    NUMERIC(16,8),
  output_cost_usd   NUMERIC(16,8),
  total_cost_usd    NUMERIC(16,8),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_conv        ON conversation_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_msg_role        ON conversation_messages(role);
CREATE INDEX IF NOT EXISTS idx_msg_created     ON conversation_messages(created_at DESC);

-- ─── Prompt Categories ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(80) NOT NULL UNIQUE,
  display_name    VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  icon            VARCHAR(40) DEFAULT 'file-text',
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Prompt Templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES prompt_categories(id) ON DELETE SET NULL,
  name              VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  version           VARCHAR(20) NOT NULL DEFAULT '1.0',
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','published','archived')),
  template          TEXT NOT NULL,
  variables         JSONB DEFAULT '[]',
  capabilities      TEXT[] DEFAULT '{}',
  system_prompt     TEXT,
  output_format     VARCHAR(40) DEFAULT 'text'
                      CHECK (output_format IN ('text','json','markdown','html','code','yaml','xml')),
  runtime_policies  JSONB DEFAULT '{}',
  tags              TEXT[] DEFAULT '{}',
  is_system         BOOLEAN NOT NULL DEFAULT false,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_org    ON prompt_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_prompt_cat    ON prompt_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_prompt_status ON prompt_templates(status);
CREATE INDEX IF NOT EXISTS idx_prompt_tags   ON prompt_templates USING gin(tags);

-- ─── Prompt Version History ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prompt_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id         UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
  version           VARCHAR(20) NOT NULL,
  template          TEXT NOT NULL,
  variables         JSONB DEFAULT '[]',
  system_prompt     TEXT,
  runtime_policies  JSONB DEFAULT '{}',
  changelog         TEXT NOT NULL DEFAULT '',
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_ver_prompt ON prompt_versions(prompt_id, created_at DESC);

-- ─── Runtime Executions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runtime_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  conversation_id   UUID REFERENCES conversations(id) ON DELETE SET NULL,
  prompt_id         UUID REFERENCES prompt_templates(id) ON DELETE SET NULL,
  capability        VARCHAR(80) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','completed','failed','cancelled','streaming')),
  -- Request
  request_body      JSONB DEFAULT '{}',
  resolved_prompt   TEXT,
  resolved_system_prompt TEXT,
  -- Response
  response_body     TEXT,
  response_status   SMALLINT,
  -- Performance
  execution_time_ms INTEGER,
  latency_ms        INTEGER,
  retry_count       SMALLINT NOT NULL DEFAULT 0,
  -- Provider/Model
  provider          VARCHAR(60),
  model             VARCHAR(200),
  -- Tokens
  prompt_tokens     INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens      INTEGER NOT NULL DEFAULT 0,
  -- Cost
  estimated_cost_usd NUMERIC(16,8) NOT NULL DEFAULT 0,
  actual_cost_usd    NUMERIC(16,8),
  -- Error
  error_message     TEXT,
  error_code        VARCHAR(60),
  -- Audit
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_runtime_org  ON runtime_executions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_user ON runtime_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_runtime_conv ON runtime_executions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_runtime_cap  ON runtime_executions(capability);
CREATE INDEX IF NOT EXISTS idx_runtime_status ON runtime_executions(status);
CREATE INDEX IF NOT EXISTS idx_runtime_created ON runtime_executions(created_at DESC);

-- ─── Runtime Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS runtime_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id      UUID REFERENCES runtime_executions(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  level             VARCHAR(20) NOT NULL DEFAULT 'info'
                      CHECK (level IN ('debug','info','warn','error','fatal')),
  message           TEXT NOT NULL,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_log_exec ON runtime_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_runtime_log_org  ON runtime_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runtime_log_level ON runtime_logs(level);

-- ─── Seed: Prompt Categories ──────────────────────────────────────────────────
INSERT INTO prompt_categories (id, name, display_name, description, icon, sort_order, is_system) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'general',     'General',     'General purpose prompts', 'file-text', 1, true),
  ('c0000000-0000-4000-8000-000000000002', 'coding',      'Coding',      'Software development and programming', 'code', 2, true),
  ('c0000000-0000-4000-8000-000000000003', 'business',    'Business',    'Business operations and strategy', 'briefcase', 3, true),
  ('c0000000-0000-4000-8000-000000000004', 'research',    'Research',    'Research and analysis', 'search', 4, true),
  ('c0000000-0000-4000-8000-000000000005', 'analysis',    'Analysis',    'Data analysis and insights', 'bar-chart-3', 5, true),
  ('c0000000-0000-4000-8000-000000000006', 'hr',          'HR',          'Human resources and people management', 'users', 6, true),
  ('c0000000-0000-4000-8000-000000000007', 'finance',     'Finance',     'Financial operations and reporting', 'dollar-sign', 7, true),
  ('c0000000-0000-4000-8000-000000000008', 'marketing',   'Marketing',   'Marketing and campaigns', 'megaphone', 8, true),
  ('c0000000-0000-4000-8000-000000000009', 'crm',         'CRM',         'Customer relationship management', 'users', 9, true),
  ('c0000000-0000-4000-8000-000000000010', 'sales',       'Sales',       'Sales and revenue', 'trending-up', 10, true),
  ('c0000000-0000-4000-8000-000000000011', 'support',     'Support',     'Customer support and help desk', 'headphones', 11, true),
  ('c0000000-0000-4000-8000-000000000012', 'developer',   'Developer',   'Developer tools and APIs', 'terminal', 12, true),
  ('c0000000-0000-4000-8000-000000000013', 'knowledge',   'Knowledge',   'Knowledge management and learning', 'book-open', 13, true),
  ('c0000000-0000-4000-8000-000000000014', 'automation',  'Automation',  'Workflow automation and processes', 'zap', 14, true),
  ('c0000000-0000-4000-8000-000000000015', 'custom',      'Custom',      'Custom user-defined prompts', 'settings', 15, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: System Prompts ────────────────────────────────────────────────────
INSERT INTO prompt_templates (id, organization_id, category_id, name, description, version, status,
  template, variables, capabilities, system_prompt, output_format, runtime_policies, tags, is_system, created_by)
VALUES
  ('d0000000-0000-4000-8000-000000000001', NULL,
   (SELECT id FROM prompt_categories WHERE name = 'general'),
   'General Assistant', 'A general-purpose AI assistant for answering questions and helping with tasks.',
   '1.0', 'published',
   'You are a helpful AI assistant. Answer the following question:\n\n{{query}}',
   '[{"name":"query","type":"text","label":"Question","required":true,"description":"The user question to answer"}]',
   ARRAY['chat','reasoning'], 'You are a helpful, harmless, and honest AI assistant.',
   'text', '{"maxTokens":2048,"temperature":0.7,"streaming":true}',
   ARRAY['general','assistant'], true, NULL),

  ('d0000000-0000-4000-8000-000000000002', NULL,
   (SELECT id FROM prompt_categories WHERE name = 'coding'),
   'Code Generator', 'Generate code based on requirements and specifications.',
   '1.0', 'published',
   'Generate {{language}} code for the following requirement:\n\n{{requirement}}\n\nConstraints:\n{{constraints}}',
   '[{"name":"language","type":"text","label":"Programming Language","required":true,"description":"e.g. Python, JavaScript, TypeScript"},{"name":"requirement","type":"textarea","label":"Requirements","required":true,"description":"What the code should do"},{"name":"constraints","type":"textarea","label":"Constraints","required":false,"description":"Any constraints or preferences"}]',
   ARRAY['coding','reasoning'], 'You are an expert software engineer. Write clean, well-documented, production-ready code.',
   'code', '{"maxTokens":4096,"temperature":0.3,"streaming":true}',
   ARRAY['coding','development'], true, NULL),

  ('d0000000-0000-4000-8000-000000000003', NULL,
   (SELECT id FROM prompt_categories WHERE name = 'analysis'),
   'Data Analyzer', 'Analyze data and provide insights, trends, and recommendations.',
   '1.0', 'published',
   'Analyze the following data:\n\nData:\n{{data}}\n\nQuestions to answer:\n{{questions}}',
   '[{"name":"data","type":"textarea","label":"Data","required":true,"description":"The data to analyze"},{"name":"questions","type":"textarea","label":"Questions","required":true,"description":"Specific questions to answer about the data"}]',
   ARRAY['data-analysis','reasoning'], 'You are a data analyst expert. Provide clear insights, trends, and actionable recommendations.',
   'markdown', '{"maxTokens":2048,"temperature":0.5}',
   ARRAY['analysis','data'], true, NULL),

  ('d0000000-0000-4000-8000-000000000004', NULL,
   (SELECT id FROM prompt_categories WHERE name = 'business'),
   'Business Report', 'Generate professional business reports and summaries.',
   '1.0', 'published',
   'Write a {{type}} report for {{organization}}.\n\nContext:\n{{context}}\n\nFocus Areas:\n{{focus}}',
   '[{"name":"type","type":"select","label":"Report Type","required":true,"options":["Executive Summary","Status Report","Analysis","Proposal","Review"],"description":"Type of business report"},{"name":"organization","type":"text","label":"Organization","required":true,"description":"Organization name"},{"name":"context","type":"textarea","label":"Context","required":true,"description":"Background and context"},{"name":"focus","type":"textarea","label":"Focus Areas","required":false,"description":"Key areas to focus on"}]',
   ARRAY['summarization','reasoning'], 'You are a professional business analyst. Write concise, impactful business reports.',
   'markdown', '{"maxTokens":2048,"temperature":0.5}',
   ARRAY['business','reporting'], true, NULL),

  ('d0000000-0000-4000-8000-000000000005', NULL,
   (SELECT id FROM prompt_categories WHERE name = 'support'),
   'Support Response', 'Generate professional customer support responses.',
   '1.0', 'published',
   'Customer Issue:\n{{issue}}\n\nCustomer Context:\n{{context}}\n\nKnowledge Base:\n{{knowledge}}\n\nCompany Policy:\n{{policy}}',
   '[{"name":"issue","type":"textarea","label":"Issue Description","required":true,"description":"The customer issue"},{"name":"context","type":"textarea","label":"Customer Context","required":false,"description":"Customer account and history"},{"name":"knowledge","type":"textarea","label":"Knowledge Base","required":false,"description":"Relevant knowledge base articles"},{"name":"policy","type":"textarea","label":"Company Policy","required":false,"description":"Relevant policies"}]',
   ARRAY['chat','reasoning'], 'You are a professional customer support agent. Be empathetic, clear, and helpful.',
   'text', '{"maxTokens":1024,"temperature":0.5}',
   ARRAY['support','customer-service'], true, NULL)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: System Prompt Versions ─────────────────────────────────────────────
INSERT INTO prompt_versions (id, prompt_id, version, template, variables, system_prompt, changelog, created_by)
SELECT
  gen_random_uuid(), id, '1.0', template, variables, system_prompt, 'Initial version.', NULL
FROM prompt_templates WHERE is_system = true AND NOT EXISTS (
  SELECT 1 FROM prompt_versions pv WHERE pv.prompt_id = prompt_templates.id
);