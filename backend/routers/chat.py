"""
chat.py — /api/chat endpoint.
Full pipeline: intent → query analysis → vector search → rerank → synthesize.

Single query:  1 vector search → rerank (1500 token budget) → synthesize
Multi query:   N parallel vector searches → merge → rerank (3000 token budget) → synthesize
Smalltalk:     direct LLM response, no retrieval
"""

import asyncio
import json
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, validator
from pipeline.intent_and_query import classify_and_analyse
from pipeline.smalltalk_agent import handle_smalltalk
from pipeline.retrieval.vector_search import vector_search
from pipeline.retrieval.reranker import rerank, SINGLE_BUDGET, MULTI_BUDGET
from pipeline.synthesizer import synthesize, synthesize_stream
from jwt_handler import verify_token
from db.token_usage_db import insert_query_event, get_user_token_balance, get_agent_total_tokens

router = APIRouter()

# ── Rate limiter — 20 requests per 60 seconds per user ──────────────────────
_rate_store: dict[str, list[float]] = defaultdict(list)

def check_rate_limit(user_id: str, limit: int = 20, window: int = 60):
    now = time.time()
    _rate_store[user_id] = [t for t in _rate_store[user_id] if now - t < window]
    if len(_rate_store[user_id]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    _rate_store[user_id].append(now)

# ── Prompt injection patterns ────────────────────────────────────────────────
INJECTION_PATTERNS = [
    "ignore all previous", "ignore previous instructions",
    "disregard your instructions", "disregard all instructions",
    "you are now", "act as if", "forget everything",
    "new instructions:", "system prompt:", "override instructions",
]

def sanitize_message(message: str) -> str:
    lower = message.lower()
    for pattern in INJECTION_PATTERNS:
        if pattern in lower:
            # Wrap as data so LLM treats it as user input, not instruction
            return f"[User message]: {message}"
    return message


class ChatRequest(BaseModel):
    message:            str
    agent_id:           str
    session_id:         str
    agent_name:         str = ""
    agent_description:  str = ""
    agent_instructions: str = ""

    @validator('message')
    def validate_message(cls, v):
        v = v.strip()
        if not v:
            raise ValueError('Message cannot be empty.')
        if len(v) > 2000:
            raise ValueError('Message too long. Maximum 2000 characters.')
        return v


@router.get("/chat/tokens/{agent_id}")
async def get_agent_tokens(agent_id: str, current_user: dict = Depends(verify_token)):
    total = await get_agent_total_tokens(agent_id)
    return {"agent_id": agent_id, "total_tokens": total}


@router.get("/chat/balance")
async def get_balance(current_user: dict = Depends(verify_token)):
    return await get_user_token_balance(current_user["user_id"])


@router.post("/chat")
async def chat(body: ChatRequest, current_user: dict = Depends(verify_token)):

    # ── Rate limit check ─────────────────────────────────────────────────────
    check_rate_limit(current_user["user_id"])

    # ── Sanitize message ──────────────────────────────────────────────────
    safe_message = sanitize_message(body.message)

    # ── Token balance check ─────────────────────────────────────────────────────
    balance = await get_user_token_balance(current_user["user_id"])
    if balance["tokens_remaining"] <= 0:
        raise HTTPException(status_code=402, detail="Token limit reached. Upgrade your plan to continue.")

    # ── Step 1: Classify intent + extract search queries (single LLM call) ────
    analysed       = await classify_and_analyse(
        user_message=safe_message,
        system_instructions=body.agent_instructions,
    )
    intent         = analysed.get("intent", "single")
    search_queries = analysed.get("search_queries") or [safe_message]

    # ── Step 2: Smalltalk — no retrieval needed ──────────────────────────────
    if intent == "smalltalk":
        answer = await handle_smalltalk(
            user_message=safe_message,
            agent_name=body.agent_name or "Assistant",
            agent_description=body.agent_description,
            agent_instructions=body.agent_instructions,
        )
        input_tokens  = len(safe_message) // 4
        output_tokens = len(answer) // 4
        await insert_query_event(
            agent_id=body.agent_id,
            user_id=current_user["user_id"],
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            user_message=safe_message,
            agent_response=answer,
        )
        return {
            "intent":         intent,
            "thinking":       "",
            "search_queries": [],
            "answer":         answer,
            "sources":        [],
            "token_usage":    {"input_tokens": input_tokens, "output_tokens": output_tokens, "total": input_tokens + output_tokens},
        }

    # ── Step 4: Vector search — parallel fan-out for multi queries ───────────
    search_tasks = [
        vector_search(query, body.agent_id, match_count=15)
        for query in search_queries
    ]
    all_results = await asyncio.gather(*search_tasks)

    # Merge all matches from all queries into one flat list
    merged_matches = [match for result in all_results for match in result]

    # ── Step 5: Rerank — deduplicate, gap filter, token budget ───────────────
    budget         = MULTI_BUDGET if intent == "multi" else SINGLE_BUDGET
    context_chunks = rerank(merged_matches, budget=budget)

    # ── Step 6: Synthesize — generate grounded answer ────────────────────────
    result = await synthesize(
        user_message=safe_message,
        context_chunks=context_chunks,
        agent_name=body.agent_name or "Assistant",
        agent_instructions=body.agent_instructions,
        search_queries=search_queries,
    )

    # ── Step 7: Log token usage ──────────────────────────────────────────────
    token_usage = result["token_usage"]
    print(f"[chat] Step 7 reached — token_usage={token_usage} agent={body.agent_id} user={current_user['user_id']}")
    await insert_query_event(
        agent_id=body.agent_id,
        user_id=current_user["user_id"],
        input_tokens=token_usage.get("input_tokens", 0),
        output_tokens=token_usage.get("output_tokens", 0),
        user_message=safe_message,
        agent_response=result["answer"],
    )

    return {
        "intent":          intent,
        "thinking":        analysed.get("thinking", ""),
        "search_thinking": analysed.get("search_thinking", ""),
        "search_queries":  search_queries,
        "answer":          result["answer"],
        "sources":         result["sources"],
        "token_usage":     result["token_usage"],
    }


@router.post("/chat/stream")
async def chat_stream(body: ChatRequest, current_user: dict = Depends(verify_token)):

    check_rate_limit(current_user["user_id"])
    safe_message = sanitize_message(body.message)

    balance = await get_user_token_balance(current_user["user_id"])
    if balance["tokens_remaining"] <= 0:
        raise HTTPException(status_code=402, detail="Token limit reached. Upgrade your plan to continue.")

    # Steps 1-5 run before streaming starts (same as /chat)
    analysed       = await classify_and_analyse(
        user_message=safe_message,
        system_instructions=body.agent_instructions,
    )
    intent         = analysed.get("intent", "single")
    search_queries = analysed.get("search_queries") or [safe_message]

    # Smalltalk — no retrieval, stream the smalltalk answer directly
    if intent == "smalltalk":
        answer = await handle_smalltalk(
            user_message=safe_message,
            agent_name=body.agent_name or "Assistant",
            agent_description=body.agent_description,
            agent_instructions=body.agent_instructions,
        )
        input_tokens  = len(safe_message) // 4
        output_tokens = len(answer) // 4
        await insert_query_event(
            agent_id=body.agent_id,
            user_id=current_user["user_id"],
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            user_message=safe_message,
            agent_response=answer,
        )

        async def smalltalk_stream():
            # Send metadata first so frontend can show ThinkingSteps
            yield f"data: {json.dumps({'type': 'meta', 'intent': intent, 'thinking': '', 'search_thinking': '', 'search_queries': []})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'token': answer})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'sources': [], 'token_usage': {'input_tokens': input_tokens, 'output_tokens': output_tokens, 'total': input_tokens + output_tokens}})}\n\n"

        return StreamingResponse(smalltalk_stream(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    search_tasks  = [vector_search(q, body.agent_id, match_count=15) for q in search_queries]
    all_results   = await asyncio.gather(*search_tasks)
    merged        = [m for result in all_results for m in result]
    budget        = MULTI_BUDGET if intent == "multi" else SINGLE_BUDGET
    context_chunks = rerank(merged, budget=budget)

    async def rag_stream():
        # Send metadata so frontend can render ThinkingSteps before tokens arrive
        yield f"data: {json.dumps({'type': 'meta', 'intent': intent, 'thinking': analysed.get('thinking', ''), 'search_thinking': analysed.get('search_thinking', ''), 'search_queries': search_queries})}\n\n"

        full_response = ""
        final_event   = None

        async for chunk in synthesize_stream(
            user_message=safe_message,
            context_chunks=context_chunks,
            agent_name=body.agent_name or "Assistant",
            agent_instructions=body.agent_instructions,
            search_queries=search_queries,
        ):
            # synthesize_stream yields raw SSE strings — parse and re-emit with type field
            raw = chunk.removeprefix("data: ").strip()
            if raw.startswith("[DONE]"):
                final_event = json.loads(raw[7:])
                token_usage = final_event["token_usage"]
                await insert_query_event(
                    agent_id=body.agent_id,
                    user_id=current_user["user_id"],
                    input_tokens=token_usage.get("input_tokens", 0),
                    output_tokens=token_usage.get("output_tokens", 0),
                    user_message=safe_message,
                    agent_response=full_response,
                )
                yield f"data: {json.dumps({'type': 'done', 'sources': final_event['sources'], 'suggested_questions': final_event.get('suggested_questions', []), 'token_usage': token_usage})}\n\n"
            else:
                parsed = json.loads(raw)
                token  = parsed.get("token", "")
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

    return StreamingResponse(rag_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
