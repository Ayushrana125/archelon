"""
vector_search.py — Embeds a search query and retrieves matching child chunks
from Supabase via the retrieve-chunks edge function.
"""

import os
import httpx
from dotenv import load_dotenv

load_dotenv()

MISTRAL_API_KEY  = os.getenv("MISTRAL_API_KEY_1")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_EDGE_URL = os.getenv("SUPABASE_EDGE_URL")
EMBED_URL        = "https://api.mistral.ai/v1/embeddings"
EMBED_MODEL      = "mistral-embed"


async def embed_query(query: str) -> list[float]:
    """Embed a single query string using mistral-embed with retry on 429."""
    async with httpx.AsyncClient(timeout=30) as client:
        for attempt in range(3):
            response = await client.post(
                EMBED_URL,
                headers={
                    "Authorization": f"Bearer {MISTRAL_API_KEY}",
                    "Content-Type":  "application/json",
                },
                json={"model": EMBED_MODEL, "input": [query]},
            )
            if response.status_code == 429:
                import asyncio
                wait = 2 ** attempt
                print(f"[vector_search] Rate limited, retrying in {wait}s...")
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            return response.json()["data"][0]["embedding"]
    raise RuntimeError("Embedding failed after 3 retries")


async def vector_search(query: str, agent_id: str, match_count: int = 15) -> list[dict]:
    """
    Embed query and retrieve top matching chunks from Supabase edge function.
    Returns raw matches: [{child_id, parent_id, child_content, parent_content,
                           section_name, parent_token_count, score}]
    """
    try:
        query_embedding = await embed_query(query)

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                SUPABASE_EDGE_URL,
                headers={
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type":  "application/json",
                },
                json={
                    "query_embedding": query_embedding,
                    "agent_id":        agent_id,
                    "match_count":     match_count,
                },
            )
            response.raise_for_status()
            return response.json().get("matches", [])

    except Exception as e:
        print(f"[vector_search] ERROR: {e}")
        return []
