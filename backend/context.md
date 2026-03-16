# Archelon — Agentic RAG Platform

## What is Archelon?
Archelon is an Agentic RAG (Retrieval Augmented Generation) 
platform. It lets users create AI agents, upload documents 
to those agents, and chat with them. The agent answers 
questions based only on the uploaded documents.

## What We Are Building
A Python FastAPI backend that powers the Archelon platform.
The frontend is already built in React.
This backend handles document ingestion and agentic chat.

---

## Two Core Flows

### Flow 1 — Document Ingestion (no LLM needed)
When user uploads a document:
1. Detect file type from extension (PDF, DOCX, TXT)
2. Load and extract raw text using LangChain loaders
3. Detect document structure (headings, sections, paragraphs)
4. Create parent chunks (~800 tokens) from sections
5. Create child chunks (~200 tokens) from paragraphs
6. Each child chunk stores its parent_id and metadata
7. Embed child chunks using Mistral embeddings API
8. Store parent and child chunks in Supabase pgvector

### Flow 2 — Agentic Chat
When user sends a message:
1. Intent Classifier understands the query type
2. Orchestrator decides what to search for
3. Retrieval searches Supabase vector store
4. Synthesizer generates the final answer
5. Response streams back to frontend with thinking steps

---

## The Agents — 4 Total

### Agent 1 — Intent Classifier
- Model: mistral-small-latest
- Task: classify user message ONLY
- Output: { intent: "smalltalk" | "single" | "multi" }
- Skips everything else if smalltalk

### Agent 2 — Orchestrator  
- Model: mistral-small-latest
- Task: understand what to search for
- Only runs if intent is single or multi
- Output: { thinking: string, search_queries: [string] }
- For multi query: returns multiple search terms

### Agent 3 — Retrieval (NOT an LLM — pure Python)
- No AI call, completely free
- Embeds search query using Mistral embeddings
- Searches child_chunks in Supabase by vector similarity
- Fetches parent chunks for context
- Reranks by relevance score
- Runs once per search query
- For multi queries: runs in parallel

### Agent 4 — Synthesizer
- Model: mistral-small-latest
- Task: read retrieved chunks and write final answer
- Receives all context from retrieval
- Streams response token by token to frontend

---

## LangGraph Flow
```
START
  ↓
[Intent Classifier]
  ↓
  ├── smalltalk ──→ [Direct Answer] ──→ END
  │
  └── single/multi ──→ [Orchestrator]
                              ↓
                        [Retrieval]
                        (parallel if multi)
                              ↓
                        [Synthesizer]
                              ↓
                             END
```

---

## State Object (data flowing between nodes)
```python
{
  "user_message": str,
  "agent_id": str,
  "session_id": str,
  "intent": str,
  "thinking": str,
  "search_queries": [],
  "search_results": [],
  "final_answer": str,
  "show_thinking": bool
}
```

---

## Tech Stack
- FastAPI — web framework
- LangGraph — agent orchestration
- LangChain — LLM and document utilities
- Mistral API — LLM and embeddings
- Supabase — PostgreSQL + pgvector storage
- pymupdf — PDF parsing
- python-docx — DOCX parsing

## File Structure
archelon-backend/
  main.py          — FastAPI app and all routes
  classifier.py    — Intent Classifier agent
  orchestrator.py  — Orchestrator agent
  retrieval.py     — Vector search and reranking
  synthesizer.py   — Answer generation agent
  graph.py         — LangGraph graph wiring
  ingestion.py     — Document processing pipeline
  supabase_client.py — Database connection
  requirements.txt
  .env

---

## Current Status
- Frontend: complete
- Backend: starting now
- Building block by block, testing each piece
  before connecting to the next
- Local development only for now
- Deployment to Hostinger Ubuntu server later
```

---

