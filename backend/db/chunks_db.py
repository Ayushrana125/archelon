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


async def insert_parent_chunk(document_id: str, chunk, chunk_index: int) -> str:
    db           = get_supabase()
    section_name = " > ".join(chunk.heading_path) if chunk.heading_path else None
    response     = db.table("parent_chunks").insert({
        "document_id":  document_id,
        "content":      chunk.markdown,
        "section_name": section_name,
        "page_number":  chunk.page_start or None,
        "chunk_index":  chunk_index,
        "token_count":  chunk.token_count,
    }).execute()
    return response.data[0]["id"]


async def insert_child_chunk(parent_uuid: str, chunk, chunk_index: int):
    db = get_supabase()
    db.table("child_chunks").insert({
        "parent_id":   parent_uuid,
        "content":     chunk.markdown,
        "chunk_index": chunk_index,
        "token_count": chunk.token_count,
        "embedding":   None,  # added in embedding phase
    }).execute()


async def update_document_status(document_id: str, chunk_count: int, status: str = "processed"):
    db = get_supabase()
    db.table("documents").update({
        "chunk_count": chunk_count,
        "status":      status,
    }).eq("id", document_id).execute()
