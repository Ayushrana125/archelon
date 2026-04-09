# Rate Limiting

**Archelon — Backend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

Archelon has two separate rate limiting systems — one for the authenticated dashboard chat, and one for the public embed widget. They are completely independent.

---

## 1. Dashboard Chat Rate Limit

**File:** `backend/routers/chat.py`

**Who it applies to:** Logged-in Archelon users chatting with agents in the dashboard.

**Limit:** 20 requests per minute per user.

**Implementation:** In-memory sliding window counter keyed by `user_id`.

```python
_rate_store: dict[str, list[float]] = defaultdict(list)

def check_rate_limit(user_id: str, limit: int = 20, window: int = 60):
    now = time.time()
    _rate_store[user_id] = [t for t in _rate_store[user_id] if now - t < window]
    if len(_rate_store[user_id]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    _rate_store[user_id].append(now)
```

**Response on exceed:** `429 Too Many Requests`

---

## 2. Public Embed Widget Rate Limits

**File:** `backend/routers/embed.py`

**Who it applies to:** Visitors on client websites using the embedded chat widget.

Two separate limits run on every public chat request:

### 2a. Per API Key (Per Widget)

Limits total requests across **all visitors** of a single deployed widget.

| Setting | Value |
|---|---|
| Limit | 30 requests per minute |
| Keyed by | API key ID |
| Purpose | Prevents a single widget from flooding the backend if a client's site gets high traffic |

```python
def check_public_rate_limit(key_id: str, limit: int = 30, window: int = 60):
```

### 2b. Per Visitor IP

Limits requests from a **single visitor** regardless of which widget they're using.

| Setting | Value | Notes |
|---|---|---|
| Per minute | 5 requests | Prevents rapid spamming |
| Per day | 10 requests | **TEST VALUE** — raise before production |
| Keyed by | Visitor IP (`X-Forwarded-For`) | |

```python
IP_LIMIT_PER_MIN = 5
IP_LIMIT_PER_DAY = 25  # TEST VALUE — raise before production
```

**To change the day limit** — update `IP_LIMIT_PER_DAY` in `embed.py`. Single line change.

**IP detection:** Uses `X-Forwarded-For` header to get the real visitor IP behind Railway's reverse proxy. Falls back to `request.client.host` if header is absent.

```python
ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown").split(",")[0].strip()
```

**Response on exceed:** `429 Too Many Requests`

Widget shows: *"You're sending messages too fast. Give it a moment."*

---

## 3. Validation Order on Public Chat

Every public chat request goes through `_validate_public_request()` in this order:

```
1. API key present?           → 401 if missing
2. API key valid?             → 403 if invalid
3. Agent ID matches key?      → 403 if mismatch
4. Origin whitelisted?        → 403 if not allowed (only if whitelist is set)
5. Per-key rate limit (30/min) → 429 if exceeded
6. Per-IP rate limit (5/min, 10/day) → 429 if exceeded
7. Token balance check        → 402 if exhausted
8. Message length check       → 400 if empty after truncation
```

---

## 4. Limitations

| Limitation | Impact | Fix |
|---|---|---|
| In-memory storage | Railway restart resets all counters | Use Redis for persistent rate limiting |
| Single Railway instance | Works correctly | Multiple instances would need Redis to share state |
| IP rotation / VPN | Bypasses per-IP limit | Requires Cloudflare or WAF for network-level protection |
| `X-Forwarded-For` spoofing | Malicious client could fake IP | Acceptable risk at current scale |

---

## 6. Infrastructure Concepts

### Reverse Proxy

A reverse proxy sits between the internet and your backend server. When a visitor sends a request to `api.archelon.cloud`, it doesn't go directly to your FastAPI process — it goes to Railway's infrastructure first, which then forwards it to your app.

```
Visitor → Internet → Railway Reverse Proxy → FastAPI (your code)
```

This is why `request.client.host` gives the proxy's IP, not the visitor's real IP. The proxy adds the real IP in the `X-Forwarded-For` header, which is why we read from there.

**Real world examples:** Nginx, Cloudflare, AWS ALB — all act as reverse proxies.

---

### Load Balancer

A load balancer distributes incoming requests across multiple instances of your app. If Railway runs 2 copies of your backend, the load balancer decides which copy handles each request.

```
Visitor → Load Balancer → Instance 1 (FastAPI)
                       → Instance 2 (FastAPI)
```

**Why this breaks in-memory rate limiting:**
If visitor sends 3 requests — 2 go to Instance 1, 1 goes to Instance 2. Instance 1 thinks they've sent 2 requests. Instance 2 thinks they've sent 1. Neither blocks them even if the real total exceeds the limit.

**The fix:** Redis — a shared in-memory store outside both instances. Both read and write to the same counter.

```
Instance 1 ──→ Redis (shared counter)
Instance 2 ──→ Redis (shared counter)
```

Currently Railway runs one instance so this isn't a problem. It becomes a problem when scaling.

---

### CDN (Content Delivery Network)

A CDN caches static files (like `embed.js`) at servers around the world. When a visitor in Mumbai loads `embed.js`, they get it from a Mumbai server instead of your Railway server in the US.

**Why it matters for embed.js:**
Currently `embed.js` is served from Railway with `no-cache` headers — every visitor re-downloads it from Railway every time. With a CDN:
- First visitor downloads from Railway, CDN caches it
- Every subsequent visitor gets it from the nearest CDN node — much faster
- Railway gets less traffic

**Cloudflare** acts as both a CDN and a reverse proxy — free tier is sufficient for this.

---

### Cold Start

Railway on free/hobby tier spins down your backend after inactivity (~15 minutes). The next request has to wait for the container to start up — typically 2-4 seconds.

```
No traffic for 15 min → Railway shuts down container
Next request arrives  → Railway starts container (2-4s delay)
Request is served     → Container stays warm for next 15 min
```

This is why users sometimes see "Unable to connect" on login — the request arrives during cold start before FastAPI is ready.

**Fixes:**
- Railway Hobby plan ($5/month) — keeps container always on
- Ping the backend every 10 minutes with a cron job to prevent sleep
- Show a friendly "Please wait" message on the frontend (already implemented)

---

### X-Forwarded-For Header

When a reverse proxy forwards a request, it adds the original visitor's IP in this header:

```
X-Forwarded-For: 103.21.244.0, 172.16.0.1
```

The first IP is the real visitor. The rest are intermediate proxies. This is why we do:

```python
ip = request.headers.get("X-Forwarded-For", ...).split(",")[0].strip()
```

**Security note:** A malicious client can fake this header by sending `X-Forwarded-For: 1.2.3.4` themselves. At current scale this is an acceptable risk. Cloudflare solves this by overwriting the header with the verified real IP.

---

### DDoS (Distributed Denial of Service)

An attacker uses thousands of machines to flood your API with requests, making it unavailable for real users.

**Current protection:** In-memory rate limiting slows down a single IP but does nothing against a distributed attack from thousands of IPs.

**Real protection:** Cloudflare — sits in front of your domain, detects attack patterns, blocks malicious traffic before it reaches Railway. Free tier handles most DDoS scenarios.

```
Attacker (1000 IPs) → Cloudflare (blocks) → Railway never sees it
Real visitor        → Cloudflare (allows) → Railway → FastAPI
```

This is the correct infrastructure order for production:
```
Visitor → Cloudflare → Railway → FastAPI
```

Before going to production with real clients:

1. **Raise `IP_LIMIT_PER_DAY`** — 10 is a test value. A real user having a conversation needs at least 50-100 messages per day.
2. **Consider per-session limit** — instead of per-day IP, a session-based limit (e.g. 20 messages per browser session) is more user-friendly.
3. **Redis** — when scaling to multiple Railway instances, move rate stores to Redis so all instances share the same counters.
4. **Cloudflare** — for DDoS protection at the network level, put Cloudflare in front of `api.archelon.cloud`.
