# Chat Pipeline Agents & Token Usage

**Archelon — Backend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

This document covers the three pipeline agents that handle every chat request, plus the token usage tracking system.

```
User message
    ↓
classify_and_analyse()     ← intent_and_query.py — single LLM call
    ↓
intent = smalltalk?
  YES → handle_smalltalk() ← smalltalk_agent.py
  NO  → vector search → rerank → synthesize_stream()
    ↓
Token usage logged         ← token_usage_db.py
```

---

## 1. Intent & Query Classifier

**File:** `backend/pipeline/intent_and_query.py`

**Function:** `classify_and_analyse(user_message, system_instructions)`

**Model:** `mistral-small-latest` (fast, sufficient for classification)

### What it does

Single LLM call that replaces the old two-step pipeline (v1 had separate `intent_classifier.py` + `query_analyser.py`). Returns everything needed to route the request:

```python
{
  "intent":          "single" | "multi" | "smalltalk",
  "thinking":        "User is asking about X",
  "search_thinking": "Let's search for X from the documents",
  "search_queries":  ["keyword 1", "keyword 2"]
}
```

### Intent Types

| Intent | When | What happens next |
|---|---|---|
| `smalltalk` | Greetings, casual chat, identity questions about the agent | `handle_smalltalk()` — no retrieval |
| `single` | One information need, even if multi-concept | 1-3 search queries, single vector search |
| `multi` | Two or more clearly distinct information needs | Multiple search queries, parallel vector searches |

### Smalltalk Detection Rule

> If there is ANY question about a specific person, topic, document content, skill, or project — NOT smalltalk. When in doubt, classify as single or multi, never smalltalk.

This prevents false smalltalk classification for questions like "who is Ayush" which look casual but need retrieval.

### Search Queries

- `single` intent → 1-3 keywords covering all concepts in the question
- `multi` intent → one keyword per distinct sub-topic, minimum 2
- `smalltalk` → empty array `[]`

Keywords are short noun phrases (2-5 words) — not full sentences. These go directly into vector search.

### Error Handling

If the LLM returns malformed JSON or the call fails, falls back to:
```python
{ "intent": "single", "thinking": "", "search_thinking": "", "search_queries": [user_message] }
```

The raw user message becomes the search query — degraded but functional.

### v1 Archive

The old two-file approach is preserved in `pipeline/archive_v1_pipeline/`:
- `intent_classifier.py` — classified intent only
- `query_analyser.py` — extracted search queries only

These are not imported anywhere. Kept for reference.

---

## 2. Smalltalk Agent

**File:** `backend/pipeline/smalltalk_agent.py`

**Function:** `handle_smalltalk(user_message, agent_name, agent_description, agent_instructions)`

**Model:** `mistral-small-latest`

### What it does

Handles casual conversation and greetings without any document retrieval. Responds as the agent using its name, description, and instructions as context.

### System Prompt Rules

- Use `**bold**` for key terms
- Keep it short — 1 or 2 lines maximum
- No bullet points, headers, code blocks, or emojis
- Each distinct point on its own line with a blank line between

### Context Passed to LLM

```python
context = f"Agent name: {agent_name}"
if agent_description:
    context += f"\nAgent description: {agent_description}"
if agent_instructions:
    context += f"\nAgent instructions: {agent_instructions}"
```

This is how the agent knows its own identity — the instructions from the DB are injected here.

### Fallback

If the LLM call fails:
```python
return f"Hi! I'm {agent_name}. How can I help you?"
```

### Arex Special Case — Resume Webhook

For the Arex system agent, the frontend intercepts resume-related keywords **before** sending to the backend:

```javascript
const resumeKeywords = ['resume', 'cv', 'send me your resume', ...];
if (isArex && resumeKeywords.some(k => text.toLowerCase().includes(k))) {
    setResumeFlow({ step: 'askName' });
    // asks for name → email → fires n8n webhook
}
```

The n8n webhook URL: `https://n8n.aranixlabs.cloud/webhook/c6f0b2d8-c320-4ab7-9028-e24932938b54`

Payload: `{ name, email }` — n8n sends the resume PDF to the provided email address.

This flow never hits the backend — it's entirely frontend + n8n.

---

## 3. Token Usage DB

**File:** `backend/db/token_usage_db.py`

### Functions

#### `insert_embedding_event`

Called at the end of document ingestion (Step 6 in `ingestor.py`):

```python
await insert_embedding_event(
    agent_id=agent_id,
    user_id=user_id,
    embedding_tokens=total_tokens,  # sum of all parent chunk tokens
    job_id=job_id,
)
```

Records how many tokens were used to embed a document. `job_id` links to the full ingestion metadata.

#### `insert_query_event`

Called after every chat response in `chat.py` and `embed.py`:

```python
await insert_query_event(
    agent_id=agent_id,
    user_id=user_id,
    input_tokens=input_tokens,
    output_tokens=output_tokens,
    user_message=safe_message,   # sanitized message
    agent_response=full_response,
)
```

`user_message` and `agent_response` are stored for future conversation memory feature.

#### `_increment_user_tokens`

Internal function called by both insert functions:

```python
async def _increment_user_tokens(user_id: str, amount: int):
    db = get_supabase()
    res = db.table("users").select("tokens_used").eq("id", user_id).execute()
    current = res.data[0]["tokens_used"] if res.data else 0
    db.table("users").update({"tokens_used": (current or 0) + amount}).eq("id", user_id).execute()
```

**Known limitation:** This is a read-then-write pattern. At high concurrency, two simultaneous requests could both read the same `tokens_used` value and both add to it, resulting in one increment being lost. At current scale (single user at a time) this is safe. Fix when scaling: use a SQL atomic update (`UPDATE users SET tokens_used = tokens_used + $1`).

#### `get_user_token_balance`

Returns `{ token_limit, tokens_used, tokens_remaining }`. Used by:
- `GET /api/chat/balance` — TopNav credits display
- Before every chat request — 402 if `tokens_remaining <= 0`
- Before every document upload — 402 if exhausted

`tokens_remaining` is clamped to `max(0, ...)` — never goes negative in the response.

#### `get_agent_total_tokens`

Sums all token events for an agent (embedding + input + output). Used by:
- `GET /api/chat/tokens/{agent_id}` — ChatView session/total display
- Dashboard stats

### Token Estimation

Tokens are estimated as `len(text) // 4` — 1 token ≈ 4 characters. This is a rough approximation. It underestimates for code (symbols tokenize at higher rates) but is consistent and fast. Real tokenizer integration is a future improvement.

### Why `user_id` in token_usage

System agents are shared across all users. If only `agent_id` was stored, you couldn't tell which user made a query to Arex. `user_id` is stored explicitly even though it's technically derivable from the agent owner — because for system agents, the agent owner is always Ayush, not the actual user.

---

## Token Flow Summary

```
Document uploaded
    → ingestor.py Step 6
    → insert_embedding_event()
    → token_usage row (event_type='embedding')
    → _increment_user_tokens(embedding_tokens)

User sends message
    → chat.py checks get_user_token_balance() → 402 if exhausted
    → pipeline runs
    → insert_query_event()
    → token_usage row (event_type='query')
    → _increment_user_tokens(input + output tokens)
    → refreshTokenBalance() called on frontend → TopNav updates
```
