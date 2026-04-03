# Infrastructure & Cost Strategy Discussion

**Archelon — Architecture Decisions**  
Date: April 3, 2026  
Author: Ayush Rana

---

## How This Discussion Started

After a full session of building the retrieval pipeline and fixing ingestion bugs, we hit repeated Railway instability — 2.5 minute deploys, broken pipe errors, connection resets. The question came up: are these free tier limitations or real bugs? That led to a broader discussion about what constraints exist, what real companies use, and how to be smart about infrastructure spend without over-engineering.

---

## The First Question — What Are My Constraints?

We went through each service honestly:

**Vercel** — No real constraints for a React frontend. Free tier is what Vercel was built for. Even at thousands of users, a static React app on a global CDN doesn't need upgrading. Decision: never touch this.

**Railway** — Two real problems on free tier. First, $5/month credit exhausts if the backend runs continuously. Second, shared infrastructure means other users on the same machines — which is exactly why we saw 2.5 minute deploys and connection resets today. That wasn't a code bug. That was Railway's shared infra having a bad day.

**Supabase** — The sneaky one. 500MB storage fills fast with 1024-dimension vectors (~4KB per child chunk). But the real killer is the **inactivity pause** — if no one uses the DB for 7 days, Supabase puts it to sleep. First request after that takes 30+ seconds. Imagine a recruiter opening Archelon and seeing a blank screen for 30 seconds.

**Mistral** — 1 request/second on free tier. The pipeline makes 3-4 sequential LLM calls per chat message. Two users chatting simultaneously = requests queuing = visible delays = 429 errors showing up in the UI.

---

## The "Jugaad" Pushback

The response to the initial analysis was sharp: "This all feels like Jugaad or workaround. What do real product companies use?"

Fair point. So we separated two things:

1. What real companies use at scale
2. What makes sense right now given zero paying users

**What real companies use:**
- Database: AWS RDS / Aurora for large scale, Supabase Pro / Neon for startups. Supabase is actually used in production by serious companies — Resend, Pika, many YC startups. It's not a toy.
- Backend: AWS ECS or GCP Cloud Run at scale. Railway/Render/Fly.io for early stage.
- LLMs: Volume discounts with Mistral/OpenAI at scale, response caching for repeated queries.

**The honest answer:** The current stack is not Jugaad. Every serious startup begins on Vercel + Railway + Supabase + cheap LLM APIs. They upgrade when they have users, not before.

---

## The Real Goal — Demo Stability, Not Scale

Then the conversation got more specific. The actual problem isn't scale. It's: **"I don't want this to fail in front of recruiters and team leads."**

That's a completely different problem. Demo stability is much cheaper to solve than production scale.

What actually fails in front of a recruiter:
- Supabase inactivity pause → blank screen for 30 seconds
- Railway credit exhaustion → backend goes down mid-demo
- Mistral 429 → chat fails visibly with an error

What doesn't fail:
- Vercel (never)
- Supabase DB queries (once awake, fast)
- Railway backend (once running, stable enough for a demo)

---

## The Smart Workarounds Discussion

**Supabase inactivity pause** — The immediate response was: "I will play with it every day so no inactivity." That's the right call. No need to pay $25/month just to keep a DB awake when you're actively developing. The Pro plan becomes necessary only when you have real users who might not use it for 7 days.

**Railway memory spikes** — The insight here was sharp: "Cap file size to less than 1MB. Still workable on free." Exactly right. The Railway free tier memory limit causes problems when ingesting large files. Capping at 2MB (slightly more generous than 1MB to handle text-heavy PDFs) keeps memory usage low and eliminates the instability risk without paying anything.

**Mistral rate limits** — "Buying credits sounds good. I can't risk hallucinations or failure in front of recruiters." Adding $10 credits moves you to the paid tier automatically. Rate limit jumps from 1 req/sec to ~10 req/sec. At current usage (testing + demos), $10 lasts months.

---

## The Multiple API Keys Question

The question came up: what about using multiple Mistral API keys from different accounts to get around the 1 req/sec limit?

Technically it works — round-robin between keys, each account gets its own quota. So 3 accounts = 3 req/sec effectively.

But:
- Against Mistral's Terms of Service
- Fragile — if one account gets flagged, the pipeline breaks
- Management overhead — rotating keys, handling different account failures

The conclusion: **one paid account is the right answer.** $10 credits on one account gives ~10 req/sec which is more than enough for demos and early users. Clean, compliant, sufficient.

---

## The DB Caps Idea

The suggestion to add DB-level caps per agent and per user was a good one. The reasoning: one heavy user shouldn't be able to exhaust storage, Mistral credits, or Railway memory for everyone else.

Caps decided:

| What | Limit | Why |
|---|---|---|
| File size | 2MB | Keeps Railway memory safe |
| Documents per agent | 10 | Prevents storage abuse |
| Agents per user | 5 | Reasonable for early users |
| Chat requests | 20/minute per user | Prevents Mistral credit burn |

These are enforced in backend routers — no DB changes, no infrastructure cost.

---

## The Embedding Retry Gap

During the discussion, a real gap was identified: if embedding fails, there's currently no automatic retry of the whole document. The pipeline retries individual batches 3 times, then marks the document as error permanently.

This is a problem because transient 503 errors (like the overflow errors seen today) cause permanent failures even though a retry would succeed.

Fix identified — wrap the embedding step with exponential backoff:

```python
for attempt in range(3):
    try:
        embeddings = await embed_chunks(...)
        break
    except RuntimeError as e:
        if attempt == 2:
            raise
        await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s
```

Not implemented yet — flagged for next session.

---

## The Staged Infrastructure Model

The broader discussion landed on a staged model — don't buy infrastructure ahead of users, upgrade each layer exactly when it becomes the bottleneck.

**Right now (0 users, development):**
```
Vercel:    Free
Railway:   Free + 2MB file cap
Supabase:  Free + use daily
Mistral:   $10 credits on paid account
Total:     ~$10 one-time
```

**First 10 paying users:**
```
Vercel:    Free
Railway:   Hobby ($8-13/month) OR Hetzner VPS ($6/month)
Supabase:  Pro ($25/month) — inactivity pause now a real UX problem
Mistral:   Pay-per-use (~$5-10/month)
Total:     ~$40-50/month
```

At ₹999/month × 10 users = ₹9,990 revenue. Infrastructure ~₹4,200. Healthy.

**100 paying users:**
```
Total:     ~$85-125/month
Revenue:   ₹99,900/month
```

Very healthy margin.

---

## The Key Insight on Budgeting

The most important point from the discussion:

> "Don't optimise infrastructure before product-market fit. Every hour spent on infrastructure before you have paying users is wasted. The real question is not how do I make infrastructure cheaper — it's how do I get 10 paying users."

Infrastructure cost at ₹4,200/month is nothing if you have 10 paying users. The problem to solve is user acquisition, not infrastructure optimisation.

---

## What Real Production Looks Like (For Reference)

At serious scale (10,000+ users), a RAG platform would look like:

```
Frontend:     Vercel Pro or Cloudflare Pages
Backend:      AWS ECS or GCP Cloud Run (containerised, auto-scaling)
Database:     AWS RDS Postgres with pgvector OR Supabase Pro
LLM:          Mistral/OpenAI with volume discount + response caching
Queue:        Redis + Celery for ingestion jobs
Storage:      AWS S3 for raw document files
Monitoring:   Datadog or Grafana
```

We are not there. We don't need to be. The current stack is correct for the current stage.

---

## Decisions Summary

| Decision | What We Decided | Why |
|---|---|---|
| Supabase upgrade | No — use daily to avoid pause | Free is fine while actively developing |
| Railway upgrade | Maybe Hobby later, for now cap files at 2MB | Eliminates memory spike risk for free |
| Mistral upgrade | Yes — $10 credits on one paid account | Eliminates 429s, sufficient for demos |
| Multiple Mistral accounts | No | Against ToS, fragile, one paid account is enough |
| File size cap | 2MB | Keeps Railway stable on free tier |
| DB caps per user/agent | Yes — implement now | Prevents abuse, protects credits and storage |
| Embedding retry | Yes — implement next session | Handles transient failures gracefully |

---

## Demo Stability Checklist

Before showing Archelon to a recruiter or team lead:

- [ ] Confirm Supabase was used in the last 7 days
- [ ] Confirm Mistral credits are topped up
- [ ] Test the full flow 30 minutes before the demo
- [ ] Upload a test document and chat with it successfully
- [ ] Have a screen recording backup of the full flow working
