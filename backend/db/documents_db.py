"""
documents_db.py — All Supabase queries for the documents table.
"""

from db.supabase_client import get_supabase


async def get_documents_by_agent(agent_id: str) -> list:
    db = get_supabase()
    response = db.table("documents").select("id, filename, filetype, file_size, status, chunk_count, created_at").eq("agent_id", agent_id).execute()
    return response.data
