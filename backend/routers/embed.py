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
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from jwt_handler import verify_token
from db.api_keys_db import generate_api_key, get_key_by_agent, validate_api_key, update_key_settings, delete_api_key
from db import agents_db
from db.token_usage_db import get_user_token_balance, insert_query_event
from pipeline.intent_classifier import classify_intent
from pipeline.query_analyser import analyse_query
from pipeline.smalltalk_agent import handle_smalltalk
from pipeline.retrieval.vector_search import vector_search
from pipeline.retrieval.reranker import rerank, SINGLE_BUDGET, MULTI_BUDGET
from pipeline.synthesizer import synthesize

router = APIRouter()

# ── Rate limiter for public endpoint — 10 req/min per API key ────────────────
_public_rate_store: dict[str, list[float]] = defaultdict(list)

def check_public_rate_limit(key_id: str, limit: int = 10, window: int = 60):
    now = time.time()
    _public_rate_store[key_id] = [t for t in _public_rate_store[key_id] if now - t < window]
    if len(_public_rate_store[key_id]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests.")
    _public_rate_store[key_id].append(now)


# ── Private endpoints ─────────────────────────────────────────────────────────

class GenerateKeyRequest(BaseModel):
    widget_name:      str = ""
    allowed_origins:  list[str] = []
    theme:            str = "light"
    max_input_chars:  int = 2000
    max_output_tokens: int = 500


class UpdateSettingsRequest(BaseModel):
    widget_name:     str = None
    allowed_origins: list[str] = None


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
    await update_key_settings(agent_id, body.widget_name, body.allowed_origins)
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


@router.post("/public/chat")
async def public_chat(request: Request, body: PublicChatRequest):

    # 1. Extract API key from header
    raw_key = request.headers.get("X-Archelon-Key")
    if not raw_key:
        raise HTTPException(status_code=401, detail="Missing API key.")

    # 2. Validate key
    key_record = await validate_api_key(raw_key)
    if not key_record:
        raise HTTPException(status_code=403, detail="Invalid API key.")

    # 3. Verify key belongs to the requested agent
    if key_record["agent_id"] != body.agent_id:
        raise HTTPException(status_code=403, detail="API key does not match agent.")

    # 4. Check origin whitelist
    origin = request.headers.get("origin", "")
    allowed = key_record.get("allowed_origins") or []
    if allowed:
        origin_clean = origin.replace("https://", "").replace("http://", "").rstrip("/")
        if not any(origin_clean == o.replace("https://", "").replace("http://", "").rstrip("/") for o in allowed):
            raise HTTPException(status_code=403, detail="Origin not allowed.")

    # 5. Rate limit per key
    check_public_rate_limit(key_record["id"])

    # 6. Token balance check
    balance = await get_user_token_balance(key_record["user_id"])
    if balance["tokens_remaining"] <= 0:
        raise HTTPException(status_code=402, detail="Token limit reached.")

    # 7. Message length check — use key's max_input_chars
    max_chars = key_record.get("max_input_chars") or 2000
    message = body.message.strip()[:max_chars]
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # 8. Run pipeline
    agent_name = key_record.get("widget_name") or "Assistant"
    max_output = key_record.get("max_output_tokens") or 500

    classified = await classify_intent(user_message=message, system_instructions="")
    intent = classified.get("intent", "single")

    if intent == "smalltalk":
        answer = await handle_smalltalk(
            user_message=message,
            agent_name=agent_name,
            agent_description="",
            agent_instructions="",
        )
        await insert_query_event(
            agent_id=body.agent_id,
            user_id=key_record["user_id"],
            input_tokens=len(message) // 4,
            output_tokens=len(answer) // 4,
            user_message=message,
            agent_response=answer,
        )
        return {"answer": answer, "sources": []}

    analysed = await analyse_query(message, intent=intent)
    search_queries = analysed.get("search_queries") or [message]

    all_results = await asyncio.gather(*[
        vector_search(q, body.agent_id, match_count=15) for q in search_queries
    ])
    merged = [m for result in all_results for m in result]
    budget = MULTI_BUDGET if intent == "multi" else SINGLE_BUDGET
    context_chunks = rerank(merged, budget=budget)

    result = await synthesize(
        user_message=message,
        context_chunks=context_chunks,
        agent_name=agent_name,
        agent_instructions="",
        search_queries=search_queries,
        max_output_tokens=max_output,
    )

    await insert_query_event(
        agent_id=body.agent_id,
        user_id=key_record["user_id"],
        input_tokens=result["token_usage"].get("input_tokens", 0),
        output_tokens=result["token_usage"].get("output_tokens", 0),
        user_message=message,
        agent_response=result["answer"],
    )

    return {"answer": result["answer"], "sources": result["sources"]}
