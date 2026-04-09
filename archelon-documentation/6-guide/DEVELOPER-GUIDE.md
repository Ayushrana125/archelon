# Archelon — Developer Guide

**Start here. Read in this order.**

---

## What is Archelon?

Archelon is an **Agentic RAG Platform**. Users create AI agents, upload documents to them, and chat with them. The agents answer questions grounded in the uploaded documents. Agents can also be deployed as embeddable chat widgets on any website.

**Stack:**
- Frontend: React + Vite → Vercel
- Backend: FastAPI (Python) → Railway
- Database: Supabase (PostgreSQL + pgvector)
- LLMs: Mistral AI (mistral-large, mistral-embed)

---

## Reading Order

### Phase 1 — Understand the Project

Start here before touching any code.

**1. `git-and-project-setup.md`**
Understand the repo structure, folder layout, branches, environment variables, and how to run the project locally. This is your orientation.

**2. `supabase-schema.md`**
Read the full database schema before anything else. Every feature in Archelon maps to these tables. Understanding the data model makes everything else click.

**3. `infrastructure-decisions-3-4-2026.md`**
Why Railway, Vercel, Supabase, and Mistral were chosen. What the constraints are. What the staged upgrade path looks like. Read this to understand the "why" behind the stack.

---

### Phase 2 — Core Backend Pipeline

This is the heart of Archelon — how documents become answers.

**4. `ingestion-embeddings.md`**
How documents are parsed, chunked, embedded, and stored. Every bug encountered and fixed. The full pipeline: `parsing → chunking → saving → embedding → done`. Read this to understand how knowledge gets into the system.

**5. `retrieval-rag-pipeline.md`**
How the system finds relevant chunks when a user asks a question. Vector search via Supabase Edge Function, deduplication, gap-detection reranking, token budget. This is the retrieval half of RAG.

**6. `streaming-response.md`**
How answers stream back to the user token by token using SSE. The synthesizer, the `/api/chat/stream` endpoint, and the frontend SSE reader. This is the generation half of RAG.

**7. `pipeline-and-ux-improvements.md`**
Merged intent + query pipeline (single LLM call), auto-greeting, scroll lock, smalltalk animation. Read after the core pipeline to understand the optimisations.

---

### Phase 3 — Auth, Agents, and Users

**8. `authentication-system.md`**
JWT auth, signup/login flow, bcrypt password hashing, token storage in localStorage. How every protected endpoint is secured.

**9. `agent-system.md`**
Agent CRUD, system agents (visible to all users), ownership checks, chat history in React state, model selector. The core product unit.

---

### Phase 4 — Token Economy and Security

**10. `product-and-infrastructure_token_economy-updates.md`**
Token usage tracking, per-user quota enforcement, the 402 upgrade flow, TopNav credits display, session token counter.

**11. `security-hardening.md`**
Rate limiting (sliding window), prompt injection sanitizer, filename sanitization, zip bomb protection, public widget security. Read this before touching any endpoint.

**12. `rate-limiting.md`**
Deep dive on rate limiting specifically — per-user, per-key, per-IP limits. Also explains reverse proxy, load balancer, CDN, cold start, X-Forwarded-For, and DDoS concepts.

---

### Phase 5 — Embed System

**13. `embed-system.md`**
The full embed widget system — backend API key management, public endpoints, `embed.js` widget, EmbedModal frontend. How clients deploy Archelon agents on their websites.

**14. `ux-product-updates-april-2026.md`**
Embed widget UX details — bubble steps, FAB pill design, pre-chat screen, timestamps, message actions, upgrade modal redesign, Deployments view.

---

### Phase 6 — Infrastructure and Operations

**15. `branching-and-deployment.md`**
Git branching strategy (main/dev), Vercel preview deployments, Railway backend, custom domains, environment variables per branch.

**16. `developer-dashboard.md`**
The private analytics dashboard — platform stats, user/agent tables, Power BI-style row selection, embedding cost calculation.

---

### Phase 7 — Product Context (Optional)

These are decision logs — useful for understanding why things are built the way they are.

**17. `product-decisions-april-2026.md`**
Product thinking behind token tracking, the upgrade modal, agent switching, model selector, loading screen, DNS problem.

---

## Quick Reference

| I want to understand... | Read |
|---|---|
| How the chat pipeline works | `chat-pipeline-agents.md` |
| How documents are managed | `document-management.md` |
| How to run the project | `git-and-project-setup.md` |
| The database tables | `supabase-schema.md` |
| How documents are processed | `ingestion-embeddings.md` |
| How RAG retrieval works | `retrieval-rag-pipeline.md` |
| How streaming works | `streaming-response.md` |
| How auth works | `authentication-system.md` |
| How agents work | `agent-system.md` |
| How tokens are tracked | `product-and-infrastructure_token_economy-updates.md` |
| How the embed widget works | `embed-system.md` |
| How rate limiting works | `rate-limiting.md` |
| How security is handled | `security-hardening.md` |
| How deployments work | `branching-and-deployment.md` |
| Why we chose this stack | `infrastructure-decisions-3-4-2026.md` |

---

## Key Concepts to Understand First

Before reading any doc, make sure you understand these terms:

- **RAG** — Retrieval Augmented Generation. The LLM answers based on retrieved document chunks, not just its training data.
- **Parent-child chunking** — Documents split into section-level parents (800 tokens) and sentence-level children (150 tokens). Children are embedded, parents provide context.
- **pgvector** — PostgreSQL extension for storing and searching vector embeddings using cosine similarity.
- **SSE** — Server-Sent Events. HTTP connection stays open, server pushes tokens one by one as Mistral generates them.
- **JWT** — JSON Web Token. Signed token containing user_id, sent with every authenticated request.
- **Embed widget** — Vanilla JS widget (`embed.js`) that loads on client websites and connects to Archelon's public API using an API key.

---

## Architecture in One Diagram

```
User types message
        ↓
POST /api/chat/stream (JWT auth)
        ↓
classify_and_analyse()          ← single Mistral LLM call
        ↓
intent = smalltalk?
  YES → handle_smalltalk()      ← direct Mistral response, stream back
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
