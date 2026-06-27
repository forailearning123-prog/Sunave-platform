-- Enterprise Platforms Modules Schema Setup (Epics 10-15)
-- Using Business Operating Platform (BOP) metadata fields framework.

INSERT INTO business_custom_fields (id, organization_id, object_type, field_name, field_label, field_type, is_system, display_order, created_at, updated_at)
VALUES
    -- Collaboration (Epic 10)
    (uuid_generate_v4(), NULL, 'meeting', 'start_time', 'Start Time', 'datetime', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'meeting', 'end_time', 'End Time', 'datetime', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'meeting', 'location', 'Location', 'text', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'email', 'subject', 'Subject', 'text', true, 1, NOW(), NOW()),
    
    -- SCM/Procurement/Inventory (Epic 11)
    (uuid_generate_v4(), NULL, 'purchase_order', 'vendor_id', 'Vendor', 'reference', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'purchase_order', 'total_value', 'Total Value', 'currency', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'inventory_item', 'sku', 'SKU', 'text', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'inventory_item', 'quantity_on_hand', 'Quantity On Hand', 'number', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'asset', 'serial_number', 'Serial Number', 'text', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'asset', 'purchase_date', 'Purchase Date', 'date', true, 2, NOW(), NOW()),

    -- Support (Epic 12)
    (uuid_generate_v4(), NULL, 'support_ticket', 'severity', 'Severity', 'dropdown', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'support_ticket', 'resolution_time', 'Resolution Time', 'number', true, 2, NOW(), NOW()),
    
    -- BI (Epic 13)
    (uuid_generate_v4(), NULL, 'report', 'data_source', 'Data Source', 'text', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'report', 'last_run', 'Last Run', 'datetime', true, 2, NOW(), NOW()),

    -- Operations (Epic 14)
    (uuid_generate_v4(), NULL, 'subscription', 'plan_tier', 'Plan Tier', 'dropdown', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'subscription', 'billing_cycle', 'Billing Cycle', 'dropdown', true, 2, NOW(), NOW()),

    -- Cloud (Epic 15)
    (uuid_generate_v4(), NULL, 'marketplace_item', 'version', 'Version', 'text', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), NULL, 'marketplace_item', 'publisher', 'Publisher', 'text', true, 2, NOW(), NOW());
