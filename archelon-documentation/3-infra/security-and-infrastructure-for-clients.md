# Security & Infrastructure

**Archelon — Platform Documentation**
Date: May 2026
Author: Ayush Rana

---

## Overview

This document covers how Archelon stores client data, how that data is isolated between users, how accounts and API keys are secured, and what the current infrastructure looks like. It also covers known limitations and the planned improvements for future versions.

---

## 1. Infrastructure Stack

| Layer | Provider | Purpose |
|-------|----------|---------|
| Frontend | Vercel | React app, global CDN |
| Backend API | Railway | FastAPI Python server |
| Database | Supabase | PostgreSQL + pgvector |
| LLM & Embeddings | Mistral AI | Text generation and embedding |
| Vector Search | Supabase Edge Function | Runs inside Supabase infrastructure |

**Frontend (Vercel)** is a static React app served from a global CDN. No user data passes through Vercel.

**Backend (Railway)** is a FastAPI server that handles all business logic — authentication, document ingestion, chat pipeline, embed widget API. All API requests go through here.

**Database (Supabase)** is a managed PostgreSQL instance hosted on AWS. This is where all user data lives — accounts, agents, documents, chunks, embeddings, and usage records.

**Mistral AI** is a third-party API used for two things: generating vector embeddings during document ingestion, and generating chat responses. Document content and user queries are sent to Mistral's servers for processing. Mistral's API documentation states that API inputs are not used to train models by default.

---

## 2. Where Data Is Stored

All persistent data lives in Supabase (PostgreSQL on AWS). Here is what is stored and where:

| Data | Table | Notes |
|---|---|---|
| User accounts | `users` | Email, username, bcrypt password hash |
| Agent configuration | `agents` | Name, description, system instructions |
| Document metadata | `documents` | Filename, filetype, processing status |
| Document text content | `parent_chunks` | Section-level text extracted from documents |
| Sentence-level chunks | `child_chunks` | Smaller chunks with 1024-dim vector embeddings |
| Chat history | `token_usage` | User messages and agent responses per query |
| API keys | `api_keys` | SHA256 hash only — raw key never stored |
| Widget logos | Supabase Storage | Public bucket, accessible by URL |

**Raw uploaded files are not retained.** When a document is uploaded, it is parsed into text, split into chunks, embedded, and the original file is deleted. Only the extracted text content is stored in the database.

---

## 3. Data Isolation Between Users

Archelon is a multi-tenant platform — multiple users share the same database. Data isolation is enforced through a strict ownership chain and query-level filtering.

### Ownership Chain

Every piece of data traces back to a single user:

```
users
  └── agents          (agents.user_id → users.id)
        └── documents (documents.agent_id → agents.id)
              └── parent_chunks  (parent_chunks.document_id → documents.id)
                    └── child_chunks (child_chunks.parent_id → parent_chunks.id)
        └── token_usage (token_usage.user_id + token_usage.agent_id)
        └── api_keys    (api_keys.user_id + api_keys.agent_id)
```

A document row contains only an `agent_id` — it does not directly reference a user. The user ownership is resolved through the agent. This is standard normalized database design.

### Query-Level Enforcement

Every database query that reads or modifies user-owned data filters by both the resource ID and the authenticated user's ID. This is enforced in every database function, not just at the router level.

Reading an agent:
```python
db.table("agents").select("*").eq("id", agent_id).eq("user_id", user_id)
```

Updating or deleting an agent:
```python
db.table("agents").update(updates).eq("id", agent_id).eq("user_id", user_id)
db.table("agents").delete().eq("id", agent_id).eq("user_id", user_id)
```

If `user_id` does not match the record, the query returns nothing. There is no separate authorization check that could be bypassed — the ownership filter is part of the query itself.

### Vector Search Isolation

When a user sends a chat message, the vector search that retrieves relevant document chunks is filtered by `agent_id` inside the Supabase Edge Function at the database level:

```sql
-- retrieve_chunks_vector SQL function
-- filters through: child_chunks → parent_chunks → documents → agents
WHERE agents.id = agent_id_filter
```

A search against Agent A will never return chunks from Agent B, even if both agents have documents with similar content. The filter runs inside PostgreSQL — not in application code.

### Cascade Deletes

All foreign keys use `ON DELETE CASCADE`. When a user deletes their account, all associated data is removed automatically by the database:

```
Delete user → all agents deleted
  → all documents deleted
    → all ingestion jobs deleted
    → all parent chunks deleted
      → all child chunks and embeddings deleted
  → all token usage records deleted
  → all API keys deleted
```

No orphaned data remains after account deletion.

---

## 4. Account Security

### Password Hashing

Passwords are hashed using **bcrypt** before being stored. bcrypt uses a random salt per password and is intentionally slow, making brute force attacks computationally expensive. The raw password is never stored, never logged, and is discarded immediately after hashing.

```python
# Signup
password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

# Login verification
bcrypt.checkpw(password.encode(), stored_hash.encode())
```

### JWT Authentication

After login, the server issues a **JWT (JSON Web Token)** signed with a secret key stored as an environment variable on Railway. The token is valid for 24 hours.

Every protected API endpoint verifies this token before processing the request. The token payload contains only `user_id` and `email` — no sensitive data. All authorization decisions (ownership checks, token balance, developer access) are made by querying the database on each request, not by trusting the token payload.

A tampered or expired token returns 401. There is no way to forge a valid token without the server's secret key.

### What Is Not Implemented Yet

- **Email verification** — the `is_email_verified` column exists in the schema but the verification flow is not built. Users can sign up with any email address.
- **Brute force lockout** — there is no lockout after repeated failed login attempts. bcrypt's slowness provides some resistance but there is no hard block.

---

## 5. Embed Widget Security

When an Archelon agent is deployed as a chat widget on an external website, a separate security model applies.

### API Key Design

- Generated using `secrets.token_urlsafe(32)` — 256 bits of cryptographic randomness
- Prefixed with `arch_live_` for identification
- Only the **SHA256 hash** is stored in the database — the raw key is shown once at generation and never stored again
- If the database were compromised, active API keys could not be extracted from the stored hashes

### Request Validation

Every request to the public chat endpoint goes through this sequence:

```
1. X-Archelon-Key header present?          → 401 if missing
2. SHA256(key) matches a row in api_keys?  → 403 if not found
3. agent_id in request matches key record? → 403 if mismatch
4. Origin in allowed_origins whitelist?    → 403 if not allowed (when whitelist is set)
5. Per-key rate limit (30 req/min)?        → 429 if exceeded
6. Per-IP rate limit (5/min, 25/day)?      → 429 if exceeded
7. User token balance > 0?                 → 402 if exhausted
8. Message non-empty after truncation?     → 400 if empty
```

### Origin Whitelisting

Widget owners can restrict their widget to specific domains. If `allowed_origins` is configured (e.g. `["mycompany.com"]`), requests from any other origin are rejected with 403. This prevents the widget from being used on unauthorized websites.

### Agent Instructions Are Server-Side

For public chat requests, the agent's system instructions are fetched from the database using the API key's linked `agent_id`. They are not accepted from the request body. A malicious request cannot inject or override agent instructions.

---

## 6. Input Security

### Message Length Limit

Chat messages are capped at 2000 characters via Pydantic validation. Requests exceeding this are rejected before reaching any pipeline logic.

### Prompt Injection Detection

Messages are checked against a list of known prompt injection patterns before being passed to any LLM. Detected messages are wrapped as `[User message]: {content}` — this frames the content as user input rather than a system instruction, reducing the effectiveness of injection attempts.

This is a pattern-matching first-line defense. It does not catch all possible injection attempts, particularly rephrased or obfuscated ones.

### File Upload Validation

Document uploads are validated on multiple dimensions:

| Check | Limit |
|---|---|
| Allowed file types | PDF, DOCX, TXT only |
| Per-file size | 2MB maximum |
| Total upload size | 6MB across all files in one request |
| Files per upload | 5 maximum |
| Filename sanitization | Path components stripped, special characters removed, 100 char limit |
| Parsed content size | 5MB cap on extracted text (zip bomb protection) |

The 5MB parsed content cap protects against files that are small when compressed but expand to very large text after parsing.

---

## 7. Rate Limiting

Three independent rate limiting systems are in place:

| Scope | Limit | Purpose |
|---|---|---|
| Per authenticated user | 20 requests/min | Prevents dashboard chat abuse |
| Per embed API key | 30 requests/min | Prevents a single widget from flooding the backend |
| Per visitor IP (embed) | 5/min + 25/day | Prevents individual visitor abuse |

All three use an in-memory sliding window counter stored in the FastAPI process.

**Current limitation:** These counters live in Railway's process memory. A server restart resets all counters. If the backend were scaled to multiple instances, each instance would have its own independent counter — a user could send requests to different instances and bypass the per-instance limit. The correct fix for multi-instance deployments is a shared Redis store. At current scale (single Railway instance), this is not a problem.

---

## 8. Known Limitations

These are documented openly as part of V1. They represent the gap between a working production system and a hardened enterprise system.

**CORS policy is permissive.** `main.py` currently sets `allow_origins=["*"]`, meaning any website can make requests to the backend. For authenticated endpoints this is mitigated by JWT requirements, but it is not best practice. The correct configuration is to restrict to known frontend domains.

**Rate limiting is not persistent.** In-memory counters reset on server restart and do not work correctly across multiple backend instances. Redis would solve both issues.

**Token increment is not atomic.** The function that updates a user's `tokens_used` does a read-then-write. Under high concurrency, two simultaneous requests could both read the same value and both write `current + amount`, causing one increment to be lost. The fix is a SQL atomic update (`UPDATE users SET tokens_used = tokens_used + $1`). At current usage levels this is not a practical issue.

**No email verification.** Users can register with any email address. There is no verification step.

**No brute force lockout.** The login endpoint does not lock after repeated failed attempts.

**IP spoofing on embed rate limit.** The per-IP rate limit reads from the `X-Forwarded-For` header, which a client can forge. Cloudflare in front of the Railway domain would overwrite this header with the verified real IP.

**No audit log.** There is no record of access events — logins, document reads, configuration changes, API key generation. If a security review required knowing who accessed what and when, the current system cannot answer that question beyond what is in `token_usage`..

**Chat messages stored in plain text.** User messages and agent responses are stored in the `token_usage` table as plain text. This is used for future conversation memory features. Clients with sensitive conversation content should be aware of this.

**No data residency control.** All users share a single Supabase project in one AWS region. There is no mechanism to isolate a specific client's data to a particular geographic region. This matters for clients subject to data residency regulations.

---

## 9. Planned Improvements

In order of priority for V2:

1. Restrict CORS to known frontend domains
2. Email verification on signup
3. Atomic token increment via SQL
4. Brute force lockout on login
5. Cloudflare in front of Railway — real IP detection, DDoS protection
6. Redis-backed rate limiting — persistent, multi-instance safe
7. Audit log table — login, document upload, agent changes, API key events
8. Per-API-key conversation storage opt-out flag
9. Supabase Pro — daily backups, point-in-time recovery, no inactivity pause
10. Data residency options for enterprise clients

---
