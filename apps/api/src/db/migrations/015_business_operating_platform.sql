-- Business Operating Platform (BOP) - Epic 6
-- Shared foundation for CRM, HR, Finance, Sales, Support, Projects, etc.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- BUSINESS OBJECTS
-- ============================================
CREATE TABLE business_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_type VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    owner_id UUID REFERENCES users(id),
    created_by UUID NOT NULL REFERENCES users(id),
    updated_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    visibility VARCHAR(50) NOT NULL DEFAULT 'organization',
    tags JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    archived_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_business_objects_org ON business_objects(organization_id);
CREATE INDEX idx_business_objects_type ON business_objects(object_type);
CREATE INDEX idx_business_objects_status ON business_objects(status);
CREATE INDEX idx_business_objects_owner ON business_objects(owner_id);
CREATE INDEX idx_business_objects_created_at ON business_objects(created_at);
CREATE INDEX idx_business_objects_tags ON business_objects USING GIN(tags);

-- ============================================
-- RELATIONSHIPS
-- ============================================
CREATE TABLE business_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    source_object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    target_object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, relationship_type, source_object_id, target_object_id)
);

CREATE INDEX idx_business_relationships_org ON business_relationships(organization_id);
CREATE INDEX idx_business_relationships_type ON business_relationships(relationship_type);
CREATE INDEX idx_business_relationships_source ON business_relationships(source_object_id);
CREATE INDEX idx_business_relationships_target ON business_relationships(target_object_id);

-- ============================================
-- ACTIVITY TIMELINE
-- ============================================
CREATE TABLE business_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(50) NOT NULL DEFAULT 'user',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_activities_org ON business_activities(organization_id);
CREATE INDEX idx_business_activities_object ON business_activities(object_id);
CREATE INDEX idx_business_activities_type ON business_activities(activity_type);
CREATE INDEX idx_business_activities_created_at ON business_activities(created_at);

-- ============================================
-- COMMENTS
-- ============================================
CREATE TABLE business_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES business_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    content_type VARCHAR(50) NOT NULL DEFAULT 'markdown',
    author_id UUID NOT NULL REFERENCES users(id),
    is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMP,
    reactions JSONB DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_business_comments_org ON business_comments(organization_id);
CREATE INDEX idx_business_comments_object ON business_comments(object_id);
CREATE INDEX idx_business_comments_parent ON business_comments(parent_comment_id);
CREATE INDEX idx_business_comments_author ON business_comments(author_id);
CREATE INDEX idx_business_comments_created_at ON business_comments(created_at);

-- ============================================
-- MENTIONS
-- ============================================
CREATE TABLE business_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES business_comments(id) ON DELETE CASCADE,
    mentioned_type VARCHAR(50) NOT NULL,
    mentioned_id UUID NOT NULL,
    mentioned_name VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_mentions_org ON business_mentions(organization_id);
CREATE INDEX idx_business_mentions_comment ON business_mentions(comment_id);
CREATE INDEX idx_business_mentions_target ON business_mentions(mentioned_type, mentioned_id);

-- ============================================
-- TASKS
-- ============================================
CREATE TABLE business_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    assignee_id UUID REFERENCES users(id),
    assignee_type VARCHAR(50),
    due_date TIMESTAMP,
    reminder_at TIMESTAMP,
    parent_task_id UUID REFERENCES business_tasks(id) ON DELETE CASCADE,
    checklist JSONB DEFAULT '[]',
    dependencies JSONB DEFAULT '[]',
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern JSONB,
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    archived_at TIMESTAMP
);

CREATE INDEX idx_business_tasks_org ON business_tasks(organization_id);
CREATE INDEX idx_business_tasks_object ON business_tasks(object_id);
CREATE INDEX idx_business_tasks_status ON business_tasks(status);
CREATE INDEX idx_business_tasks_assignee ON business_tasks(assignee_id);
CREATE INDEX idx_business_tasks_due_date ON business_tasks(due_date);
CREATE INDEX idx_business_tasks_parent ON business_tasks(parent_task_id);

-- ============================================
-- APPROVALS
-- ============================================
CREATE TABLE business_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    approval_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    title VARCHAR(500) NOT NULL,
    description TEXT,
    requested_by UUID NOT NULL REFERENCES users(id),
    approver_id UUID REFERENCES users(id),
    approver_type VARCHAR(50),
    decision_comment TEXT,
    decided_at TIMESTAMP,
    decided_by UUID REFERENCES users(id),
    escalation_level INTEGER NOT NULL DEFAULT 0,
    delegated_to UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP
);

CREATE INDEX idx_business_approvals_org ON business_approvals(organization_id);
CREATE INDEX idx_business_approvals_object ON business_approvals(object_id);
CREATE INDEX idx_business_approvals_status ON business_approvals(status);
CREATE INDEX idx_business_approvals_approver ON business_approvals(approver_id);
CREATE INDEX idx_business_approvals_requested ON business_approvals(requested_by);

-- ============================================
-- APPROVAL STEPS (for multi-step approvals)
-- ============================================
CREATE TABLE business_approval_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    approval_id UUID NOT NULL REFERENCES business_approvals(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL,
    approver_id UUID REFERENCES users(id),
    approver_type VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    decision_comment TEXT,
    decided_at TIMESTAMP,
    decided_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_approval_steps_org ON business_approval_steps(organization_id);
CREATE INDEX idx_business_approval_steps_approval ON business_approval_steps(approval_id);
CREATE INDEX idx_business_approval_steps_status ON business_approval_steps(status);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE business_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    message TEXT,
    priority VARCHAR(50) NOT NULL DEFAULT 'normal',
    channel VARCHAR(50) NOT NULL DEFAULT 'in_app',
    object_type VARCHAR(100),
    object_id UUID,
    action_url VARCHAR(1000),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP
);

CREATE INDEX idx_business_notifications_org ON business_notifications(organization_id);
CREATE INDEX idx_business_notifications_user ON business_notifications(user_id);
CREATE INDEX idx_business_notifications_read ON business_notifications(is_read);
CREATE INDEX idx_business_notifications_created_at ON business_notifications(created_at);
CREATE INDEX idx_business_notifications_type ON business_notifications(notification_type);

-- ============================================
-- TAGS
-- ============================================
CREATE TABLE business_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    color VARCHAR(50) DEFAULT '#6366f1',
    description TEXT,
    parent_tag_id UUID REFERENCES business_tags(id) ON DELETE SET NULL,
    category VARCHAR(100),
    aliases JSONB DEFAULT '[]',
    usage_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

CREATE INDEX idx_business_tags_org ON business_tags(organization_id);
CREATE INDEX idx_business_tags_category ON business_tags(category);
CREATE INDEX idx_business_tags_parent ON business_tags(parent_tag_id);

-- ============================================
-- OBJECT TAGS (many-to-many)
-- ============================================
CREATE TABLE business_object_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES business_tags(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, object_id, tag_id)
);

CREATE INDEX idx_business_object_tags_org ON business_object_tags(organization_id);
CREATE INDEX idx_business_object_tags_object ON business_object_tags(object_id);
CREATE INDEX idx_business_object_tags_tag ON business_object_tags(tag_id);

-- ============================================
-- CUSTOM FIELDS
-- ============================================
CREATE TABLE business_custom_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_type VARCHAR(100) NOT NULL,
    field_name VARCHAR(200) NOT NULL,
    field_label VARCHAR(500) NOT NULL,
    field_type VARCHAR(50) NOT NULL,
    field_options JSONB DEFAULT '{}',
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    is_unique BOOLEAN NOT NULL DEFAULT FALSE,
    default_value JSONB,
    validation_rules JSONB DEFAULT '{}',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, object_type, field_name)
);

CREATE INDEX idx_business_custom_fields_org ON business_custom_fields(organization_id);
CREATE INDEX idx_business_custom_fields_type ON business_custom_fields(object_type);

-- ============================================
-- CUSTOM FIELD VALUES
-- ============================================
CREATE TABLE business_custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    custom_field_id UUID NOT NULL REFERENCES business_custom_fields(id) ON DELETE CASCADE,
    value JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, object_id, custom_field_id)
);

CREATE INDEX idx_business_custom_field_values_org ON business_custom_field_values(organization_id);
CREATE INDEX idx_business_custom_field_values_object ON business_custom_field_values(object_id);
CREATE INDEX idx_business_custom_field_values_field ON business_custom_field_values(custom_field_id);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE business_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(50) NOT NULL DEFAULT 'user',
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(100),
    user_agent TEXT,
    device_info JSONB,
    worker_id UUID,
    agent_id UUID,
    api_endpoint VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_audit_logs_org ON business_audit_logs(organization_id);
CREATE INDEX idx_business_audit_logs_actor ON business_audit_logs(actor_id);
CREATE INDEX idx_business_audit_logs_action ON business_audit_logs(action);
CREATE INDEX idx_business_audit_logs_resource ON business_audit_logs(resource_type, resource_id);
CREATE INDEX idx_business_audit_logs_created_at ON business_audit_logs(created_at);

-- ============================================
-- TIMELINE EVENTS
-- ============================================
CREATE TABLE business_timeline_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    actor_id UUID REFERENCES users(id),
    actor_type VARCHAR(50) NOT NULL DEFAULT 'user',
    related_object_type VARCHAR(100),
    related_object_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_timeline_events_org ON business_timeline_events(organization_id);
CREATE INDEX idx_business_timeline_events_object ON business_timeline_events(object_id);
CREATE INDEX idx_business_timeline_events_type ON business_timeline_events(event_type);
CREATE INDEX idx_business_timeline_events_created_at ON business_timeline_events(created_at);

-- ============================================
-- FAVORITES
-- ============================================
CREATE TABLE business_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id, object_id)
);

CREATE INDEX idx_business_favorites_org ON business_favorites(organization_id);
CREATE INDEX idx_business_favorites_user ON business_favorites(user_id);
CREATE INDEX idx_business_favorites_object ON business_favorites(object_id);

-- ============================================
-- BOOKMARKS
-- ============================================
CREATE TABLE business_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    object_type VARCHAR(100),
    object_id UUID,
    filter_criteria JSONB DEFAULT '{}',
    is_shared BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_bookmarks_org ON business_bookmarks(organization_id);
CREATE INDEX idx_business_bookmarks_user ON business_bookmarks(user_id);
CREATE INDEX idx_business_bookmarks_object ON business_bookmarks(object_type, object_id);

-- ============================================
-- RECENT ITEMS
-- ============================================
CREATE TABLE business_recent_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    object_type VARCHAR(100) NOT NULL,
    object_id UUID NOT NULL,
    accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id, object_type, object_id)
);

CREATE INDEX idx_business_recent_items_org ON business_recent_items(organization_id);
CREATE INDEX idx_business_recent_items_user ON business_recent_items(user_id);
CREATE INDEX idx_business_recent_items_accessed ON business_recent_items(accessed_at);

-- ============================================
-- SYSTEM TAGS (seeded)
-- ============================================
INSERT INTO business_tags (id, organization_id, name, slug, color, description, is_system, created_at, updated_at)
VALUES
    (uuid_generate_v4(), NULL, 'Important', 'important', '#ef4444', 'High priority items', true, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'Urgent', 'urgent', '#f59e0b', 'Requires immediate attention', true, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'In Progress', 'in-progress', '#3b82f6', 'Currently being worked on', true, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'Review', 'review', '#8b5cf6', 'Awaiting review', true, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'Completed', 'completed', '#10b981', 'Finished items', true, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'Archived', 'archived', '#6b7280', 'Archived items', true, NOW(), NOW());

-- ============================================
-- SYSTEM CUSTOM FIELDS (seeded)
-- ============================================
INSERT INTO business_custom_fields (id, organization_id, object_type, field_name, field_label, field_type, is_system, display_order, created_at, updated_at)
VALUES
    (uuid_generate_v4(), NULL, 'customer', 'industry', 'Industry', 'dropdown', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'customer', 'company_size', 'Company Size', 'dropdown', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'customer', 'annual_revenue', 'Annual Revenue', 'currency', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'lead', 'source', 'Lead Source', 'dropdown', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'lead', 'score', 'Lead Score', 'number', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'opportunity', 'amount', 'Amount', 'currency', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'opportunity', 'probability', 'Probability', 'number', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'opportunity', 'expected_close_date', 'Expected Close Date', 'date', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'employee', 'department', 'Department', 'text', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'employee', 'job_title', 'Job Title', 'text', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'employee', 'hire_date', 'Hire Date', 'date', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'project', 'budget', 'Budget', 'currency', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'project', 'start_date', 'Start Date', 'date', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'project', 'end_date', 'End Date', 'date', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'invoice', 'invoice_number', 'Invoice Number', 'text', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'invoice', 'due_date', 'Due Date', 'date', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'invoice', 'total_amount', 'Total Amount', 'currency', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'support_ticket', 'priority', 'Priority', 'dropdown', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'support_ticket', 'category', 'Category', 'dropdown', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'support_ticket', 'sla_deadline', 'SLA Deadline', 'datetime', true, 3, NOW(), NOW());

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_business_objects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_objects_updated_at BEFORE UPDATE ON business_objects
    FOR EACH ROW EXECUTE FUNCTION update_business_objects_updated_at();

CREATE OR REPLACE FUNCTION update_business_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_comments_updated_at BEFORE UPDATE ON business_comments
    FOR EACH ROW EXECUTE FUNCTION update_business_comments_updated_at();

CREATE OR REPLACE FUNCTION update_business_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_tasks_updated_at BEFORE UPDATE ON business_tasks
    FOR EACH ROW EXECUTE FUNCTION update_business_tasks_updated_at();

CREATE OR REPLACE FUNCTION update_business_approvals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_approvals_updated_at BEFORE UPDATE ON business_approvals
    FOR EACH ROW EXECUTE FUNCTION update_business_approvals_updated_at();

CREATE OR REPLACE FUNCTION update_business_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_tags_updated_at BEFORE UPDATE ON business_tags
    FOR EACH ROW EXECUTE FUNCTION update_business_tags_updated_at();

CREATE OR REPLACE FUNCTION update_business_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_bookmarks_updated_at BEFORE UPDATE ON business_bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_business_bookmarks_updated_at();

-- ============================================
-- RECORD MIGRATION
-- ============================================
INSERT INTO schema_migrations (version, applied_at)
VALUES ('015', NOW())
ON CONFLICT (version) DO NOTHING;