# Archelon

Live Demo: https://archelon.cloud
Example: IRCTC assistant (on the website)

Archelon is an **Agentic RAG platform** where users can create AI agents, upload documents, and deploy them as embeddable chat widgets.

Each agent has its own isolated knowledge base and instructions, enabling context-aware responses grounded in uploaded documents.

---

## What it does

* Create AI agents with custom instructions
* Upload documents (PDF, DOCX, TXT) per agent
* Convert documents into embeddings for retrieval
* Chat with agents using real-time streaming responses
* Deploy agents as chat widgets on external websites

---

## Core System Flow

1. User uploads documents
2. Documents are parsed, chunked, and embedded
3. Embeddings stored in vector database (Supabase pgvector)
4. User sends a query
5. System classifies intent and generates search queries
6. Relevant chunks retrieved via vector search + reranking
7. LLM generates response grounded in retrieved context
8. Response streamed token-by-token to UI

---

## Architecture

* **Frontend:** React (Vite) → Vercel
* **Backend:** FastAPI (Python) → Railway
* **Database:** Supabase (PostgreSQL + pgvector)
* **LLM:** Mistral (embedding + generation)
* **Streaming:** Server-Sent Events (SSE)

---

## Core Components

* **Agent System**
  Multi-agent architecture with isolated knowledge and instructions per agent

* **Ingestion Pipeline**
  Parsing → chunking → embedding → storage

* **Retrieval Engine**
  Vector search + deduplication + reranking

* **Chat Pipeline**
  Intent classification → query generation → retrieval → synthesis

* **Streaming Engine**
  Token-level response streaming via SSE

* **Embed System**
  Deploy agents as chat widgets using API keys

* **Token System**
  Usage tracking and quota enforcement

---

## Design Highlights

* Agent-based architecture with strict data isolation per agent
* Intelligent query pipeline (intent classification + dynamic query generation)
* Advanced retrieval logic (deduplication, gap detection, token budgeting)
* Streaming-first system for reduced perceived latency
* Public embed system with API-key authentication and origin validation
* Built with real-world constraints in mind (rate limits, infra limits, cost control)

---

## Features

* Create and manage AI agents
* Upload and manage documents per agent
* Real-time streaming chat responses
* Deploy agents as website chat widgets
* Developer dashboard with platform analytics
* Token usage tracking and limits

---

## Production Considerations

* Rate limiting (per user, per API key, per IP)
* Prompt injection protection and input sanitization
* File validation and ingestion safeguards
* Token-based quota enforcement
* API-key based access control for public widgets

---

## Infrastructure

Built on Vercel + Railway + Supabase stack for fast iteration and cost efficiency at early stage.

Optimized for demo reliability and real-world constraints such as API limits, cold starts, and cost control.

---

## Known Limitations & Evolution Path

This version of Archelon represents a fully working V1 system. The current system reflects real-world constraints across model behavior, retrieval design, and infrastructure.

**Internal (System Design)**
- Retrieval quality depends on chunking, reranking, and query strategies  
- Context memory and long-session coherence are not yet implemented  
- Further improvements possible in multi-query handling and grounding  

**External (Model & Infrastructure Constraints)**
- Response quality depends on underlying LLM behavior (hallucinations, temperature sensitivity)  
- Rate limits and latency vary across model providers (Mistral, Gemini, etc.)  
- Serverless infrastructure introduces cold starts and resource limits  

**Evolution Direction (V2 Thinking)**
- Improve retrieval robustness and grounding accuracy  
- Introduce memory + tool-calling capabilities  
- Move toward more stable infrastructure (queues, VPS, async pipelines)  
- Evaluate multiple models for quality, latency, and cost tradeoffs  

This reflects a typical progression from a working agentic RAG system to a more production-grade AI platform.

---

## Documentation

See detailed system design and architecture:

→ `archelon-documentation/0-overview/system-overview.md`

---

## Notes

This project focuses on building a production-oriented AI system with real-world constraints - not just a demo chatbot.

---
