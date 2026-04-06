# Pipeline & UX Improvements

**Archelon — Backend + Frontend Documentation**
Date: April 2026
Author: Ayush Rana

---

## Overview

This document covers all improvements made after the streaming implementation:

1. **Merged intent + query pipeline** — single LLM call replaces two sequential calls
2. **Auto-greeting via stream** — agent greeting goes through full stream pipeline
3. **Scroll lock + down arrow** — users can scroll up while answer streams
4. **Smalltalk animation fix** — no flash, no replay on agent switch
5. **Input send block** — users can type but not send while agent is responding

---

## 1. Merged Intent + Query Pipeline

### Problem

The v1 pipeline made two sequential LLM calls before retrieval:

```
classify_intent()  → Mistral call (~800ms)
analyse_query()    → Mistral call (~700ms)
vector search      → (~500ms)
```

Total before first token: ~2 seconds just in LLM overhead.

### Solution

Created `pipeline/intent_and_query.py` with a single `classify_and_analyse()` function that returns all fields in one call:

```python
{
  "intent":          "single" | "multi" | "smalltalk",
  "thinking":        "User is asking about X",
  "search_thinking": "Let's search for X from the documents",
  "search_queries":  ["keyword 1", "keyword 2"]
}
```

One LLM call instead of two. Saves ~700-900ms on every query.

### Archive

Old files preserved in `pipeline/archive_v1_pipeline/`:
- `intent_classifier.py`
- `query_analyser.py`

These are not imported anywhere — kept for reference only.

### Files Changed

| File | Change |
|---|---|
| `pipeline/intent_and_query.py` | New — merged classify + analyse |
| `pipeline/archive_v1_pipeline/intent_classifier.py` | Archived v1 |
| `pipeline/archive_v1_pipeline/query_analyser.py` | Archived v1 |
| `routers/chat.py` | Both `/chat` and `/chat/stream` now use `classify_and_analyse()` |

---

## 2. Auto-Greeting via Stream

### Problem

When a user clicked an agent for the first time, `App.jsx` fired a manual `fetch('/api/chat', ...)` with `message: 'Hi'`. This used the old non-streaming endpoint, returned a static string, and showed it as a plain assistant message — no typewriter, no thinking steps, inconsistent with the rest of the chat.

### Solution

- `App.jsx` `handleSelectAgent` now just sets `chatHistories[agent.id] = []` and does nothing else
- `ChatView` has a `useEffect` on `agentData?.id` — when `messages.length === 0`, calls `handleSend('Hi', true)`
- `silent = true` skips adding the "Hi" user bubble — greeting appears to come from the agent
- Goes through the full `/api/chat/stream` pipeline — smalltalk intent → hidden bubble → typewriter animation

### Input Blocking During Greeting

`isBusy` includes `isGreetingLoading` — send button and Enter key are blocked while greeting streams in. Textarea stays enabled so users can type ahead.

### Files Changed

| File | Change |
|---|---|
| `frontend/src/App.jsx` | Removed manual greeting fetch, just sets empty history |
| `frontend/src/components/ChatView.jsx` | Added greeting useEffect, `silent` param on `handleSend` |

---

## 3. Scroll Lock + Down Arrow

### Problem

During streaming, `messagesEndRef.scrollIntoView()` fired on every token — every new word pushed the user back to the bottom. Users couldn't scroll up to re-read earlier messages while the answer was streaming.

### Solution

Added scroll tracking with `onScroll` handler on the scroll container:

```javascript
const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
setUserScrolledUp(distFromBottom > 100);
```

- If user is within 100px of bottom → auto-scroll continues normally
- If user scrolls up more than 100px → auto-scroll stops
- A semi-transparent circular button appears (bottom-right) with a chevron-down icon
- Clicking it scrolls back to bottom and re-enables auto-scroll
- Sending a new message resets `userScrolledUp` to false

### Down Arrow Button Style

```
Background: rgba(30,30,30,0.55)
Backdrop blur: 6px
Border: 1px solid rgba(255,255,255,0.15)
Position: fixed, bottom-36, right-8
Size: 36×36px circle
```

### Files Changed

| File | Change |
|---|---|
| `frontend/src/components/ChatView.jsx` | `userScrolledUp` state, `scrollContainerRef`, `handleScroll`, down arrow button |

---

## 4. Smalltalk Animation Fix

### Problem — Flash Before Typewriter

Smalltalk sends the full answer as one token (not word-by-word like RAG). The streaming bubble showed the full text immediately, then when committed to messages as `role: 'smalltalk'`, `TypewriterMessage` reset to empty and re-animated. User saw: full text flash → blank → types out again.

### Fix

Smalltalk streaming bubble is marked `hidden: true`:
- Content accumulates silently in `streamingMsg` state
- Only a spinning logo placeholder is shown while loading
- On `done` event, full content commits as `role: 'smalltalk'`
- `TypewriterMessage` starts from empty — no flash, clean animation

### Problem — Typewriter Replays on Agent Switch

`ChatView` remounts on every agent switch (`key={agentData?.id}`). `TypewriterMessage` always animates on mount — so switching away and back replayed the animation.

### Fix

- `onComplete` callback marks the message with `skipAnimation: true` in `chatHistories`
- `TypewriterMessage` accepts a `skip` prop — when true, renders full content instantly
- Since `chatHistories` lives in `App.jsx` state, `skipAnimation: true` persists across remounts

### Files Changed

| File | Change |
|---|---|
| `frontend/src/components/ChatView.jsx` | `hidden` flag on smalltalk stream, `skipAnimation` on commit, `skip` prop wired |

---

## 5. Input Send Block

### Behaviour

While any response is in progress (greeting, smalltalk, RAG streaming, document processing):
- Textarea stays **enabled** — users can type their next message
- Send button is **disabled** (opacity 30%, not clickable)
- Enter key is **blocked** — does not fire `handleSend`

`isBusy` covers all cases:
```javascript
const isBusy = isTyping || !!streamingMsg || isProcessingDoc || isGreetingLoading;
```

### Files Changed

| File | Change |
|---|---|
| `frontend/src/components/ChatView.jsx` | `isBusy` on send button disabled + Enter key guard, textarea stays enabled |

---

## Streaming Logo Fix

The spinning Archelon logo on the streaming bubble never stopped because `streamingMsg` was always non-null while it was visible.

Fix: added `streaming: true/false` flag on `streamingMsg`. Logo spins while `streaming: true`, stops the moment the `done` event fires — before the 120ms commit timeout.

```javascript
// On token
setStreamingMsg({ id: sid, content: token, streaming: true });

// On done
setStreamingMsg(prev => ({ ...prev, sources, streaming: false }));
```
