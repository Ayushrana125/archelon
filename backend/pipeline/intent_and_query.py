"""
intent_and_query.py — Classifies intent AND extracts search keywords in one LLM call.

Replaces the two-step v1 pipeline (intent_classifier.py + query_analyser.py).
Saves one full Mistral round trip (~700-900ms) per query.

Returns:
  {
    "intent":         "single" | "multi" | "smalltalk",
    "thinking":       "User is asking about X",
    "search_thinking": "Let's search for X from the documents",
    "search_queries": ["keyword 1", "keyword 2"]
  }

For smalltalk: search_thinking and search_queries are empty — no retrieval needed.
"""

import os
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

_SYSTEM_PROMPT = """You are an intent classifier and search keyword extractor for a RAG system.
In one step: classify the intent AND extract optimised search keywords.
Return raw JSON only. No markdown. No backticks. No explanation.

Return exactly this format:
{
  "intent": "single" or "multi" or "smalltalk",
  "thinking": "User is asking about X",
  "search_thinking": "Let's search for X from the documents",
  "search_queries": ["keyword 1", "keyword 2"]
}

--- INTENT RULES ---

smalltalk: Pure greetings, casual conversation, identity questions about the agent itself.
  Examples: "hi", "hello", "how are you", "thanks", "bye",
  "who are you", "what can you do", "tell me about yourself"
  If there is ANY question about a specific person, topic, document content, skill, or project — NOT smalltalk.
  When in doubt, classify as single or multi, never smalltalk.
  For smalltalk: set thinking="" and search_thinking="" and search_queries=[]

single: ONE information need, even if it mentions multiple related concepts.
  Examples: "who is Ayush", "what are his Python and FastAPI skills", "tell me about his experience"

multi: TWO OR MORE clearly distinct information needs requiring separate lookups.
  Examples: "who is Ayush and what are his skills", "tell me his projects and his education"

--- THINKING RULES ---

thinking:
  - Start with "User is asking about"
  - One line describing what the user wants
  - Empty string "" for smalltalk only

search_thinking:
  - Start with "Let's search for"
  - One line describing what to look up
  - Empty string "" for smalltalk only

--- KEYWORD RULES ---

search_queries:
  - Each keyword is a short search phrase (2-5 words max)
  - Use nouns, not verbs — be specific
  - single intent: 1 to 3 keywords covering all concepts
  - multi intent: one keyword per distinct sub-topic, minimum 2
  - Empty array [] for smalltalk only

--- EXAMPLES ---

Query: "hi there"
Output: {
  "intent": "smalltalk",
  "thinking": "",
  "search_thinking": "",
  "search_queries": []
}

Query: "who is Ayush Rana"
Output: {
  "intent": "single",
  "thinking": "User is asking about Ayush Rana's background",
  "search_thinking": "Let's search for Ayush Rana's profile from the documents",
  "search_queries": ["Ayush Rana profile"]
}

Query: "what is Ayush's experience with Python and FastAPI"
Output: {
  "intent": "single",
  "thinking": "User is asking about Ayush's Python and FastAPI experience",
  "search_thinking": "Let's search for Ayush's Python and FastAPI skills",
  "search_queries": ["Ayush Python experience", "Ayush FastAPI skills"]
}

Query: "who is Ayush and what projects has he worked on and what are his skills"
Output: {
  "intent": "multi",
  "thinking": "User is asking about Ayush's background, projects, and skills",
  "search_thinking": "Let's search for Ayush's profile, his projects, and his technical skills separately",
  "search_queries": ["Ayush Rana background", "Ayush projects", "Ayush technical skills"]
}

Query: "what is Archelon, how does it help businesses, and how do I use it"
Output: {
  "intent": "multi",
  "thinking": "User is asking about Archelon's overview, business value, and usage",
  "search_thinking": "Let's search for Archelon overview, business use cases, and usage guide",
  "search_queries": ["Archelon overview", "Archelon business use cases", "Archelon how to use"]
}"""


async def classify_and_analyse(user_message: str, system_instructions: str = "") -> dict:
    """
    Single LLM call that returns intent + thinking + search_thinking + search_queries.
    Replaces the sequential classify_intent() + analyse_query() calls from v1.
    """
    try:
        llm = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.getenv("MISTRAL_API_KEY_1"),
        )
        prompt = f"{system_instructions}\n\n{_SYSTEM_PROMPT}".strip() if system_instructions else _SYSTEM_PROMPT
        response = await llm.ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content=user_message),
        ])
        content = response.content.strip().replace("```json", "").replace("```", "").strip()
        result = json.loads(content)

        # Ensure all keys are present with safe defaults
        return {
            "intent":          result.get("intent", "single"),
            "thinking":        result.get("thinking", ""),
            "search_thinking": result.get("search_thinking", ""),
            "search_queries":  result.get("search_queries") or [user_message],
        }

    except Exception as e:
        print(f"[intent_and_query] ERROR: {e}")
        return {
            "intent":          "single",
            "thinking":        "",
            "search_thinking": "",
            "search_queries":  [user_message],
        }
