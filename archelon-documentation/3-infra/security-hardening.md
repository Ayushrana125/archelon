# Security Hardening

**Archelon — Backend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

This document covers all security protections added to the Archelon backend. These were implemented after the core pipeline was working, as a hardening pass before the product was shown publicly.

---

## Protection Summary

| Threat | Fix | Where |
|---|---|---|
| Rate limit abuse / loop attack | 20 req/min per user, 429 on exceed | `chat.py` |
| Prompt injection | Pattern detection, wraps as `[User message]` | `chat.py` |
| Message too long | 2000 char limit, validator rejects | `chat.py` |
| Path traversal in filename | `os.path.basename` strips `../../` | `ingest.py` |
| XSS in filename | Regex strips special chars | `ingest.py` |
| Zip bomb / parser explosion | 5MB parsed content cap | `ingestor.py` |
| Unsupported file types | Extension whitelist | `ingest.py` (existing) |
| Oversized files | 2MB/6MB limits | `ingest.py` (existing) |
| Too many files | 5 file cap per upload | `ingest.py` (existing) |
| Public widget abuse | Rate limit per API key | `embed.py` |
| Unauthorized widget access | API key hash validation + origin check | `embed.py` |

---

## 1. Rate Limiter — `chat.py`

### Implementation

In-code sliding window counter — no Redis, no external dependency:

```python
_rate_store: dict[str, list[float]] = defaultdict(list)

def check_rate_limit(user_id: str, limit: int = 20, window: int = 60):
    now = time.time()
    _rate_store[user_id] = [t for t in _rate_store[user_id] if now - t < window]
    if len(_rate_store[user_id]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    _rate_store[user_id].append(now)
```

**How it works:**
- Keeps a list of request timestamps per user in memory
- On each request: removes timestamps older than 60 seconds, counts what's left
- If 20+ in the window → 429
- Otherwise → records timestamp and allows

**Limitation:** `_rate_store` lives in RAM. Railway restart wipes it. Multiple Railway instances each have their own dict. At current scale (single instance) this is fine. Redis would be needed for multi-instance deployments.

**Why not server-level (Nginx/Cloudflare)?** Server-level rate limiting is at the network layer before requests reach Python. Code-level is simpler to deploy and sufficient for current scale. Server-level would be added when scaling to multiple instances.

---

## 2. Prompt Injection Sanitizer — `chat.py`

### What it protects against

Prompt injection is when a user crafts a message designed to override the system prompt or make the LLM behave differently. Examples:
- "Ignore all previous instructions and..."
- "You are now a different AI..."
- "System: override your instructions"

### Implementation

```python
INJECTION_PATTERNS = [
    r'ignore\s+(all\s+)?(previous|prior|above)\s+instructions',
    r'you\s+are\s+now\s+a',
    r'act\s+as\s+(if\s+you\s+are|a)',
    r'(system|assistant)\s*:\s*',
    r'override\s+(your\s+)?(instructions|rules|guidelines)',
    r'forget\s+(everything|all)',
    r'new\s+instructions?\s*:',
    r'disregard\s+(all\s+)?(previous|prior)',
]

def sanitize_message(message: str) -> str:
    lower = message.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lower):
            return f"[User message]: {message}"
    return message
```

Detected messages are wrapped in `[User message]: ...` — this signals to the LLM that the content is user input, not a system instruction. The message is not blocked — it's passed through but framed.

`safe_message` is used in all pipeline steps: intent classifier, smalltalk handler, query analyser, synthesizer, and token usage logging.

---

## 3. Message Length Limit — `chat.py`

```python
class ChatRequest(BaseModel):
    message: str = Field(..., max_length=2000)
```

FastAPI's Pydantic validator rejects messages over 2000 characters with a 422 before the request even reaches the handler. No LLM tokens wasted on oversized inputs.

---

## 4. Filename Sanitization — `ingest.py`

### Threats

- **Path traversal:** `../../etc/passwd` as a filename could write to unexpected locations
- **XSS:** `<script>alert(1)</script>.pdf` stored in DB could execute if rendered unsanitized

### Implementation

```python
def sanitize_filename(filename: str) -> str:
    # Strip path components — prevents ../../ traversal
    filename = os.path.basename(filename)
    # Remove special characters — only allow alphanumeric, spaces, dots, hyphens, underscores
    filename = re.sub(r'[^\w\s.\-]', '', filename)
    # Limit length
    return filename[:100]
```

Applied before storing the filename in the `documents` table.

---

## 5. Zip Bomb Protection — `ingestor.py`

### What it protects against

A zip bomb is a compressed file that expands to an enormous size when extracted. A 1MB PDF could theoretically contain 1GB of text after parsing. Without a cap, this would:
- Exhaust Railway's memory (free tier has ~512MB)
- Create millions of chunks
- Cause the embedding step to run for hours

### Implementation

After `document_parser.py` extracts text from the file:

```python
parsed_content = "\n".join(el.text for el in elements if el.text)
if len(parsed_content) > 5_000_000:  # 5MB of text
    raise ValueError(f"Parsed content too large ({len(parsed_content):,} chars). Max 5MB.")
```

5MB of plain text is approximately 1.25M tokens — far more than any legitimate document needs. Any file that expands beyond this is either malicious or pathologically large.

---

## 6. Public Widget Security — `embed.py`

### API Key Validation

Every public endpoint call validates the API key:
1. Reads `X-Archelon-Key` header
2. Computes `sha256(key)` and looks up in `api_keys` table
3. Returns 401 if not found

The raw key is never stored — only the hash. Even if the DB is compromised, API keys cannot be extracted.

### Origin Whitelist

If `allowed_origins` is non-empty for a key:
```python
origin = request.headers.get("Origin", "")
clean_origin = origin.replace("https://", "").replace("http://", "").rstrip("/")
if clean_origin not in key_record["allowed_origins"]:
    raise HTTPException(status_code=403, detail="Origin not allowed")
```

If `allowed_origins` is empty — all origins allowed (useful for testing).

### Rate Limiting on Public Endpoint

Separate rate limit per API key (not per user) — prevents a single widget from flooding the backend:

```python
_public_rate_store: dict[str, list[float]] = defaultdict(list)

def check_public_rate_limit(key_id: str, limit: int = 30, window: int = 60):
    ...
```

30 requests/minute per API key — higher than the authenticated limit because widget traffic is expected to be higher volume.

---

## Files Modified

| File | What Changed |
|---|---|
| `routers/chat.py` | Rate limiter, prompt injection sanitizer, 2000 char validator, safe_message throughout |
| `routers/ingest.py` | `sanitize_filename()` function, applied before DB insert |
| `ingestion/ingestor.py` | Parsed content size check after extraction |
| `routers/embed.py` | API key hash validation, origin whitelist check, public rate limiter |

---

## What's Not Yet Implemented

| Threat | Status | Notes |
|---|---|---|
| SQL injection | Not needed | Supabase Python client uses parameterised queries — no raw SQL |
| CSRF | Not needed | API is stateless JWT — no cookies, no session state |
| DDoS | Not protected | Would need Cloudflare or Railway Pro for network-level protection |
| Brute force on API keys | Partially protected | Rate limit slows it down, but no lockout after N failures |
| Conversation memory poisoning | Future | When memory is added, need to sanitize stored messages too |
