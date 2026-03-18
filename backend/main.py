from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from classifier import classify_intent
from orchestrator import analyze_query

import uvicorn
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    agent_id: str
    session_id: str
    system_instructions: str = ""


@app.post("/api/chat")
async def chat(body: ChatRequest):
    classified = await classify_intent(
        user_message=body.message,
        system_instructions=body.system_instructions
    )
    intent = classified.get("intent")
    if intent == "smalltalk":
        return {"intent": intent, "thinking": "", "search_queries": [], "answer": "retrieval coming soon"}
    result = await analyze_query(body.message)
    return {
        "intent": intent,
        "thinking": classified.get("thinking"),
        "search_thinking": classified.get("search_thinking"),
        "search_queries": result.get("search_queries"),
        "answer": "retrieval coming soon",
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)