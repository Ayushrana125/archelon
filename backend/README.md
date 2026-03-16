# Archelon Backend

FastAPI backend for a RAG (Retrieval-Augmented Generation) system.

---

## Stack
- **FastAPI** — API server
- **Mistral AI** — LLM for query analysis
- **LangChain** — LLM interface
- **Pydantic** — request validation
- **python-dotenv** — environment variable management

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env  # add your MISTRAL_API_KEY
uvicorn main:app --reload
```

---

## What We Built

### 1 — Project Bootstrap
**Goal:** Get a working API server running with a single chat endpoint that accepts user messages.

**Files:** `main.py`, `requirements.txt`, `.env.example`

**Libraries used:**
- `FastAPI` — lightweight async Python web framework, chosen for its speed and automatic docs
- `Pydantic BaseModel` — validates and parses incoming JSON request body, throws clear errors if fields are missing
- `CORSMiddleware` — allows the frontend (running on a different port/domain) to call this API without being blocked by the browser
- `uvicorn` — ASGI server that runs the FastAPI app

**Concepts:**
- REST API design — single POST endpoint `/api/chat` receives all chat messages
- Request validation — `ChatRequest` model enforces that `message`, `agent_id`, and `session_id` are always present
- Environment config — `MISTRAL_API_KEY` is loaded from `.env` so secrets never live in code
- Separation of concerns — `main.py` only handles routing, actual logic will live in separate modules

---

### 2 — Query Orchestrator
**Goal:** Before doing any retrieval, understand *what* the user is asking and *how many* distinct things they're asking about. This prevents wasted retrieval calls on smalltalk and enables multi-topic queries to be handled correctly.

**Files:** `orchestrator.py`, updated `main.py`

**Libraries used:**
- `langchain_mistralai.ChatMistralAI` — wraps the Mistral API into a LangChain-compatible LLM so we can swap models later without rewriting logic
- `langchain_core.messages.SystemMessage` — sets the LLM's behavior and output format before the user message
- `langchain_core.messages.HumanMessage` — passes the actual user query to the LLM
- `json` — parses the raw string response from the LLM into a Python dict
- `python-dotenv` — loads `MISTRAL_API_KEY` from `.env` at runtime

**Concepts:**
- Orchestrator pattern — `orchestrator.py` is a dedicated layer that sits between the API and retrieval. It classifies the query so downstream logic knows what to do
- Prompt engineering — the system prompt is strict: return JSON only, no markdown, no explanation. This makes the response reliably parseable
- Intent detection — three intents: `smalltalk` (no retrieval needed), `single` (one search query), `multi` (one search query per topic)
- `search_queries` field — the LLM doesn't just classify, it also rewrites the user's message into optimized search terms ready for retrieval
- Async LLM call — `ainvoke` is used instead of `invoke` so the API stays non-blocking while waiting for the LLM response
- Graceful fallback — wrapped in `try/except`, if the LLM returns malformed JSON or fails, we return a safe default using the raw user message as the search query instead of crashing
