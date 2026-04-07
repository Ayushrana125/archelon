"""
embed.py — Embed deployment endpoints.

Private endpoints (JWT auth):
  POST   /api/embed/{agent_id}/generate  — generate API key
  PATCH  /api/embed/{agent_id}/settings  — update widget name + allowed origins
  DELETE /api/embed/{agent_id}           — disable embed (delete key)
  GET    /api/embed/{agent_id}           — get embed status for agent

Public endpoint (API key auth):
  POST   /api/public/chat                — widget chat, called from embedded sites
"""

import asyncio
import json
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from jwt_handler import verify_token
from db.api_keys_db import generate_api_key, get_key_by_agent, validate_api_key, update_key_settings, delete_api_key
from db import agents_db
from db.token_usage_db import get_user_token_balance, insert_query_event
from pipeline.intent_and_query import classify_and_analyse
from pipeline.smalltalk_agent import handle_smalltalk
from pipeline.retrieval.vector_search import vector_search
from pipeline.retrieval.reranker import rerank, SINGLE_BUDGET, MULTI_BUDGET
from pipeline.synthesizer import synthesize_stream

router = APIRouter()

# ── Rate limiter for public endpoint — 10 req/min per API key ────────────────
_public_rate_store: dict[str, list[float]] = defaultdict(list)

def check_public_rate_limit(key_id: str, limit: int = 30, window: int = 60):
    now = time.time()
    _public_rate_store[key_id] = [t for t in _public_rate_store[key_id] if now - t < window]
    if len(_public_rate_store[key_id]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests.")
    _public_rate_store[key_id].append(now)


# ── Rate limiter per visitor IP ───────────────────────────────────────────────
_ip_rate_store_min: dict[str, list[float]] = defaultdict(list)
_ip_rate_store_day: dict[str, list[float]] = defaultdict(list)

IP_LIMIT_PER_MIN = 5
IP_LIMIT_PER_DAY = 10  # TEST VALUE — raise before production

def check_ip_rate_limit(ip: str):
    now = time.time()
    # Per minute
    _ip_rate_store_min[ip] = [t for t in _ip_rate_store_min[ip] if now - t < 60]
    if len(_ip_rate_store_min[ip]) >= IP_LIMIT_PER_MIN:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    # Per day
    _ip_rate_store_day[ip] = [t for t in _ip_rate_store_day[ip] if now - t < 86400]
    if len(_ip_rate_store_day[ip]) >= IP_LIMIT_PER_DAY:
        raise HTTPException(status_code=429, detail="Daily message limit reached. Please try again tomorrow.")
    # Record
    _ip_rate_store_min[ip].append(now)
    _ip_rate_store_day[ip].append(now)


# ── Private endpoints ─────────────────────────────────────────────────────────

class GenerateKeyRequest(BaseModel):
    widget_name:      str = ""
    allowed_origins:  list[str] = []
    theme:            str = "light"
    max_input_chars:  int = 2000
    max_output_tokens: int = 500


class UpdateSettingsRequest(BaseModel):
    widget_name:       str = None
    allowed_origins:   list[str] = None
    theme:             str = None
    max_input_chars:   int = None
    max_output_tokens: int = None


@router.post("/embed/{agent_id}/generate")
async def generate_key(agent_id: str, body: GenerateKeyRequest, current_user: dict = Depends(verify_token)):
    # Verify agent belongs to user
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    result = await generate_api_key(
        user_id=current_user["user_id"],
        agent_id=agent_id,
        widget_name=body.widget_name or agent["name"],
        allowed_origins=body.allowed_origins,
        theme=body.theme,
        max_input_chars=body.max_input_chars,
        max_output_tokens=body.max_output_tokens,
    )
    return result  # raw_key returned here — only time it's visible


@router.patch("/embed/{agent_id}/settings")
async def update_settings(agent_id: str, body: UpdateSettingsRequest, current_user: dict = Depends(verify_token)):
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await update_key_settings(agent_id, body.widget_name, body.allowed_origins, theme=body.theme, max_input_chars=body.max_input_chars, max_output_tokens=body.max_output_tokens)
    return {"ok": True}


@router.delete("/embed/{agent_id}")
async def disable_embed(agent_id: str, current_user: dict = Depends(verify_token)):
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await delete_api_key(agent_id)
    return {"ok": True}


@router.get("/embed/{agent_id}")
async def get_embed_status(agent_id: str, current_user: dict = Depends(verify_token)):
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    key_record = await get_key_by_agent(agent_id)
    return {
        "enabled":           key_record is not None,
        "key_prefix":        key_record["key_prefix"] if key_record else None,
        "widget_name":       key_record["widget_name"] if key_record else None,
        "allowed_origins":   key_record["allowed_origins"] if key_record else [],
        "logo_url":          key_record["logo_url"] if key_record else None,
        "theme":             key_record["theme"] if key_record else "light",
        "max_input_chars":   key_record["max_input_chars"] if key_record else 2000,
        "max_output_tokens": key_record["max_output_tokens"] if key_record else 500,
        "created_at":        key_record["created_at"] if key_record else None,
        "last_used_at":      key_record["last_used_at"] if key_record else None,
    }


# ── Public endpoint ───────────────────────────────────────────────────────────

@router.get("/public/info")
async def public_info(request: Request):
    """Returns widget name for the API key — called by embed.js on load."""
    raw_key = request.headers.get("X-Archelon-Key")
    if not raw_key:
        raise HTTPException(status_code=401, detail="Missing API key.")
    key_record = await validate_api_key(raw_key)
    if not key_record:
        raise HTTPException(status_code=403, detail="Invalid API key.")
    return {
      "name":     key_record.get("widget_name") or "Assistant",
      "logo_url": key_record.get("logo_url") or "",
      "theme":    key_record.get("theme") or "light",
    }


class PublicChatRequest(BaseModel):
    message:  str
    agent_id: str


async def _validate_public_request(request: Request, body: PublicChatRequest):
    """Shared validation for public chat endpoints. Returns (key_record, message, agent_name, agent_instructions, max_output)."""
    raw_key = request.headers.get("X-Archelon-Key")
    if not raw_key:
        raise HTTPException(status_code=401, detail="Missing API key.")

    key_record = await validate_api_key(raw_key)
    if not key_record:
        raise HTTPException(status_code=403, detail="Invalid API key.")

    if key_record["agent_id"] != body.agent_id:
        raise HTTPException(status_code=403, detail="API key does not match agent.")

    origin = request.headers.get("origin", "")
    allowed = key_record.get("allowed_origins") or []
    if allowed:
        origin_clean = origin.replace("https://", "").replace("http://", "").rstrip("/")
        if not any(origin_clean == o.replace("https://", "").replace("http://", "").rstrip("/") for o in allowed):
            raise HTTPException(status_code=403, detail="Origin not allowed.")

    check_public_rate_limit(key_record["id"])

    ip = request.client.host if request.client else "unknown"
    check_ip_rate_limit(ip)

    balance = await get_user_token_balance(key_record["user_id"])
    if balance["tokens_remaining"] <= 0:
        raise HTTPException(status_code=402, detail="Token limit reached.")

    max_chars = key_record.get("max_input_chars") or 2000
    message = body.message.strip()[:max_chars]
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Fetch real agent instructions from DB
    agent_row = await agents_db.get_agent_by_id(body.agent_id, key_record["user_id"])
    agent_instructions = agent_row.get("instructions", "") if agent_row else ""
    agent_name         = key_record.get("widget_name") or (agent_row.get("name") if agent_row else "Assistant") or "Assistant"
    max_output         = None

    return key_record, message, agent_name, agent_instructions, max_output


@router.post("/public/chat/stream")
async def public_chat_stream(request: Request, body: PublicChatRequest):
    key_record, message, agent_name, agent_instructions, max_output = await _validate_public_request(request, body)

    analysed       = await classify_and_analyse(user_message=message, system_instructions=agent_instructions)
    intent         = analysed.get("intent", "single")
    search_queries = analysed.get("search_queries") or [message]

    # Smalltalk — stream answer directly with dots, no thinking steps
    if intent == "smalltalk":
        answer = await handle_smalltalk(
            user_message=message,
            agent_name=agent_name,
            agent_description="",
            agent_instructions=agent_instructions,
        )
        input_tokens  = len(message) // 4
        output_tokens = len(answer) // 4
        await insert_query_event(
            agent_id=body.agent_id,
            user_id=key_record["user_id"],
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            user_message=message,
            agent_response=answer,
        )
        async def smalltalk_stream():
            yield f"data: {json.dumps({'type': 'meta', 'intent': 'smalltalk'})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'token': answer})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'sources': [], 'token_usage': {'input_tokens': input_tokens, 'output_tokens': output_tokens}})}\n\n"
        return StreamingResponse(smalltalk_stream(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # RAG — run retrieval then stream synthesizer
    all_results = await asyncio.gather(*[
        vector_search(q, body.agent_id, match_count=15) for q in search_queries
    ])
    merged         = [m for result in all_results for m in result]
    budget         = MULTI_BUDGET if intent == "multi" else SINGLE_BUDGET
    context_chunks = rerank(merged, budget=budget)

    async def rag_stream():
        yield f"data: {json.dumps({'type': 'meta', 'intent': intent})}\n\n"

        full_response = ""
        final_event   = None

        async for chunk in synthesize_stream(
            user_message=message,
            context_chunks=context_chunks,
            agent_name=agent_name,
            agent_instructions=agent_instructions,
            search_queries=search_queries,
            max_output_tokens=max_output,
        ):
            raw = chunk.removeprefix("data: ").strip()
            if raw.startswith("[DONE]"):
                final_event = json.loads(raw[7:])
                token_usage = final_event["token_usage"]
                await insert_query_event(
                    agent_id=body.agent_id,
                    user_id=key_record["user_id"],
                    input_tokens=token_usage.get("input_tokens", 0),
                    output_tokens=token_usage.get("output_tokens", 0),
                    user_message=message,
                    agent_response=full_response,
                )
                yield f"data: {json.dumps({'type': 'done', 'sources': final_event['sources'], 'token_usage': token_usage})}\n\n"
            else:
                parsed = json.loads(raw)
                token  = parsed.get("token", "")
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

    return StreamingResponse(rag_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
