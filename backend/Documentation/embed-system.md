# Embed System

**Archelon — Backend + Frontend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

The embed system allows Archelon users to deploy their agents as chat widgets on any external website. A user generates an API key for their agent, copies a script tag, and pastes it on their website. Visitors on that website can then chat with the agent directly.

The system has three parts:
1. **Backend** — API key management, public chat endpoint, info endpoint
2. **embed.js** — self-contained vanilla JS widget served from the backend
3. **EmbedModal** — the frontend UI for configuring and deploying the widget

---

## Architecture

```
Archelon Dashboard (user)
  → EmbedModal → POST /api/embed/{agentId}/generate → stores key hash in DB
  → copies script tag

Customer's website (visitor)
  → <script src="https://api.archelon.cloud/embed.js"> loads widget
  → widget fetches GET /api/public/info (name, logo, theme)
  → visitor sends message
  → widget calls POST /api/public/chat/stream with X-Archelon-Key header
  → backend validates key, checks origin, runs full RAG pipeline
  → streams response back to widget
```

---

## Part 1 — Backend

### DB Schema — `api_keys` table

```sql
CREATE TABLE api_keys (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id        uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key_hash        text NOT NULL UNIQUE,
  key_prefix      text NOT NULL,
  allowed_origins text[] DEFAULT '{}',
  widget_name     text,
  theme           text DEFAULT 'light',
  logo_url        text,
  max_input_chars  integer DEFAULT 2000,
  max_output_tokens integer DEFAULT 500,
  created_at      timestamptz DEFAULT now(),
  last_used_at    timestamptz
);
```

**Key design decisions:**
- **Presence = active, absence = disabled** — no `is_active` column. A row existing means the widget is live. Disabling deletes the row. Re-enabling inserts a new row.
- **Hash stored, raw shown once** — `key_hash` is `sha256(raw_key)`. The raw key is shown to the user exactly once on generation and never stored. If lost, user must generate a new key.
- **One key per agent** — generating a new key for an agent that already has one replaces it (old row deleted, new row inserted).

### `db/api_keys_db.py`

| Function | What it does |
|---|---|
| `generate_api_key()` | Creates `arch_live_` prefixed key, stores hash, returns raw key |
| `validate_api_key()` | Hashes incoming key, looks up in DB, returns key record or None |
| `get_key_by_agent()` | Returns key record for an agent (without hash) |
| `update_key_settings()` | Updates widget_name, allowed_origins, theme, logo_url, limits |
| `delete_api_key()` | Deletes the row — disables the widget |

### `routers/embed.py`

**Private endpoints (JWT auth — Archelon dashboard users):**

| Endpoint | Method | What it does |
|---|---|---|
| `/api/embed/{agent_id}` | GET | Returns embed status — enabled, widget_name, domains, theme, logo_url, limits |
| `/api/embed/{agent_id}/generate` | POST | Generates API key, stores hash, returns raw key once |
| `/api/embed/{agent_id}/settings` | PATCH | Updates widget_name, domains, theme, logo_url, limits |
| `/api/embed/{agent_id}` | DELETE | Deletes key row — disables widget |
| `/api/embed/{agent_id}/logo` | POST | Uploads logo to Supabase Storage, saves URL |

**Public endpoints (API key auth — widget on customer websites):**

| Endpoint | Method | What it does |
|---|---|---|
| `/api/public/info` | GET | Returns widget name, logo_url, theme for the API key |
| `/api/public/chat/stream` | POST | Full RAG pipeline, SSE streaming, authenticated by X-Archelon-Key header |

### `_validate_public_request()` helper

Every public endpoint call goes through this helper:
1. Reads `X-Archelon-Key` header
2. Hashes it and looks up in `api_keys`
3. Checks `allowed_origins` against `Origin` header (if whitelist is non-empty)
4. Returns key record or raises 401/403

### Logo Upload

Logo uploads go through the backend, not directly from frontend to Supabase:
- `POST /api/embed/{agent_id}/logo` — validates file type (png/jpg/jpeg/webp/svg), max 500KB
- Uploads to Supabase Storage bucket `widget-logos` (public bucket)
- Saves the public URL to `api_keys.logo_url`
- Returns `{ logo_url: "https://..." }`

### Public Chat Pipeline

`POST /api/public/chat/stream` runs the full pipeline:
1. Validate API key + origin
2. Rate limit (per API key)
3. Token balance check (402 if exhausted)
4. `classify_and_analyse()` — intent + search queries
5. If smalltalk → stream directly
6. If RAG → vector search → rerank → `synthesize_stream()`
7. Fetches real agent instructions from DB via `agents_db.get_agent_by_id()`
8. `max_output_tokens` from key record passed to synthesizer
9. Token usage logged to `token_usage` table

**Key difference from `/api/chat/stream`:** No JWT — authenticated by API key. Agent instructions fetched from DB (not from request body). `max_output_tokens` respected from key settings.

---

## Part 2 — embed.js Widget

Self-contained vanilla JS file served at `GET /embed.js` from the FastAPI backend. No dependencies, no build step, works on any website with a single script tag.

### Script tag

```html
<script>
  window.ArchelonConfig = {
    agentId: "YOUR_AGENT_ID",
    apiKey: "arch_live_YOUR_KEY"
  };
</script>
<script src="https://api.archelon.cloud/embed.js" async></script>
```

`name` is intentionally NOT in the config — the widget fetches it from `/api/public/info` using the API key. This means the widget always shows the current name from the DB, not a hardcoded value.

### Load Sequence

1. Script executes — injects CSS + HTML into page
2. FAB starts hidden (`opacity: 0`, `pointer-events: none`)
3. Fires `GET /api/public/info` and `fetchSampleQuestions()` in parallel
4. Info resolves → sets `NAME`, `LOGO`, `THEME` → FAB fades in (`fab.classList.add('ready')`)
5. Sample questions resolve → chips appear on pre-chat screen

FAB is never visible until info fetch settles — no flash, no wrong logo.

### Pre-chat Screen

Shown before the first message is sent:
- Top right: theme toggle (moon/sun icon) + close button
- Center: agent logo in circle (no border, no background — pure image clipped to circle)
- Below logo: agent name
- Green "Online" dot
- Rotating greeting from 5 random phrases
- 3 sample question chips (fetched from backend via a silent RAG call)

### Chat Transition

When user sends first message:
- Pre-chat screen hides
- Header becomes visible (logo + name + Online indicator + new chat button)
- Messages area shows
- Disclaimer shows

### FAB Design

Horizontal pill shape:
- Black background (`#0a0a0a`), white border (`rgba(255,255,255,0.18)`), deep black glow
- Left: agent logo clipped to circle (no ring, no background — just the image)
- Right: "Ask {Name}" text (closed state) / "Close" text (open state)
- Starts hidden, fades in after info fetch

### Thinking Steps (Bubble-based)

Steps appear as real bot chat bubbles in the message area — not a static overlay. Each step has the bot avatar, same bubble style as regular messages.

- Step 1 ("Analyzing your request") appears immediately on send
- For RAG: steps 2-4 appear one by one at 1100ms intervals
- Active step has green pulsing dot + animated `...` dots
- Completed steps fade to gray
- All step bubbles removed when `clearSteps()` is called on `done` event

Steps:
1. Analyzing your request
2. Identifying key details
3. Finding relevant information
4. Reviewing gathered information

### Send Button

- Arrow up icon (↑) in normal state
- Ring spinner animation when loading (`loading` CSS class)
- Restores to arrow on `done`/error

### Markdown Parsing

`parseMarkdown()` function handles:
- Code blocks (` ``` `)
- Inline code
- Headers (`#`, `##`, `###`)
- Bold + italic (`**`, `***`)
- Unordered lists (`-`, `*`)
- Ordered lists (`1.`, `2.`)
- Links (`[text](url)`)
- Line breaks

Full answer rendered with `parseMarkdown` once on `done` event — tokens accumulate silently to avoid markdown corruption during partial streaming.

### Dark/Light Theme

- Default: `light` (from DB setting)
- Toggle button in pre-chat screen top-right
- `root.classList.toggle('dark', THEME === 'dark')` — CSS class switches all colors
- Theme from DB applied on load via info fetch

### Message Actions

Every bot response has:
- 👍 Thumb up (locks on click, prevents double-vote)
- 👎 Thumb down (locks on click, prevents double-vote)
- Copy button (copies raw text, shows checkmark for 1.5s)

### Smart Window Positioning

Widget window positions itself relative to the FAB:
- Prefers opening above FAB if space allows
- Falls back to below if not enough space above
- Clamps to viewport edges on both axes
- Repositions on window resize

### Mobile

On screens ≤ 480px: widget takes full screen (`100% × 100dvh`), no border radius.

---

## Part 3 — EmbedModal Frontend

`frontend/src/components/EmbedModal.jsx` — the configuration UI in the Archelon dashboard.

### State

| State | Purpose |
|---|---|
| `enabled` | Whether embed is active |
| `savedName` | Widget display name |
| `apiKey` | `null` = not generated, `'masked'` = generated but hidden, raw string = just generated |
| `keyJustGenerated` | Shows the one-time key reveal overlay |
| `domains` | Allowed origins whitelist |
| `theme` | `'light'` or `'dark'` |
| `logoUrl` | Custom logo URL from Supabase Storage |
| `maxInputChars` | Max visitor message length |
| `maxOutputTokens` | Max response length |
| `fetchDone` | Whether initial status fetch has resolved (prevents toggle flash) |
| `editMode` | Whether settings card is in edit mode |
| `originalSettings` | Snapshot of settings when edit mode starts (for change detection) |
| `hasChanges` | Whether any setting differs from `originalSettings` |

### Prefetch on Login

`App.jsx` fetches embed status for all non-system agents in parallel on login:

```javascript
Promise.all(
  deployable.map(a => fetch(`/api/embed/${a.id}`).then(r => r.json()))
).then(results => setEmbedStatuses(map));
```

When `EmbedModal` opens, `prefetchedStatus` prop is already populated — `fetchDone` is set to `true` immediately, toggle shows correct state with zero delay.

### Edit/Save Mode

Settings card is read-only by default. Clicking anywhere on the card enters edit mode. In edit mode:
- All fields become editable
- "Cancel" button appears (click outside also cancels)
- "Save Changes" button appears (only enabled when `hasChanges` is true)
- Save calls `PATCH /api/embed/{agentId}/settings`, exits edit mode on success

### Key Reveal Overlay

When a key is generated, a blocking overlay appears inside the modal:
- Shows the raw key in a green monospace box
- "Copy & Close" button — copies to clipboard and dismisses
- "I've saved it" button — dismisses without copying
- Warning: key cannot be recovered after dismissal

### Live Preview

Left panel of the modal:
- When `apiKey !== 'masked'` (just generated): live iframe with actual widget running
- When `apiKey === 'masked'` (already existed): "Widget is live" pulsing green dot state

### Disable Confirmation

Disabling shows a confirmation modal explaining that the current API key will be revoked and any website using it will stop working immediately.

---

## Files Modified

| File | What Changed |
|---|---|
| `backend/db/api_keys_db.py` | New — generate, validate, get, update, delete |
| `backend/routers/embed.py` | New — all private + public endpoints |
| `backend/embed.js` | New — full self-contained widget |
| `backend/main.py` | Serves embed.js and Archelon_logo.png as FileResponse with no-cache headers |
| `backend/routers/ingest.py` | Added logo upload endpoint |
| `backend/pipeline/synthesizer.py` | Added max_output_tokens param |
| `frontend/src/components/EmbedModal.jsx` | Full rewrite — real API calls, edit/save mode, prefetch support |
| `frontend/src/App.jsx` | embedStatuses state, parallel prefetch on login, onEmbedStatusChange |
| `frontend/src/components/TopNav.jsx` | Passes embedStatuses + onEmbedStatusChange to EmbedModal |
| `frontend/src/components/DeploymentsView.jsx` | Rewritten — real deployment overview using embedStatuses |

---

## Key Decisions

| Decision | What | Why |
|---|---|---|
| Presence = active | No is_active column | Cleaner — row exists = live, deleted = disabled |
| Hash stored, raw shown once | SHA256 of raw key | Security — even if DB is compromised, keys can't be extracted |
| Name not in script tag | Fetched from DB via API key | Always reflects current DB value, no stale config |
| Tokens accumulate silently | No streaming in widget | Markdown renders correctly only on complete text |
| Logo upload through backend | Not direct to Supabase | Backend controls validation, naming, and URL format |
| FAB hidden until info fetch | opacity 0 until ready | Eliminates logo flash — user only sees widget with correct logo |
| Sample questions via silent RAG call | Not hardcoded | Always relevant to the agent's actual documents |
