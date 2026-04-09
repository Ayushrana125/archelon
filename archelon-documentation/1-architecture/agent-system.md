# Agent System

**Archelon — Backend + Frontend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

Agents are the core unit of Archelon. Each agent has a name, description, system instructions, and an isolated knowledge base (documents + chunks). Users create agents, upload documents to them, and chat with them.

There are two types of agents:
- **User agents** — created by a user, visible only to that user
- **System agents** — created by the developer (Ayush), visible to all users, marked with `is_system = true`

---

## Backend

### Files
- `backend/routers/agents.py` — all agent CRUD endpoints
- `backend/db/agents_db.py` — all DB queries for agents table

### Endpoints

| Endpoint | Method | Auth | What it does |
|---|---|---|---|
| `GET /api/agents` | GET | JWT | Returns user's agents + all system agents |
| `POST /api/agents` | POST | JWT | Creates a new agent |
| `PATCH /api/agents/{id}` | PATCH | JWT | Updates agent name/description/instructions |
| `DELETE /api/agents/{id}` | DELETE | JWT | Deletes agent and all its data |

### Get Agents — Merging User + System

```python
async def get_agents_by_user(user_id: str) -> list:
    db = get_supabase()
    user_agents   = db.table("agents").select("*").eq("user_id", user_id).execute().data
    system_agents = db.table("agents").select("*").eq("is_system", True).execute().data
    user_ids = {a["id"] for a in user_agents}
    merged = user_agents + [a for a in system_agents if a["id"] not in user_ids]
    return merged
```

System agents appear for every user. Deduplication prevents duplicates if the developer's own account is logged in.

### System Agents

`is_system = true` is set manually in Supabase dashboard. No API endpoint to set it — intentional, only the developer can create system agents.

**Arex** — the personal assistant system agent. Knows about Ayush Rana's experience, projects, and skills. Answers questions about Ayush. Can send resume via n8n webhook.

### Agent Ownership Check

Before any edit or delete, the backend verifies the agent belongs to the requesting user:

```python
agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
if not agent:
    raise HTTPException(status_code=404, detail="Agent not found")
```

`get_agent_by_id` filters by both `id` AND `user_id` — so even if someone knows another user's agent ID, they can't edit or delete it.

### Documents Endpoint

```
GET /api/agents/{agent_id}/documents
```

Returns all documents for an agent. For system agents, any logged-in user can fetch documents (not just the owner) — so all users can see Arex's documents in the DocsPanel.

---

## Frontend

### Sidebar

- System agents appear at the **top** of the agent list with a teal "System" badge
- User agents appear below
- Active agent highlighted with `bg-gray-200 dark:bg-[#2a2a2a]`
- Collapsed state shows a hamburger icon to expand

### Edit Button

Edit button in TopNav is shown only when:
```jsx
agentData && (!agentData.is_system || agentData.user_id === user?.id)
```

- Regular agents → always shows edit
- System agents → only shows edit if logged-in user owns it (i.e. Ayush)
- Other users → no edit button on system agents

### Agent Selection Flow

When user clicks an agent in the sidebar:
1. `handleSelectAgent` in `App.jsx` fires
2. Sets `agentData`, `activeAgentId`, mode to `'arex'`
3. If no chat history for this agent → fires silent "Hi" greeting
4. `isGreetingLoading` becomes true → spinning logo shows
5. Greeting response arrives → logo settles, message renders

### Chat History

Chat histories are stored in React state (`chatHistories` in `App.jsx`) keyed by `agentId`. They persist for the session but reset on page refresh — no DB persistence for chat messages currently.

### Agent Creation Flow

1. User fills name, description, instructions in `CreateAgentView`
2. Optionally uploads documents in `FileUpload`
3. `POST /api/agents` creates the agent
4. `POST /api/ingest` uploads documents (if any)
5. Agent appears in sidebar

### Double-Click Prevention

Both "Create Agent" and "Upload Documents" buttons disable immediately on first click and show loading text — prevents duplicate agents or duplicate document uploads.

---

## Supabase Agents Table

```sql
CREATE TABLE agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  instructions TEXT,
  model        TEXT DEFAULT 'mistral-small-latest',
  is_system    BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_agents_user_id ON agents(user_id);
```

`ON DELETE CASCADE` — deleting a user automatically deletes all their agents, which cascades to documents, chunks, and token usage.

---

## Model Selection

Each agent has a `model` column. The frontend `ModelSelector` component lets users choose:

| Model | Group | Status |
|---|---|---|
| `mistral-large-latest` | Mistral | Active |
| `mistral-small-latest` | Mistral | Active |
| `codestral-latest` | Mistral | Active |
| `archelon-arca` | Archelon | Coming soon |
| `archelon-tega` | Archelon | Coming soon |

Currently `selectedModel` is frontend state only — not yet sent to the backend synthesizer. The backend always uses `mistral-large-latest`.

---

## Key Decisions

| Decision | What | Why |
|---|---|---|
| System agents visible to all | `is_system = true` fetched for every user | Arex should be available to all users as a demo |
| Owner can edit system agents | `user_id === user?.id` check | Developer needs to update Arex's instructions |
| No chat history in DB | React state only | Conversation memory is a future feature |
| Agent isolation | `user_id` filter on all queries | One user's agents never appear in another's list |
