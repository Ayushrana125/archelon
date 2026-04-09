# Branching Strategy & Deployment Workflow

**Archelon — Infrastructure Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

Archelon uses a two-branch Git strategy to separate stable production code from active development.

| Branch | Purpose | Deployed To |
|---|---|---|
| `main` | Stable production code | Vercel (production) + Railway |
| `dev` | Active development, new features, testing | Vercel (preview) |

---

## Branch Structure

```
main  ← production, always stable
  │
  └── dev  ← all new work happens here
```

**Rule:** Never commit directly to `main`. All changes go to `dev` first, get tested, then merge to `main`.

---

## Daily Development Workflow

```bash
# Always work on dev
git checkout dev

# Make changes, then commit
git add -A
git commit -m "Your change description"
git push   # triggers Vercel preview deploy automatically
```

---

## Releasing to Production

When dev is tested and stable:

```bash
git checkout main
git merge dev
git push              # triggers production deploy on Vercel + Railway
git checkout dev      # go back to dev immediately
```

---

## Vercel Setup

Vercel automatically creates preview deployments for every branch.

**Production URL:** `archelon.cloud` → points to `main` branch

**Dev preview URL:** Vercel auto-generates something like `archelon-git-dev.vercel.app`

**To add a custom domain for dev preview:**
1. Go to Vercel dashboard → Project → Settings → Domains
2. Add `archelon-dev.cloud` (or any domain you own)
3. Under branch deployments, assign `archelon-dev.cloud` to the `dev` branch
4. Add DNS records at your domain registrar:
   ```
   Type: CNAME
   Name: @  (or archelon-dev)
   Value: cname.vercel-dns.com
   ```

---

## Custom Domain for Dev — archelon-dev.cloud

**Can you use your own domain for the dev preview?**

Yes — but you need to **own** `archelon-dev.cloud` as a separate domain. It cannot be a subdomain of `archelon.cloud` unless you control the DNS for that domain.

**Option 1 — Buy `archelon-dev.cloud`** (~$10-15/year)
- Clean separation — `archelon.cloud` = production, `archelon-dev.cloud` = dev
- Full control, works perfectly with Vercel

**Option 2 — Use a subdomain of `archelon.cloud`** (free, you already own it)
- `dev.archelon.cloud` → points to dev branch on Vercel
- Add a CNAME record: `dev` → `cname.vercel-dns.com`
- In Vercel, assign `dev.archelon.cloud` to the `dev` branch
- No extra cost, cleaner than buying a new domain

**Option 3 — Use Vercel's auto-generated preview URL** (free, no setup)
- `archelon-git-dev-ayush.vercel.app` — auto-generated, always works
- No custom domain needed, fine for internal testing

**Recommendation:** Use `dev.archelon.cloud` — you already own the domain, zero extra cost, looks professional.

---

## Railway — Backend Branching

Currently Railway only deploys from `main`. This means:

- `dev` frontend → hits production backend (`api.archelon.cloud`)
- This is fine for most frontend changes
- For backend changes on `dev`, you have two options:

**Option A — Test backend locally:**
```bash
cd backend
uvicorn main:app --reload --port 8001
```
Point dev frontend to `http://localhost:8001` via `.env.local`:
```
VITE_API_URL=http://localhost:8001
```

**Option B — Create a second Railway service for dev backend:**
- Railway dashboard → New Service → connect to same repo → set branch to `dev`
- Gets its own URL like `api-dev.archelon.cloud`
- More expensive (uses Railway credits) — only worth it when backend changes are complex

For now, Option A is sufficient.

---

## Environment Variables

**Production (Vercel — main branch):**
```
VITE_API_URL=https://api.archelon.cloud
```

**Dev preview (Vercel — dev branch):**
- Either point to production backend (fine for frontend-only changes)
- Or point to local/dev backend for backend changes

In Vercel dashboard → Project → Settings → Environment Variables, you can set different values per branch.

---

## Git Commands Reference

```bash
# Switch to dev
git checkout dev

# Create dev branch (first time only)
git checkout -b dev
git push -u origin dev

# Check which branch you're on
git branch

# Merge dev into main (release)
git checkout main
git merge dev
git push
git checkout dev

# Pull latest from remote
git pull

# See branch history
git log --oneline --graph --all
```

---

## What NOT to Do

- Never `git push` directly to `main` for new features
- Never test unfinished features on `main`
- Never merge to `main` without testing on dev first
- Don't delete the `dev` branch — it's permanent
