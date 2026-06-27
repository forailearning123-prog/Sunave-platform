-- Worker Platform Migration
-- Migration 010 — runs exactly once via schema_migrations tracking
-- Tables: workers, worker_versions, worker_executions, workflows,
--         workflow_steps, workflow_connections, workflow_executions,
--         workflow_templates, schedules, marketplace_items,
--         worker_ratings, execution_logs, worker_dependencies

-- ─── Workers ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  display_name      VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          VARCHAR(40) NOT NULL
                    CHECK (category IN (
                      'ai','knowledge','search','document','communication',
                      'database','analytics','automation','integration',
                      'development','finance','crm','hr','operations','custom'
                    )),
  version           VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','testing','published','deprecated','archived')),
  author            UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility        VARCHAR(20) NOT NULL DEFAULT 'private'
                    CHECK (visibility IN ('private','organization','public')),
  icon              VARCHAR(100) DEFAULT 'box',
  tags              TEXT[] DEFAULT '{}',
  capabilities      JSONB DEFAULT '[]',
  required_permissions JSONB DEFAULT '[]',
  required_inputs   JSONB DEFAULT '[]',
  expected_outputs  JSONB DEFAULT '[]',
  supported_execution_modes TEXT[] DEFAULT '{}',
  retry_policy      JSONB DEFAULT '{}',
  timeout           INTEGER DEFAULT 300,
  cost_policy       JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_org ON workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_category ON workers(category);
CREATE INDEX IF NOT EXISTS idx_worker_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_worker_visibility ON workers(visibility);
CREATE INDEX IF NOT EXISTS idx_worker_tags ON workers USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_worker_created ON workers(created_at DESC);

-- ─── Worker Versions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  version           VARCHAR(40) NOT NULL,
  changelog         TEXT,
  definition        JSONB NOT NULL DEFAULT '{}',
  is_current        BOOLEAN NOT NULL DEFAULT false,
  published_at      TIMESTAMPTZ,
  published_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_version_worker ON worker_versions(worker_id, version);
CREATE UNIQUE INDEX IF NOT EXISTS idx_worker_version_unique ON worker_versions(worker_id, version);

-- ─── Worker Dependencies ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_dependencies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  depends_on_worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  version_constraint VARCHAR(100) DEFAULT '*',
  is_optional       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, depends_on_worker_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_dep_worker ON worker_dependencies(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_dep_depends ON worker_dependencies(depends_on_worker_id);

-- ─── Worker Executions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  worker_version_id UUID REFERENCES worker_versions(id) ON DELETE SET NULL,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  triggered_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  execution_mode    VARCHAR(40) NOT NULL
                    CHECK (execution_mode IN ('manual','workflow','api','scheduled','agent','webhook','event')),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','paused','completed','failed','cancelled','retrying')),
  inputs            JSONB DEFAULT '{}',
  outputs           JSONB DEFAULT '{}',
  result            JSONB DEFAULT '{}',
  error_message     TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  duration_ms       INTEGER,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  max_retries       INTEGER NOT NULL DEFAULT 3,
  token_usage       JSONB DEFAULT '{}',
  cost_usd          NUMERIC(10,6) DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_exec_worker ON worker_executions(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_exec_org ON worker_executions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_exec_status ON worker_executions(status);
CREATE INDEX IF NOT EXISTS idx_worker_exec_triggered ON worker_executions(triggered_by);

-- ─── Workflows ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          VARCHAR(40) NOT NULL DEFAULT 'custom',
  version           VARCHAR(40) NOT NULL DEFAULT '1.0.0',
  status            VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','testing','published','deprecated','archived')),
  steps             JSONB NOT NULL DEFAULT '[]',
  connections       JSONB NOT NULL DEFAULT '[]',
  variables         JSONB DEFAULT '{}',
  inputs            JSONB DEFAULT '[]',
  outputs           JSONB DEFAULT '[]',
  triggers          JSONB DEFAULT '[]',
  author            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_org ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_category ON workflows(category);
CREATE INDEX IF NOT EXISTS idx_workflow_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_created ON workflows(created_at DESC);

-- ─── Workflow Steps ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_id           VARCHAR(100) NOT NULL,
  step_type         VARCHAR(40) NOT NULL
                    CHECK (step_type IN ('worker','condition','parallel','loop','retry','delay','approval','webhook','manual','merge')),
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  config            JSONB NOT NULL DEFAULT '{}',
  position          JSONB DEFAULT '{"x": 0, "y": 0}',
  order_index       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_wf_step_workflow ON workflow_steps(workflow_id, order_index);

-- ─── Workflow Connections ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  connection_id     VARCHAR(100) NOT NULL,
  source_step_id    VARCHAR(100) NOT NULL,
  target_step_id    VARCHAR(100) NOT NULL,
  source_port       VARCHAR(100) DEFAULT 'output',
  target_port       VARCHAR(100) DEFAULT 'input',
  condition         JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, connection_id)
);

CREATE INDEX IF NOT EXISTS idx_wf_conn_workflow ON workflow_connections(workflow_id);

-- ─── Workflow Executions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  triggered_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  trigger_type      VARCHAR(40) NOT NULL
                    CHECK (trigger_type IN ('manual','schedule','webhook','api','agent','system_event','organization_event')),
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','running','paused','completed','failed','cancelled')),
  inputs            JSONB DEFAULT '{}',
  outputs           JSONB DEFAULT '{}',
  result            JSONB DEFAULT '{}',
  error_message     TEXT,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  duration_ms       INTEGER,
  current_step_id   VARCHAR(100),
  execution_path    JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_exec_workflow ON workflow_executions(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_exec_org ON workflow_executions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_exec_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_wf_exec_triggered ON workflow_executions(triggered_by);

-- ─── Workflow Templates ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workflow_templates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  category          VARCHAR(40) NOT NULL,
  icon              VARCHAR(100) DEFAULT 'template',
  thumbnail         TEXT,
  template          JSONB NOT NULL DEFAULT '{}',
  tags              TEXT[] DEFAULT '{}',
  is_system         BOOLEAN NOT NULL DEFAULT false,
  is_public         BOOLEAN NOT NULL DEFAULT false,
  usage_count       INTEGER NOT NULL DEFAULT 0,
  rating            NUMERIC(3,2) DEFAULT 0,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_template_category ON workflow_templates(category);
CREATE INDEX IF NOT EXISTS idx_wf_template_public ON workflow_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_wf_template_usage ON workflow_templates(usage_count DESC);

-- ─── Schedules ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  schedule_type     VARCHAR(40) NOT NULL
                    CHECK (schedule_type IN ('once','hourly','daily','weekly','monthly','cron')),
  cron_expression   VARCHAR(100),
  schedule_config   JSONB NOT NULL DEFAULT '{}',
  execution_target  JSONB NOT NULL DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_run_at       TIMESTAMPTZ,
  next_run_at       TIMESTAMPTZ,
  run_count         INTEGER NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_org ON schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_active ON schedules(is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_schedule_next_run ON schedules(next_run_at) WHERE is_active = true;

-- ─── Marketplace Items ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id         UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  short_description VARCHAR(500) NOT NULL DEFAULT '',
  category          VARCHAR(40) NOT NULL,
  icon              VARCHAR(100) DEFAULT 'box',
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

-- ─── Worker Ratings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_ratings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_rating_item ON worker_ratings(marketplace_item_id);
CREATE INDEX IF NOT EXISTS idx_worker_rating_user ON worker_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_worker_rating_org ON worker_ratings(organization_id);

-- ─── Execution Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS execution_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id      UUID NOT NULL,
  execution_type    VARCHAR(40) NOT NULL
                    CHECK (execution_type IN ('worker','workflow')),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  level             VARCHAR(20) NOT NULL DEFAULT 'info'
                    CHECK (level IN ('debug','info','warning','error','critical')),
  message           TEXT NOT NULL,
  data              JSONB DEFAULT '{}',
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exec_log_execution ON execution_logs(execution_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_exec_log_org ON execution_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_exec_log_level ON execution_logs(level);

-- ─── Seed: System Workflow Templates ────────────────────────────────────────────
INSERT INTO workflow_templates (id, name, description, category, icon, is_system, template, tags)
VALUES
  ('w0000000-0000-4000-8000-000000000001', 'Document Processing Pipeline', 'Extract, classify, and index documents', 'document', 'file-text', true,
   '{"steps": [{"stepId": "extract", "type": "worker", "name": "Extract Text", "config": {"workerType": "document"}}, {"stepId": "classify", "type": "worker", "name": "Classify Document", "config": {"workerType": "ai"}}, {"stepId": "index", "type": "worker", "name": "Index to Knowledge", "config": {"workerType": "knowledge"}}], "connections": [{"source": "extract", "target": "classify"}, {"source": "classify", "target": "index"}]}',
   ARRAY['document','processing','ai']),
  ('w0000000-0000-4000-8000-000000000002', 'Research Pipeline', 'Automated research and summarization', 'ai', 'search', true,
   '{"steps": [{"stepId": "search", "type": "worker", "name": "Search Sources", "config": {"workerType": "search"}}, {"stepId": "analyze", "type": "worker", "name": "Analyze Results", "config": {"workerType": "ai"}}, {"stepId": "summarize", "type": "worker", "name": "Generate Summary", "config": {"workerType": "ai"}}], "connections": [{"source": "search", "target": "analyze"}, {"source": "analyze", "target": "summarize"}]}',
   ARRAY['research','ai','summarization']),
  ('w0000000-0000-4000-8000-000000000003', 'Meeting Summary', 'Process meeting recordings and generate summaries', 'communication', 'message-square', true,
   '{"steps": [{"stepId": "transcribe", "type": "worker", "name": "Transcribe Audio", "config": {"workerType": "document"}}, {"stepId": "extract", "type": "worker", "name": "Extract Action Items", "config": {"workerType": "ai"}}, {"stepId": "notify", "type": "worker", "name": "Send Notifications", "config": {"workerType": "communication"}}], "connections": [{"source": "transcribe", "target": "extract"}, {"source": "extract", "target": "notify"}]}',
   ARRAY['meeting','communication','ai']),
  ('w0000000-0000-4000-8000-000000000004', 'Email Automation', 'Process and respond to emails automatically', 'communication', 'mail', true,
   '{"steps": [{"stepId": "receive", "type": "webhook", "name": "Receive Email"}, {"stepId": "classify", "type": "worker", "name": "Classify Intent", "config": {"workerType": "ai"}}, {"stepId": "respond", "type": "worker", "name": "Generate Response", "config": {"workerType": "ai"}}, {"stepId": "send", "type": "worker", "name": "Send Email", "config": {"workerType": "communication"}}], "connections": [{"source": "receive", "target": "classify"}, {"source": "classify", "target": "respond"}, {"source": "respond", "target": "send"}]}',
   ARRAY['email','automation','communication']),
  ('w0000000-0000-4000-8000-000000000005', 'Knowledge Update', 'Automatically update knowledge base', 'knowledge', 'book-open', true,
   '{"steps": [{"stepId": "fetch", "type": "worker", "name": "Fetch Sources", "config": {"workerType": "knowledge"}}, {"stepId": "process", "type": "worker", "name": "Process Content", "config": {"workerType": "document"}}, {"stepId": "embed", "type": "worker", "name": "Generate Embeddings", "config": {"workerType": "ai"}}, {"stepId": "index", "type": "worker", "name": "Update Index", "config": {"workerType": "knowledge"}}], "connections": [{"source": "fetch", "target": "process"}, {"source": "process", "target": "embed"}, {"source": "embed", "target": "index"}]}',
   ARRAY['knowledge','automation','ai']),
  ('w0000000-0000-4000-8000-000000000006', 'Project Reporting', 'Generate project status reports', 'analytics', 'bar-chart-2', true,
   '{"steps": [{"stepId": "gather", "type": "worker", "name": "Gather Data", "config": {"workerType": "database"}}, {"stepId": "analyze", "type": "worker", "name": "Analyze Metrics", "config": {"workerType": "analytics"}}, {"stepId": "report", "type": "worker", "name": "Generate Report", "config": {"workerType": "document"}}, {"stepId": "distribute", "type": "worker", "name": "Distribute Report", "config": {"workerType": "communication"}}], "connections": [{"source": "gather", "target": "analyze"}, {"source": "analyze", "target": "report"}, {"source": "report", "target": "distribute"}]}',
   ARRAY['reporting','analytics','project']),
  ('w0000000-0000-4000-8000-000000000007', 'Goal Review', 'Automated goal progress review', 'analytics', 'target', true,
   '{"steps": [{"stepId": "collect", "type": "worker", "name": "Collect Metrics", "config": {"workerType": "database"}}, {"stepId": "evaluate", "type": "worker", "name": "Evaluate Progress", "config": {"workerType": "ai"}}, {"stepId": "report", "type": "worker", "name": "Generate Review", "config": {"workerType": "document"}}], "connections": [{"source": "collect", "target": "evaluate"}, {"source": "evaluate", "target": "report"}]}',
   ARRAY['goals','review','ai']),
  ('w0000000-0000-4000-8000-000000000008', 'Task Review', 'Review and prioritize tasks', 'operations', 'check-square', true,
   '{"steps": [{"stepId": "fetch", "type": "worker", "name": "Fetch Tasks", "config": {"workerType": "database"}}, {"stepId": "prioritize", "type": "worker", "name": "AI Prioritization", "config": {"workerType": "ai"}}, {"stepId": "assign", "type": "worker", "name": "Smart Assignment", "config": {"workerType": "automation"}}], "connections": [{"source": "fetch", "target": "prioritize"}, {"source": "prioritize", "target": "assign"}]}',
   ARRAY['tasks','operations','ai']),
  ('w0000000-0000-4000-8000-000000000009', 'Customer Support', 'Automated customer support workflow', 'crm', 'help-circle', true,
   '{"steps": [{"stepId": "receive", "type": "webhook", "name": "Receive Ticket"}, {"stepId": "classify", "type": "worker", "name": "Classify Issue", "config": {"workerType": "ai"}}, {"stepId": "respond", "type": "worker", "name": "Generate Response", "config": {"workerType": "ai"}}, {"stepId": "route", "type": "condition", "name": "Route to Team", "config": {"condition": "priority == 'high'"}}], "connections": [{"source": "receive", "target": "classify"}, {"source": "classify", "target": "respond"}, {"source": "respond", "target": "route"}]}',
   ARRAY['support','crm','ai'])
ON CONFLICT (id) DO NOTHING;