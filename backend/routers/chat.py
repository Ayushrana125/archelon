"""
chat.py — /api/chat endpoint.
Orchestrates the full pipeline: intent → retrieval → synthesis.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from pipeline.intent_classifier import classify_intent
from pipeline.query_analyser import analyse_query
from pipeline.smalltalk_agent import handle_smalltalk
from jwt_handler import verify_token

router = APIRouter()


class ChatRequest(BaseModel):
    message:             str
    agent_id:            str
    session_id:          str
    agent_name:          str = ""
    agent_description:   str = ""
    agent_instructions:  str = ""


@router.post("/chat")
async def chat(body: ChatRequest, current_user: dict = Depends(verify_token)):
    classified = await classify_intent(
        user_message=body.message,
        system_instructions=body.agent_instructions,
    )
    intent = classified.get("intent")

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
