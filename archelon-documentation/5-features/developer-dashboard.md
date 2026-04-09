# Developer Dashboard

**Archelon — Backend + Frontend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

The developer dashboard is a private analytics view visible only to users with `is_developer = true` in the `users` table. It shows platform-wide stats across all users and agents.

Access: TopNav → "View Dashboard" button (only visible when `user.is_developer === true` and no agent is selected).

---

## Backend

**File:** `backend/routers/dashboard.py`

**Endpoint:** `GET /api/dashboard/stats`

**Auth:** JWT required + `is_developer` check — returns 403 for non-developer users.

### Query Parameters

| Param | Type | Purpose |
|---|---|---|
| `date_from` | string (ISO) | Filter stats from this date |
| `date_to` | string (ISO) | Filter stats to this date |
| `user_id` | UUID | Filter to a specific user |
| `agent_id` | UUID | Filter to a specific agent |

### Response

```json
{
  "total_users": 12,
  "total_agents": 34,
  "total_documents": 89,
  "total_parent_chunks": 4521,
  "total_child_chunks": 18043,
  "total_tokens": 2847392,
  "embedding_cost_usd": 0.000285,
  "users": [...],
  "agents": [...]
}
```

### Exclusions

- System agents excluded from `total_agents` count and agent list
- Developer users (`is_developer = true`) excluded from `total_users` count and user list

### Enrichment

**Users list** — each user includes `agent_count` (number of agents they own), sorted descending.

**Agents list** — each agent includes `token_count` (sum of all token usage events) and `owner_name` (joined from users table), sorted descending by token count.

### Embedding Cost Calculation

```python
MISTRAL_EMBED_COST_PER_TOKEN = 0.10 / 1_000_000  # $0.10 per 1M tokens

embedding_tokens = sum of all embedding events' token counts
embedding_cost   = embedding_tokens * MISTRAL_EMBED_COST_PER_TOKEN
```

---

## Frontend

**File:** `frontend/src/components/DashboardView.jsx`

### Layout

1. **Tables row** (top) — Users table + Agents table side by side
2. **Stat cards** (below) — Platform row + Chunks row + Cost card

### Stat Cards

| Card | Value | Color |
|---|---|---|
| Users | Total non-developer users | Teal |
| Agents | Total non-system agents | Teal |
| Documents | Total documents | Teal |
| Parent Chunks | Total parent chunks | Teal |
| Child Chunks | Total child chunks | Teal |
| Total Chunks | Parent + Child combined | Teal |
| Embedding Cost | USD cost estimate | Red |

### Tables

**Users table** — Name, Username, Agents count (teal) — sorted desc by agent count

**Agents table** — Agent name, Owner, Tokens (teal) — sorted desc by token count

### Interactive Row Selection (Power BI style)

Clicking a row in either table filters all stat cards to that user/agent:
- Click user → agents table filters to that user's agents, cards show their stats
- Click agent → cards show that agent's stats
- Click same row again → deselects, restores full stats
- Only one selection at a time
- Re-fetches from backend with `user_id` or `agent_id` param — accurate server-side counts

### Date Filter

Date range inputs in the header filter all stats. Combined with row selection for drill-down analysis.

### Refresh Button

Spinning refresh icon in header — re-fetches all stats. Disabled while loading.

### Skeleton Loaders

Cards show animated pulse placeholders while data is loading — no blank flash.

---

## Access Control

The "View Dashboard" button in TopNav only renders when:
```jsx
user?.is_developer && !agentData && agentName !== 'Dashboard'
```

- Must be developer
- Must be on home page (no agent selected)
- Hides when already on dashboard

The backend independently checks `is_developer` on every request — frontend check is UX only, not security.

To grant dashboard access to a user, manually set `is_developer = true` in Supabase dashboard → users table.
