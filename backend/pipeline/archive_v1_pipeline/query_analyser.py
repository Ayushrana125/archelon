"""
[ARCHIVED — v1 pipeline]
Replaced by pipeline/intent_and_query.py which merges intent classification
and query analysis into a single LLM call, saving one full Mistral round trip.

query_analyser.py — Extracts optimised search keywords from a user query.

Owns all keyword extraction. Intent-aware:
  single — 1 to 3 tight keywords covering all concepts in the query
  multi  — one keyword group per distinct sub-topic

A single intent query can still produce multiple keywords.
Example: "What is Ayush's experience with Python and FastAPI?"
  → intent: single
  → keywords: ["Ayush Python experience", "Ayush FastAPI experience"]
"""

import os
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

_SYSTEM_PROMPT = """You are a search keyword extractor for a RAG retrieval system.
Given a user query and its intent, extract optimised search keywords.
Return raw JSON only. No markdown. No backticks.

Return exactly this format:
{
  "search_thinking": "Let's search for X and Y from the documents",
  "search_queries": ["keyword 1", "keyword 2"]
}

Rules:
- Each keyword is a short search phrase (2-5 words max)
- Use nouns, not verbs
- Be specific — generic terms return poor results
- single intent: 1 to 3 keywords covering all concepts in the query
- multi intent: one keyword per distinct sub-topic, minimum 2

Examples:

Query: "who is Ayush Rana"
Intent: single
Output: {
  "search_thinking": "Let's search for Ayush Rana's profile from the documents",
  "search_queries": ["Ayush Rana profile"]
}

Query: "what is Ayush's experience with Python and FastAPI"
Intent: single
Output: {
  "search_thinking": "Let's search for Ayush's Python and FastAPI experience",
  "search_queries": ["Ayush Python experience", "Ayush FastAPI skills"]
}

Query: "who is Ayush and what projects has he worked on and what are his skills"
Intent: multi
Output: {
  "search_thinking": "Let's search for Ayush's background, his projects, and his skills separately",
  "search_queries": ["Ayush Rana background", "Ayush projects", "Ayush technical skills"]
}

Query: "what is Archelon, how does it help businesses, and how do I use it"
Intent: multi
Output: {
  "search_thinking": "Let's search for what Archelon is, its business use cases, and usage guide",
  "search_queries": ["Archelon overview", "Archelon business use cases", "Archelon how to use"]
}"""


async def analyse_query(user_message: str, intent: str = "single") -> dict:
    try:
        llm = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.getenv("MISTRAL_API_KEY_1"),
        )
        prompt_input = f"Query: {user_message}\nIntent: {intent}"
        response = await llm.ainvoke([
            SystemMessage(content=_SYSTEM_PROMPT),
            HumanMessage(content=prompt_input),
        ])
        content = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"[query_analyser] ERROR: {e}")
        return {
            "search_thinking": "",
            "search_queries":  [user_message],
        }
