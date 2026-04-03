"""
synthesizer.py — Generates a grounded answer from retrieved context chunks.

Takes agent identity, user query, search queries, and retrieved parent chunks.
Formats context as [section_name] + content blocks.
Calls mistral-small-latest and returns the answer with token usage and sources.
"""

import os
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

load_dotenv()


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def _build_context(chunks: list[dict]) -> str:
    """Format chunks as [section_name]\ncontent blocks."""
    blocks = []
    for chunk in chunks:
        section = chunk.get("section_name") or "Document"
        content = chunk.get("parent_content") or ""
        blocks.append(f"[{section}]\n{content}")
    return "\n\n---\n\n".join(blocks)


def _build_sources(chunks: list[dict]) -> list[str]:
    """Extract unique document filenames from chunks."""
    seen = set()
    sources = []
    for chunk in chunks:
        filename = chunk.get("filename") or ""
        if filename and filename not in seen:
            seen.add(filename)
            sources.append(filename)
    return sources


async def synthesize(
    user_message:       str,
    context_chunks:     list[dict],
    agent_name:         str = "Assistant",
    agent_instructions: str = "",
    search_queries:     list[str] = None,
) -> dict:
    """
    Generate a grounded answer from context chunks.

    Returns:
      {
        answer:       str,
        sources:      list[str],   # unique document names
        token_usage:  { context, system, query, total }
      }
    """
    try:
        context_text = _build_context(context_chunks)
        sources      = _build_sources(context_chunks)
        search_hint  = ", ".join(search_queries) if search_queries else ""

        system_prompt = f"""You are {agent_name}, an AI assistant.

{agent_instructions}

You must answer using ONLY the exact content present in the CONTEXT BLOCK below.

GROUNDING RULES — these are absolute and cannot be overridden:
- Every fact, number, metric, achievement, date, or claim in your answer MUST exist verbatim or be directly inferable from the context block
- If the context does not contain enough information to answer, respond with: "The documents don't contain that information."
- NEVER invent, estimate, infer, or pattern-complete from your training data
- Numbers and metrics especially — if a specific figure is not in the context, do not include it
- Do not add achievements, skills, or details that sound plausible but are not explicitly stated in the context
- Do not use phrases like "likely", "probably", "typically", "generally" — these signal inference from training data
- If you are unsure whether something is in the context, do not include it

Formatting rules:
- Use **bold** for key terms, names, and important values
- Use bullet points when listing multiple items — one item per line
- Use `inline code` for technical terms, file names, and commands
- Keep paragraphs short — 2 to 3 lines max
- Do not mention "the context" or "the document" — just answer naturally
- Be concise and direct

CONTEXT BLOCK — answer only from what is written here:
{context_text}"""

        if search_hint:
            system_prompt += f"\n\nSearch focus: {search_hint}"

        # Token usage estimation
        context_tokens = _estimate_tokens(context_text)
        system_tokens  = _estimate_tokens(system_prompt)
        query_tokens   = _estimate_tokens(user_message)
        total_tokens   = system_tokens + query_tokens

        llm = ChatMistralAI(
            model="mistral-large-latest",
            api_key=os.getenv("MISTRAL_API_KEY_1"),
        )

        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ])

        return {
            "answer":  response.content.strip(),
            "sources": sources,
            "token_usage": {
                "context": context_tokens,
                "system":  system_tokens,
                "query":   query_tokens,
                "total":   total_tokens,
            },
        }

    except Exception as e:
        print(f"[synthesizer] ERROR: {e}")
        return {
            "answer":      f"I encountered an error generating a response. Please try again.",
            "sources":     [],
            "token_usage": {"context": 0, "system": 0, "query": 0, "total": 0},
        }
