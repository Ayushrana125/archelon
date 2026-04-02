"""
synthesizer.py — Generates the final answer from retrieved context chunks.

Takes the user query + retrieved parent chunks and produces a
grounded, concise answer using the LLM.

Token budgets:
  single query  — context ~1500 tokens, answer max ~400 tokens
  multi query   — context ~4500-6000 tokens, answer max ~1000 tokens
"""

import os
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()

_SYSTEM_PROMPT = """You are a helpful assistant that answers questions based strictly on the provided context.

Rules:
- Answer only from the context provided
- If the answer is not in the context, say "I don't have that information in my documents"
- Be concise and direct
- Do not make up information"""


async def synthesize(query: str, context_chunks: list[dict], max_tokens: int = 400) -> str:
    """
    Generate a grounded answer from context chunks.
    context_chunks: list of {content, section_name, ...}
    """
    raise NotImplementedError("synthesizer not yet implemented")
