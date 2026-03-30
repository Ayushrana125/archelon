# Archelon — Development Update

> Complete data flow, file structure, and what passes from where.
> Reference this before making changes to understand the full picture.

---

## Project Structure

```
archelon/
├── backend/                        — FastAPI backend, deployed on Railway
│   ├── main.py                     — App entry, registers all routers
│   ├── jwt_handler.py              — JWT token creation + verification
│   ├── agent_1_intent_classifier.py — LLM Agent 1: intent classification
│   ├── agent_2_query_orchestrator.py — LLM Agent 2: query decomposition
│   ├── routers/
│   │   ├── auth.py                 — POST /api/auth/signup, /api/auth/login
│   │   ├── agents.py               — CRUD /api/agents, /api/agents/{id}/documents
│   │   └── ingest.py               — POST /api/ingest, GET /api/ingest/status/{job_id}
│   ├── ingestion/
│   │   ├── document_parser.py      — PDF/DOCX → Element list
│   │   ├── chunker.py              — Elements → ParentChunk + ChildChunk
│   │   └── ingestor.py             — Orchestrates parser + chunker + DB insert
│   └── db/
│       ├── supabase_client.py      — Supabase singleton connection
│       ├── users_db.py             — All SQL for users table
│       ├── agents_db.py            — All SQL for agents table
│       ├── documents_db.py         — All SQL for documents + ingestion_jobs
│       └── chunks_db.py            — All SQL for parent/child chunks + job tracking
│
└── frontend/                       — React + Vite, deployed on Vercel
    └── src/
        ├── main.jsx                — Router root, auth state, cache clear on login/logout
        ├── App.jsx                 — Main chat app shell, agent state management
        ├── services/
        │   ├── auth_service.js     — signup(), login(), getToken(), authHeaders(), logout()
        │   ├── agent_service.js    — fetchAgents(), createAgent(), updateAgent(), deleteAgent()
        │   ├── document_service.js — fetchDocuments(), deleteDocument(), fetchDocumentHistory()
        │   └── ingest_service.js   — uploadFiles(), getJobStatus()
        ├── hooks/
        │   └── useCache.js         — Global in-memory cache (get, set, invalidate)
        └── components/
            ├── LandingPage.jsx     — Public landing page with auth modal trigger
            ├── SignupPage.jsx      — /signup route — full signup form
            ├── LoginPage.jsx       — /login route — email/username login
            ├── LoadingScreen.jsx   — Spinning logo transition screen
            ├── HomePage.jsx        — Default view after login, no agent selected
            ├── Sidebar.jsx         — Agent list, collapse/expand, profile menu
            ├── TopNav.jsx          — Agent name, docs pill, edit button
            ├── ChatView.jsx        — Main chat interface with Arex/agent
            ├── CreateAgentView.jsx — Multi-step: setup → upload → processing
            ├── AgentSetup.jsx      — Step 1: name + instructions form
            ├── FileUpload.jsx      — Step 2: file picker with back button
            ├── ProcessingSteps.jsx — Step 3: real-time per-file ingestion progress
            ├── EditAgentView.jsx   — Edit name/instructions, add/delete docs
            ├── DocsPanel.jsx       — Right sidebar: doc list + ingest history
            ├── ThinkingSteps.jsx   — Chat thinking animation (classifier output)
            └── DocumentProcessing.jsx — In-chat document processing animation
```

---

## Authentication Flow

```
User fills SignupPage / LoginPage
    ↓
auth_service.js → POST /api/auth/signup or /api/auth/login
    ↓
routers/auth.py
    → bcrypt verifies/hashes password
    → jwt_handler.create_token(user_id, email)
    → returns { token, user: { id, username, email, first_name, last_name } }
    ↓
auth_service.js stores:
    localStorage['archelon_token'] = token
    localStorage['archelon_user']  = user JSON
    ↓
main.jsx handleLogin(userData)
    → clearCache() + clearDocumentCache()   ← prevents cross-user data leak
    → setUser(userData.user)
    → setIsLoading(true) → LoadingScreen
    ↓
LoadingScreen onDone()
    → localStorage['isLoggedIn'] = true
    → navigate('/chat')
    → App renders
```

**JWT on every protected request:**
```
authHeaders() → { Authorization: Bearer <token> }
    ↓
FastAPI Depends(verify_token)
    → jwt_handler.verify_token(authorization header)
    → returns { user_id, email }
    → used directly — never trust user_id from request body
```

**Logout:**
```
Sidebar → onLogout()
    → main.jsx handleLogout()
    → clearCache() + clearDocumentCache()
    → localStorage.removeItem('isLoggedIn', 'user')
    → navigate('/')
```

---

## Agent Flow

### Create Agent
```
HomePage "Create new agent" → setMode('create') → CreateAgentView

Step 1 — AgentSetup
    User fills name + instructions
    "Upload Documents" → createAgent() → POST /api/agents (JWT)
        → routers/agents.py → agents_db.create_agent(user_id, name, instructions)
        → returns agent { id, name, instructions, ... }
        → setCreatedAgent(agent) → setStep('upload')
    "Upload later" → same createAgent() call → setAgentData + onSave → mode='arex'

Step 2 — FileUpload
    User selects files (max 5, 10MB total)
    Back → setStep('setup')
    "Create Agent" → handleCreateAgent() → uploadFiles(agentId, files)
        → ingest_service.js → POST /api/ingest (multipart, JWT)
        → returns { files: [{ job_id, document_id, filename, file_size }] }
        → setJobs(jobList) → setStep('processing')

Step 3 — ProcessingSteps
    Receives jobs: [{ jobId, filename, fileSize }]
    Processes files ONE BY ONE (activeIndex)
    Per file: FileProgress polls GET /api/ingest/status/{job_id} every 1s
    When file done → onComplete → activeIndex++ → next file starts polling
    All done → 1.5s delay → handleProcessingComplete()
        → setAgentData(createdAgent) + onSave(agent) → mode='arex'

App.jsx handleSaveAgent(agent)
    → fetchAgents(forceRefresh=true) → re-fetches from DB
    → setSavedAgents(fresh list)     ← prevents duplicates
    → setActiveAgentId(agent.id)     ← highlights new agent in sidebar
```

### Edit Agent
```
TopNav edit icon → setMode('edit') → EditAgentView

step='edit'
    → fetchDocuments(agentId) on mount (cached)
    → User edits name/instructions → handleSave()
        → updateAgent(agentId, { name, instructions })
        → PATCH /api/agents/{id} (JWT)
        → onSave(updated) → App updates savedAgents + agentData

    → "Add documents" → setStep('upload')
    → Delete doc → handleDeleteDoc(docId) (2-click confirm)
        → deleteDocument(agentId, docId)
        → DELETE /api/agents/{id}/documents/{docId} (JWT)
        → invalidateDocuments(agentId) → removes from local state

    → "Delete agent" → handleDelete() (2-click confirm)
        → deleteAgent(agentId)
        → DELETE /api/agents/{id} (JWT) — hard delete, cascades all data
        → onDelete(id) → App removes from savedAgents, resets to home

step='upload' → FileUpload (same component, back → step='edit')
step='processing' → ProcessingSteps (same component)
step='done' → Success screen with "Back to agent" button → step='edit'
    (does NOT auto-navigate to chat)
```

### Delete Agent
```
EditAgentView → deleteAgent(agentId)
    → DELETE /api/agents/{id} (JWT)
    → agents_db.delete_agent() → hard DELETE from DB
    → ON DELETE CASCADE removes: documents → parent_chunks → child_chunks → ingestion_jobs
    → onDelete(id) → App: setSavedAgents(filter), setAgentData(null), setMode('arex')
```

---

## Document Ingestion Flow

### Backend Pipeline
```
POST /api/ingest (multipart: agent_id + files[])
    ↓
routers/ingest.py
    1. Verify agent belongs to user (JWT user_id)
    2. Validate: max 5 files, 10MB per file, 10MB total, PDF/DOCX/TXT only
    3. For each file:
        → chunks_db.create_document(agent_id, filename, ext, file_size)
        → chunks_db.create_ingestion_job(document_id)
        → Save to tempfile
        → background_tasks.add_task(run_ingestion, ...)
    4. Return immediately: { files: [{ job_id, document_id, filename, file_size }] }

BackgroundTask: run_ingestion(agent_id, tmp_path, filename, job_id, document_id)
    ↓
ingestion/ingestor.py
    Step 1 — update job: status='parsing'
        → document_parser.parse_document(file_path)
        → returns (elements, doc_title, filetype)
        → updates document filetype in DB

    Step 2 — update job: status='chunking', metadata={ elements }
        → chunker.build_parent_chunks(elements, doc_title)
        → chunker.build_child_chunks(parents)
        → calculates total_tokens, avg_tokens

    Step 3 — update job: status='saving', metadata={ parent_chunks, child_chunks, tokens }
        → chunks_db.batch_insert_parent_chunks(document_id, parents)
            → single INSERT with all parent rows → returns parent_id_map
        → chunks_db.batch_insert_child_chunks(parent_id_map, children)
            → single INSERT with all child rows, embedding=None
        → chunks_db.update_document_status(document_id, len(children))

    Step 4 — update job: status='done', metadata={ all stats + duration_ms }
```

### Frontend Polling
```
ProcessingSteps receives jobs: [{ jobId, filename, fileSize }]
    ↓
activeIndex = 0 (only first file polls initially)
    ↓
FileProgress(active=true)
    → polls GET /api/ingest/status/{job_id} every 1000ms
    → reads job.status + job.metadata
    → renders steps: parsing → chunking → saving → done
    → on done/error: clearInterval → 800ms delay → onComplete(status)
    ↓
onComplete → activeIndex++ → next FileProgress becomes active
    ↓
All done → 1500ms delay → onComplete() (parent callback)
```

### Job Status Response Shape
```json
{
  "id": "uuid",
  "document_id": "uuid",
  "status": "parsing | chunking | saving | done | error",
  "error": null,
  "chunks_created": 48,
  "completed_at": "2026-03-30T...",
  "metadata": {
    "step": "done",
    "filename": "resume.pdf",
    "file_size": 245000,
    "filetype": "PDF",
    "elements": 115,
    "parent_chunks": 46,
    "child_chunks": 48,
    "total_tokens": 3240,
    "avg_tokens": 70,
    "duration_ms": 4200
  }
}
```

---

## DocsPanel (Right Sidebar)

```
TopNav "N docs" pill → App setShowDocsPanel(true) → DocsPanel(agentData)
    ↓
fetchDocuments(agentId, forceRefresh=true) on mount
    → GET /api/agents/{id}/documents (JWT, cached in document_service._cache)
    ↓
Default view (w-80): document list with filename + size + status

"View ingest history" button (teal gradient)
    → showHistory=true → panel expands to w-96
    → For each document: DocHistory component
        → fetchDocumentHistory(agentId, docId) (cached in _cache['history_{docId}'])
        → GET /api/agents/{id}/documents/{docId}/history (JWT)
        → renders 4 steps with metadata stats inline

"Hide history" → showHistory=false → panel shrinks back
```

---

## Caching Strategy

| Cache Key | What | Invalidated When |
|---|---|---|
| `agents` | All agents for logged-in user | createAgent, updateAgent, deleteAgent, login, logout |
| `docs_{agentId}` | Documents for an agent | deleteDocument, after ingestion complete, login, logout |
| `history_{docId}` | Ingestion job for a document | deleteDocument, login, logout |

**Cache lives in module-level `_cache = {}` objects in:**
- `agent_service.js` — agents cache
- `document_service.js` — docs + history cache

**Cleared on login AND logout** in `main.jsx`:
```js
clearCache();          // agent_service
clearDocumentCache();  // document_service
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | No | Create user, returns token + user |
| POST | `/api/auth/login` | No | Login, returns token + user |
| GET | `/api/agents` | JWT | Get all agents for user |
| POST | `/api/agents` | JWT | Create agent |
| PATCH | `/api/agents/{id}` | JWT | Update agent name/instructions |
| DELETE | `/api/agents/{id}` | JWT | Hard delete agent + all data |
| GET | `/api/agents/{id}/documents` | JWT | Get documents for agent |
| DELETE | `/api/agents/{id}/documents/{docId}` | JWT | Delete document + chunks |
| GET | `/api/agents/{id}/documents/{docId}/history` | JWT | Get ingestion job for document |
| POST | `/api/ingest` | JWT | Upload files, returns job_ids immediately |
| GET | `/api/ingest/status/{job_id}` | JWT | Poll ingestion job status |
| POST | `/api/chat` | No | Chat with agent (classifier + orchestrator) |

---

## Supabase Schema

```
users
  → agents (user_id FK)
    → documents (agent_id FK)
      → ingestion_jobs (document_id FK) — metadata JSONB column added
      → parent_chunks (document_id FK) — token_count column added
        → child_chunks (parent_id FK)  — token_count column added, embedding=NULL for now
```

**Key columns added today:**
```sql
ALTER TABLE ingestion_jobs ADD COLUMN metadata JSONB DEFAULT '{}';
ALTER TABLE parent_chunks  ADD COLUMN token_count INT DEFAULT 0;
ALTER TABLE child_chunks   ADD COLUMN token_count INT DEFAULT 0;
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | frontend `.env.local` + Vercel | Backend URL (local or Railway) |
| `MISTRAL_API_KEY_1` | backend `.env` + Railway | Mistral LLM API |
| `SUPABASE_URL` | backend `.env` + Railway | Supabase project URL |
| `SUPABASE_KEY` | backend `.env` + Railway | Supabase service role key |
| `JWT_SECRET` | backend `.env` + Railway | JWT signing secret |

---

## What Is Not Built Yet

- **Embeddings** — `embedding=None` in child_chunks. Next phase: batch embed with Mistral Embeddings API
- **Retrieval** — `RetrievalAgent` class with vector search against child_chunks
- **Synthesizer** — LLM reads retrieved chunks and streams answer
- **SmallTalkAgent** — currently returns hardcoded string, needs real LLM call with persona
- **Conversation memory** — `session_id` accepted but not stored
- **Streaming responses** — synthesizer will stream tokens via SSE
