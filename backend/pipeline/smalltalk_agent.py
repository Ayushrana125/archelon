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

Formatting rules:
- Use **bold** for the agent name and key capability terms
- Use `inline code` for technical terms, library names, commands, or file types
- Keep it short — 2 to 3 lines maximum
- Each distinct point on its own line
- Do not use bullet points or headers for smalltalk
- Do not use emojis
- No JSON, return markdown formatted text only

Example of a good response:
Hi! I'm **Python Tutor**, your guide to learning **Python programming**.

Ask me about `syntax`, `data structures`, `functions`, or `OOP` and I'll help you understand it clearly.

Example of a bad response (do not do this):
Hello! I am Python Tutor and I can help you learn Python programming including syntax data structures functions and object oriented programming concepts feel free to ask me anything."""


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
