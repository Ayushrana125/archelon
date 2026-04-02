"""
expander.py — Expands child chunk results to their parent chunks.

Small-to-big retrieval strategy:
  - Vector search finds precise child chunks (small, focused)
  - Expander fetches their parent chunks (larger context window)
  - Deduplicates parents so the same parent isn't included twice

This gives the synthesizer richer context without bloating the prompt
with redundant content.
"""


async def expand_to_parents(child_chunks: list[dict]) -> list[dict]:
    """
    Given a list of child chunks, fetch their parent chunks from DB.
    Deduplicates by parent_id.
    Returns list of parent chunk dicts with content and metadata.
    """
    raise NotImplementedError("expander not yet implemented")


def deduplicate(chunks: list[dict], key: str = "parent_id") -> list[dict]:
    """
    Remove duplicate chunks by key.
    Keeps first occurrence (highest ranked).
    """
    seen = set()
    result = []
    for chunk in chunks:
        val = chunk.get(key)
        if val not in seen:
            seen.add(val)
            result.append(chunk)
    return result
