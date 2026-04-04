# Product & Infrastructure Updates

**Archelon — Backend + Frontend Documentation**
Date: April 2026 (Post April 3)
Author: Ayush Rana

---

## Overview

This document covers everything built after the retrieval pipeline session:

1. **Token usage tracking** — per-query and per-embedding event logging, user quota enforcement
2. **Infrastructure fixes** — DNS issue diagnosis, custom domain planning, API URL centralisation
3. **Frontend polish** — model selector, TopNav credits, upgrade modal, UI spacing fixes
4. **Caps enforcement** — file size, token balance checks before every action
5. **DB schema additions** — `token_usage` table, `users` table columns

---

## Part 1 — Token Usage Tracking

### Why We Built This

The platform needed metering — knowing how many tokens each user and agent consumes. This serves two purposes:
- **Cost visibility** — understand actual Mistral API spend per user
- **Quota enforcement** — free plan users get 25,000 tokens, blocked when exhausted

### DB Schema

**New table: `token_usage`**

```sql
CREATE TABLE token_usage (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type      text NOT NULL CHECK (event_type IN ('embedding', 'query')),
  embedding_tokens  integer DEFAULT 0,
  job_id            uuid REFERENCES ingestion_jobs(id) ON DELETE SET NULL,
  input_tokens    integer DEFAULT 0,
  output_tokens   integer DEFAULT 0,
  user_message    text,
  agent_response  text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_token_usage_agent_id ON token_usage(agent_id);
CREATE INDEX idx_token_usage_user_id  ON token_usage(user_id);
CREATE INDEX idx_token_usage_created_at ON token_usage(created_at);
```

**New columns on `users` table:**

```sql
ALTER TABLE users ADD COLUMN plan          text DEFAULT 'free';
ALTER TABLE users ADD COLUMN token_limit   integer DEFAULT 25000;
ALTER TABLE users ADD COLUMN tokens_used   integer DEFAULT 0;
```

### Event Types

**Embedding event** — inserted at Step 6 of `ingestor.py` when a document finishes processing:
- `embedding_tokens` = total parent chunk tokens for the document
- `job_id` = FK to `ingestion_jobs` — full metadata (filename, filetype, chunks, duration) lives there

**Query event** — inserted in `chat.py` after every LLM response:
- `input_tokens` = system prompt + user query tokens (estimated)
- `output_tokens` = response tokens (estimated from response content)
- `user_message` + `agent_response` saved for future context memory feature

### Why `user_id` Is Needed Even Though Agent Has an Owner

System agents are shared across all users. `agent_id` alone doesn't tell you which user made the query. `user_id` is required to track per-user quota correctly.

### Token Estimation

The synthesizer uses `len(text) // 4` for estimation — same character-based approach used in embedding batching. Not perfectly accurate but consistent and fast. Real tokenizer integration is a future improvement.

Synthesizer returns:
```python
{
  "input_tokens":  system_tokens + query_tokens,
  "output_tokens": len(response.content) // 4,
  "total":         input_tokens + output_tokens,
}
```

### `_increment_user_tokens`

Instead of an RPC function, we use a direct read-then-update:

```python
async def _increment_user_tokens(user_id: str, amount: int):
    res = db.table("users").select("tokens_used").eq("id", user_id).execute()
    current = res.data[0]["tokens_used"] if res.data else 0
    db.table("users").update({"tokens_used": (current or 0) + amount}).eq("id", user_id).execute()
```

At current scale (single user at a time) this is safe. At higher concurrency, an atomic SQL update would be needed to prevent race conditions.

### Quota Enforcement

Two enforcement points:

**Before every chat query** (`chat.py`):
```python
balance = await get_user_token_balance(current_user["user_id"])
if balance["tokens_remaining"] <= 0:
    raise HTTPException(status_code=402, detail="Token limit reached. Upgrade your plan to continue.")
```

**Before every document upload** (`ingest.py`):
```python
balance = await get_user_token_balance(current_user["user_id"])
if balance["tokens_remaining"] <= 0:
    raise HTTPException(status_code=402, detail="Token limit reached. Upgrade your plan to continue.")
```

Frontend intercepts `402` and shows the upgrade modal — no error message in chat.

### New Endpoints

**`GET /api/chat/balance`** — returns `token_limit`, `tokens_used`, `tokens_remaining` for the logged-in user

**`GET /api/chat/tokens/{agent_id}`** — returns `total_tokens` for a specific agent (sum of all embedding + query events)

---

## Part 2 — Synthesizer Token Keys Fix

The synthesizer originally returned `context`, `system`, `query`, `total` as token keys. `chat.py` was reading `prompt_tokens` and `completion_tokens` — a mismatch that caused zero tokens to be logged.

Fixed by aligning keys:

**Synthesizer returns:**
```python
{
  "input_tokens":  input_tokens,
  "output_tokens": output_tokens,
  "total":         input_tokens + output_tokens,
}
```

**`chat.py` reads:**
```python
input_tokens=token_usage.get("input_tokens", 0),
output_tokens=token_usage.get("output_tokens", 0),
```

---

## Part 3 — DNS Issue & Custom Domain Planning

### The Problem

A user on Reliance broadband could not access the Railway backend. `nslookup` confirmed:

```
Server:  reliance.reliance
* reliance.reliance can't find archelon-production.up.railway.app: Query refused
```

Reliance's DNS was actively refusing to resolve Railway's infrastructure domain. This is an ISP-level block, not a code issue.

### Root Cause

`up.railway.app` is Railway's subdomain. Some ISPs block unknown infrastructure domains. The frontend (Vercel) worked fine because `vercel.app` is a well-known domain cached everywhere.

### Solution

Custom domain on Railway. Using `aranixlabs.cloud` (already owned):

- `archelon.aranixlabs.cloud` → Vercel (frontend)
- `api.archelon.aranixlabs.cloud` → Railway (backend)

DNS setup:
```
Type: CNAME
Name: archelon
Value: cname.vercel-dns.com  (Vercel gives this)

Type: CNAME
Name: api.archelon
Value: [Railway gives this on custom domain setup]
```

Custom domains resolve through standard DNS everywhere — ISP blocks on `up.railway.app` no longer apply.

### API URL Centralisation

All four service files (`auth_service.js`, `agent_service.js`, `document_service.js`, `ingest_service.js`) were reading `import.meta.env.VITE_API_URL` independently. Centralised into `services/api.js`:

```javascript
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) {
  console.warn('VITE_API_URL is not set. API calls will fail.');
}
export default API_URL;
```

Changed from `throw` to `console.warn` — a throw at module load time crashes React before it mounts, causing the loading spinner to hang forever.

---

## Part 4 — Loading Screen Fix

Added a loading screen in `index.html` that shows the Archelon logo spinning while the JS bundle loads. Eliminates the white flash on first visit.

**Key implementation detail:** The loader must live **outside** `#root`, not inside it. React's `createRoot().render()` replaces the entire innerHTML of `#root` — if the loader is inside, React wipes it before the observer can detect the mount.

```html
<div id="root"></div>
<div id="app-loader">...</div>
<script>
  const observer = new MutationObserver(() => {
    const root = document.getElementById('root');
    if (root && root.children.length > 0) {
      // fade out loader
    }
  });
  observer.observe(document.getElementById('root'), { childList: true });
</script>
```

---

## Part 5 — Frontend: Model Selector

A model selector was added to the chat input bar for agent chats. Shows current model with logo, opens a dropdown with two groups.

**Models:**

| ID | Group | Status |
|---|---|---|
| `mistral-large-latest` | Mistral | Active |
| `mistral-small-latest` | Mistral | Active |
| `codestral-latest` | Mistral | Active |
| `archelon-arca` | Archelon | Coming soon (disabled) |
| `archelon-tega` | Archelon | Coming soon (disabled) |

Archelon model names are derived from real prehistoric sea turtle species — `arca` (shell/vault) and `tega` (from Protostega, ancestor genus). Disabled models show `opacity-30 grayscale` — visually present but clearly unavailable.

Model logos: `/mistral.png`, `/Small.png`, `/Codestral.png`, `/Archelon_logo.png` — all in `frontend/public/`.

Currently frontend-only — `selectedModel` state exists but is not yet sent to the backend synthesizer.

---

## Part 6 — Frontend: TopNav Credits Indicator

Shows remaining tokens for the logged-in user in the top navigation bar.

```
Free Plan · Tokens: 24,850
```

- Fetches from `GET /api/chat/balance` on mount in `App.jsx`
- `refreshTokenBalance()` is called after every query response — TopNav updates in real time
- Guard against NaN: `Math.max(0, (token_limit ?? 25000) - (tokens_used ?? 0))`
- Shows `...` while loading

Token balance state lives in `App.jsx` and is passed as a prop to `TopNav` — single source of truth, no duplicate fetches.

---

## Part 7 — Frontend: Upgrade Modal

When token limit is reached (`402` from backend), a modal appears:

- Title: "You've used all your tokens"
- Body: "Upgrade your plan to keep chatting with Archelon and unlock more tokens."
- "Upgrade Plan" button (dummy — no billing yet)
- "Maybe later" dismiss

**Triggered by:**
- Sending a message → backend returns `402`
- Clicking `+` upload button when `showUpgradeModal` is true
- File select when `showUpgradeModal` is true
- Upload fails with token limit error

**Not triggered by:**
- Switching agents
- Opening any page
- Any passive navigation

---

## Part 8 — Frontend: Agent Switch During Active Query

If a user tries to switch agents while a query is in progress, a custom modal appears:

- "Response in progress"
- "Switch anyway" — clears busy state and proceeds with switch
- "Keep waiting" — dismisses modal, stays on current agent

Implementation:
- `ChatView` accepts `onRequestBusy` prop — calls `setChatBusy(true)` when fetch starts, `false` when response arrives or errors
- `App.jsx` tracks `chatBusy` state
- `handleSelectAgent` checks `chatBusy` — if true, stores agent in `pendingAgent` and shows modal instead of switching

---

## Part 9 — UI Polish

### ThinkingSteps Gap Fix

Gap between "Show thinking" collapsed row and the response below was too large (`space-y-6` = 24px). Fixed by adding `marginBottom: -18px` to the `ThinkingSteps` root div when collapsed:

```jsx
<div style={{ marginBottom: expanded ? '0' : '-18px' }}>
```

When expanded, normal spacing. When collapsed, pulls the response up closer.

### Settings Page Stale Agent Data

When navigating to Settings, the TopNav was still showing the previously selected agent's name, docs pill, and edit button. Fixed by passing `null` for `agentData` and `[]` for `documents` when `mode === 'settings'` or `mode === 'dashboard'`.

### Bug Report Button

Moved from a floating fixed button to the TopNav right-side button group. Icon-only, orange colour (`#f97316`), opens a dropdown modal anchored to `top-14 right-4` — not centered on screen.

### EditAgentView Processing Padding

Processing steps were sticking to the top bar with no padding. Added `pt-12` to the processing container.

### FileUpload Button Label

When uploading from `EditAgentView`, the button showed "Create Agent with X Documents". Added `mode` prop — shows "Update Agent with X Documents" when `mode="edit"`.

### Sidebar Active State in Light Mode

Active agent used `bg-[#2a2a2a]` which is invisible in light mode. Changed to `bg-gray-200 dark:bg-[#2a2a2a]`.

---

## Part 10 — Session Token Display

Below the chat input, agent chats show:

```
⚡ 245 session · 1,840 total
```

On hover, a popup shows:
- Input (Prompt + Instructions): X
- Output: X
- Total: X

**Session tokens** — accumulate from `data.token_usage.input_tokens + output_tokens` on each query response. Reset when switching agents.

**Agent total tokens** — fetched from `GET /api/chat/tokens/{agent_id}` on agent load. Increments live as queries are made.

---

## Files Modified

| File | What Changed |
|------|-------------|
| `db/token_usage_db.py` | New — insert_embedding_event, insert_query_event, get_user_token_balance, get_agent_total_tokens |
| `routers/chat.py` | Token balance check, query event logging, /api/chat/balance and /api/chat/tokens/{agent_id} endpoints |
| `routers/ingest.py` | Token balance check before upload, pass user_id to background task |
| `ingestion/ingestor.py` | Accept user_id param, insert embedding event at Step 6 |
| `pipeline/synthesizer.py` | Return input_tokens and output_tokens separately, estimate output from response content |
| `frontend/src/services/api.js` | New — centralised VITE_API_URL with warn instead of throw |
| `frontend/src/services/*.js` | All 4 service files import from api.js |
| `frontend/src/App.jsx` | tokenBalance state, refreshTokenBalance, chatBusy, pendingAgent, agent switch modal |
| `frontend/src/components/TopNav.jsx` | Accept tokenBalance prop, bug report button moved here, credits display |
| `frontend/src/components/ChatView.jsx` | Model selector, session/total token display, upgrade modal, onRequestBusy prop |
| `frontend/src/components/ThinkingSteps.jsx` | marginBottom fix for collapsed gap |
| `frontend/src/components/EditAgentView.jsx` | mode prop for FileUpload, pt-12 on processing container |
| `frontend/src/components/FileUpload.jsx` | mode prop — "Update Agent" vs "Create Agent" label, 2MB/6MB limits |
| `frontend/src/components/Sidebar.jsx` | Active state visible in light mode |
| `frontend/index.html` | Loading screen outside #root |

---

## Cost Analysis

Mistral Large pricing: $2/1M input tokens, $6/1M output tokens

**Typical query (1,037 input + 265 output):**
- Cost: ~$0.0000037
- In rupees: ~₹0.00031

**Free plan (25,000 tokens):**
- Worth approximately $0.00005 = ₹0.004 per user
- At 10,000 free users: ~$0.50 total cost to serve

**$10 Mistral credits:**
- Supports ~2,700 queries of typical size
- Supports ~200,000 free plan users at 25K tokens each

The free plan is essentially zero cost per user at current token pricing.

---

## Pending / Future Work

1. **Wire model selector to backend** — pass `selectedModel` in chat request, use in synthesizer
2. **Upgrade Plan button** — wire to actual billing (Stripe or manual)
3. **Conversation memory** — `user_message` and `agent_response` are saved in `token_usage`, ready to use as context
4. **Accurate token counting** — replace `len(text) // 4` with Mistral tokenizer
5. **Atomic token increment** — replace read-then-write with SQL atomic update for concurrent safety
6. **Docs per agent cap (10)** — planned, not implemented
7. **Agents per user cap (5)** — planned, not implemented
8. **Chat rate limit (20/min per user)** — planned, not implemented
