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
    max_output_tokens:  int = None,
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
- Write in clean, natural prose — avoid over-formatting
- Use **bold** only for proper nouns, key metrics, and critical values — not for every term
- Use bullet points only when listing 3 or more distinct items — never for single facts
- Keep bullet points to one line each — if it needs two lines, write it as prose instead
- Use numbered lists only for sequential steps or ordered processes
- Never use headers or section titles inside an answer
- Keep paragraphs to 2–3 lines maximum
- URLs must be formatted as markdown links: [arento.vercel.app](https://arento.vercel.app)
- Email addresses must be plain text — never wrapped in code, backticks, or brackets
- Never use `inline code` for URLs, email addresses, company names, or product names
- Use `inline code` only for actual code, CLI commands, environment variables, and file extensions
- Never add unnecessary filler phrases like "Great question", "Based on the documents", "Here is a summary of", "Certainly" — start the answer directly
- Never mention "the context", "the document", "based on what I have", or any reference to the retrieval system
- If listing achievements or metrics, lead with the number or result — not the project name
- One blank line between sections if the answer has multiple parts — no more

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
            max_tokens=max_output_tokens if max_output_tokens else None,
        )

        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message),
        ])

        input_tokens  = system_tokens + query_tokens
        output_tokens = _estimate_tokens(response.content)

        return {
            "answer":  response.content.strip(),
            "sources": sources,
            "token_usage": {
                "context":       context_tokens,
                "system":        system_tokens,
                "query":         query_tokens,
                "input_tokens":  input_tokens,
                "output_tokens": output_tokens,
                "total":         input_tokens + output_tokens,
            },
        }

    except Exception as e:
        print(f"[synthesizer] ERROR: {e}")
        return {
            "answer":      f"I encountered an error generating a response. Please try again.",
            "sources":     [],
            "token_usage": {"context": 0, "system": 0, "query": 0, "total": 0},
        }
