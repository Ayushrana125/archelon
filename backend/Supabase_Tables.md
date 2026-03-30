✅ 0. Enable extension (run first)
CREATE EXTENSION IF NOT EXISTS vector;
✅ 1. Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,

  first_name TEXT,
  last_name TEXT,

  company_name TEXT,
  website TEXT,

  is_email_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
✅ 2. Agents
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,

  model TEXT DEFAULT 'mistral-small-latest',
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_agents_user_id ON agents(user_id);
✅ 3. Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  filename TEXT NOT NULL,
  filetype TEXT NOT NULL,
  file_size INT,

  status TEXT DEFAULT 'uploaded',
  chunk_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_documents_agent_id ON documents(agent_id);
✅ 4. Ingestion Jobs
CREATE TABLE ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending',
  error TEXT,
  chunks_created INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_ingestion_document_id ON ingestion_jobs(document_id);
✅ 5. Parent Chunks
CREATE TABLE parent_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  summary TEXT,
  summary_embedding VECTOR(1024),

  section_name TEXT,
  page_number INT,
  chunk_index INT,
  token_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_parent_chunks_document_id 
ON parent_chunks(document_id);

CREATE INDEX idx_parent_chunks_embedding
ON parent_chunks
USING ivfflat (summary_embedding vector_cosine_ops)
WITH (lists = 100);
✅ 6. Child Chunks
CREATE TABLE child_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parent_chunks(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  embedding VECTOR(1024),

  chunk_index INT,
  token_count INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_child_chunks_parent_id 
ON child_chunks(parent_id);

CREATE INDEX idx_child_chunks_embedding
ON child_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
🧠 Final Structure (clean flow)
users
  → agents
    → documents
      → parent_chunks
        → child_chunks