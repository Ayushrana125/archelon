"""
intent_classifier.py — Classifies user query intent.

Intents:
  smalltalk  — pure greeting/casual, no retrieval needed
  single     — one clear topic, one retrieval query
  multi      — two or more distinct topics, multiple retrieval queries
"""

import os
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

_SYSTEM_PROMPT = """You are an intent classifier for a RAG system.
Return raw JSON only. No markdown. No backticks. No explanation.

Return exactly this format:
{
  "intent": "single" or "multi" or "smalltalk",
  "thinking": "User is asking about X",
  "search_thinking": "Let's search for X from the uploaded documents",
  "search_queries": ["keyword1", "keyword2"]
}

Rules for intent:
- smalltalk: ONLY pure greetings and casual conversation with zero information request.
  Examples: "hi", "hello", "how are you", "good morning", "thanks", "okay", "bye"
  If there is ANY question about a person, topic, skill, project, experience, document — it is NOT smalltalk.
  When in doubt, classify as single or multi, never smalltalk.

- single: ONE clear topic, question, or information request.
  Examples: "who is Ayush", "what are his skills", "tell me about his experience"

- multi: TWO OR MORE distinct topics in one message.
  Examples: "who is Ayush and what are his skills", "tell me his projects and his background"

Rules for thinking:
- Start with "User is asking about"
- Describe what user wants in one line
- Empty string "" for smalltalk only

Rules for search_thinking:
- Start with "Let's search for"
- Mention what will be searched
- Empty string "" for smalltalk only

Rules for search_queries:
- Optimized short search terms for vector search
- One term per topic
- Keep each term under 5 words
- Be specific — use nouns not verbs
- Empty array [] for smalltalk only"""


async def classify_intent(user_message: str, system_instructions: str = "") -> dict:
    try:
        llm = ChatMistralAI(
            model="mistral-large-latest",
            api_key=os.getenv("MISTRAL_API_KEY_1"),
        )
        prompt = f"{system_instructions}\n\n{_SYSTEM_PROMPT}".strip() if system_instructions else _SYSTEM_PROMPT
        response = await llm.ainvoke([
            SystemMessage(content=prompt),
            HumanMessage(content=user_message),
        ])
        content = response.content.strip().replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"[intent_classifier] ERROR: {e}")
        return {
            "intent":         "single",
            "thinking":       "",
            "search_thinking": "",
            "search_queries": [],
        }
