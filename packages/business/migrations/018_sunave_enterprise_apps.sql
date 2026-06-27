-- Sunave Enterprise Apps Extension
-- Inserts custom fields for the detailed CRM, HR, Finance, Service, and Intelligence modules.

INSERT INTO business_custom_fields (id, organization_id, object_type, field_name, field_label, field_type, is_system, display_order, created_at, updated_at)
VALUES
    -- CRM Additions
    (uuid_generate_v4(), NULL, 'campaign', 'budget', 'Campaign Budget', 'currency', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'campaign', 'status', 'Campaign Status', 'dropdown', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'quote', 'total_value', 'Total Value', 'currency', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'quote', 'valid_until', 'Valid Until', 'date', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'contract', 'start_date', 'Start Date', 'date', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'contract', 'end_date', 'End Date', 'date', true, 2, NOW(), NOW()),

    -- HR Additions
    (uuid_generate_v4(), NULL, 'position', 'headcount', 'Headcount', 'number', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'attendance', 'date', 'Date', 'date', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'attendance', 'hours_worked', 'Hours Worked', 'number', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'performance_review', 'rating', 'Rating', 'number', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'performance_review', 'review_period', 'Review Period', 'text', true, 2, NOW(), NOW()),

    -- Finance Additions
    (uuid_generate_v4(), NULL, 'budget', 'fiscal_year', 'Fiscal Year', 'text', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'budget', 'allocated_amount', 'Allocated Amount', 'currency', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'tax', 'tax_rate', 'Tax Rate (%)', 'number', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'recurring_billing', 'frequency', 'Frequency', 'dropdown', true, 1, NOW(), NOW()),

    -- Service Additions
    (uuid_generate_v4(), NULL, 'case', 'priority', 'Priority', 'dropdown', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'case', 'status', 'Status', 'dropdown', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'customer_feedback', 'csat_score', 'CSAT Score', 'number', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'customer_feedback', 'nps_score', 'NPS Score', 'number', true, 2, NOW(), NOW()),

    -- Intelligence Additions
    (uuid_generate_v4(), NULL, 'kpi', 'target_value', 'Target Value', 'number', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'kpi', 'current_value', 'Current Value', 'number', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'semantic_model', 'source_table', 'Source Table', 'text', true, 1, NOW(), NOW());
