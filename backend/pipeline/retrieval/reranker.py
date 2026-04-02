"""
reranker.py — Deduplicates and reranks raw vector search matches.

Steps:
  1. Deduplicate by parent_id — keep best (lowest) score per parent
  2. Sort by score ascending (most relevant first)
  3. Apply gap detection — stop when relevance drops sharply
  4. Skip junk chunks (headers, footers under 20 tokens)
  5. Apply token budget as safety net
"""

RELEVANCE_THRESHOLD = 0.6   # drop anything with score above this
GAP_THRESHOLD       = 0.05  # stop when score jumps more than this
MIN_TOKENS          = 20    # skip chunks smaller than this (junk)
SINGLE_BUDGET       = 1500  # max tokens for single query context
MULTI_BUDGET        = 3000  # max tokens for multi query context


def deduplicate_and_rerank(matches: list[dict]) -> list[dict]:
    """
    Deduplicate by parent_id keeping best score per parent.
    Sort by score ascending (most relevant first).
    """
    best_per_parent = {}
    for match in matches:
        pid = match["parent_id"]
        if pid not in best_per_parent or match["score"] < best_per_parent[pid]["score"]:
            best_per_parent[pid] = match
    return sorted(best_per_parent.values(), key=lambda x: x["score"])


def apply_budget(reranked: list[dict], budget: int) -> list[dict]:
    """
    Walk the reranked list and stop when:
      1. Score exceeds RELEVANCE_THRESHOLD (hard cutoff)
      2. Score gap > GAP_THRESHOLD (natural relevance drop)
      3. Token budget exceeded (safety net)
    Also skips junk chunks under MIN_TOKENS.
    """
    final = []
    token_count = 0
    prev_score = None

    for chunk in reranked:
        score = chunk["score"]

        if score > RELEVANCE_THRESHOLD:
            break

        if (chunk.get("parent_token_count") or 0) < MIN_TOKENS:
            continue

        if prev_score is not None and (score - prev_score) > GAP_THRESHOLD:
            break

        tokens = chunk.get("parent_token_count") or 0
        if token_count + tokens > budget:
            break

        final.append(chunk)
        token_count += tokens
        prev_score = score

    return final


def rerank(matches: list[dict], budget: int = SINGLE_BUDGET) -> list[dict]:
    """
    Full rerank pipeline: deduplicate → sort → gap filter → budget.
    Returns final context chunks ready for synthesizer.
    """
    reranked = deduplicate_and_rerank(matches)
    return apply_budget(reranked, budget)
