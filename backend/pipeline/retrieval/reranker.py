"""
reranker.py — Re-ranks retrieved chunks by relevance to the original query.

After vector search returns top-k by similarity score, re-ranking
re-scores them by actually reading query + chunk together (cross-encoder).
This gives much better relevance ordering than raw similarity alone.

Planned: flashrank (free, runs locally, no API needed)
"""


def rerank(query: str, chunks: list[dict], top_n: int = 5) -> list[dict]:
    """
    Re-rank chunks by relevance to query.
    Returns top_n chunks sorted by re-rank score descending.
    """
    raise NotImplementedError("reranker not yet implemented")
