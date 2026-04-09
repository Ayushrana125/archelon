# Git & Project Setup

**Archelon — Infrastructure Documentation**
Date: April 2026
Author: Ayush Rana

---

## Repository Structure

```
archelon/                          ← single Git repo root
├── backend/                       ← FastAPI backend
│   ├── db/                        ← all Supabase DB queries
│   │   ├── supabase_client.py     ← Supabase connection
│   │   ├── agents_db.py
│   │   ├── api_keys_db.py
│   │   ├── chunks_db.py
│   │   ├── documents_db.py
│   │   ├── token_usage_db.py
│   │   └── users_db.py
│   ├── ingestion/                 ← document processing pipeline
│   │   ├── chunker.py
│   │   ├── document_parser.py
│   │   ├── embedding_service.py
│   │   └── ingestor.py
│   ├── pipeline/                  ← RAG pipeline
│   │   ├── archive_v1_pipeline/   ← old files kept for reference
│   │   ├── retrieval/
│   │   │   ├── reranker.py
│   │   │   └── vector_search.py
│   │   ├── intent_and_query.py
│   │   ├── smalltalk_agent.py
│   │   └── synthesizer.py
│   ├── routers/                   ← FastAPI route handlers
│   │   ├── agents.py
│   │   ├── auth.py
│   │   ├── chat.py
│   │   ├── dashboard.py
│   │   ├── embed.py
│   │   └── ingest.py
│   ├── Documentation/             ← all documentation files
│   ├── embed.js                   ← public widget served at GET /embed.js
│   ├── jwt_handler.py
│   ├── main.py                    ← FastAPI app entry point
│   ├── Procfile                   ← Railway start command
│   ├── requirements.txt
│   └── .python-version            ← pins Python 3.11 for Railway
└── frontend/                      ← React + Vite frontend
    ├── public/                    ← static assets (logos, screenshots)
    ├── src/
    │   ├── assets/fonts/          ← Satoshi + Zodiak web fonts
    │   ├── components/            ← all React components
    │   ├── hooks/
    │   ├── services/              ← API service layer
    │   │   ├── api.js             ← centralised VITE_API_URL
    │   │   ├── agent_service.js
    │   │   ├── auth_service.js
    │   │   ├── document_service.js
    │   │   └── ingest_service.js
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── .env.local                 ← local dev env vars (not committed)
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vercel.json
```

---

## Git Branches

| Branch | Purpose | Deployed To |
|---|---|---|
| `main` | Stable production code | Vercel (production) + Railway |
| `dev` | Active development | Vercel (preview) |

**Rule:** Never commit directly to `main`. All work goes to `dev` first.

### Daily Workflow
```bash
git checkout dev
# make changes
git add -A
git commit -m "description"
git push   # triggers Vercel preview deploy
```

### Releasing to Production
```bash
git checkout main
git merge dev
git push              # triggers production deploy
git checkout dev      # go back to dev
```

---

## Environment Variables

### Backend (Railway + `backend/.env`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `MISTRAL_API_KEY_1` | Mistral AI API key |
| `JWT_SECRET_KEY` | Signs and verifies JWT tokens |

### Frontend (Vercel + `frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend URL — `http://127.0.0.1:8000` locally, `https://api.archelon.cloud` in production |

`.env.local` is in `.gitignore` — never committed. Set `VITE_API_URL` in Vercel dashboard for production.

---

## Deployment

### Backend — Railway

- Connected to GitHub `main` branch
- Auto-deploys on every push to `main`
- Python version pinned to 3.11 via `.python-version` file
- Start command in `Procfile`: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Custom domain: `api.archelon.cloud`

### Frontend — Vercel

- Connected to GitHub `main` branch
- Auto-deploys on every push to `main`
- Preview deployments on every push to `dev`
- Custom domain: `archelon.cloud`
- `vercel.json` handles SPA routing (all routes → `index.html`)

---

## Initial Setup History

The project started as two separate folders:
- `Arex - Ayush Rana's Personal Assistant/` — frontend
- `archelon-backend/` — backend

These were reorganised into a single `archelon/` repo with `frontend/` and `backend/` subfolders. The frontend had a nested `.git` folder (created by Vite) which caused it to appear as a Git submodule on GitHub. Fixed by deleting `frontend/.git` and re-adding as a regular folder.

A Mistral API key was accidentally committed in a Jupyter notebook (`Langchainpractice.ipynb`). The notebook was removed and the key was revoked and regenerated.

---

## Running Locally

**Backend:**
```bash
cd backend
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`.

`.env.local` must have `VITE_API_URL=http://127.0.0.1:8000` for local frontend to hit local backend.

---

## .gitignore

**Backend** ignores: `__pycache__/`, `*.pyc`, `.env`, `venv/`, `.venv/`

**Frontend** ignores: `node_modules/`, `dist/`, `.env`, `.env.local`, `*.local`
