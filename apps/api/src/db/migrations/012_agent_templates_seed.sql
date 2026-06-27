-- Seed Agent Templates
-- Prompts 20-24: Complete Agent Operating System

-- Insert system agent templates
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'ceo-agent',
  'CEO Agent',
  'Executive agent responsible for reviewing goals, prioritizing initiatives, allocating resources, monitoring KPIs, and orchestrating department agents.',
  'executive',
  'executive',
  '👔',
  true,
  false,
  '{"reasoningMode": "strategic", "maxConcurrentGoals": 10, "delegationEnabled": true, "approvalRequired": true}',
  '["goal_review", "prioritization", "resource_allocation", "kpi_monitoring", "department_coordination", "reporting", "strategic_planning"]',
  '{"canReadAllGoals": true, "canAssignAgents": true, "canAllocateBudget": true, "canViewAllDepartments": true}',
  '["outcome", "initiative"]',
  '[{"workerType": "analysis", "accessLevel": "execute"}, {"workerType": "reporting", "accessLevel": "execute"}, {"workerType": "planning", "accessLevel": "execute"}]',
  '[{"type": "organization", "scope": "all"}, {"type": "strategy", "scope": "executive"}]',
  '{"systemPrompt": "You are the CEO Agent. Your responsibilities include reviewing goals, prioritizing initiatives, allocating resources, monitoring KPIs, and orchestrating department agents. Focus on strategic outcomes and organizational alignment.", "temperature": 0.7, "maxTokens": 2000}',
  '{"mode": "strategic", "depth": "deep", "considerLongTerm": true, "riskTolerance": "medium"}',
  '{"enabled": true, "types": ["long-term", "organization", "goal"], "retentionDays": 365, "importance": "high"}',
  '{"timeout": 3600000, "maxRetries": 2, "approvalRequired": true, "escalationEnabled": true}',
  '{"maxWorkers": 20, "allowedDepartments": ["all"], "restrictedActions": ["delete", "archive"]}',
  '{"maxCost": 10.0, "alertThreshold": 7.5, "budgetPeriod": "monthly"}',
  '{"level": "detailed", "trackDecisions": true, "trackDelegations": true, "retentionDays": 90}',
  NOW(),
  NOW()
);

-- HR Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-fa2345678901',
  'hr-agent',
  'HR Agent',
  'Department agent for human resources operations including recruitment, employee management, policy enforcement, and workplace culture.',
  'department',
  'department',
  '👥',
  true,
  false,
  '{"reasoningMode": "analytical", "maxConcurrentGoals": 5, "delegationEnabled": true, "approvalRequired": false}',
  '["recruitment", "employee_management", "policy_enforcement", "onboarding", "performance_review", "workplace_culture", "compliance"]',
  '{"canReadEmployeeData": true, "canManageRecruitment": true, "canAccessPolicies": true, "canViewPerformanceData": true}',
  '["output", "initiative"]',
  '[{"workerType": "document_processing", "accessLevel": "execute"}, {"workerType": "data_analysis", "accessLevel": "execute"}, {"workerType": "communication", "accessLevel": "execute"}]',
  '[{"type": "hr_policies", "scope": "department"}, {"type": "employee_handbook", "scope": "organization"}]',
  '{"systemPrompt": "You are the HR Agent. Your responsibilities include recruitment, employee management, policy enforcement, onboarding, performance reviews, and maintaining workplace culture. Ensure compliance with labor laws and company policies.", "temperature": 0.6, "maxTokens": 1500}',
  '{"mode": "analytical", "depth": "balanced", "considerLongTerm": true, "riskTolerance": "low"}',
  '{"enabled": true, "types": ["working", "conversation", "organization"], "retentionDays": 180, "importance": "high"}',
  '{"timeout": 1800000, "maxRetries": 3, "approvalRequired": false, "escalationEnabled": true}',
  '{"maxWorkers": 10, "allowedDepartments": ["hr"], "restrictedActions": ["delete", "external_sharing"]}',
  '{"maxCost": 5.0, "alertThreshold": 3.75, "budgetPeriod": "monthly"}',
  '{"level": "detailed", "trackDecisions": true, "trackDelegations": false, "retentionDays": 180}',
  NOW(),
  NOW()
);

-- Finance Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-ba3456789012',
  'finance-agent',
  'Finance Agent',
  'Department agent for financial operations including budgeting, forecasting, expense management, financial reporting, and compliance.',
  'department',
  'department',
  '💰',
  true,
  false,
  '{"reasoningMode": "analytical", "maxConcurrentGoals": 5, "delegationEnabled": true, "approvalRequired": true}',
  '["budgeting", "forecasting", "expense_management", "financial_reporting", "compliance", "audit_support", "cost_optimization"]',
  '{"canReadFinancialData": true, "canManageBudgets": true, "canGenerateReports": true, "canAccessTransactions": true}',
  '["outcome", "output"]',
  '[{"workerType": "data_analysis", "accessLevel": "execute"}, {"workerType": "document_processing", "accessLevel": "execute"}, {"workerType": "calculation", "accessLevel": "admin"}]',
  '[{"type": "financial_policies", "scope": "department"}, {"type": "budget_data", "scope": "organization"}]',
  '{"systemPrompt": "You are the Finance Agent. Your responsibilities include budgeting, forecasting, expense management, financial reporting, and ensuring financial compliance. Maintain accuracy and transparency in all financial operations.", "temperature": 0.5, "maxTokens": 1500}',
  '{"mode": "analytical", "depth": "deep", "considerLongTerm": true, "riskTolerance": "low"}',
  '{"enabled": true, "types": ["long-term", "organization", "project"], "retentionDays": 365, "importance": "critical"}',
  '{"timeout": 1800000, "maxRetries": 2, "approvalRequired": true, "escalationEnabled": true}',
  '{"maxWorkers": 10, "allowedDepartments": ["finance"], "restrictedActions": ["delete", "external_sharing", "modify_approved"]}',
  '{"maxCost": 5.0, "alertThreshold": 3.75, "budgetPeriod": "monthly"}',
  '{"level": "detailed", "trackDecisions": true, "trackDelegations": true, "retentionDays": 365}',
  NOW(),
  NOW()
);

-- Sales Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'd4e5f6a7-b8c9-0123-defa-cb4567890123',
  'sales-agent',
  'Sales Agent',
  'Department agent for sales operations including lead management, pipeline tracking, customer engagement, and revenue optimization.',
  'department',
  'department',
  '📈',
  true,
  false,
  '{"reasoningMode": "balanced", "maxConcurrentGoals": 8, "delegationEnabled": true, "approvalRequired": false}',
  '["lead_management", "pipeline_tracking", "customer_engagement", "revenue_optimization", "sales_reporting", "forecasting"]',
  '{"canReadSalesData": true, "canManageLeads": true, "canAccessCRM": true, "canGenerateReports": true}',
  '["outcome", "output"]',
  '[{"workerType": "data_analysis", "accessLevel": "execute"}, {"workerType": "communication", "accessLevel": "execute"}, {"workerType": "document_processing", "accessLevel": "execute"}]',
  '[{"type": "sales_data", "scope": "department"}, {"type": "customer_data", "scope": "organization"}]',
  '{"systemPrompt": "You are the Sales Agent. Your responsibilities include lead management, pipeline tracking, customer engagement, and revenue optimization. Focus on driving sales growth and maintaining customer relationships.", "temperature": 0.7, "maxTokens": 1500}',
  '{"mode": "balanced", "depth": "balanced", "considerLongTerm": true, "riskTolerance": "medium"}',
  '{"enabled": true, "types": ["working", "conversation", "customer"], "retentionDays": 90, "importance": "medium"}',
  '{"timeout": 1800000, "maxRetries": 3, "approvalRequired": false, "escalationEnabled": true}',
  '{"maxWorkers": 10, "allowedDepartments": ["sales"], "restrictedActions": ["delete", "external_sharing"]}',
  '{"maxCost": 5.0, "alertThreshold": 3.75, "budgetPeriod": "monthly"}',
  '{"level": "standard", "trackDecisions": false, "trackDelegations": false, "retentionDays": 90}',
  NOW(),
  NOW()
);

-- Marketing Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'e5f6a7b8-c9d0-1234-efab-dc5678901234',
  'marketing-agent',
  'Marketing Agent',
  'Department agent for marketing operations including campaign management, content creation, brand management, and market analysis.',
  'department',
  'department',
  '📣',
  true,
  false,
  '{"reasoningMode": "creative", "maxConcurrentGoals": 6, "delegationEnabled": true, "approvalRequired": true}',
  '["campaign_management", "content_creation", "brand_management", "market_analysis", "social_media", "analytics", "seo_optimization"]',
  '{"canReadMarketingData": true, "canManageCampaigns": true, "canCreateContent": true, "canAccessAnalytics": true}',
  '["output", "initiative"]',
  '[{"workerType": "content_generation", "accessLevel": "execute"}, {"workerType": "data_analysis", "accessLevel": "execute"}, {"workerType": "document_processing", "accessLevel": "execute"}]',
  '[{"type": "brand_guidelines", "scope": "organization"}, {"type": "market_data", "scope": "department"}]',
  '{"systemPrompt": "You are the Marketing Agent. Your responsibilities include campaign management, content creation, brand management, and market analysis. Focus on creative solutions and data-driven marketing strategies.", "temperature": 0.8, "maxTokens": 1500}',
  '{"mode": "creative", "depth": "balanced", "considerLongTerm": true, "riskTolerance": "medium"}',
  '{"enabled": true, "types": ["working", "conversation", "knowledge"], "retentionDays": 90, "importance": "medium"}',
  '{"timeout": 1800000, "maxRetries": 3, "approvalRequired": true, "escalationEnabled": true}',
  '{"maxWorkers": 10, "allowedDepartments": ["marketing"], "restrictedActions": ["delete", "external_sharing"]}',
  '{"maxCost": 5.0, "alertThreshold": 3.75, "budgetPeriod": "monthly"}',
  '{"level": "standard", "trackDecisions": false, "trackDelegations": false, "retentionDays": 90}',
  NOW(),
  NOW()
);

-- Legal Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'f6a7b8c9-d0e1-2345-fabc-de6789012345',
  'legal-agent',
  'Legal Agent',
  'Department agent for legal operations including contract review, compliance monitoring, legal research, and risk assessment.',
  'department',
  'department',
  '⚖️',
  true,
  false,
  '{"reasoningMode": "analytical", "maxConcurrentGoals": 5, "delegationEnabled": false, "approvalRequired": true}',
  '["contract_review", "compliance_monitoring", "legal_research", "risk_assessment", "policy_development", "litigation_support"]',
  '{"canReadLegalDocuments": true, "canReviewContracts": true, "canAccessComplianceData": true, "canProvideLegalAdvice": true}',
  '["output", "initiative"]',
  '[{"workerType": "document_processing", "accessLevel": "execute"}, {"workerType": "data_analysis", "accessLevel": "execute"}]',
  '[{"type": "legal_policies", "scope": "organization"}, {"type": "contracts", "scope": "department"}]',
  '{"systemPrompt": "You are the Legal Agent. Your responsibilities include contract review, compliance monitoring, legal research, and risk assessment. Ensure all operations comply with applicable laws and regulations.", "temperature": 0.5, "maxTokens": 2000}',
  '{"mode": "analytical", "depth": "deep", "considerLongTerm": true, "riskTolerance": "low"}',
  '{"enabled": true, "types": ["long-term", "organization"], "retentionDays": 365, "importance": "critical"}',
  '{"timeout": 3600000, "maxRetries": 2, "approvalRequired": true, "escalationEnabled": true}',
  '{"maxWorkers": 8, "allowedDepartments": ["legal"], "restrictedActions": ["delete", "external_sharing", "modify_approved"]}',
  '{"maxCost": 5.0, "alertThreshold": 3.75, "budgetPeriod": "monthly"}',
  '{"level": "detailed", "trackDecisions": true, "trackDelegations": true, "retentionDays": 365}',
  NOW(),
  NOW()
);

-- Research Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'a7b8c9d0-e1f2-3456-abcd-ef7890123456',
  'research-agent',
  'Research Agent',
  'Specialized agent for research operations including market research, competitive analysis, technology scouting, and knowledge synthesis.',
  'research',
  'research',
  '🔬',
  true,
  false,
  '{"reasoningMode": "research", "maxConcurrentGoals": 5, "delegationEnabled": true, "approvalRequired": false}',
  '["market_research", "competitive_analysis", "technology_scouting", "knowledge_synthesis", "data_collection", "trend_analysis"]',
  '{"canAccessResearchData": true, "canConductAnalysis": true, "canGenerateReports": true, "canAccessExternalSources": true}',
  '["output", "initiative"]',
  '[{"workerType": "web_scraping", "accessLevel": "execute"}, {"workerType": "data_analysis", "accessLevel": "execute"}, {"workerType": "document_processing", "accessLevel": "execute"}]',
  '[{"type": "research_database", "scope": "organization"}, {"type": "market_reports", "scope": "department"}]',
  '{"systemPrompt": "You are the Research Agent. Your responsibilities include market research, competitive analysis, technology scouting, and knowledge synthesis. Provide thorough, well-sourced research to support decision-making.", "temperature": 0.6, "maxTokens": 2000}',
  '{"mode": "research", "depth": "deep", "considerLongTerm": true, "riskTolerance": "medium"}',
  '{"enabled": true, "types": ["long-term", "knowledge", "research"], "retentionDays": 180, "importance": "high"}',
  '{"timeout": 3600000, "maxRetries": 2, "approvalRequired": false, "escalationEnabled": true}',
  '{"maxWorkers": 10, "allowedDepartments": ["research", "all"], "restrictedActions": ["delete"]}',
  '{"maxCost": 5.0, "alertThreshold": 3.75, "budgetPeriod": "monthly"}',
  '{"level": "detailed", "trackDecisions": true, "trackDelegations": false, "retentionDays": 180}',
  NOW(),
  NOW()
);

-- Development Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'b8c9d0e1-f2a3-4567-bcde-fa8901234567',
  'development-agent',
  'Development Agent',
  'Department agent for software development operations including code generation, code review, testing, deployment, and technical documentation.',
  'development',
  'developer',
  '💻',
  true,
  false,
  '{"reasoningMode": "coding", "maxConcurrentGoals": 8, "delegationEnabled": true, "approvalRequired": true}',
  '["code_generation", "code_review", "testing", "deployment", "technical_documentation", "bug_fixing", "refactoring"]',
  '{"canAccessCodebase": true, "canGenerateCode": true, "canReviewCode": true, "canDeployCode": true}',
  '["output", "initiative"]',
  '[{"workerType": "code_generation", "accessLevel": "execute"}, {"workerType": "testing", "accessLevel": "execute"}, {"workerType": "document_processing", "accessLevel": "execute"}]',
  '[{"type": "codebase", "scope": "organization"}, {"type": "technical_docs", "scope": "department"}]',
  '{"systemPrompt": "You are the Development Agent. Your responsibilities include code generation, code review, testing, deployment, and technical documentation. Write clean, efficient, and well-documented code following best practices.", "temperature": 0.5, "maxTokens": 2000}',
  '{"mode": "coding", "depth": "deep", "considerLongTerm": true, "riskTolerance": "low"}',
  '{"enabled": true, "types": ["working", "conversation", "project"], "retentionDays": 90, "importance": "high"}',
  '{"timeout": 3600000, "maxRetries": 3, "approvalRequired": true, "escalationEnabled": true}',
  '{"maxWorkers": 15, "allowedDepartments": ["development", "engineering"], "restrictedActions": ["delete", "external_sharing", "production_deploy"]}',
  '{"maxCost": 5.0, "alertThreshold": 3.75, "budgetPeriod": "monthly"}',
  '{"level": "detailed", "trackDecisions": true, "trackDelegations": true, "retentionDays": 90}',
  NOW(),
  NOW()
);

-- Support Agent Template
INSERT INTO agent_templates (
  id, name, display_name, description, category, type, icon, is_system, is_public,
  configuration, capabilities, permissions, goal_types, worker_access,
  knowledge_sources, prompt_profile, reasoning_policy, memory_policy,
  execution_policy, security_policy, cost_policy, logging_policy,
  created_at, updated_at
) VALUES (
  'c9d0e1f2-a3b4-5678-cdef-ab9012345678',
  'support-agent',
  'Support Agent',
  'Department agent for customer support operations including ticket management, issue resolution, customer communication, and knowledge base maintenance.',
  'support',
  'department',
  '🎧',
  true,
  false,
  '{"reasoningMode": "fast", "maxConcurrentGoals": 10, "delegationEnabled": true, "approvalRequired": false}',
  '["ticket_management", "issue_resolution", "customer_communication", "knowledge_base", "escalation", "satisfaction_tracking"]',
  '{"canReadSupportTickets": true, "canResolveIssues": true, "canAccessCustomerData": true, "canUpdateKnowledgeBase": true}',
  '["output"]',
  '[{"workerType": "communication", "accessLevel": "execute"}, {"workerType": "document_processing", "accessLevel": "execute"}, {"workerType": "data_analysis", "accessLevel": "execute"}]',
  '[{"type": "support_kb", "scope": "organization"}, {"type": "customer_data", "scope": "department"}]',
  '{"systemPrompt": "You are the Support Agent. Your responsibilities include ticket management, issue resolution, customer communication, and knowledge base maintenance. Provide timely and effective support to ensure customer satisfaction.", "temperature": 0.7, "maxTokens": 1500}',
  '{"mode": "fast", "depth": "balanced", "considerLongTerm": false, "riskTolerance": "medium"}',
  '{"enabled": true, "types": ["working", "conversation", "customer"], "retentionDays": 90, "importance": "medium"}',
  '{"timeout": 600000, "maxRetries": 3, "approvalRequired": false, "escalationEnabled": true}',
  '{"maxWorkers": 10, "allowedDepartments": ["support"], "restrictedActions": ["delete", "external_sharing"]}',
  '{"maxCost": 3.0, "alertThreshold": 2.25, "budgetPeriod": "monthly"}',
  '{"level": "standard", "trackDecisions": false, "trackDelegations": false, "retentionDays": 90}',
  NOW(),
  NOW()
);

-- Track schema migration
INSERT INTO schema_migrations (version, applied_at) VALUES ('012_agent_templates_seed', NOW());