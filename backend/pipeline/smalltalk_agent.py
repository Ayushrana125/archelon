"""
smalltalk_agent.py — Handles casual/greeting queries using agent context.

Takes the agent's name, description, and instructions from DB and
generates a short, natural response. No retrieval needed.
Answer is kept brief — just enough to acknowledge and invite the user.
"""

import os
import json
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

_SYSTEM_PROMPT = """You are handling a casual greeting or smalltalk message for an AI agent.
Respond naturally and briefly as that agent, based on its name, description, and instructions.

Rules:
- Keep the response short — 1 to 2 sentences maximum
- Be warm and friendly
- Mention what you can help with based on the agent's purpose
- Do not make up capabilities not mentioned in the agent description
- Do not use emojis
- Return plain text only, no JSON, no markdown"""


async def handle_smalltalk(
    user_message: str,
    agent_name: str,
    agent_description: str = "",
    agent_instructions: str = "",
) -> str:
    try:
        llm = ChatMistralAI(
            model="mistral-small-latest",
            api_key=os.getenv("MISTRAL_API_KEY_1"),
        )

        context = f"Agent name: {agent_name}"
        if agent_description:
            context += f"\nAgent description: {agent_description}"
        if agent_instructions:
            context += f"\nAgent instructions: {agent_instructions}"

        response = await llm.ainvoke([
            SystemMessage(content=f"{_SYSTEM_PROMPT}\n\n{context}"),
            HumanMessage(content=user_message),
        ])
        return response.content.strip()

    except Exception as e:
        print(f"[smalltalk_agent] ERROR: {e}")
        return f"Hi! I'm {agent_name}. How can I help you?"
