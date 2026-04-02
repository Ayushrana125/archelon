"""
vector_search.py — Retrieves relevant child chunks from Supabase using vector similarity.

Flow:
  1. Embed the search query using mistral-embed
  2. Run pgvector similarity search against child_chunks table
  3. Return top-k results with scores

TODO: Implement once pgvector is configured on Supabase.
"""


async def vector_search(query: str, agent_id: str, top_k: int = 20) -> list[dict]:
    """
    Search child_chunks by vector similarity for a given agent.
    Returns list of {id, content, score, parent_id, token_count}.
    """
    raise NotImplementedError("vector_search not yet implemented")
