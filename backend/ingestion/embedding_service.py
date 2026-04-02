"""
embedding_service.py — Embeds child chunks using mistral-embed.
Batches by token budget (15K tokens per call) to minimise API calls.
Free tier: 1 req/sec — enforced with 1.1s delay between batches.
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

MISTRAL_API_KEY  = os.getenv("MISTRAL_API_KEY_1")
EMBED_MODEL      = "mistral-embed"
MAX_TOKENS_BATCH = 15_000
RATE_LIMIT_DELAY = 1.1
EMBED_URL        = "https://api.mistral.ai/v1/embeddings"


def _build_batches(chunks: list[dict]) -> list[list[dict]]:
    """Group chunks into batches where total tokens <= MAX_TOKENS_BATCH."""
    batches = []
    current_batch = []
    current_tokens = 0

    for chunk in chunks:
        t = chunk.get("token_count") or 1
        if current_tokens + t > MAX_TOKENS_BATCH and current_batch:
            batches.append(current_batch)
            current_batch = []
            current_tokens = 0
        current_batch.append(chunk)
        current_tokens += t

    if current_batch:
        batches.append(current_batch)

    return batches


async def embed_chunks(chunks: list[dict], on_batch_done=None) -> dict[str, list[float]]:
    """
    Embed all child chunks. Returns {chunk_id: embedding_vector}.
    chunks: list of dicts with keys: id, content, token_count
    on_batch_done(batch_num, total_batches) called after each batch.
    """
    if not chunks:
        return {}

    # Filter out empty or whitespace-only chunks
    # Also truncate chunks that exceed Mistral's per-input limit (16K tokens ~ 64K chars)
    MAX_CHARS = 60_000
    cleaned = []
    for c in chunks:
        content = c.get("content", "").strip()
        if not content:
            continue
        if len(content) > MAX_CHARS:
            c = {**c, "content": content[:MAX_CHARS]}
        cleaned.append(c)
    chunks = cleaned

    batches = _build_batches(chunks)
    total_batches = len(batches)
    embeddings = {}

    async with httpx.AsyncClient(timeout=60) as client:
        for i, batch in enumerate(batches):
            texts = [c["content"] for c in batch]

            try:
                response = await client.post(
                    EMBED_URL,
                    headers={
                        "Authorization": f"Bearer {MISTRAL_API_KEY}",
                        "Content-Type":  "application/json",
                    },
                    json={
                        "model":  EMBED_MODEL,
                        "input": texts,
                    },
                )
                response.raise_for_status()
                data = response.json()

                for j, item in enumerate(data["data"]):
                    embeddings[batch[j]["id"]] = item["embedding"]

            except httpx.HTTPStatusError as e:
                # Re-raise so ingestor can clean up the document
                raise RuntimeError(f"Embedding failed on batch {i + 1}/{total_batches}: {e.response.status_code} {e.response.text[:200]}")

            if on_batch_done:
                on_batch_done(i + 1, total_batches)

            if i < total_batches - 1:
                await asyncio.sleep(RATE_LIMIT_DELAY)

    return embeddings
