-- AI Intelligence Platform Migration
-- Migration 009 — runs exactly once via schema_migrations tracking
-- Tables: memories, knowledge_sources, embeddings, embedding_providers,
--         vector_indices, contexts, retrieval_logs, search_logs,
--         chunks, chunk_metadata, memory_policies, knowledge_categories

-- ─── Memory Policies ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memory_policies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  memory_type       VARCHAR(40) NOT NULL
                    CHECK (memory_type IN (
                      'working','conversation','session','long_term',
                      'knowledge','organization','user','project','goal','agent'
                    )),
  retention_period  VARCHAR(40) NOT NULL DEFAULT 'persistent'
                    CHECK (retention_period IN ('temporary','session','persistent','never_expire')),
  max_size_bytes    BIGINT,
  importance_filter VARCHAR(40)[] DEFAULT '{}',
  auto_archive      BOOLEAN NOT NULL DEFAULT false,
  archive_after_days INTEGER,
  is_system         BOOLEAN NOT NULL DEFAULT false,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mem_policy_org ON memory_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_mem_policy_type ON memory_policies(memory_type);

-- ─── Knowledge Categories ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES knowledge_categories(id) ON DELETE SET NULL,
  name            VARCHAR(100) NOT NULL,
  display_name    VARCHAR(200) NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  icon            VARCHAR(40) DEFAULT 'folder',
  color           VARCHAR(20) DEFAULT '#3b82f6',
  sort_order      SMALLINT NOT NULL DEFAULT 0,
  is_system       BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_know_cat_org ON knowledge_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_know_cat_parent ON knowledge_categories(parent_id);

-- ─── Knowledge Sources ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id       UUID REFERENCES knowledge_categories(id) ON DELETE SET NULL,
  name              VARCHAR(300) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  source_type       VARCHAR(40) NOT NULL
                    CHECK (source_type IN (
                      'knowledge_base','document','project','goal','task',
                      'conversation','uploaded_file','crm','hr','finance','plugin'
                    )),
  source_identifier VARCHAR(500) NOT NULL,
  source_metadata   JSONB DEFAULT '{}',
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','indexing','indexed','failed','archived')),
  last_indexed_at   TIMESTAMPTZ,
  indexing_progress NUMERIC(5,2) DEFAULT 0,
  error_message     TEXT,
  chunk_count       INTEGER NOT NULL DEFAULT 0,
  token_count       INTEGER NOT NULL DEFAULT 0,
  is_public         BOOLEAN NOT NULL DEFAULT false,
  permissions       JSONB DEFAULT '{}',
  tags              TEXT[] DEFAULT '{}',
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_know_source_org ON knowledge_sources(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_know_source_type ON knowledge_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_know_source_cat ON knowledge_sources(category_id);
CREATE INDEX IF NOT EXISTS idx_know_source_tags ON knowledge_sources USING gin(tags);

-- ─── Chunks ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chunks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id         UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
  chunk_index       INTEGER NOT NULL,
  content           TEXT NOT NULL,
  content_hash      VARCHAR(64) NOT NULL,
  token_count       INTEGER NOT NULL DEFAULT 0,
  char_count        INTEGER NOT NULL DEFAULT 0,
  start_offset      INTEGER,
  end_offset        INTEGER,
  page_number       INTEGER,
  section_path      TEXT[] DEFAULT '{}',
  language          VARCHAR(20) DEFAULT 'en',
  chunking_strategy VARCHAR(40) NOT NULL DEFAULT 'semantic'
                    CHECK (chunking_strategy IN ('fixed','semantic','sliding_window','hierarchical','custom')),
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunk_source ON chunks(source_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunk_org ON chunks(organization_id);
CREATE INDEX IF NOT EXISTS idx_chunk_hash ON chunks(content_hash);

-- ─── Chunk Metadata ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chunk_metadata (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id          UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  key               VARCHAR(100) NOT NULL,
  value             TEXT NOT NULL,
  value_type        VARCHAR(20) NOT NULL DEFAULT 'text'
                    CHECK (value_type IN ('text','number','boolean','date','json')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunk_meta_chunk ON chunk_metadata(chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunk_meta_key ON chunk_metadata(key);

-- ─── Embedding Providers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS embedding_providers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  provider_type     VARCHAR(40) NOT NULL
                    CHECK (provider_type IN ('local','openai','gemini','vertex','ollama')),
  display_name      VARCHAR(200) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  config            JSONB DEFAULT '{}',
  credentials_encrypted TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_default        BOOLEAN NOT NULL DEFAULT false,
  dimensions        INTEGER NOT NULL DEFAULT 1536,
  max_tokens        INTEGER NOT NULL DEFAULT 8191,
  cost_per_1k_tokens NUMERIC(10,6) DEFAULT 0,
  rate_limit_rpm    INTEGER,
  rate_limit_tpm    INTEGER,
  health_status     VARCHAR(20) NOT NULL DEFAULT 'unknown'
                    CHECK (health_status IN ('unknown','healthy','degraded','unhealthy','disabled')),
  last_health_check TIMESTAMPTZ,
  last_error        TEXT,
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emb_prov_org ON embedding_providers(organization_id);
CREATE INDEX IF NOT EXISTS idx_emb_prov_type ON embedding_providers(provider_type);
CREATE INDEX IF NOT EXISTS idx_emb_prov_active ON embedding_providers(is_active, is_default);

-- ─── Embeddings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS embeddings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  chunk_id          UUID NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  provider_id       UUID NOT NULL REFERENCES embedding_providers(id) ON DELETE CASCADE,
  vector            vector(1536) NOT NULL,
  model             VARCHAR(200) NOT NULL,
  dimensions        INTEGER NOT NULL,
  token_count       INTEGER NOT NULL DEFAULT 0,
  cost_usd          NUMERIC(10,6) DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emb_chunk ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_emb_provider ON embeddings(provider_id);
CREATE INDEX IF NOT EXISTS idx_emb_org ON embeddings(organization_id);
CREATE INDEX IF NOT EXISTS idx_emb_created ON embeddings(created_at DESC);

-- ─── Vector Indices ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vector_indices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              VARCHAR(200) NOT NULL,
  index_type        VARCHAR(40) NOT NULL DEFAULT 'ivfflat'
                    CHECK (index_type IN ('ivfflat','hnsw','flat','diskann')),
  vector_store_type VARCHAR(40) NOT NULL DEFAULT 'pgvector'
                    CHECK (vector_store_type IN ('pgvector','qdrant','pinecone','weaviate','chroma','redis')),
  config            JSONB DEFAULT '{}',
  dimensions        INTEGER NOT NULL,
  metric            VARCHAR(20) NOT NULL DEFAULT 'cosine'
                    CHECK (metric IN ('cosine','euclidean','dot_product','manhattan')),
  status            VARCHAR(20) NOT NULL DEFAULT 'building'
                    CHECK (status IN ('building','ready','updating','error','deleting')),
  last_built_at     TIMESTAMPTZ,
  last_optimized_at TIMESTAMPTZ,
  total_vectors     INTEGER NOT NULL DEFAULT 0,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vec_idx_org ON vector_indices(organization_id);
CREATE INDEX IF NOT EXISTS idx_vec_idx_status ON vector_indices(status);

-- ─── Memories ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_type        VARCHAR(40) NOT NULL
                    CHECK (owner_type IN ('user','team','project','goal','organization','agent','system')),
  owner_id          UUID NOT NULL,
  memory_type       VARCHAR(40) NOT NULL
                    CHECK (memory_type IN (
                      'working','conversation','session','long_term',
                      'knowledge','organization','user','project','goal','agent'
                    )),
  title             VARCHAR(500) NOT NULL,
  summary           TEXT,
  content           TEXT NOT NULL,
  embedding_reference UUID,
  tags              TEXT[] DEFAULT '{}',
  importance        VARCHAR(20) NOT NULL DEFAULT 'medium'
                    CHECK (importance IN ('low','medium','high','critical','pinned','archived')),
  confidence        NUMERIC(3,2) DEFAULT 1.0,
  expires_at        TIMESTAMPTZ,
  accessed_at       TIMESTAMPTZ,
  access_count      INTEGER NOT NULL DEFAULT 0,
  metadata          JSONB DEFAULT '{}',
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mem_org ON memories(organization_id);
CREATE INDEX IF NOT EXISTS idx_mem_owner ON memories(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_mem_type ON memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_mem_importance ON memories(importance);
CREATE INDEX IF NOT EXISTS idx_mem_expires ON memories(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mem_tags ON memories USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_mem_created ON memories(created_at DESC);

-- ─── Contexts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contexts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id   UUID REFERENCES conversations(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  context_type      VARCHAR(40) NOT NULL
                    CHECK (context_type IN ('conversation','request','session','workflow','agent')),
  context_data      JSONB NOT NULL DEFAULT '{}',
  assembled_context TEXT,
  context_size_tokens INTEGER,
  context_window_budget INTEGER NOT NULL DEFAULT 4096,
  used_tokens       INTEGER NOT NULL DEFAULT 0,
  sources           JSONB DEFAULT '[]',
  ranking_metadata  JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ctx_org ON contexts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ctx_conv ON contexts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ctx_user ON contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_ctx_type ON contexts(context_type);
CREATE INDEX IF NOT EXISTS idx_ctx_created ON contexts(created_at DESC);

-- ─── Retrieval Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retrieval_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  context_id        UUID REFERENCES contexts(id) ON DELETE SET NULL,
  query_text        TEXT NOT NULL,
  query_embedding   vector(1536),
  retrieval_type    VARCHAR(40) NOT NULL
                    CHECK (retrieval_type IN ('semantic','keyword','hybrid','metadata','filtered')),
  sources_queried   JSONB DEFAULT '[]',
  results_count     INTEGER NOT NULL DEFAULT 0,
  results_returned  INTEGER NOT NULL DEFAULT 0,
  latency_ms        INTEGER,
  cache_hit         BOOLEAN NOT NULL DEFAULT false,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ret_log_org ON retrieval_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ret_log_ctx ON retrieval_logs(context_id);
CREATE INDEX IF NOT EXISTS idx_ret_log_created ON retrieval_logs(created_at DESC);

-- ─── Search Logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  query_text        TEXT NOT NULL,
  search_type       VARCHAR(40) NOT NULL
                    CHECK (search_type IN ('semantic','keyword','hybrid','faceted','permission_aware')),
  filters           JSONB DEFAULT '{}',
  results_count     INTEGER NOT NULL DEFAULT 0,
  latency_ms        INTEGER,
  cache_hit         BOOLEAN NOT NULL DEFAULT false,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_log_org ON search_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_search_log_user ON search_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_log_created ON search_logs(created_at DESC);

-- ─── Seed: System Memory Policies ──────────────────────────────────────────────
INSERT INTO memory_policies (id, name, description, memory_type, retention_period, max_size_bytes, importance_filter, auto_archive, archive_after_days, is_system)
VALUES
  ('m0000000-0000-4000-8000-000000000001', 'Working Memory', 'Short-term working memory for active tasks', 'working', 'session', 1048576, ARRAY['low','medium','high','critical'], true, 1, true),
  ('m0000000-0000-4000-8000-000000000002', 'Conversation Memory', 'Memory from conversation interactions', 'conversation', 'persistent', 5242880, ARRAY['medium','high','critical'], true, 30, true),
  ('m0000000-0000-4000-8000-000000000003', 'Long-term Memory', 'Persistent long-term organizational knowledge', 'long_term', 'never_expire', 10485760, ARRAY['high','critical','pinned'], false, NULL, true),
  ('m0000000-0000-4000-8000-000000000004', 'Knowledge Memory', 'Indexed knowledge base content', 'knowledge', 'persistent', 20971520, ARRAY['high','critical'], false, NULL, true),
  ('m0000000-0000-4000-8000-000000000005', 'User Memory', 'User-specific preferences and history', 'user', 'persistent', 2097152, ARRAY['medium','high','critical'], false, NULL, true),
  ('m0000000-0000-4000-8000-000000000006', 'Organization Memory', 'Organization-wide knowledge and context', 'organization', 'never_expire', 52428800, ARRAY['high','critical','pinned'], false, NULL, true),
  ('m0000000-0000-4000-8000-000000000007', 'Project Memory', 'Project-specific context and decisions', 'project', 'persistent', 10485760, ARRAY['medium','high','critical'], true, 90, true),
  ('m0000000-0000-4000-8000-000000000008', 'Goal Memory', 'Goal-related context and progress', 'goal', 'persistent', 5242880, ARRAY['medium','high','critical'], true, 60, true),
  ('m0000000-0000-4000-8000-000000000009', 'Agent Memory', 'Agent-specific learned behaviors', 'agent', 'persistent', 10485760, ARRAY['high','critical','pinned'], false, NULL, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: System Knowledge Categories ─────────────────────────────────────────
INSERT INTO knowledge_categories (id, name, display_name, description, icon, sort_order, is_system)
VALUES
  ('k0000000-0000-4000-8000-000000000001', 'general', 'General', 'General knowledge and documentation', 'file-text', 1, true),
  ('k0000000-0000-4000-8000-000000000002', 'technical', 'Technical', 'Technical documentation and specs', 'code', 2, true),
  ('k0000000-0000-4000-8000-000000000003', 'business', 'Business', 'Business processes and policies', 'briefcase', 3, true),
  ('k0000000-0000-4000-8000-000000000004', 'hr', 'HR', 'Human resources policies and guides', 'users', 4, true),
  ('k0000000-0000-4000-8000-000000000005', 'finance', 'Finance', 'Financial documentation and reports', 'dollar-sign', 5, true),
  ('k0000000-0000-4000-8000-000000000006', 'product', 'Product', 'Product documentation and specs', 'package', 6, true),
  ('k0000000-0000-4000-8000-000000000007', 'legal', 'Legal', 'Legal documents and compliance', 'shield', 7, true),
  ('k0000000-0000-4000-8000-000000000008', 'support', 'Support', 'Customer support knowledge base', 'headphones', 8, true),
  ('k0000000-0000-4000-8000-000000000009', 'research', 'Research', 'Research and analysis documents', 'search', 9, true),
  ('k0000000-0000-4000-8000-000000000010', 'custom', 'Custom', 'Custom user-defined categories', 'folder', 10, true)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: Default Embedding Provider ──────────────────────────────────────────
INSERT INTO embedding_providers (id, name, provider_type, display_name, description, dimensions, max_tokens, is_default, is_active)
VALUES
  ('e0000000-0000-4000-8000-000000000001', 'local-embeddings', 'local', 'Local Embeddings', 'Local embedding model for development', 384, 512, true, true)
ON CONFLICT (id) DO NOTHING;