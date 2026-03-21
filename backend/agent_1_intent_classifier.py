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

- smalltalk: ONLY pure greetings and casual conversation
  with zero information request.
  Examples: "hi", "hello", "how are you", 
  "good morning", "thanks", "okay", "bye"
  If there is ANY question about a person, topic, 
  skill, project, experience, document — it is NOT smalltalk.
  When in doubt, classify as single or multi, never smalltalk.

- single: ONE clear topic, question, or information request.
  Examples: "who is Ayush", "what are his skills",
  "tell me about his experience", "what does he do"

- multi: TWO OR MORE distinct topics in one message.
  Examples: "who is Ayush and what are his skills",
  "tell me his projects and his background",
  "what are his skills, experience and education"

Rules for thinking:
- Start with "User is asking about"
- Describe what user wants in one line
- Empty string "" for smalltalk only

Rules for search_thinking:
- Start with "Let's search for"
- Mention what will be searched
- End naturally — no need to add keywords here
- Empty string "" for smalltalk only

Rules for search_queries:
- Optimized short search terms for vector search
- One term per topic
- Keep each term under 5 words
- Be specific — use nouns not verbs
- Empty array [] for smalltalk only

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

Input: "tell me about his experience"
Output: {
  "intent": "single",
  "thinking": "User is asking about Ayush's work experience",
  "search_thinking": "Let's search for Ayush's work experience from the uploaded documents",
  "search_queries": ["Ayush work experience"]
}

Input: "hi"
Output: {
  "intent": "smalltalk",
  "thinking": "",
  "search_thinking": "",
  "search_queries": []
}

Input: "hey how are you"
Output: {
  "intent": "smalltalk",
  "thinking": "",
  "search_thinking": "",
  "search_queries": []
}

Input: "what can you do"
Output: {
  "intent": "single",
  "thinking": "User is asking about the agent's capabilities",
  "search_thinking": "Let's search for agent capabilities from the uploaded documents",
  "search_queries": ["capabilities features"]
}"""


async def classify_intent(user_message: str, system_instructions: str = "") -> dict:
    try:
        llm = ChatMistralAI(
            model="mistral-large-latest",
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
