"""
chat.py — /api/chat endpoint.
Orchestrates the full pipeline: intent → retrieval → synthesis.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pipeline.intent_classifier import classify_intent
from pipeline.query_analyser import analyse_query
from pipeline.smalltalk_agent import handle_smalltalk
from db import agents_db
from jwt_handler import verify_token

router = APIRouter()


class ChatRequest(BaseModel):
    message:    str
    agent_id:   str
    session_id: str


async def _get_agent(agent_id: str, user_id: str) -> dict:
    """Fetch agent from DB — tries user-owned first, then system agents."""
    agent = await agents_db.get_agent_by_id(agent_id, user_id)
    if not agent:
        agent = await agents_db.get_system_agent_by_id(agent_id)
    return agent or {}


@router.post("/chat")
async def chat(body: ChatRequest, current_user: dict = Depends(verify_token)):
    agent = await _get_agent(body.agent_id, current_user["user_id"])

    classified = await classify_intent(
        user_message=body.message,
        system_instructions=agent.get("instructions", ""),
    )
    intent = classified.get("intent")

    if intent == "smalltalk":
        answer = await handle_smalltalk(
            user_message=body.message,
            agent_name=agent.get("name", "Assistant"),
            agent_description=agent.get("description", ""),
            agent_instructions=agent.get("instructions", ""),
        )
        return {
            "intent":         intent,
            "thinking":       "",
            "search_queries": [],
            "answer":         answer,
        }

    result = await analyse_query(body.message, intent=intent)

    # TODO: retrieval → rerank → expand → synthesize
    return {
        "intent":          intent,
        "thinking":        classified.get("thinking"),
        "search_thinking": result.get("search_thinking"),
        "search_queries":  result.get("search_queries"),
        "answer":          "retrieval coming soon",
    }
