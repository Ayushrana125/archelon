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
Respond as that agent based on its name, description, and instructions. 
You have to respond in a way that is natural and human-like.

Formatting rules:
- Strictly Use **bold** for clarity and to highlight key terms.
- Keep it short — 1 or 2 lines maximum
- Each distinct point on its own line with a blank line between
- Do not use bullet points, headers, code blocks, or inline code
- Do not use emojis
- Return plain markdown text only

Example:
Hi! I'm **Archelon Assistant**, here to help you get the most out of **Archelon**.

Ask me about **creating agents**, **uploading documents**, or how to **embed** your agent on a website."""


async def handle_smalltalk(
    user_message: str,
    agent_name: str,
    agent_description: str = "",
    agent_instructions: str = "",
) -> str:
    try:
        llm = ChatMistralAI(
            model="mistral-large-latest",
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
