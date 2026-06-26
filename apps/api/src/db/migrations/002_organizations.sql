-- Extend organizations table with full multi-tenant fields
-- These run only once due to migration tracking in migrate.js
ALTER TABLE organizations ADD COLUMN slug VARCHAR(120);
ALTER TABLE organizations ADD COLUMN legal_name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN company_size VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN timezone VARCHAR(100) NOT NULL DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN currency VARCHAR(10) NOT NULL DEFAULT 'USD';
ALTER TABLE organizations ADD COLUMN logo TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN website TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN phone VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN address TEXT NOT NULL DEFAULT '';
ALTER TABLE organizations ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN subscription_plan VARCHAR(40) NOT NULL DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN subscription_status VARCHAR(40) NOT NULL DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN ai_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN storage_quota BIGINT NOT NULL DEFAULT 5368709120;
ALTER TABLE organizations ADD COLUMN storage_used BIGINT NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Backfill slug using the organization id (always unique and URL-safe)
UPDATE organizations SET slug = id::text WHERE slug IS NULL;

ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);
ALTER TABLE organizations ADD CONSTRAINT organizations_status_check CHECK (status IN ('active','archived'));

-- Extend organization_members with additional fields
ALTER TABLE organization_members ADD COLUMN title VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE organization_members ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE organization_members ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE organization_members ADD CONSTRAINT organization_members_status_check
  CHECK (status IN ('active','inactive'));

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Admin','Manager','User','Guest')),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_org_email ON invitations(organization_id, email)
  WHERE accepted_at IS NULL;

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization settings table (JSONB per category)
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category VARCHAR(40) NOT NULL CHECK (category IN ('general','branding','regional','billing','security','ai','notifications','storage')),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, category)
);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_org_id ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_org_settings_org_id ON organization_settings(organization_id);
