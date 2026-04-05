"""
intent_classifier.py — Classifies user query intent only.

Intents:
  smalltalk  — pure greeting/casual, no retrieval needed
  single     — one clear information need (may have multiple keywords)
  multi      — two or more distinct information needs
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
  "thinking": "User is asking about X"
}

Rules for intent:
- smalltalk: Pure greetings, casual conversation, AND identity questions about the agent itself.
  Examples: "hi", "hello", "how are you", "good morning", "thanks", "bye",
  "who are you", "what are you", "what can you do", "tell me about yourself", "what is your name"
  If there is ANY question about a specific person, topic, document content, skill, or project — it is NOT smalltalk.
  When in doubt, classify as single or multi, never smalltalk.

- single: ONE information need, even if it mentions multiple related concepts.
  Examples: "who is Ayush", "what are his Python and FastAPI skills", "tell me about his experience"

- multi: TWO OR MORE clearly distinct information needs that require separate lookups.
  Examples: "who is Ayush and what are his skills", "tell me his projects and his education background"

Rules for thinking:
- Start with "User is asking about"
- Describe what user wants in one line
- Empty string "" for smalltalk only"""


async def classify_intent(user_message: str, system_instructions: str = "") -> dict:
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
        return json.loads(content)
    except Exception as e:
        print(f"[intent_classifier] ERROR: {e}")
        return {
            "intent":  "single",
            "thinking": "",
        }
