"""
query_analyser.py — Decomposes a user query into optimised search terms.

Used when intent is single or multi. Takes the raw user message and
returns clean search queries for vector retrieval.
"""

import os
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

_SYSTEM_PROMPT = """You are a query analyser for a RAG retrieval system.
Given a user query, return JSON only. No markdown.

{ "search_queries": ["search term 1", "search term 2"] }

Rules:
- Single topic: return one optimised search term
- Multiple distinct topics: return one search term per topic
- Keep each term under 5 words
- Use nouns, not verbs
- Be specific"""


async def analyse_query(user_message: str) -> dict:
    try:
        llm = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.getenv("MISTRAL_API_KEY_1"),
        )
        response = await llm.ainvoke([
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=user_message),
        ])
        content = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"[query_analyser] ERROR: {e}")
        return {"search_queries": [user_message]}
