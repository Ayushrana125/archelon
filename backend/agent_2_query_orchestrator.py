import os
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are an orchestrator for a RAG system.
Given a user query, return JSON only, no markdown.

{ "thinking": "one line explaining what user wants", "search_queries": ["search term 1"] }

Rules:
- single topic: return one optimized search term
- multiple distinct topics: return one search term per topic"""


async def analyze_query(user_message: str) -> dict:
    try:
        llm = ChatMistralAI(model="mistral-small-latest", api_key=os.getenv("MISTRAL_API_KEY_1"))
        response = await llm.ainvoke([
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=user_message),
        ])
        return json.loads(response.content.strip())
    except Exception:
        return {"thinking": "Could not parse query", "search_queries": [user_message]}
