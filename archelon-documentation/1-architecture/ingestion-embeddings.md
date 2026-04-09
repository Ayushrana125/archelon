# Ingestion & Embedding Pipeline

**Archelon — Backend Documentation**  
Date: April 2, 2026  
Author: Ayush Rana

---

## Overview

This document covers the complete ingestion and embedding pipeline built for Archelon. It covers every decision made, every bug encountered, every fix applied, and the reasoning behind each change. Nothing is skipped.

The pipeline takes a raw uploaded document (PDF, DOCX, TXT) and transforms it into searchable vector embeddings stored in Supabase. This is the foundation of the RAG (Retrieval Augmented Generation) system.

---

## Pipeline Stages

The final pipeline has 6 stages:

```
parsing → chunking → saving → embedding → vectorizing → done
```

Each stage updates the `ingestion_jobs` table in Supabase with a status and metadata. The frontend polls this every 1 second and shows live progress to the user.

---

## Stage 1 — Parsing

**File:** `ingestion/document_parser.py`

The document is parsed using `unstructured` library. It extracts elements — headings, paragraphs, list items, tables, code blocks — and returns them as a flat list with type and page number.

**What it produces:**
- A list of elements with `.type`, `.text`, `.page`
- Document title
- File type (pdf, docx, txt)

---

## Stage 2 — Chunking

**File:** `ingestion/chunker.py`

Elements are grouped into **parent chunks** (section-level) and then split into **child chunks** (sentence-level). Child chunks are what get embedded.

**Parent chunks:**
- Section-aware — grouped by heading hierarchy
- Max 800 tokens per parent
- If a section exceeds 800 tokens, it's split with overlap

**Child chunks:**
- Max 150 tokens each
- Sentence-level splitting using regex
- Code blocks and tables kept as single chunks (with a size cap added later — see Bug #3)

**Token estimation:**
```python
def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)
```

This is a rough approximation — 1 token ≈ 4 characters. It works for plain English but underestimates for code because symbols like `{`, `}`, `->` each count as tokens but are only 1-2 characters. This caused issues later (see Bug #3).

---

## Stage 3 — Saving

**File:** `db/chunks_db.py`

All parent and child chunks are inserted into Supabase in **two batch inserts** — one for parent chunks, one for child chunks. This is done in a single DB call each to avoid N individual inserts.

`batch_insert_child_chunks` was updated to **return the inserted rows** (with their Supabase UUIDs) so the embedding stage can use the real IDs.

```python
async def batch_insert_child_chunks(parent_id_map: dict, children: list) -> list[dict]:
    ...
    response = db.table("child_chunks").insert(rows).execute()
    return response.data or []  # ← returns inserted rows with IDs
```

**Why this matters:** Before this change, we had no way to map chunk content back to its DB ID for embedding. We needed the real UUID to update the `embedding` column later.

---

## Stage 4 — Embedding

**File:** `ingestion/embedding_service.py`

Child chunks are embedded using Mistral's `mistral-embed` model. Each embedding is a vector of 1024 floats that represents the semantic meaning of the chunk.

### Model
- **Model:** `mistral-embed`
- **Endpoint:** `https://api.mistral.ai/v1/embeddings`
- **API Key env var:** `MISTRAL_API_KEY_1`
- **Cost:** $0.10 per 1M tokens (~₹0.016 per 2000 tokens — essentially free at current scale)

### Batching Strategy

Mistral has two limits per API call:
1. **Token limit:** 16,384 tokens per request
2. **Input limit:** ~100 inputs per request (undocumented, discovered through errors)

We batch by whichever limit is hit first:

```python
MAX_TOKENS_BATCH = 15_000   # stay under 16,384 with buffer
MAX_INPUTS_BATCH = 50       # safe limit discovered through trial and error
```

**Why 50 inputs?** Mistral's actual limit is undocumented. We first tried 512 (assumed), then 64, then settled on 50 after seeing "Too many inputs" errors. 50 is conservative and reliable.

### Rate Limiting

Free tier: 1 request/second hard limit.

```python
RATE_LIMIT_DELAY = 1.1  # 1.1s between batches — slightly over 1s to be safe
```

Between each batch we `await asyncio.sleep(1.1)`. This is skipped after the last batch.

### Progress Callback

After each batch completes, an async callback updates the job metadata in Supabase:

```python
async def on_batch_done(batch_num, total):
    current_meta["embed_batches"] = batch_num
    current_meta["embed_total"]   = total
    await chunks_db.update_ingestion_job(job_id, "embedding", metadata=dict(current_meta))
```

The frontend polls every 1 second and shows `Batch 1 of 6`, `Batch 2 of 6` etc. with a live progress bar.

**Critical bug here (see Bug #4):** `on_batch_done` was initially called without `await`, so it never ran and the progress bar was always empty.

---

## Stage 5 — Vectorizing

**File:** `db/chunks_db.py` → `update_child_chunk_embeddings`

After all embeddings are generated, they are saved back to the `child_chunks` table in Supabase by updating the `embedding` column for each row.

This is a separate stage from embedding because it takes significant time and the user deserves to see it as a distinct step.

### Evolution of this function — 3 attempts

**Attempt 1 — Sequential individual updates (original):**
```python
for chunk_id, vector in embeddings.items():
    db.table("child_chunks").update({"embedding": vector}).eq("id", chunk_id).execute()
```
This worked but was extremely slow — 271 updates × ~350ms each = ~95 seconds. The UI appeared frozen on the last batch.

**Attempt 2 — Bulk upsert:**
```python
db.table("child_chunks").upsert(rows).execute()
```
This failed with:
```
null value in column "parent_id" violates not-null constraint
```
Supabase's upsert treated `{id, embedding}` as a new row insert, not an update. It tried to create new rows without the required `parent_id`, `content` etc. columns. Upsert in Supabase requires all non-null columns unless you specify the conflict column explicitly — and the Python client doesn't support that cleanly.

**Attempt 3 — asyncio.gather with async functions (wrong):**
```python
async def update_one(chunk_id, vector):
    db.table(...).update(...).execute()

await asyncio.gather(*[update_one(cid, vec) for cid, vec in batch])
```
This looked concurrent but wasn't. The Supabase Python client (`supabase-py`) uses a **synchronous** HTTP client internally. Calling it inside an `async def` doesn't make it async — it still blocks the event loop. `asyncio.gather` with sync-blocking functions runs them sequentially, not in parallel.

**Attempt 4 — asyncio.to_thread (current, correct):**
```python
def update_one(chunk_id, vector):  # sync function
    db.table("child_chunks").update({"embedding": vector}).eq("id", chunk_id).execute()

await asyncio.gather(*[asyncio.to_thread(update_one, cid, vec) for cid, vec in batch])
```

`asyncio.to_thread` runs a sync function in a **thread pool executor**. This means the event loop is not blocked — it can handle other requests (like status polls) while the DB updates run in background threads. 10 updates run truly in parallel.

**Result:** 271 updates dropped from ~95 seconds to ~8-10 seconds.

---

## Stage 6 — Done

Job status set to `done` with full metadata including `duration_ms` (total time from start to finish).

---

## Error Handling

### On any pipeline failure:
1. Error message written to `ingestion_jobs.error` column
2. Document status set to `error`
3. Exception is NOT re-raised (this was a bug — see Bug #6)

### Why we don't delete the document on error:
Initially we deleted the document on failure to "clean up". This caused a cascade problem — Supabase has `ON DELETE CASCADE` on `ingestion_jobs.document_id → documents.id`. Deleting the document automatically deleted the job row. The frontend then polled for the job, got a 404, and the status endpoint crashed with a 500 (no CORS headers on crash = browser blocked the response entirely).

**Fix:** Keep the document with `status=error`. The user sees the error in the UI. They can delete it manually.

---

## Bugs Encountered and Fixed

### Bug #1 — Wrong API field name
**Error:** `422 Unprocessable Entity`  
**Cause:** Mistral's embedding API uses `"input"` (singular) not `"inputs"` (plural).  
**Fix:** Changed `"inputs": texts` to `"input": texts`.

### Bug #2 — Wrong API key env var
**Error:** `401 Unauthorized`  
**Cause:** Code used `MISTRAL_API_KEY` but the env var on Railway was named `MISTRAL_API_KEY_1`.  
**Fix:** Changed `os.getenv("MISTRAL_API_KEY")` to `os.getenv("MISTRAL_API_KEY_1")`.

### Bug #3 — Oversized code block chunks
**Error:** `400 Bad Request — Too many inputs`  
**Cause:** The chunker kept code blocks as single unsplit chunks regardless of size. A large doc with many code blocks produced chunks that were individually fine token-wise but collectively exceeded Mistral's input count limit when sent as one batch.  
**Fix 1:** Added `MAX_INPUTS_BATCH = 50` to split by input count, not just tokens.  
**Fix 2:** Updated chunker to split oversized code blocks by word count instead of keeping them whole.  
**Fix 3:** Added content length filter in embedding service — truncate any chunk over 60,000 characters.

### Bug #4 — on_batch_done never ran
**Symptom:** Progress bar always empty, subtext always "Preparing X chunks..." never updated to "Batch 1 of 6".  
**Cause:** `on_batch_done` is an `async` function but was called without `await`:
```python
if on_batch_done:
    on_batch_done(i + 1, total_batches)  # ← missing await, returns coroutine object, never executes
```
**Fix:** Added `await`:
```python
if on_batch_done:
    await on_batch_done(i + 1, total_batches)
```

### Bug #5 — .single() crash on deleted/missing job
**Error:** `500 Internal Server Error` + CORS blocked  
**Cause:** `get_ingestion_job` used `.single()` which throws a Supabase `APIError` when 0 rows are found. When a job was deleted or didn't exist, the status endpoint crashed before FastAPI could attach CORS headers. Browser blocked the response.  
**Fix:** Removed `.single()`, return `None` instead:
```python
response = db.table("ingestion_jobs").select("*").eq("id", job_id).execute()
return response.data[0] if response.data else None
```

### Bug #6 — re-raise causing 500 on background task
**Cause:** The `except` block re-raised the exception after writing the error to DB. In a FastAPI `BackgroundTask`, an unhandled exception causes the server to return a 500 with no CORS headers on the next request.  
**Fix:** Removed `raise` from the except block. The error is already written to the DB — no need to propagate it further.

### Bug #7 — Upsert creating new rows instead of updating
**Error:** `null value in column "parent_id" violates not-null constraint`  
**Cause:** Supabase upsert with only `{id, embedding}` tried to insert new rows instead of updating existing ones. All required columns were missing.  
**Fix:** Abandoned upsert, moved to `asyncio.to_thread` approach (see Stage 5, Attempt 4).

---

## Frontend — ProcessingSteps.jsx

The frontend polls `/api/ingest/status/{job_id}` every 1 second and renders the pipeline steps live.

### Step order (final):
```
parsing → chunking → saving → embedding → vectorizing → done
```

### Features added during this session:
- **Embedding step** with live batch progress: `Batch 1 of 6 · 271 chunks`
- **Progress bar** that fills as each batch completes
- **Archelon logo spinner** on embedding and vectorizing steps (instead of pulsing dot)
- **Elapsed timer** in the file header showing seconds while processing
- **Error state** — after 3 consecutive failed polls, shows error message and stops polling
- **Collapsible steps** — auto-collapses when done, can be expanded to review

### Why the progress bar was blank for a long time:
The `on_batch_done` callback was not awaited (Bug #4). The DB was never updated with batch progress so the frontend always read `embed_batches: 0`.

---

## Performance Summary

| Doc | Chunks | Batches | Total Time (before) | Total Time (after) |
|-----|--------|---------|--------------------|--------------------|
| Resume (47 chunks) | 47 | 1 | ~18s | ~18s |
| Doc1 (271 chunks) | 271 | 6 | ~118s | ~30s |

The improvement from 118s to 30s came from:
1. `asyncio.to_thread` for concurrent DB updates (95s → 8s for vectorizing)
2. Correct `await` on `on_batch_done` (no functional speedup but fixed progress display)

---

## Mistral Free Tier Limits

| Limit | Value |
|-------|-------|
| Requests per second | 1 |
| Tokens per minute | 500,000 |
| Max tokens per request | 16,384 |
| Max inputs per request | ~100 (undocumented, we use 50) |
| Cost | Free |

When upgrading to paid tier, `RATE_LIMIT_DELAY` can be reduced to `0.3` and `MAX_INPUTS_BATCH` can be increased to `100+`.

---

## Files Modified

| File | What Changed |
|------|-------------|
| `ingestion/embedding_service.py` | New file — entire embedding service |
| `ingestion/ingestor.py` | Added embedding + vectorizing steps, fixed error handling |
| `ingestion/chunker.py` | Added size cap on code block chunks |
| `db/chunks_db.py` | `batch_insert_child_chunks` returns rows, added `update_child_chunk_embeddings`, fixed `get_ingestion_job` `.single()`, added `delete_document_cascade` |
| `frontend/src/components/ProcessingSteps.jsx` | Added embedding + vectorizing steps, progress bar, spinner, elapsed timer, error handling |

---

## Future Improvements

1. **Switch to `supabase-py` async client** — eliminates the need for `asyncio.to_thread` entirely. All DB calls become truly async.
2. **Redis + Celery queue** — when multiple users upload simultaneously, background tasks compete for Mistral rate limits. A queue processes one document at a time per API key.
3. **Multiple Mistral API keys** — keys from different accounts give separate rate limit quotas. Round-robin between them for higher throughput.
4. **Accurate token counting** — replace `len(text) // 4` with the actual Mistral tokenizer for precise batch sizing.
5. **Retry logic** — if a batch fails with a 429 (rate limit), wait and retry instead of failing the whole document.
