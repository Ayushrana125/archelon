# Archelon — Agentic RAG: Deep Architecture

> This document explains how Agentic RAG really works, validates Ayush's design,
> names everything correctly with technical terms, explains what is missing,
> and what to care about when building this.

---

## Part 1 — How Agentic RAG Really Works

### Naive RAG vs Agentic RAG

**Naive RAG** (the simple version most tutorials show):
```
User message → embed query → vector search → stuff chunks into prompt → LLM answers
```
This breaks on:
- Multi-topic questions (one search misses half the answer)
- Vague questions (bad embedding = bad retrieval)
- Follow-up questions (no memory of what was said before)
- Large documents (too many chunks, LLM gets confused)

**Agentic RAG** (what Archelon is building):
```
User message → understand intent → decompose into sub-queries → 
run retrieval per sub-query (in parallel) → rerank and merge chunks → 
synthesize grounded answer
```

The key difference: **agents make decisions at each step** instead of blindly passing data forward.
Each agent has a specific job, a specific input, a specific output, and fails gracefully.

### The Core Concept: Agents Are Just Functions With LLMs Inside

An "agent" in this context is not magic. It is:
- A Python class or function
- That takes a well-defined input
- Calls an LLM (or not, if it doesn't need one)
- Returns a well-defined output
- And handles its own errors

The "agentic" part means agents can **decide** — route differently, call tools, spawn sub-tasks.

---

## Part 2 — Ayush's Design: What Is Correct

Your mental model is solid. Here is what you got right:

### ✅ Separating smalltalk from retrieval
Correct. Smalltalk does not need vector search. Gating on intent before retrieval is standard
practice in production RAG systems. Saves cost, saves latency.

### ✅ Dynamic parallel retrieval agents
This is the most important insight in your design and it is correct.
The technical name for this pattern is **Fan-Out / Fan-In**.

- Fan-Out: one orchestrator spawns N retrieval workers (one per sub-query)
- Fan-In: all N results are collected and merged before synthesis

Your idea of "create a class, instantiate objects on the spot" is exactly right.
The technical term is **worker pool** or **task fan-out with asyncio.gather**.

### ✅ Synthesizer takes all chunks and answers
Correct. The synthesizer should never do retrieval. It only reads what retrieval gave it
and writes a grounded answer. Single responsibility.

### ✅ Document ingestion as a separate pipeline
Correct. Ingestion and chat are completely separate flows. Ingestion runs once when a
document is uploaded. Chat runs on every message. They should never share code paths.

### ✅ Not every agent makes an LLM call
Correct and important. Retrieval is pure math — cosine similarity between vectors.
No LLM needed. Chunking is rule-based. No LLM needed. Only classification,
decomposition, and synthesis need LLM calls.

---

## Part 3 — Technical Naming of Everything

### Chat Pipeline Agents

---

#### `IntentClassifierAgent`
- **File:** `classifier.py`
- **LLM:** Yes — mistral-large-latest
- **Input:** user message + system instructions
- **Output:** `{ intent, thinking, search_thinking, search_queries }`
- **Pattern:** Single LLM call, strict JSON output, fast gate for the whole pipeline
- **Technical role:** Router / Gate — decides which branch of the pipeline runs

---

#### `QueryOrchestratorAgent`
- **File:** `orchestrator.py`
- **LLM:** Yes — mistral-small-latest
- **Input:** user message
- **Output:** `{ thinking, search_queries: ["term1", "term2", ...] }`
- **Pattern:** Query decomposition / query rewriting
- **Technical role:** Decomposes natural language into N optimized vector search terms.
  One term per distinct topic. This is called **Query Decomposition** in RAG literature.

---

#### `SmallTalkAgent`
- **File:** `smalltalk.py` (to be created)
- **LLM:** Yes — mistral-small-latest
- **Input:** user message + system instructions (agent persona)
- **Output:** `{ answer: string }`
- **Pattern:** Direct generation — no retrieval, just respond based on persona
- **Technical role:** Handles greetings, identity questions ("who are you"), casual chat.
  Currently this returns a hardcoded string — needs to be a real LLM call so Arex
  can answer "who are you" properly using system instructions.

---

#### `RetrievalAgent` — The Class You Described
- **File:** `retrieval.py`
- **LLM:** No — pure Python + math
- **Input:** `search_query: str`, `agent_id: str`, `top_k: int`
- **Output:** `{ chunks: [{ text, parent_text, score, metadata }] }`
- **Pattern:** This is exactly what you described — a class with a method, instantiated per sub-query

```python
class RetrievalAgent:
    def __init__(self, agent_id: str, top_k: int = 5):
        self.agent_id = agent_id
        self.top_k = top_k

    async def run(self, search_query: str) -> list[dict]:
        # 1. Embed the search query using Mistral Embeddings
        # 2. Run cosine similarity search in Supabase pgvector
        # 3. Fetch parent chunks for matched child chunks
        # 4. Return ranked results
        ...
```

**For single query:**
```python
agent = RetrievalAgent(agent_id="arex")
results = await agent.run("Ayush skills")
```

**For multi query (fan-out):**
```python
agents = [RetrievalAgent(agent_id="arex") for _ in search_queries]
all_results = await asyncio.gather(*[a.run(q) for a, q in zip(agents, search_queries)])
# all_results is a list of lists — flatten and deduplicate
```

This is called **Parallel Fan-Out Retrieval**. `asyncio.gather` runs all N retrieval
calls concurrently — they all hit the database at the same time, not one after another.
Total latency = slowest single retrieval, not sum of all retrievals.

**What happens inside RetrievalAgent.run():**
1. Call Mistral Embeddings API → get a 1024-dimension vector for the search query
2. Send that vector to Supabase → `SELECT ... ORDER BY embedding <=> query_vector LIMIT top_k`
3. The `<=>` operator is cosine distance (pgvector syntax)
4. For each matched child chunk, fetch its parent chunk (for more context)
5. Return chunks sorted by similarity score

---

#### `SynthesizerAgent`
- **File:** `synthesizer.py`
- **LLM:** Yes — mistral-small-latest (streaming)
- **Input:** user message + all retrieved chunks (merged from all retrieval agents)
- **Output:** streamed answer token by token
- **Pattern:** Retrieval-Augmented Generation — the actual RAG step
- **Technical role:** Reads context, writes grounded answer. Must be instructed to:
  - Answer only from provided context
  - Say "I don't know" if context doesn't contain the answer
  - Cite which document/chunk the answer came from

```python
class SynthesizerAgent:
    async def run(self, user_message: str, chunks: list[dict], system_instructions: str):
        context = "\n\n".join([c["parent_text"] for c in chunks])
        # stream response back to frontend
        ...
```

---

### Document Ingestion Agents

---

#### `DocumentClassifierAgent`
- **File:** `ingestion.py` (as a class inside)
- **LLM:** Possibly — depends on complexity
- **Input:** raw file bytes + filename
- **Output:** `{ file_type: "pdf"|"docx"|"txt", structure_type: "resume"|"report"|"article"|"unstructured" }`
- **Pattern:** Rule-based first (check file extension), LLM only if structure detection is needed
- **Technical role:** Tells the chunker what kind of document it is dealing with so chunking
  strategy can be adapted. A resume has a different structure than a legal contract.

**Important:** For v1, file type detection by extension is enough. LLM-based structure
detection is an enhancement for later.

---

#### `DocumentChunkCreatorAgent`
- **File:** `ingestion.py` (as a class inside)
- **LLM:** No — pure Python, rule-based
- **Input:** raw extracted text + document structure type
- **Output:** `{ parent_chunks: [...], child_chunks: [...] }`
- **Pattern:** Hierarchical chunking (also called Parent-Child chunking or Small-to-Big retrieval)

**Why parent-child chunking:**
- Child chunks (~200 tokens) are small → better embedding precision → better retrieval match
- Parent chunks (~800 tokens) are large → more context for the LLM to answer from
- At retrieval time: search child chunks, return parent chunks
- This gives you precision of small chunks + context of large chunks

```
Document
  └── Parent Chunk 1 (800 tokens) — id: "p1"
        ├── Child Chunk 1a (200 tokens) — parent_id: "p1"
        ├── Child Chunk 1b (200 tokens) — parent_id: "p1"
        └── Child Chunk 1c (200 tokens) — parent_id: "p1"
  └── Parent Chunk 2 (800 tokens) — id: "p2"
        ├── Child Chunk 2a (200 tokens) — parent_id: "p2"
        └── Child Chunk 2b (200 tokens) — parent_id: "p2"
```

---

#### `DocumentEmbeddingsAgent`
- **File:** `ingestion.py` (as a class inside)
- **LLM:** No — Embeddings API call (different from LLM)
- **Input:** list of child chunks
- **Output:** child chunks with embedding vectors attached, saved to Supabase
- **Pattern:** Batch embedding + vector store upsert

**Important distinction:** Embeddings API ≠ LLM.
- LLM: generates text, expensive, slow
- Embeddings API: converts text to a vector of numbers, cheap, fast
- Mistral embeddings: 1024 dimensions, ~$0.0001 per 1000 tokens

```python
class DocumentEmbeddingsAgent:
    async def run(self, child_chunks: list[dict], agent_id: str):
        # Batch embed all child chunks in one API call
        # Store in Supabase: child_chunks table with agent_id, parent_id, text, embedding
        ...
```

---

## Part 4 — Complete System Architecture

### Chat Flow (Full)

```
User types message
        ↓
POST /api/chat → main.py
        ↓
IntentClassifierAgent (LLM: mistral-large)
        ↓
   ┌────┴────┐
smalltalk  single/multi
   ↓           ↓
SmallTalk   QueryOrchestratorAgent (LLM: mistral-small)
Agent           ↓
   ↓      search_queries: ["q1", "q2", ...]
   ↓           ↓
   ↓      Fan-Out: asyncio.gather(
   ↓          RetrievalAgent(agent_id).run("q1"),
   ↓          RetrievalAgent(agent_id).run("q2"),
   ↓          ...N agents for N queries
   ↓      )
   ↓           ↓
   ↓      Fan-In: merge + deduplicate chunks
   ↓           ↓
   ↓      SynthesizerAgent (LLM: mistral-small, streaming)
   ↓           ↓
   └───────────┘
        ↓
  Streamed response → Frontend
```

### Document Ingestion Flow (Full)

```
User uploads file
        ↓
POST /api/ingest → main.py
        ↓
DocumentClassifierAgent (rule-based, no LLM for v1)
  → detects: PDF / DOCX / TXT
  → detects: structure type
        ↓
Raw text extraction
  → PDF: PyMuPDF
  → DOCX: python-docx
  → TXT: plain read
        ↓
DocumentChunkCreatorAgent (rule-based, no LLM)
  → creates parent chunks (~800 tokens)
  → creates child chunks (~200 tokens) with parent_id
        ↓
DocumentEmbeddingsAgent (Embeddings API, not LLM)
  → embeds all child chunks in batch
  → saves parent + child chunks to Supabase with agent_id
        ↓
Return { status: "done", chunks_created: N } → Frontend
```

---

## Part 5 — What Is Missing From Your Current Plan

### 1. SmallTalkAgent needs to be a real LLM call
Currently returns a hardcoded string. When someone asks "who are you" or "what can you do",
Arex needs to answer using the system instructions (persona). This requires an actual LLM call
with the system instructions passed in. Without this, Arex cannot introduce himself properly.

### 2. Chunk Deduplication after Fan-In
When you run 3 retrieval agents in parallel, the same parent chunk might be returned by
multiple agents (e.g. a chunk about "Ayush skills" might also match "Ayush experience").
You need to deduplicate by `chunk_id` before passing to the synthesizer.
Otherwise the LLM sees the same text twice and wastes context window.

### 3. Reranking
After retrieval, chunks are sorted by cosine similarity score. But cosine similarity is not
perfect — a chunk can be semantically close but not actually useful for the question.
A reranker (cross-encoder model) re-scores chunks by relevance to the specific question.
For v1 this is optional, but it significantly improves answer quality.
Simple v1 approach: just use the top-K by cosine score. Add reranking later.

### 4. Context Window Management
The synthesizer receives all chunks. If you have 5 queries × 5 chunks each = 25 chunks,
that is a lot of text. Mistral small has a 32K context window — you will not hit the limit
easily, but you should still cap the number of chunks passed to the synthesizer (e.g. top 10
after deduplication and reranking) to keep responses fast and focused.

### 5. Streaming to Frontend
Currently the backend returns a complete JSON response. For a good UX, the synthesizer
should stream tokens back to the frontend as they are generated. This requires:
- Backend: FastAPI `StreamingResponse` with Server-Sent Events (SSE)
- Frontend: `fetch` with `response.body.getReader()` to read the stream chunk by chunk
This is the difference between "answer appears all at once after 5 seconds" vs
"answer types out word by word instantly".

### 6. Conversation Memory
Currently `session_id` is accepted but ignored. Without memory, every message is treated
as a fresh conversation. Follow-up questions like "tell me more about that" will fail
because the LLM has no context of what "that" refers to.
Solution: store last N message pairs in memory (Redis or in-memory dict keyed by session_id)
and pass them to the synthesizer as conversation history.

### 7. agent_id Namespacing in Supabase
Every chunk stored in Supabase must be tagged with `agent_id`. Retrieval must always
filter by `agent_id` so Agent A never sees Agent B's documents. This is data isolation —
critical for a multi-agent platform. Your context.md mentions this but it must be enforced
at the database query level, not just at the application level.

### 8. Ingestion Status Tracking
Document ingestion takes time (embedding API calls, DB writes). The frontend currently
shows a processing animation. The backend needs to either:
- Return a job ID and let the frontend poll `GET /api/ingest/status/{job_id}`
- Or use WebSockets / SSE to push progress updates (step 1 done, step 2 done, etc.)
Without this, the frontend has no way to know when ingestion actually finished.

---

## Part 6 — LLM Call Count Per Request

### Chat message (smalltalk):
| Agent | LLM Call | Model |
|---|---|---|
| IntentClassifierAgent | Yes | mistral-large |
| SmallTalkAgent | Yes | mistral-small |
| **Total** | **2 calls** | |

### Chat message (single query):
| Agent | LLM Call | Model |
|---|---|---|
| IntentClassifierAgent | Yes | mistral-large |
| QueryOrchestratorAgent | Yes | mistral-small |
| RetrievalAgent (×1) | No — Embeddings API only | — |
| SynthesizerAgent | Yes (streaming) | mistral-small |
| **Total** | **3 LLM calls + 1 embedding call** | |

### Chat message (multi query, 3 sub-queries):
| Agent | LLM Call | Model |
|---|---|---|
| IntentClassifierAgent | Yes | mistral-large |
| QueryOrchestratorAgent | Yes | mistral-small |
| RetrievalAgent (×3, parallel) | No — Embeddings API only | — |
| SynthesizerAgent | Yes (streaming) | mistral-small |
| **Total** | **3 LLM calls + 3 embedding calls (parallel)** | |

### Document ingestion (1 file):
| Agent | LLM Call | Model |
|---|---|---|
| DocumentClassifierAgent | No (rule-based) | — |
| DocumentChunkCreatorAgent | No (rule-based) | — |
| DocumentEmbeddingsAgent | No — Embeddings API only | — |
| **Total** | **0 LLM calls + N embedding calls** | |

---

## Part 7 — What To Care About When Building

### Care about prompt stability
LLMs are non-deterministic. Your classifier prompt must be so strict that the LLM
has no choice but to return valid JSON. Test with edge cases: empty messages,
very long messages, messages in other languages, messages with special characters.

### Care about latency
Every LLM call adds ~500ms-2s of latency. With 3 sequential LLM calls, you are
looking at 1.5-6 seconds before the user sees anything. Streaming the synthesizer
response hides this — the user sees words appearing immediately even if the full
response takes 3 seconds.

### Care about cost
Mistral large is ~10x more expensive than mistral small. Use large only where
accuracy matters most (classifier). Use small everywhere else.

### Care about the embedding model consistency
Always use the same embedding model for ingestion and retrieval. If you embed
documents with `mistral-embed` and search with a different model, the vectors
are in different spaces and similarity scores are meaningless.

### Care about chunk size tuning
200/800 token split is a good starting point but not universal. A resume needs
smaller chunks (each bullet point is a fact). A legal document needs larger chunks
(context spans paragraphs). Plan to make chunk sizes configurable per agent.

### Care about the `agent_id` filter
Every single Supabase query in retrieval must include `WHERE agent_id = ?`.
If you forget this once, users will see each other's documents. This is a
data isolation bug, not just a quality bug.

---

## Part 8 — Revised File Structure

```
backend/
├── main.py                  — FastAPI app, routes, request/response schemas
├── classifier.py            — IntentClassifierAgent (LLM)
├── orchestrator.py          — QueryOrchestratorAgent (LLM)
├── smalltalk.py             — SmallTalkAgent (LLM) ← needs to be created
├── retrieval.py             — RetrievalAgent class (no LLM, embeddings only)
├── synthesizer.py           — SynthesizerAgent (LLM, streaming) ← needs to be created
├── ingestion.py             — DocumentClassifierAgent, DocumentChunkCreatorAgent,
│                              DocumentEmbeddingsAgent (no LLM)
├── supabase_client.py       — Supabase singleton connection ← needs to be created
├── graph.py                 — LangGraph wiring (optional, can wire manually first)
├── requirements.txt
├── .env
├── ARCHITECTURE.md          — High level architecture
└── architecture_in_detail.md — This file
```
