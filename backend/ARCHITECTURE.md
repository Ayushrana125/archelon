# Archelon Backend — Architecture Document

> Written from the perspective of an AI Engineer.  
> This document covers every file, every LLM call, data flow, design decisions, and what is built vs. what is planned.

---

## What This Backend Does

Archelon is an **Agentic RAG (Retrieval-Augmented Generation)** platform. Users create AI agents, upload documents to those agents, and chat with them. The agent answers questions grounded strictly in the uploaded documents.

The backend is responsible for:
1. Receiving chat messages from the frontend
2. Understanding what the user is asking (intent classification)
3. Deciding what to search for (query orchestration)
4. Searching the document knowledge base (vector retrieval) — *planned*
5. Generating a grounded answer (synthesis) — *planned*
6. Streaming the response back to the frontend

---

## Current File Structure

```
backend/
├── main.py            — API server, routing, request/response contract
├── classifier.py      — LLM Agent 1: Intent classification
├── orchestrator.py    — LLM Agent 2: Query decomposition
├── requirements.txt   — Python dependencies
├── .env               — Secret keys (never committed)
├── context.md         — Product context and build plan
├── README.md          — Setup and build log
└── ARCHITECTURE.md    — This file
```

### Planned files (not yet built)
```
├── ingestion.py       — Document upload and chunking pipeline
├── retrieval.py       — Vector search against Supabase pgvector
├── synthesizer.py     — LLM Agent 4: Final answer generation
├── graph.py           — LangGraph wiring of all agents
└── supabase_client.py — Supabase connection singleton
```

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| API Framework | FastAPI | Async, fast, auto-docs at `/docs` |
| LLM Provider | Mistral AI | Strong instruction-following, JSON output, cost-effective |
| LLM Interface | LangChain | Model-agnostic wrapper, easy to swap models |
| Agent Orchestration | LangGraph | Stateful graph for multi-step agentic flows |
| Vector Database | Supabase pgvector | Postgres + vector search in one, free tier available |
| Embeddings | Mistral Embeddings API | Same provider as LLM, consistent vector space |
| PDF Parsing | PyMuPDF | Fast, accurate PDF text + structure extraction |
| DOCX Parsing | python-docx | Native DOCX reading |
| Deployment | Railway | Auto-deploy from GitHub, environment variables via dashboard |

---

## File-by-File Breakdown

---

### `main.py` — The Front Door

**Role:** API server. Owns the HTTP contract. Routes requests to the right agents. Returns structured responses to the frontend.

**What it does:**
- Spins up the FastAPI app
- Adds CORS middleware so the React frontend (different origin) can call it
- Defines the `ChatRequest` schema — enforces that every request has `message`, `agent_id`, `session_id`, and optionally `system_instructions`
- Exposes one endpoint: `POST /api/chat`
- Calls `classifier.py` first, then `orchestrator.py` if needed
- Returns a structured JSON response the frontend knows how to render

**The `/api/chat` endpoint flow:**
```
Incoming request
      ↓
ChatRequest validation (Pydantic)
      ↓
classify_intent(message, system_instructions)
      ↓
  intent == "smalltalk"?
      ├── YES → return { intent, answer: "Hello, How can I help you?" }
      └── NO  → analyze_query(message)
                      ↓
               return { intent, thinking, search_thinking, search_queries, answer }
```

**Design decisions:**
- `main.py` has zero business logic — it only routes. This keeps it clean and testable.
- `system_instructions` is passed from the frontend per-agent. For Arex, it carries Ayush's full persona context. For custom agents, it carries their name and purpose. This means the same backend serves all agents without any agent-specific code.
- `agent_id` and `session_id` are accepted but not yet used — reserved for when retrieval and conversation memory are added.
- Port is read from `os.environ.get("PORT", 8080)` so Railway can inject its own port dynamically.

**LLM calls:** None directly. Delegates to classifier and orchestrator.

---

### `classifier.py` — LLM Agent 1: Intent Classifier

**Role:** The first brain in the pipeline. Reads the user message and decides what kind of request it is before any expensive retrieval happens.

**Model:** `mistral-large-latest`
*(Upgraded from small — large is more reliable at strict JSON output and edge case classification)*

**Why this agent exists:**
Not every message needs RAG. "Hi" does not need a vector search. "What are Ayush's skills and his projects?" needs two separate searches. The classifier gates the pipeline so we never waste retrieval calls on smalltalk, and we correctly fan out multi-topic queries.

**Input:**
```python
user_message: str         # the raw user message
system_instructions: str  # agent persona from frontend (optional)
```

**Output:**
```json
{
  "intent": "single" | "multi" | "smalltalk",
  "thinking": "User is asking about Ayush's work experience",
  "search_thinking": "Let's search for Ayush's work experience from the uploaded documents",
  "search_queries": ["Ayush work experience"]
}
```

**Intent definitions:**

| Intent | Meaning | Example |
|---|---|---|
| `smalltalk` | Pure greeting or casual chat, zero information request | "hi", "thanks", "bye" |
| `single` | One clear topic or question | "what are his skills" |
| `multi` | Two or more distinct topics in one message | "what are his skills and his projects" |

**Prompt engineering notes:**
- The system prompt is strict: return raw JSON only, no markdown, no backticks, no explanation
- `system_instructions` from the frontend is prepended to the classifier prompt — this gives the LLM context about who the agent is, so it classifies correctly (e.g. "what is your experience" is classified as `single` about Ayush, not smalltalk)
- The prompt explicitly says: *"If there is ANY question about a person, topic, skill, project, experience — it is NOT smalltalk. When in doubt, classify as single or multi, never smalltalk."* This prevents the LLM from being too conservative.
- Response is stripped of any markdown backticks Mistral sometimes adds before JSON parsing

**LLM call:**
```python
llm = ChatMistralAI(model="mistral-large-latest", api_key=...)
response = await llm.ainvoke([
    SystemMessage(content=combined_prompt),
    HumanMessage(content=user_message),
])
```

**Fallback:** If JSON parsing fails or the LLM errors, returns `intent: "single"` with empty thinking — the pipeline continues safely rather than crashing.

---

### `orchestrator.py` — LLM Agent 2: Query Decomposition

**Role:** Takes the user message and rewrites it into optimized search terms for vector retrieval. Only runs when intent is `single` or `multi`.

**Model:** `mistral-small-latest`
*(Small is sufficient here — the task is mechanical rewriting, not complex reasoning)*

**Why this agent exists:**
Users don't write vector-search-friendly queries. "Tell me about what he has done professionally" is a bad vector search term. "Ayush work experience" is a good one. The orchestrator bridges natural language to retrieval-optimized keywords.

**Input:**
```python
user_message: str  # raw user message
```

**Output:**
```json
{
  "thinking": "User wants to know about Ayush's professional background",
  "search_queries": ["Ayush work experience"]
}
```

For multi-topic queries, `search_queries` contains one term per topic:
```json
{
  "search_queries": ["Ayush skills", "Ayush projects"]
}
```

**LLM call:**
```python
llm = ChatMistralAI(model="mistral-small-latest", api_key=...)
response = await llm.ainvoke([
    SystemMessage(content=SYSTEM_PROMPT),
    HumanMessage(content=user_message),
])
```

**Fallback:** Returns the raw user message as the search query if parsing fails — retrieval will still run, just with a less optimized term.

**Note:** Currently `orchestrator.py` and `classifier.py` both produce `thinking` and `search_queries`. There is intentional overlap — the classifier's `thinking` and `search_thinking` are used for the frontend ThinkingSteps UI, while the orchestrator's `search_queries` will be used for actual retrieval. Once LangGraph is wired, the orchestrator will be a dedicated graph node and the classifier will only produce intent + thinking display fields.

---

## Complete Data Flow (Current State)

```
Frontend (React)
      │
      │  POST /api/chat
      │  {
      │    message: "what are Ayush's skills",
      │    agent_id: "arex",
      │    session_id: "session_1",
      │    system_instructions: "You are Arex, Ayush Rana's assistant..."
      │  }
      ↓
main.py → /api/chat
      │
      ↓
classifier.py → Mistral Large
      │  Input: system_instructions + CLASSIFIER_PROMPT + user_message
      │  Output: { intent: "single", thinking: "...", search_thinking: "...", search_queries: ["Ayush skills"] }
      │
      ├── intent == "smalltalk"?
      │       └── return { intent, answer: "Hello, How can I help you?" } → Frontend
      │
      └── intent == "single" or "multi"
              ↓
        orchestrator.py → Mistral Small
              │  Input: ORCHESTRATOR_PROMPT + user_message
              │  Output: { thinking: "...", search_queries: ["Ayush skills"] }
              │
              ↓
        main.py assembles response:
        {
          intent: "single",
          thinking: "User is asking about Ayush's skills",
          search_thinking: "Let's search for Ayush's skills...",
          search_queries: ["Ayush skills"],
          answer: "retrieval coming soon"
        }
              ↓
        Frontend receives response
        → Shows ThinkingSteps animation (thinking + search_thinking + search_queries)
        → Shows answer text
```

---

## LLM Calls Summary

| Call | File | Model | When | Purpose |
|---|---|---|---|---|
| Intent Classification | `classifier.py` | mistral-large-latest | Every non-resume message | Classify intent, generate thinking display text, generate search queries |
| Query Decomposition | `orchestrator.py` | mistral-small-latest | Only when intent is single/multi | Rewrite user query into optimized vector search terms |
| Answer Synthesis | `synthesizer.py` *(planned)* | mistral-small-latest | After retrieval | Read retrieved chunks and write final grounded answer |

**Total LLM calls per chat message:**
- Smalltalk: 1 call (classifier only)
- Single/Multi: 2 calls (classifier + orchestrator) → will become 3 when synthesizer is added

---

## What Is Not Built Yet

### Retrieval Pipeline (`retrieval.py`)
- Embed each `search_query` using Mistral Embeddings API
- Run cosine similarity search against `child_chunks` table in Supabase pgvector
- Fetch parent chunks for each matched child (parent-child chunking strategy gives better context)
- Rerank results by similarity score
- For multi queries: run all searches in parallel using `asyncio.gather`

### Document Ingestion (`ingestion.py`)
- Accept PDF / DOCX / TXT uploads via `POST /api/ingest`
- Extract raw text using PyMuPDF (PDF) or python-docx (DOCX)
- Detect document structure: headings → sections → paragraphs
- Create parent chunks (~800 tokens) from sections
- Create child chunks (~200 tokens) from paragraphs, each storing `parent_id`
- Embed child chunks using Mistral Embeddings
- Store everything in Supabase with `agent_id` as namespace

### Answer Synthesizer (`synthesizer.py`)
- Receive all retrieved chunks as context
- System prompt: answer strictly from the provided context, cite sources
- Stream response token by token back to frontend via SSE or chunked response

### LangGraph Wiring (`graph.py`)
- Wire all agents as graph nodes with a shared state object
- Handle conditional edges (smalltalk → direct answer, single/multi → retrieval → synthesis)
- Manage parallel retrieval for multi-intent queries

### Conversation Memory
- Store chat history per `session_id`
- Pass last N messages as context to synthesizer for follow-up questions

---

## Environment Variables

| Variable | Used In | Purpose |
|---|---|---|
| `MISTRAL_API_KEY_1` | `classifier.py`, `orchestrator.py` | Mistral API authentication |
| `PORT` | `main.py` | Railway injects this at runtime |
| `SUPABASE_URL` | `supabase_client.py` *(planned)* | Supabase project URL |
| `SUPABASE_KEY` | `supabase_client.py` *(planned)* | Supabase service role key |

---

## Deployment

- **Platform:** Railway
- **URL:** `https://archelon-production.up.railway.app`
- **Auto-deploy:** Every push to `main` branch triggers a redeploy
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment variables:** Set in Railway dashboard, never in code

---

## Design Principles

1. **Each file does one thing.** `main.py` routes. `classifier.py` classifies. `orchestrator.py` decomposes. No file bleeds into another's responsibility.

2. **LLMs only where necessary.** Retrieval is pure Python + vector math — no LLM needed. Only classification, decomposition, and synthesis use LLM calls. This keeps costs low and latency predictable.

3. **Fail gracefully.** Every LLM call is wrapped in try/except with a safe fallback. The pipeline never crashes on a bad LLM response.

4. **Agent-agnostic backend.** The same backend serves Arex and all custom agents. Agent identity and persona live in `system_instructions` sent from the frontend — the backend has no hardcoded agent logic.

5. **Async throughout.** All LLM calls use `ainvoke` (async). FastAPI runs on uvicorn's async event loop. This means the server handles multiple concurrent requests without blocking.
