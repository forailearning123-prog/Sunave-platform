-- Agent Platform Migration
-- Prompts 20-24: Complete Agent Operating System

-- Agent Registry
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  department VARCHAR(100),
  role VARCHAR(100),
  icon VARCHAR(255),
  avatar_url VARCHAR(500),
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'published', 'disabled', 'archived')),
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  visibility VARCHAR(50) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'public')),
  capabilities JSONB NOT NULL DEFAULT '[]',
  permissions JSONB NOT NULL DEFAULT '{}',
  goal_types JSONB NOT NULL DEFAULT '[]',
  worker_access JSONB NOT NULL DEFAULT '[]',
  knowledge_sources JSONB NOT NULL DEFAULT '[]',
  prompt_profile JSONB NOT NULL DEFAULT '{}',
  reasoning_policy JSONB NOT NULL DEFAULT '{}',
  memory_policy JSONB NOT NULL DEFAULT '{}',
  execution_policy JSONB NOT NULL DEFAULT '{}',
  security_policy JSONB NOT NULL DEFAULT '{}',
  cost_policy JSONB NOT NULL DEFAULT '{}',
  logging_policy JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMP
);

CREATE INDEX idx_agents_organization_id ON agents(organization_id);
CREATE INDEX idx_agents_owner_id ON agents(owner_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_department ON agents(department);
CREATE INDEX idx_agents_visibility ON agents(visibility);

-- Agent Templates
CREATE TABLE agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('executive', 'department', 'assistant', 'research', 'automation', 'coordinator', 'reviewer', 'developer', 'custom')),
  icon VARCHAR(255),
  avatar_url VARCHAR(500),
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  configuration JSONB NOT NULL DEFAULT '{}',
  capabilities JSONB NOT NULL DEFAULT '[]',
  permissions JSONB NOT NULL DEFAULT '{}',
  goal_types JSONB NOT NULL DEFAULT '[]',
  worker_access JSONB NOT NULL DEFAULT '[]',
  knowledge_sources JSONB NOT NULL DEFAULT '[]',
  prompt_profile JSONB NOT NULL DEFAULT '{}',
  reasoning_policy JSONB NOT NULL DEFAULT '{}',
  memory_policy JSONB NOT NULL DEFAULT '{}',
  execution_policy JSONB NOT NULL DEFAULT '{}',
  security_policy JSONB NOT NULL DEFAULT '{}',
  cost_policy JSONB NOT NULL DEFAULT '{}',
  logging_policy JSONB NOT NULL DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_templates_category ON agent_templates(category);
CREATE INDEX idx_agent_templates_type ON agent_templates(type);
CREATE INDEX idx_agent_templates_is_system ON agent_templates(is_system);
CREATE INDEX idx_agent_templates_is_public ON agent_templates(is_public);

-- Agent Executions
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'planning', 'delegating', 'executing', 'reviewing', 'completed', 'failed', 'cancelled', 'paused')),
  goal JSONB NOT NULL,
  plan JSONB,
  context JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error JSONB,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  planning_time_ms INTEGER,
  execution_time_ms INTEGER,
  total_time_ms INTEGER,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10,4),
  cost_actual DECIMAL(10,4),
  workers_used JSONB NOT NULL DEFAULT '[]',
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_failed INTEGER NOT NULL DEFAULT 0,
  tasks_total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_executions_agent_id ON agent_executions(agent_id);
CREATE INDEX idx_agent_executions_organization_id ON agent_executions(organization_id);
CREATE INDEX idx_agent_executions_user_id ON agent_executions(user_id);
CREATE INDEX idx_agent_executions_status ON agent_executions(status);
CREATE INDEX idx_agent_executions_created_at ON agent_executions(created_at);

-- Agent Goals
CREATE TABLE agent_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('outcome', 'output', 'initiative')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'cancelled', 'paused')),
  progress DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (progress BETWEEN 0 AND 100),
  context JSONB NOT NULL DEFAULT '{}',
  constraints JSONB NOT NULL DEFAULT '{}',
  success_criteria JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_goals_agent_id ON agent_goals(agent_id);
CREATE INDEX idx_agent_goals_organization_id ON agent_goals(organization_id);
CREATE INDEX idx_agent_goals_execution_id ON agent_goals(execution_id);
CREATE INDEX idx_agent_goals_status ON agent_goals(status);
CREATE INDEX idx_agent_goals_priority ON agent_goals(priority);

-- Agent Tasks
CREATE TABLE agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'executing', 'completed', 'failed', 'cancelled', 'retrying')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  worker_type VARCHAR(100),
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  result JSONB,
  error JSONB,
  dependencies JSONB NOT NULL DEFAULT '[]',
  estimated_time_ms INTEGER,
  actual_time_ms INTEGER,
  tokens_used INTEGER,
  cost_estimate DECIMAL(10,4),
  cost_actual DECIMAL(10,4),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  approval_required BOOLEAN NOT NULL DEFAULT false,
  approval_status VARCHAR(50) CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_tasks_agent_id ON agent_tasks(agent_id);
CREATE INDEX idx_agent_tasks_organization_id ON agent_tasks(organization_id);
CREATE INDEX idx_agent_tasks_goal_id ON agent_tasks(goal_id);
CREATE INDEX idx_agent_tasks_execution_id ON agent_tasks(execution_id);
CREATE INDEX idx_agent_tasks_worker_id ON agent_tasks(worker_id);
CREATE INDEX idx_agent_tasks_status ON agent_tasks(status);
CREATE INDEX idx_agent_tasks_parent_task_id ON agent_tasks(parent_task_id);

-- Agent Workers (Worker assignments for agents)
CREATE TABLE agent_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  access_level VARCHAR(50) NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'execute', 'admin')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  configuration JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, worker_id)
);

CREATE INDEX idx_agent_workers_agent_id ON agent_workers(agent_id);
CREATE INDEX idx_agent_workers_organization_id ON agent_workers(organization_id);
CREATE INDEX idx_agent_workers_worker_id ON agent_workers(worker_id);

-- Agent Decisions
CREATE TABLE agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('plan', 'delegate', 'review', 'approve', 'escalate', 'transfer', 'retry', 'abort', 'resume')),
  reasoning TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB NOT NULL DEFAULT '{}',
  confidence DECIMAL(5,2) CHECK (confidence BETWEEN 0 AND 100),
  approved BOOLEAN,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_decisions_agent_id ON agent_decisions(agent_id);
CREATE INDEX idx_agent_decisions_organization_id ON agent_decisions(organization_id);
CREATE INDEX idx_agent_decisions_execution_id ON agent_decisions(execution_id);
CREATE INDEX idx_agent_decisions_type ON agent_decisions(type);

-- Agent Delegations
CREATE TABLE agent_delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  to_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  to_worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  delegation_type VARCHAR(50) NOT NULL CHECK (delegation_type IN ('single_worker', 'multiple_workers', 'sequential', 'parallel', 'conditional', 'recursive', 'approval_required')),
  context JSONB NOT NULL DEFAULT '{}',
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_delegations_agent_id ON agent_delegations(agent_id);
CREATE INDEX idx_agent_delegations_organization_id ON agent_delegations(organization_id);
CREATE INDEX idx_agent_delegations_execution_id ON agent_delegations(execution_id);
CREATE INDEX idx_agent_delegations_from_agent_id ON agent_delegations(from_agent_id);
CREATE INDEX idx_agent_delegations_to_agent_id ON agent_delegations(to_agent_id);
CREATE INDEX idx_agent_delegations_status ON agent_delegations(status);

-- Agent Approvals
CREATE TABLE agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES agent_executions(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES agent_goals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  delegation_id UUID REFERENCES agent_delegations(id) ON DELETE CASCADE,
  approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN ('execution', 'delegation', 'decision', 'resource', 'escalation')),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  context JSONB NOT NULL DEFAULT '{}',
  input JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  expires_at TIMESTAMP,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_approvals_agent_id ON agent_approvals(agent_id);
CREATE INDEX idx_agent_approvals_organization_id ON agent_approvals(organization_id);
CREATE INDEX idx_agent_approvals_status ON agent_approvals(status);
CREATE INDEX idx_agent_approvals_requested_by ON agent_approvals(requested_by);

-- Agent Memory References
CREATE TABLE agent_memory_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  memory_type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('read', 'write', 'shared', 'context')),
  context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_memory_references_agent_id ON agent_memory_references(agent_id);
CREATE INDEX idx_agent_memory_references_organization_id ON agent_memory_references(organization_id);
CREATE INDEX idx_agent_memory_references_memory_id ON agent_memory_references(memory_id);

-- Agent Analytics
CREATE TABLE agent_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  executions_started INTEGER NOT NULL DEFAULT 0,
  executions_completed INTEGER NOT NULL DEFAULT 0,
  executions_failed INTEGER NOT NULL DEFAULT 0,
  executions_cancelled INTEGER NOT NULL DEFAULT 0,
  goals_completed INTEGER NOT NULL DEFAULT 0,
  goals_failed INTEGER NOT NULL DEFAULT 0,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  tasks_failed INTEGER NOT NULL DEFAULT 0,
  workers_used JSONB NOT NULL DEFAULT '{}',
  planning_time_avg_ms INTEGER,
  execution_time_avg_ms INTEGER,
  total_time_avg_ms INTEGER,
  tokens_used_total INTEGER NOT NULL DEFAULT 0,
  cost_estimate_total DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  cost_actual_total DECIMAL(10,4) NOT NULL DEFAULT 0.00,
  approvals_requested INTEGER NOT NULL DEFAULT 0,
  approvals_granted INTEGER NOT NULL DEFAULT 0,
  delegations_made INTEGER NOT NULL DEFAULT 0,
  delegations_received INTEGER NOT NULL DEFAULT 0,
  escalations INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, organization_id, date)
);

CREATE INDEX idx_agent_analytics_agent_id ON agent_analytics(agent_id);
CREATE INDEX idx_agent_analytics_organization_id ON agent_analytics(organization_id);
CREATE INDEX idx_agent_analytics_date ON agent_analytics(date);

-- Agent Policies
CREATE TABLE agent_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('cost', 'execution', 'security', 'approval', 'escalation', 'resource')),
  rules JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_policies_agent_id ON agent_policies(agent_id);
CREATE INDEX idx_agent_policies_organization_id ON agent_policies(organization_id);
CREATE INDEX idx_agent_policies_policy_type ON agent_policies(policy_type);
CREATE INDEX idx_agent_policies_is_active ON agent_policies(is_active);

-- Agent Marketplace Items
CREATE TABLE agent_marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES agent_templates(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  icon VARCHAR(255),
  avatar_url VARCHAR(500),
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  configuration JSONB NOT NULL DEFAULT '{}',
  capabilities JSONB NOT NULL DEFAULT '[]',
  permissions JSONB NOT NULL DEFAULT '{}',
  goal_types JSONB NOT NULL DEFAULT '[]',
  worker_access JSONB NOT NULL DEFAULT '[]',
  knowledge_sources JSONB NOT NULL DEFAULT '[]',
  prompt_profile JSONB NOT NULL DEFAULT '{}',
  reasoning_policy JSONB NOT NULL DEFAULT '{}',
  memory_policy JSONB NOT NULL DEFAULT '{}',
  execution_policy JSONB NOT NULL DEFAULT '{}',
  security_policy JSONB NOT NULL DEFAULT '{}',
  cost_policy JSONB NOT NULL DEFAULT '{}',
  logging_policy JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER NOT NULL DEFAULT 0,
  tags JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_marketplace_items_organization_id ON agent_marketplace_items(organization_id);
CREATE INDEX idx_agent_marketplace_items_category ON agent_marketplace_items(category);
CREATE INDEX idx_agent_marketplace_items_type ON agent_marketplace_items(type);
CREATE INDEX idx_agent_marketplace_items_is_public ON agent_marketplace_items(is_public);
CREATE INDEX idx_agent_marketplace_items_is_featured ON agent_marketplace_items(is_featured);
CREATE INDEX idx_agent_marketplace_items_rating ON agent_marketplace_items(rating);

-- Agent Collaborations
CREATE TABLE agent_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  collaboration_type VARCHAR(50) NOT NULL CHECK (collaboration_type IN ('delegate', 'request_help', 'review', 'approve', 'escalate', 'transfer', 'share_context', 'share_knowledge', 'share_memory', 'share_workflow', 'share_results')),
  target_agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  context JSONB NOT NULL DEFAULT '{}',
  input JSONB NOT NULL DEFAULT '{}',
  output JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'failed')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_collaborations_agent_id ON agent_collaborations(agent_id);
CREATE INDEX idx_agent_collaborations_organization_id ON agent_collaborations(organization_id);
CREATE INDEX idx_agent_collaborations_target_agent_id ON agent_collaborations(target_agent_id);
CREATE INDEX idx_agent_collaborations_collaboration_type ON agent_collaborations(collaboration_type);
CREATE INDEX idx_agent_collaborations_status ON agent_collaborations(status);

-- Track schema migration
INSERT INTO schema_migrations (version, applied_at) VALUES ('011_agent_platform', NOW());