# Document Management

**Archelon — Backend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

Document management covers everything from uploading a file to viewing, deleting, and tracking ingestion history. Documents belong to agents and are the source of knowledge for RAG.

---

## Upload Flow

**Endpoint:** `POST /api/ingest`

**File:** `backend/routers/ingest.py`

### Limits

| Limit | Value | Why |
|---|---|---|
| Max files per upload | 5 | Prevents memory spikes on Railway |
| Max file size | 2MB per file | Railway free tier memory limit |
| Max total size | 6MB across all files | Same reason |
| Allowed types | `.pdf`, `.docx`, `.txt` | Only supported parsers |

### Validation Order

1. Agent ownership check — 404 if agent doesn't belong to user
2. Token balance check — 402 if exhausted
3. File count check — 400 if > 5 files
4. Per-file: extension whitelist, 2MB limit
5. Total size check — 400 if > 6MB
6. Filename sanitization

### Filename Sanitization

```python
def sanitize_filename(name: str) -> str:
    name = os.path.basename(name)           # strips ../../ path traversal
    name = re.sub(r'[^\w\s\-.]', '', name)  # strips special chars (XSS protection)
    name = name.strip('. ')                 # strips leading/trailing dots/spaces
    return name[:100] or 'document'         # max 100 chars
```

### Background Task Pattern

The endpoint returns immediately with job IDs — it does not wait for processing:

```
POST /api/ingest
    → validate all files
    → create document rows in DB
    → create ingestion_job rows in DB
    → save files to temp disk
    → queue background tasks (one per file)
    → return { files: [{ job_id, document_id, filename, ... }] }

Background (async, parallel):
    → ingest_document() for each file
    → parse → chunk → save → embed → done
    → update job status at each step
```

Frontend polls `GET /api/ingest/status/{job_id}` every 1 second to show live progress.

### Temp File Cleanup

Each background task saves the file to a temp path, runs ingestion, then deletes the temp file in a `finally` block — cleanup happens even if ingestion fails.

---

## Status Polling

**Endpoint:** `GET /api/ingest/status/{job_id}`

Returns the full `ingestion_jobs` row including `metadata` JSONB with pipeline progress.

**Important:** Uses `execute()` without `.single()` — returns `None` if job not found instead of throwing. Returns 404 if `None`. This prevents 500 crashes when a job row is deleted (e.g. after document deletion cascade).

---

## Documents DB

**File:** `backend/db/documents_db.py`

### Functions

| Function | What it does |
|---|---|
| `get_documents_by_agent(agent_id)` | Returns all documents for an agent — id, filename, filetype, file_size, status, chunk_count, created_at |
| `delete_document(document_id, agent_id)` | Deletes document — cascades to ingestion_jobs, parent_chunks, child_chunks |
| `get_ingestion_job_by_document(document_id)` | Returns the most recent ingestion job for a document (for history view) |

### Document Status Values

| Status | Meaning |
|---|---|
| `uploaded` | File received, ingestion not started |
| `processing` | Ingestion background task running |
| `processed` | All steps complete, embeddings stored |
| `error` | Ingestion failed — error message in ingestion_job.error |

---

## Document Deletion

**Endpoint:** `DELETE /api/agents/{agent_id}/documents/{document_id}`

**File:** `backend/routers/agents.py`

Deletes the document row. Supabase `ON DELETE CASCADE` automatically removes:
- `ingestion_jobs` rows for this document
- `parent_chunks` rows
- `child_chunks` rows (including embeddings)

After deletion, `invalidateDocuments(agentId)` is called on the frontend to clear the cache, then `fetchDocuments` force-refetches so the DocsPanel and TopNav pill update immediately.

---

## Ingestion History

**Endpoint:** `GET /api/agents/{agent_id}/documents`

Returns all documents for an agent. The frontend `EditAgentView` shows each document with its status and a delete button. Clicking a document shows its ingestion job metadata (elements extracted, chunks created, tokens, duration).

---

## Frontend Caching

**File:** `frontend/src/services/document_service.js`

Documents are cached in memory to avoid redundant fetches:

```javascript
const cache = {};

export function getCachedDocuments(agentId) {
    return cache[agentId] || null;
}

export function invalidateDocuments(agentId) {
    delete cache[agentId];
}

export async function fetchDocuments(agentId, forceRefresh = false) {
    if (!forceRefresh && cache[agentId]) return cache[agentId];
    const docs = await fetch(`${API_URL}/api/agents/${agentId}/documents`, ...);
    cache[agentId] = docs;
    return docs;
}
```

Cache is invalidated after:
- Document deleted
- New document uploaded and processed
- Agent switched (stale data cleared)

---

## File Upload Validation — Frontend

**File:** `frontend/src/components/FileUploadModal.jsx`

Client-side validation before the file even reaches the backend:

```javascript
const ALLOWED = ['.pdf', '.docx', '.txt'];
const MAX_FILES = 5;

// Filter valid files, skip invalid ones silently
const valid = files.filter(f => ALLOWED.includes(ext(f)));
const skipped = files.length - valid.length;

// Show notice if any were skipped
if (skipped > 0) setNotice(`${skipped} unsupported file(s) skipped.`);

// Enforce 5 file limit
const toUpload = valid.slice(0, MAX_FILES);
```

Valid files proceed immediately — no user confirmation needed. Skipped files show a brief notice. This prevents wasted API calls for unsupported file types.

---

## Logo Upload

**Endpoint:** `POST /api/embed/{agent_id}/logo`

Separate from document upload — used for widget logos only.

- Allowed: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`
- Max size: 500KB
- Uploaded to Supabase Storage bucket `widget-logos` (public)
- Public URL saved to `api_keys.logo_url`
- Filename format: `{agent_id}_{random_8_chars}{ext}` — prevents collisions

Goes through backend (not direct frontend → Supabase) so the backend controls validation, naming, and URL format.
