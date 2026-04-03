# Retrieval Pipeline, RAG Wiring & Infrastructure Fixes

**Archelon — Backend Documentation**  
Date: April 3, 2026  
Author: Ayush Rana

---

## Overview

This document covers everything built and fixed in this session:

1. **Retrieval pipeline** — vector search via Supabase Edge Function, deduplication, reranking, token budget
2. **Full RAG wiring** — intent classifier → query analyser → retrieval → synthesizer → response
3. **Infrastructure bugs** — stale Supabase connections causing broken pipe and connection reset errors
4. **Embedding fixes** — 503 overflow on dense technical documents, character-based batching
5. **Synthesizer grounding** — hallucination prevention for metrics and achievements
6. **Frontend additions** — auto-greeting on agent select, bug report button

---

## Part 1 — Retrieval Pipeline

### Architecture Decision: Supabase Edge Function

The vector search needed to run close to the database to avoid a round-trip from Railway → Supabase → Railway. We chose a **Supabase Edge Function** (`retrieve-chunks`) that runs inside Supabase's infrastructure.

**Why not RPC:** We wanted a pure edge function with no stored SQL functions. After several failed attempts with `deno-postgres` (connection string parsing issues, missing database parameter errors), we switched to the **Supabase JS client** using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — both injected automatically into every edge function with no secrets needed.

**Final approach:** Edge function uses `supabase.rpc()` calling a SQL function `retrieve_chunks_vector`. This was the only clean way to run pgvector's `<=>` operator from the JS client.

### SQL Function

```sql
CREATE OR REPLACE FUNCTION retrieve_chunks_vector(
  query_embedding TEXT,
  agent_id_filter UUID,
  match_count     INT DEFAULT 15
)
RETURNS TABLE (
  child_id           UUID,
  parent_id          UUID,
  child_content      TEXT,
  parent_content     TEXT,
  section_name       TEXT,
  parent_token_count INT,
  filename           TEXT,
  score              FLOAT
)
```

Key design decisions:
- Returns `filename` directly from the `documents` table join — avoids parsing section names to extract doc names
- Returns both `child_content` (for matching precision) and `parent_content` (for LLM context)
- Returns `section_name` — critical for LLM context so it knows where in the document content came from
- Filters by `agent_id` through the join chain: `child_chunks → parent_chunks → documents` — ensures data isolation

### Retrieval Settings (Validated via Test Script)

| Setting | Value | Reasoning |
|---|---|---|
| `match_count` | 15 child chunks | Wide net, dedup reduces this |
| `RELEVANCE_THRESHOLD` | 0.6 | Drop anything with cosine distance > 0.6 |
| `GAP_THRESHOLD` | 0.05 | Stop when score jumps more than this |
| `MIN_TOKENS` | 20 | Skip junk chunks (headers, footers) |
| `SINGLE_BUDGET` | 1500 tokens | Max context for single query |
| `MULTI_BUDGET` | 3000 tokens | Max context for multi query |

### Reranking Logic

After vector search returns 15 child chunks:

1. **Deduplicate by `parent_id`** — keep best (lowest) score per parent. Multiple children from the same section collapse into one parent.
2. **Sort ascending by score** — most relevant first (lower cosine distance = more relevant)
3. **Gap detection** — stop when score jumps > `GAP_THRESHOLD`. This catches focused queries like "What is pricing?" where only 1-2 sections are relevant, preventing noise from loosely related sections.
4. **Junk filter** — skip parents with `token_count < 20` (headers, footers, title-only chunks)
5. **Token budget** — safety net, stop before exceeding context limit

**Why gap detection matters:** Without it, a query like "What is pricing?" would return 6 sections because all scores were between 0.28-0.37 — all under the 0.6 threshold. Gap detection catches the natural drop-off at 0.345 and stops there, returning only the pricing section.

### Test Script

A standalone Python test script was built at `backend/archelon_testing/retrieval_test.py` to validate the full pipeline before wiring into the backend. It:
- Embeds queries via Mistral
- Calls the edge function
- Runs deduplication + reranking + budget logic
- Outputs results to timestamped Excel files (child chunks + parent chunks) and a summary text file

**Key finding from testing:** The retrieval correctly identifies relevant sections. Scores for the Archelon overview doc ranged from 0.13 (very strong match) to 0.29 (decent match), all well under the 0.6 threshold.

---

## Part 2 — Full RAG Pipeline Wiring

### Files Created

**`pipeline/retrieval/vector_search.py`**
- Embeds query using `mistral-embed` with 429 retry (3 attempts, exponential backoff)
- Calls `retrieve-chunks` edge function with `query_embedding`, `agent_id`, `match_count`
- Returns raw matches

**`pipeline/retrieval/reranker.py`**
- `deduplicate_and_rerank()` — dedup by parent_id, sort by score
- `apply_budget()` — gap detection + junk filter + token budget
- `rerank()` — full pipeline, accepts budget parameter

**`pipeline/synthesizer.py`**
- Formats context as `[section_name]\ncontent` blocks separated by `---`
- Extracts unique document filenames for sources
- Calls `mistral-large-latest` (upgraded from small for better instruction following)
- Returns `{ answer, sources, token_usage }`

**`routers/chat.py`** — Full pipeline wired:
```
intent classifier → query analyser → vector search (parallel fan-out) → rerank → synthesize
```

For multi queries, all vector searches run in parallel via `asyncio.gather`. Results are merged before reranking.

### Synthesizer System Prompt — Grounding Rules

Initial prompt had weak grounding (`"do not make up information"`) which LLMs routinely ignore for resume-style questions. The LLM was hallucinating achievements like "reduced email processing time by 70%" that didn't exist in any document.

**Strengthened to:**
- Every fact, number, metric must exist verbatim in the context block
- Numbers and metrics especially — if not in context, do not include
- Banned inference language: "likely", "probably", "typically", "generally"
- Uncertainty rule: if unsure whether something is in context, do not include it
- Framed as "absolute rules that cannot be overridden" — not soft suggestions
- Renamed `Context:` to `CONTEXT BLOCK` — capitalised labels signal higher priority

### Sources

The frontend `SourceBadges` component already existed. We wired it to show actual document filenames (e.g. `Archelon_Platform_Overview.docx`) instead of search query keywords. The SQL function was updated to return `filename` directly from the `documents` table join.

---

## Part 3 — Infrastructure Bugs

### Bug #8 — Stale Supabase Singleton Causing Broken Pipe

**Error:** `httpx.ReadError: [Errno 32] Broken pipe` / `[Errno 104] Connection reset by peer`

**Root cause:** `supabase_client.py` used a singleton pattern:
```python
_client: Client = None

def get_supabase():
    global _client
    if _client is None:
        _client = create_client(...)
    return _client  # same client reused forever
```

The Supabase client opens an HTTP/2 connection when first used. HTTP/2 keeps connections alive for performance. But Supabase's load balancer has an idle timeout (~60-90 seconds). After inactivity, Supabase closes the connection on their end. The backend doesn't know — tries to reuse it — gets broken pipe.

**Why it didn't happen earlier:** Earlier docs were small and processed quickly. Testing was rapid so connections stayed warm. With larger docs (1.9MB PDF, dense technical docs) taking 30-120 seconds to embed, the connection went stale during processing.

**Fix:** Remove singleton, create fresh client per request:
```python
def get_supabase() -> Client:
    return create_client(url, key)
```

`create_client()` is cheap — it just creates a Python object, no network call. Connection only opens on `.execute()`. No performance cost.

### Bug #9 — Shared Supabase Client Across Threads in Vectorizing Step

**Error:** `[Errno 104] Connection reset by peer` during vectorizing stage specifically

**Root cause:** Even after fixing the singleton, `update_child_chunk_embeddings` created one client and shared it across 10 concurrent threads:

```python
db = get_supabase()  # one client

def update_one(chunk_id, vector):
    db.table(...)  # same client in all threads simultaneously
```

10 threads sharing one HTTP/2 connection = race conditions and connection resets under concurrent load.

**Fix:** Move `get_supabase()` inside `update_one` so each thread gets its own fresh client:
```python
def update_one(chunk_id, vector):
    db = get_supabase()  # fresh client per thread
    db.table("child_chunks").update({"embedding": vector}).eq("id", chunk_id).execute()
```

---

## Part 4 — Embedding Overflow Fixes

### Bug #10 — 503 Overflow on Dense Technical Documents

**Error:** `503 upstream connect error or disconnect/reset before headers. reset reason: overflow`

**Affected docs:** Resume (191 paragraphs, dense key-value fields), Localisation Engine doc (346 paragraphs, config blocks, code snippets, numbered sub-sections)

**Root cause:** Batching was token-based using `token_count` from the DB, which was estimated as `len(text) // 4`. This badly underestimates technical content because:
- Symbols like `{`, `}`, `->`, `•`, `—` each count as separate tokens but are 1-2 characters
- Key-value fields, config constants, function names tokenize at 3-4x the character estimate
- The batch thought it was sending 15K tokens but was actually sending 30-40K tokens
- HTTP request body overflowed Mistral's limit before they even parsed it

**Fix progression:**

**Attempt 1 — Switch to character-based batching with `MAX_CHARS_BATCH = 80_000`:**
Still failed on the Localisation Engine doc. 80K chars was still too large for extremely dense content.

**Attempt 2 — Reduce to `MAX_CHARS_BATCH = 40_000`, `MAX_INPUTS_BATCH = 16`:**
Resume passed. Localisation Engine still failed on batch 3/3.

**Attempt 3 — Also reduce per-chunk truncation from `MAX_CHARS = 60_000` to `30_000`:**
The batch limit was 40K but a single chunk could be 60K — one chunk alone could overflow. Aligned both limits.

**Final values:**
```python
MAX_CHARS_BATCH  = 40_000   # max total characters per batch
MAX_INPUTS_BATCH = 16       # max chunks per batch
MAX_CHARS        = 30_000   # per-chunk truncation limit
```

**Why character-based is better than token-based:**
Characters directly control HTTP payload size. Token estimates are model-specific and unreliable for technical content. Characters are always accurate.

**Speed impact:** More batches = more API calls = more 1.1s delays. Dense docs now take 20-30 seconds longer. Acceptable tradeoff — the alternative is consistent failures.

---

## Part 5 — Edge Function Debugging Journey

Getting the edge function working took significant iteration. Full record:

### Attempt 1 — `deno-postgres` with connection string
```typescript
const pool = new Pool(Deno.env.get("DB_URL")!, 3, true);
```
**Error:** `ConnectionParamsError: Missing connection parameters: database`
Supabase's transaction pooler URL format (`postgres.projectref:password@host`) wasn't parsed correctly by `deno-postgres`.

### Attempt 2 — `{ connectionString: ... }` wrapper
```typescript
const pool = new Pool({ connectionString: Deno.env.get("DB_URL")! }, 3, true);
```
**Error:** Same — `deno-postgres` v0.17.0 doesn't accept connection string in object form.

### Attempt 3 — Explicit connection params
```typescript
const pool = new Pool({
  user: "postgres.projectref",
  password: Deno.env.get("DB_PASSWORD")!,
  hostname: "aws-1-ap-south-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
}, 3, true);
```
**Error:** `ConnectionParamsError: Attempting SASL auth with unset password`
`DB_PASSWORD` secret wasn't being read — Supabase edge function secret names cannot start with `SUPABASE_` prefix (reserved). We had named it `DB_PASSWORD` but it still wasn't working.

### Attempt 4 — Supabase JS client (final, working)
Abandoned `deno-postgres` entirely. Used the built-in Supabase JS client which uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — both automatically injected by Supabase into every edge function.

```typescript
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const { data, error } = await supabase.rpc("retrieve_chunks_vector", { ... });
```

**Lesson:** For Supabase Edge Functions, always use the Supabase JS client. `deno-postgres` has connection string parsing issues with Supabase's pooler URL format. The JS client handles all auth and connection management automatically.

---

## Part 6 — Frontend Changes

### Auto-Greeting on Agent Select

When a user clicks an agent for the first time, the frontend automatically sends "Hi" to the backend and displays the response as the opening message. Implemented in `App.jsx` `handleSelectAgent`:

- Sets empty `[]` placeholder in `chatHistories` immediately (shows spinner)
- Fires `POST /api/chat` with `"Hi"` in background
- On response, replaces placeholder with greeting message
- Guard: `if (prev[agent.id]) return prev` — greeting only fires once per agent per session

### Bug Report Button

Floating button fixed to bottom-right corner of the entire app. Always visible on every page. Opens a dark modal with:
- Textarea for bug description
- Submit button with 800ms loading state
- Success state with checkmark — "Bug reported successfully!"
- Auto-closes after 2 seconds
- Currently dummy (no backend) — ready to wire to a real endpoint later

---

## Bugs Summary

| # | Error | Cause | Fix |
|---|---|---|---|
| 8 | Broken pipe on status poll | Stale singleton Supabase client | Remove singleton, fresh client per request |
| 9 | Connection reset during vectorizing | Shared client across 10 threads | Move `get_supabase()` inside thread function |
| 10 | 503 overflow on dense docs | Token estimator undercount for technical content | Switch to character-based batching, reduce limits |

---

## Files Modified

| File | What Changed |
|------|-------------|
| `db/supabase_client.py` | Removed singleton pattern — fresh client per call |
| `db/chunks_db.py` | `update_child_chunk_embeddings` — fresh client per thread |
| `ingestion/embedding_service.py` | Character-based batching, reduced limits (40K chars, 16 inputs, 30K per chunk) |
| `pipeline/retrieval/vector_search.py` | New — embeds query, calls edge function |
| `pipeline/retrieval/reranker.py` | New — dedup, gap detection, junk filter, token budget |
| `pipeline/synthesizer.py` | New — context formatting, LLM call, sources, token usage. Strengthened grounding rules |
| `routers/chat.py` | Full pipeline wired — intent → analyse → retrieve → rerank → synthesize |
| `frontend/src/App.jsx` | Auto-greeting on agent select, BugReportButton component |
| `frontend/src/components/ChatView.jsx` | Wire real answer + sources from backend, greeting loading state |

---

## Retrieval Performance (Validated)

| Query | Child chunks fetched | After dedup | After gap+budget | Tokens |
|---|---|---|---|---|
| "What is Archelon?" | 15 | 9 unique parents | 6 parents | 1,287 |
| "How does ingestion work?" | 15 | 7 unique parents | 6 parents | 1,331 |
| "What is pricing?" | 15 | 7 unique parents | 1 parent (pricing only) | 233 |

Gap detection correctly isolated the pricing query to just the pricing section instead of returning 6 loosely related sections.

---

## Future Improvements

1. **Wire bug report to real backend** — store in Supabase `bug_reports` table, notify via email or Slack
2. **Conversation memory** — `session_id` is accepted but ignored. Store last N messages per session for follow-up question support
3. **Streaming responses** — synthesizer currently returns complete response. SSE streaming would show words appearing as they generate
4. **Switch to `supabase-py` async client** — eliminates `asyncio.to_thread` entirely, all DB calls become truly async
5. **Accurate token counting** — replace `len(text) // 4` with actual Mistral tokenizer for precise batch sizing
6. **Retry logic on embedding batches** — if a batch fails with 429, wait and retry instead of failing the whole document
