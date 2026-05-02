# System Overview

**Archelon — Agentic RAG Platform**
Date: April 2026
Author: Ayush Rana

Live: https://archelon.cloud

---

## What is Archelon?

Archelon is an **Agentic RAG (Retrieval Augmented Generation) platform**. Users create AI agents, upload documents to them, and chat with them. The agents answer questions grounded in the uploaded documents — not from the LLM's training data.

Agents can also be deployed as embeddable chat widgets on any external website using an API key.

---

## The Core Idea

Most chatbots hallucinate because they rely entirely on what the LLM was trained on. Archelon grounds every answer in documents you actually uploaded. The system retrieves the most relevant chunks from your documents, then passes them to the LLM as context. The LLM synthesizes an answer from that context — nothing more.

This is RAG. Archelon is built around making it work reliably.

---

## Stack

| Layer | Technology | Hosted on |
|---|---|---|
| Frontend | React + Vite | Vercel |
| Backend | FastAPI (Python) | Railway |
| Database | Supabase (PostgreSQL + pgvector) | Supabase |
| LLM + Embeddings | Mistral AI | Mistral API |
| Streaming | Server-Sent Events (SSE) | — |
| Embed Widget | Vanilla JS (`embed.js`) | Served from Railway |

---

## How a Chat Message Becomes an Answer

This is the full pipeline from user input to streamed response:

```
User types a message
        ↓
POST /api/chat/stream  (JWT auth)
        ↓
classify_and_analyse()          ← single Mistral call: intent + search queries
        ↓
intent = smalltalk?
  YES → handle_smalltalk()      ← direct Mistral response, no retrieval
  NO  ↓
vector_search() × N queries     ← Supabase Edge Function, pgvector cosine search
        ↓
rerank()                        ← dedup by parent, gap detection, token budget
        ↓
synthesize_stream()             ← Mistral large, grounded in retrieved chunks
        ↓
SSE tokens stream to frontend
        ↓
Frontend renders word by word
```

---

## How a Document Becomes Searchable

Before any chat can happen, documents must be ingested:

```
User uploads PDF / DOCX / TXT
        ↓
parse()         ← extract elements (headings, paragraphs, tables, code)
        ↓
chunk()         ← parent chunks (800 tokens, section-level)
                   child chunks (150 tokens, sentence-level)
        ↓
save()          ← insert parent + child chunks into Supabase
        ↓
embed()         ← Mistral mistral-embed → 1024-dim vectors per child chunk
        ↓
vectorize()     ← write vectors back to child_chunks.embedding column
        ↓
done            ← document is now searchable
```

The frontend polls ingestion status every second and shows live progress through each stage.

---

## Key Concepts

**Parent-child chunking** — Documents are split into section-level parents (up to 800 tokens) and sentence-level children (up to 150 tokens). Children are what get embedded and matched. Parents are what get passed to the LLM as context. This gives precise matching with rich context.

**pgvector** — PostgreSQL extension that stores 1024-dimensional vectors and runs cosine similarity search. Archelon uses a Supabase Edge Function to run vector search close to the database, avoiding a Railway → Supabase → Railway round-trip.

**Gap detection** — After vector search returns 15 candidate chunks, the reranker sorts by similarity score and stops when the score drops sharply. This prevents loosely related sections from polluting the context for focused queries.

**SSE streaming** — The HTTP connection stays open after the request. The backend pushes tokens one by one as Mistral generates them. The frontend renders words as they arrive. Perceived latency drops from 10+ seconds to ~2.5 seconds to first word.

**Intent classification** — Every message is classified as `smalltalk`, `single`, or `multi` before retrieval. Smalltalk (greetings, identity questions) skips retrieval entirely. Single and multi queries generate 1-3 keyword search queries each.

**Agent isolation** — Every agent has its own knowledge base. Documents, chunks, and embeddings are scoped to an agent. One user's agents never appear in another user's list. Queries only search within the active agent's documents.

---

## Agents

Agents are the core product unit. Each agent has:
- A name, description, and system instructions
- An isolated document store (documents → chunks → embeddings)
- A model setting (currently `mistral-large-latest` for generation)

Two types:
- **User agents** — created by a user, visible only to that user
- **System agents** — created by the developer (`is_system = true`), visible to all users. Example: **Arex**, a personal assistant agent that knows about Ayush Rana's experience and can send a resume via n8n webhook.

---

## Embed System

Any agent can be deployed as a chat widget on an external website:

1. User generates an API key for their agent in the Archelon dashboard
2. Copies a `<script>` tag and pastes it on their website
3. Visitors on that website can chat with the agent directly

The widget (`embed.js`) is a self-contained vanilla JS file. It fetches agent info, renders a floating pill button, and streams responses from `POST /api/public/chat/stream` — the same full RAG pipeline, authenticated by API key instead of JWT.

Origin whitelisting, per-key rate limiting, and per-IP rate limiting protect the public endpoint.

---

## Database Schema (Summary)

```
users
  → agents
      → documents
          → ingestion_jobs
          → parent_chunks
              → child_chunks  (embedding VECTOR(1024))
      → token_usage
  → api_keys
```

Full schema: `2-backend/supabase-schema.md`

---

## Security & Limits

- JWT authentication on all dashboard endpoints
- API key authentication (SHA256 hash stored, raw shown once) on public embed endpoints
- Rate limiting: 20 req/min per user (dashboard), 30 req/min per API key, 5 req/min per visitor IP
- Token quota per user (default 50,000 tokens) — 402 returned when exhausted
- File size cap: 2MB per upload
- Prompt injection sanitization on all user inputs
- Agent ownership check on every edit/delete — `user_id` filter prevents cross-user access

---

## Infrastructure

| Service | Tier | Notes |
|---|---|---|
| Vercel | Free | Static React frontend, global CDN |
| Railway | Free / Hobby | FastAPI backend, single instance |
| Supabase | Free | PostgreSQL + pgvector, 500MB storage |
| Mistral | Pay-per-use | mistral-large (generation), mistral-embed (embeddings) |

The stack is intentionally lean. Upgrade path is staged — each layer upgrades only when it becomes the actual bottleneck. See `3-infra/infrastructure-decisions-3-4-2026.md` for the full reasoning.

---

## Documentation Map

Read in this order:

| # | File | What it covers |
|---|---|---|
| 0 | `0-overview/system-overview.md` | **This file** — start here |
| 1 | `1-architecture/ingestion-embeddings.md` | Document ingestion pipeline |
| 2 | `1-architecture/retrieval-rag-pipeline.md` | Vector search, reranking, RAG wiring |
| 3 | `1-architecture/chat-pipeline-agents.md` | Intent classifier, smalltalk agent, token tracking |
| 4 | `2-backend/streaming-response.md` | SSE streaming implementation |
| 5 | `2-backend/authentication-system.md` | JWT auth, signup/login |
| 6 | `1-architecture/agent-system.md` | Agent CRUD, system agents, model selector |
| 7 | `2-backend/supabase-schema.md` | Full database schema |
| 8 | `2-backend/rate-limiting.md` | Rate limiting, reverse proxy, cold starts |
| 9 | `1-architecture/embed-system.md` | Embed widget, API keys, public endpoints |
| 10 | `3-infra/infrastructure-decisions-3-4-2026.md` | Stack choices, cost strategy |
| 11 | `5-features/developer-dashboard.md` | Platform analytics dashboard |
| 12 | `6-guide/DEVELOPER-GUIDE.md` | Full developer onboarding guide |

---

## Known Limitations (V1)

- No conversation memory — chat history lives in React state only, resets on page refresh
- Token estimation is approximate (`len(text) // 4`) — not a real tokenizer
- In-memory rate limiting resets on Railway restart — Redis needed for multi-instance scale
- Supabase free tier pauses after 7 days of inactivity
- Model selector is frontend-only — backend always uses `mistral-large-latest`
- No retry UI for failed ingestion — user must re-upload

These are known, documented, and tracked. See individual architecture docs for fix paths.
