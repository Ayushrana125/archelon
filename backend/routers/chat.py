"""
chat.py — /api/chat endpoint.
Orchestrates the full pipeline: intent → retrieval → synthesis.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from pipeline.intent_classifier import classify_intent
from pipeline.query_analyser import analyse_query

router = APIRouter()


class ChatRequest(BaseModel):
    message:             str
    agent_id:            str
    session_id:          str
    system_instructions: str = ""


@router.post("/chat")
async def chat(body: ChatRequest):
    classified = await classify_intent(
        user_message=body.message,
        system_instructions=body.system_instructions,
    )
    intent = classified.get("intent")

    if intent == "smalltalk":
        return {
            "intent":        intent,
            "thinking":      "",
            "search_queries": [],
            "answer":        "Hello! How can I help you?",
        }

    result = await analyse_query(body.message)

    # TODO: retrieval → rerank → expand → synthesize
    return {
        "intent":         intent,
        "thinking":       classified.get("thinking"),
        "search_thinking": classified.get("search_thinking"),
        "search_queries": result.get("search_queries"),
        "answer":         "retrieval coming soon",
    }
