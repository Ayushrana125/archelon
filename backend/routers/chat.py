"""
chat.py — /api/chat endpoint.
Full pipeline: intent → query analysis → vector search → rerank → synthesize.

Single query:  1 vector search → rerank (1500 token budget) → synthesize
Multi query:   N parallel vector searches → merge → rerank (3000 token budget) → synthesize
Smalltalk:     direct LLM response, no retrieval
"""

import asyncio
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pipeline.intent_classifier import classify_intent
from pipeline.query_analyser import analyse_query
from pipeline.smalltalk_agent import handle_smalltalk
from pipeline.retrieval.vector_search import vector_search
from pipeline.retrieval.reranker import rerank, SINGLE_BUDGET, MULTI_BUDGET
from pipeline.synthesizer import synthesize
from jwt_handler import verify_token
from db.token_usage_db import insert_query_event, get_user_token_balance, get_agent_total_tokens

router = APIRouter()


class ChatRequest(BaseModel):
    message:            str
    agent_id:           str
    session_id:         str
    agent_name:         str = ""
    agent_description:  str = ""
    agent_instructions: str = ""


@router.get("/chat/tokens/{agent_id}")
async def get_agent_tokens(agent_id: str, current_user: dict = Depends(verify_token)):
    total = await get_agent_total_tokens(agent_id)
    return {"agent_id": agent_id, "total_tokens": total}


@router.post("/chat")
async def chat(body: ChatRequest, current_user: dict = Depends(verify_token)):

    # ── Token balance check ─────────────────────────────────────────────────────
    balance = await get_user_token_balance(current_user["user_id"])
    if balance["tokens_remaining"] <= 0:
        raise HTTPException(status_code=402, detail="Token limit reached. Upgrade your plan to continue.")

    # ── Step 1: Classify intent ──────────────────────────────────────────────
    classified = await classify_intent(
        user_message=body.message,
        system_instructions=body.agent_instructions,
    )
    intent = classified.get("intent", "single")

    # ── Step 2: Smalltalk — no retrieval needed ──────────────────────────────
    if intent == "smalltalk":
        answer = await handle_smalltalk(
            user_message=body.message,
            agent_name=body.agent_name or "Assistant",
            agent_description=body.agent_description,
            agent_instructions=body.agent_instructions,
        )
        return {
            "intent":         intent,
            "thinking":       "",
            "search_queries": [],
            "answer":         answer,
            "sources":        [],
            "token_usage":    {"context": 0, "system": 0, "query": 0, "total": 0},
        }

    # ── Step 3: Analyse query → extract search terms ─────────────────────────
    analysed      = await analyse_query(body.message, intent=intent)
    search_queries = analysed.get("search_queries") or [body.message]

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
        user_message=body.message,
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
        input_tokens=token_usage.get("system", 0) + token_usage.get("query", 0),
        output_tokens=token_usage.get("total", 0),
        user_message=body.message,
        agent_response=result["answer"],
    )

    return {
        "intent":          intent,
        "thinking":        classified.get("thinking", ""),
        "search_thinking": analysed.get("search_thinking", ""),
        "search_queries":  search_queries,
        "answer":          result["answer"],
        "sources":         result["sources"],
        "token_usage":     result["token_usage"],
    }
