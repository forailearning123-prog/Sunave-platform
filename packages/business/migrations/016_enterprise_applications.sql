-- Enterprise Business Applications Platform Schemas (Epic 7, 8, 9)
-- These schemas extend the Business Operating Platform without duplicating infrastructure

-- ============================================
-- CRM CUSTOM FIELDS
-- ============================================
INSERT INTO business_custom_fields (id, organization_id, object_type, field_name, field_label, field_type, is_system, display_order, created_at, updated_at)
VALUES
    (uuid_generate_v4(), NULL, 'lead', 'expected_revenue', 'Expected Revenue', 'currency', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'lead', 'lead_score', 'Lead Score', 'number', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'opportunity', 'probability', 'Probability (%)', 'number', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'opportunity', 'expected_close', 'Expected Close Date', 'date', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'account', 'website', 'Website', 'url', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'account', 'annual_revenue', 'Annual Revenue', 'currency', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'account', 'employee_count', 'Employee Count', 'number', true, 3, NOW(), NOW());

-- ============================================
-- HR CUSTOM FIELDS
-- ============================================
INSERT INTO business_custom_fields (id, organization_id, object_type, field_name, field_label, field_type, is_system, display_order, created_at, updated_at)
VALUES
    (uuid_generate_v4(), NULL, 'employee', 'hire_date', 'Hire Date', 'date', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'employee', 'department_id', 'Department', 'reference', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'employee', 'job_title', 'Job Title', 'text', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'applicant', 'applied_date', 'Applied Date', 'date', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'applicant', 'source', 'Source', 'text', true, 2, NOW(), NOW());

-- ============================================
-- FINANCE CUSTOM FIELDS
-- ============================================
INSERT INTO business_custom_fields (id, organization_id, object_type, field_name, field_label, field_type, is_system, display_order, created_at, updated_at)
VALUES
    (uuid_generate_v4(), NULL, 'invoice', 'due_date', 'Due Date', 'date', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'invoice', 'total_amount', 'Total Amount', 'currency', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'invoice', 'tax_amount', 'Tax Amount', 'currency', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'expense', 'amount', 'Amount', 'currency', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'expense', 'category', 'Category', 'text', true, 2, NOW(), NOW());
