"""
chunks_db.py — All Supabase queries for documents, parent_chunks, child_chunks.
"""

import os
from db.supabase_client import get_supabase


async def create_document(agent_id: str, filename: str, filetype: str, file_size: int) -> str:
    db = get_supabase()
    response = db.table("documents").insert({
        "agent_id":  agent_id,
        "filename":  filename,
        "filetype":  filetype,
        "file_size": file_size,
        "status":    "processing",
    }).execute()
    return response.data[0]["id"]


async def create_ingestion_job(document_id: str) -> str:
    db = get_supabase()
    response = db.table("ingestion_jobs").insert({
        "document_id": document_id,
        "status":      "parsing",
        "metadata":    {},
    }).execute()
    return response.data[0]["id"]


async def update_ingestion_job(job_id: str, status: str, metadata: dict = None, error: str = None):
    db = get_supabase()
    updates = {"status": status}
    if metadata is not None:
        updates["metadata"] = metadata
    if error is not None:
        updates["error"] = error
    if status == "done":
        from datetime import datetime
        updates["completed_at"] = datetime.utcnow().isoformat()
    db.table("ingestion_jobs").update(updates).eq("id", job_id).execute()


async def get_ingestion_job(job_id: str) -> dict:
    db = get_supabase()
    response = db.table("ingestion_jobs").select("*").eq("id", job_id).execute()
    return response.data[0] if response.data else None


async def batch_insert_parent_chunks(document_id: str, chunks: list) -> dict:
    """Insert all parent chunks in one DB call. Returns map of local_id -> supabase_uuid."""
    db = get_supabase()
    rows = []
    for idx, chunk in enumerate(chunks):
        section_name = " > ".join(chunk.heading_path) if chunk.heading_path else None
        rows.append({
            "document_id":  document_id,
            "content":      chunk.markdown,
            "section_name": section_name,
            "page_number":  chunk.page_start or None,
            "chunk_index":  idx,
            "token_count":  chunk.token_count,
        })
    response = db.table("parent_chunks").insert(rows).execute()
    # Map local parent_id (parent_0000) -> supabase UUID
    parent_id_map = {}
    for i, row in enumerate(response.data):
        parent_id_map[chunks[i].parent_id] = row["id"]
    return parent_id_map


async def batch_insert_child_chunks(parent_id_map: dict, children: list) -> list[dict]:
    """Insert all child chunks in one DB call. Returns inserted rows with IDs."""
    db = get_supabase()
    rows = []
    for idx, child in enumerate(children):
        rows.append({
            "parent_id":   parent_id_map[child.parent_id],
            "content":     child.markdown,
            "chunk_index": idx,
            "token_count": child.token_count,
            "embedding":   None,
        })
    response = db.table("child_chunks").insert(rows).execute()
    return response.data or []


async def update_document_status(document_id: str, chunk_count: int, status: str = "processed"):
    db = get_supabase()
    db.table("documents").update({
        "chunk_count": chunk_count,
        "status":      status,
    }).eq("id", document_id).execute()


async def update_child_chunk_embeddings(embeddings: dict[str, list[float]]):
    """Update embeddings concurrently in batches to avoid N sequential DB calls."""
    import asyncio
    db = get_supabase()

    async def update_one(chunk_id, vector):
        db.table("child_chunks").update({"embedding": vector}).eq("id", chunk_id).execute()

    # Run in concurrent batches of 20
    items = list(embeddings.items())
    batch_size = 20
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        await asyncio.gather(*[update_one(cid, vec) for cid, vec in batch])


async def delete_document_cascade(document_id: str):
    """Delete document and chunks only. Does NOT delete ingestion_job — caller must handle it."""
    db = get_supabase()
    db.table("parent_chunks").delete().eq("document_id", document_id).execute()
    db.table("documents").delete().eq("id", document_id).execute()
