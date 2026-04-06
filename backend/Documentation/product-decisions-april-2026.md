# Product Thinking & Decisions Discussion

**Archelon — Architecture & Product Decisions**
Date: April 2026 (Post April 3)
Author: Ayush Rana

---

## How This Session Started

After the retrieval pipeline was working and validated, the focus shifted to making the product real — not just technically functional, but something that could be shown to founders, recruiters, and potential users. That meant three things: tracking usage, enforcing limits, and polishing the UI to a level where it doesn't feel like a demo.

---

## The Token Tracking Question

The first real product question was: how do we track tokens?

The initial instinct was to track per-agent — store a running total on the agent row. Simple, fast, one column update per query..

But then the system agent problem came up. System agents are shared across all users. If you only track by `agent_id`, you can't tell which user consumed what. Two users chatting with the same system agent would have their usage mixed together.

So `user_id` is needed in the `token_usage` table even though it feels redundant — you can get the user from the agent's owner. The redundancy is intentional. It makes per-user quota queries a single indexed lookup instead of a join.

The event-based model was chosen over a single running total per agent. The reasoning: a running total tells you nothing about when usage happened. An event log tells you everything — you can answer "how many tokens did this agent use today?" or "what was the most expensive query?" without any schema changes. The data is already there.

---

## The Source of Truth Question

At one point the question came up: should the frontend check token balance before sending a query, or should the backend be the gate?

The answer is both, but for different reasons.

The backend is the source of truth. Anyone can open DevTools, remove the frontend check, and send a request. The backend `402` is the real enforcement — it runs server-side, it checks the DB, it cannot be bypassed.

The frontend check is UX. It shows the upgrade modal immediately when the user opens an agent that's already exhausted, instead of making them type a message and wait for a response before seeing the error. It's a courtesy, not a security measure.

This is exactly how real AI products work. OpenAI checks your quota server-side on every request. The frontend just shows you a nice "you've run out of credits" screen based on what the API returns.

---

## The DNS Problem — A Lesson in Infrastructure

The most unexpected issue of this session was a user on Reliance broadband who couldn't access the Railway backend at all. The Vercel frontend loaded fine. The Railway API was completely unreachable.

The initial assumption was CORS, then browser extensions, then network issues. After running `nslookup` on his machine:

```
* reliance.reliance can't find archelon-production.up.railway.app: Query refused
```

Reliance's DNS was actively refusing to resolve Railway's domain. Not a timeout, not a failure — a deliberate refusal. This is an ISP-level block on Railway's infrastructure subdomain.

The insight here: `vercel.app` is a well-known domain that every DNS server in the world has cached. `up.railway.app` is not. Some ISPs block unknown infrastructure domains as a spam/abuse prevention measure.

The fix is a custom domain. Once you're on `api.archelon.aranixlabs.cloud`, you're on a domain you own, with standard DNS records, and no ISP has a reason to block it. This is why every serious product uses a custom domain — not just for branding, but for reliability.

The domain `aranixlabs.cloud` was already owned, so no purchase needed. Just two CNAME records.

---

## The Loading Screen Problem

The white flash on first visit was a classic React problem. The browser downloads the JS bundle, parses it, executes it, then React mounts. During that time — white screen.

The fix is simple: put a loader in `index.html` that shows before any JS runs. Pure HTML and CSS, no React needed.

The tricky part was the observer. The first implementation put the loader inside `#root` and watched for `children.length > 1`. But React's `createRoot().render()` replaces the entire innerHTML of `#root` — it doesn't add children, it replaces them. The loader got wiped before the observer could fire.

Fix: move the loader outside `#root`. Now React mounts inside `#root`, the observer sees children appear, and the loader fades out. Simple once you understand what React actually does to the DOM.

---

## The Model Selector Decision

Adding a model selector was a product decision, not just a UI feature. The reasoning:

Every serious AI product shows you what model you're using. ChatGPT shows GPT-4o vs GPT-4. Claude shows Sonnet vs Haiku. It signals transparency — you know what you're getting.

For Archelon, the model selector also sets up the future. The `archelon-arca` and `archelon-tega` entries are placeholders — named after real prehistoric sea turtle species (Archelon ischyros and Protostega). When Archelon eventually deploys its own models, the UI is already there. Users are already familiar with the concept. The transition from "Mistral models" to "Archelon models" becomes a product moment, not a technical migration.

The disabled state with `grayscale` and `opacity-30` was deliberate. Hiding the Archelon models entirely would be a missed opportunity. Showing them as "coming soon" creates anticipation and communicates the roadmap without making any promises.

---

## The Upgrade Modal Design

The upgrade modal needed to be non-annoying. The original instinct was to show it on every page load if tokens were exhausted. That was immediately rejected — nobody wants a modal every time they open a page.

The rule became: only show when the user tries to do something. Sending a message, clicking upload — these are intentional actions. Switching pages is not.

The "Maybe later" button was important. It lets users dismiss the modal and still browse their agents, look at documents, check settings. They just can't send messages or upload. This is the right UX — don't lock them out of the product entirely, just block the token-consuming actions.

The "Upgrade Plan" button is currently dummy. That's fine. The infrastructure for billing doesn't exist yet. But the modal is there, the 402 is there, the token tracking is there. When billing is ready, it's a one-line change to wire the button to a payment flow.

---

## The Agent Switch During Query Problem

This came up naturally during testing. You send a query, it's processing (3-5 seconds), you click another agent. The `ChatView` remounts with a new `key`, the in-flight fetch is abandoned, the response is lost.

Two approaches were considered:

**Option 1 — Move fetch to App.jsx.** The fetch survives agent switches because it's not tied to `ChatView`'s lifecycle. The response arrives and gets stored in `chatHistories` for the correct agent. Clean, correct, but a significant refactor.

**Option 2 — Block the switch with a confirmation.** Simpler. If a query is in progress, show a modal asking if the user wants to switch anyway. If they say yes, the response is lost but they made that choice consciously.

Option 2 was chosen for now. The browser's native `window.confirm` was rejected immediately — it's ugly and breaks the design language. A custom modal matching the upgrade modal style was built instead.

The `chatBusy` state lives in `App.jsx`. `ChatView` calls `onRequestBusy(true)` when a fetch starts and `onRequestBusy(false)` when it completes or errors. `handleSelectAgent` checks `chatBusy` before switching — if busy, stores the pending agent and shows the modal.

---

## The Cost Reality Check

A detailed cost analysis was done to understand what the free plan actually costs to serve.

Mistral Large: $2/1M input, $6/1M output.

A typical query (1,037 input + 265 output tokens) costs $0.0000037 — about ₹0.00031.

The entire 25,000 token free plan is worth approximately $0.00005 = ₹0.004 per user.

At 10,000 free users, the total cost to serve all of them is about $0.50.

This has a direct implication for the product strategy: the free plan can be generous. There's no financial risk in giving users 25,000 tokens. The real cost concern only starts with heavy enterprise users doing hundreds of queries per day on large document sets.

For a banking or service website deployment, a realistic session (10 queries, longer context) costs about $0.00007. At $10 budget, that's ~142,000 sessions. But real enterprise deployments don't use pay-per-token APIs — they self-host for data privacy and SLA reasons. That's the future Archelon enterprise play: on-premise deployment with Archelon's own models.

---

## What This Session Proved

The product is no longer a demo. It has:
- Real usage tracking
- Real quota enforcement
- Real error handling that doesn't expose internals to users
- A UI that communicates limits clearly without being annoying

The gap between "working demo" and "product someone would pay for" is smaller than it looks. The main missing pieces are billing integration and conversation memory — both of which have the infrastructure already in place.

---

## Decisions Summary

| Decision | What We Decided | Why |
|---|---|---|
| Token tracking model | Event-based (one row per query/embedding) | History, date filtering, no schema changes needed for new queries |
| user_id in token_usage | Yes, even though redundant | System agents are shared — can't derive user from agent alone |
| Token increment method | Direct read-then-write | No RPC dependency, works at current scale |
| Frontend token check | UX only, not security | Backend 402 is the real gate |
| Custom domain | api.archelon.aranixlabs.cloud | Fixes ISP DNS blocks, professional, uses existing domain |
| Loading screen placement | Outside #root | React replaces #root innerHTML — loader inside gets wiped |
| Model selector | Show Archelon models as disabled | Sets up future, creates anticipation, transparent roadmap |
| Upgrade modal trigger | Only on intentional actions | Non-annoying, respects user intent |
| Agent switch during query | Custom modal, not browser confirm | Consistent design language, user makes conscious choice |
| Free plan token limit | 25,000 tokens | Costs ~$0.00005 per user — essentially free to serve |
