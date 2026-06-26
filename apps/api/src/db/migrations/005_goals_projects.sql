-- Goals & Projects Platform Migration
-- Migration 005 — runs exactly once via schema_migrations tracking
-- Tables: goals, projects, milestones, tasks, task_labels, task_label_assignments,
--         comments, attachments, activities, dependencies

-- ─── Goals ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title              VARCHAR(255) NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  status             VARCHAR(30) NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','planning','active','on_hold','completed','cancelled','archived')),
  priority           VARCHAR(20) NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('critical','high','medium','low')),
  category           VARCHAR(40) NOT NULL DEFAULT 'business'
                       CHECK (category IN ('business','sales','marketing','hr','finance','technology','operations','customer','learning','personal','custom')),
  owner_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility         VARCHAR(20) NOT NULL DEFAULT 'organization'
                       CHECK (visibility IN ('private','team','organization','public')),
  start_date         DATE,
  target_date        DATE,
  completion_pct     SMALLINT NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  budget             NUMERIC(14,2),
  budget_spent       NUMERIC(14,2) NOT NULL DEFAULT 0,
  progress_method    VARCHAR(30) NOT NULL DEFAULT 'manual'
                       CHECK (progress_method IN ('manual','task_based','milestone_based','project_based')),
  parent_goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_org    ON goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_owner  ON goals(owner_id);

-- ─── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id            UUID REFERENCES goals(id) ON DELETE SET NULL,
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL,
  description        TEXT NOT NULL DEFAULT '',
  status             VARCHAR(30) NOT NULL DEFAULT 'planning'
                       CHECK (status IN ('planning','active','blocked','completed','cancelled','archived')),
  priority           VARCHAR(20) NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('critical','high','medium','low')),
  owner_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  budget             NUMERIC(14,2),
  budget_spent       NUMERIC(14,2) NOT NULL DEFAULT 0,
  health             VARCHAR(20) NOT NULL DEFAULT 'on_track'
                       CHECK (health IN ('on_track','at_risk','off_track','unknown')),
  start_date         DATE,
  end_date           DATE,
  completion_pct     SMALLINT NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  visibility         VARCHAR(20) NOT NULL DEFAULT 'organization'
                       CHECK (visibility IN ('private','team','organization')),
  color              VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  icon               VARCHAR(80) NOT NULL DEFAULT '📁',
  created_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_org    ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_goal   ON projects(goal_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_owner  ON projects(owner_id);

-- ─── Milestones ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  goal_id         UUID REFERENCES goals(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          VARCHAR(30) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','completed','missed','cancelled')),
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  owner_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  progress        SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_goal    ON milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due     ON milestones(due_date);

-- ─── Task Labels ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_labels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(80) NOT NULL,
  color           VARCHAR(20) NOT NULL DEFAULT '#6366f1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  status          VARCHAR(30) NOT NULL DEFAULT 'todo'
                    CHECK (status IN ('todo','in_progress','blocked','review','done','cancelled')),
  priority        VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical','high','medium','low')),
  assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  estimate_hours  NUMERIC(6,1),
  actual_hours    NUMERIC(6,1) NOT NULL DEFAULT 0,
  start_date      DATE,
  due_date        DATE,
  completed_at    TIMESTAMPTZ,
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  goal_id         UUID REFERENCES goals(id) ON DELETE SET NULL,
  milestone_id    UUID REFERENCES milestones(id) ON DELETE SET NULL,
  parent_task_id  UUID REFERENCES tasks(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org       ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project   ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal      ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee  ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent    ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status    ON tasks(project_id, status);

-- ─── Task Label Assignments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_label_assignments (
  task_id  UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, label_id)
);

-- ─── Comments (polymorphic) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     VARCHAR(40) NOT NULL
                    CHECK (entity_type IN ('goal','project','task','milestone')),
  entity_id       UUID NOT NULL,
  author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  content         TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  edited_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);

-- ─── Attachments (polymorphic, URL-based) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     VARCHAR(40) NOT NULL
                    CHECK (entity_type IN ('goal','project','task','milestone','comment')),
  entity_id       UUID NOT NULL,
  name            VARCHAR(255) NOT NULL,
  url             TEXT NOT NULL,
  mime_type       VARCHAR(120) NOT NULL DEFAULT '',
  size_bytes      BIGINT NOT NULL DEFAULT 0,
  attachment_type VARCHAR(20) NOT NULL DEFAULT 'file'
                    CHECK (attachment_type IN ('file','image','video','audio','link')),
  uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity ON attachments(entity_type, entity_id);

-- ─── Activities (polymorphic audit/event feed) ────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     VARCHAR(40) NOT NULL,
  entity_id       UUID NOT NULL,
  actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  action          VARCHAR(120) NOT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_org    ON activities(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_actor  ON activities(actor_id);

-- ─── Dependencies ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dependencies (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_type VARCHAR(40) NOT NULL,
  from_entity_id   UUID NOT NULL,
  to_entity_type   VARCHAR(40) NOT NULL,
  to_entity_id     UUID NOT NULL,
  dep_type         VARCHAR(30) NOT NULL DEFAULT 'blocks'
                     CHECK (dep_type IN ('blocks','is_blocked_by','relates_to','duplicates')),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_entity_id, to_entity_id, dep_type)
);

CREATE INDEX IF NOT EXISTS idx_deps_from ON dependencies(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_deps_to   ON dependencies(to_entity_id);
