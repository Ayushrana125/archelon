import os
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

# Load .env file so we can read MISTRAL_API_KEY_1
load_dotenv()

SYSTEM_PROMPT = """You are an intent classifier for a RAG system.
Return raw JSON only. No markdown. No backticks. No explanation.

Return exactly this format:
{
  "intent": "single" or "multi" or "smalltalk",
  "thinking": "User is asking about X",
  "search_thinking": "Let's search for X from the uploaded documents",
  "search_queries": ["keyword1", "keyword2"]
}

Rules for intent:
- smalltalk: greetings, thanks, casual chat, 
  anything not related to documents
- single: ONE clear topic or question
- multi: TWO OR MORE distinct topics in one message

Rules for thinking:
- Start with "User is asking about"
- Describe what user wants in one line
- Empty string "" for smalltalk

Rules for search_thinking:
- Start with "Let's search for"
- Mention what will be searched
- End with "Keywords: keyword1, keyword2"
- Keywords should be short and specific
- Empty string "" for smalltalk

Rules for search_queries:
- Optimized short search terms for vector search
- One term per topic
- Keep each term under 5 words
- Empty array [] for smalltalk

Examples:

Input: "who is Ayush and what are his skills"
Output: {
  "intent": "multi",
  "thinking": "User is asking about Ayush's background and his skills",
  "search_thinking": "Let's search for Ayush's profile and skills from the uploaded documents",
  "search_queries": ["Ayush background", "Ayush skills"]
}

Input: "what projects has Ayush worked on"
Output: {
  "intent": "single",
  "thinking": "User is asking about Ayush's projects",
  "search_thinking": "Let's search for Ayush's projects from the uploaded documents",
  "search_queries": ["Ayush projects"]
}

Input: "hey how are you"
Output: {
  "intent": "smalltalk",
  "thinking": "",
  "search_thinking": "",
  "search_queries": []
}"""


async def classify_intent(user_message: str, system_instructions: str = "") -> dict:
    try:
        llm = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.getenv("MISTRAL_API_KEY_1")
        )
        combined_prompt = f"{system_instructions}\n\n{SYSTEM_PROMPT}".strip() if system_instructions else SYSTEM_PROMPT
        response = await llm.ainvoke([
            SystemMessage(content=combined_prompt),
            HumanMessage(content=user_message),
        ])
        # Strip markdown backticks Mistral sometimes adds
        content = response.content.strip()
        content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)

    except Exception as e:
        print(f"ERROR: {e}")
        return {
            "intent": "single",
            "thinking": "",
            "search_thinking": "",
            "search_queries": []
        }
