"""
documents_db.py — All Supabase queries for the documents table.
"""

from db.supabase_client import get_supabase


async def get_documents_by_agent(agent_id: str) -> list:
    db = get_supabase()
    response = db.table("documents").select("id, filename, filetype, file_size, status, chunk_count, created_at").eq("agent_id", agent_id).execute()
    return response.data


async def delete_document(document_id: str, agent_id: str):
    db = get_supabase()
    db.table("documents").delete().eq("id", document_id).eq("agent_id", agent_id).execute()


async def get_ingestion_job_by_document(document_id: str) -> dict:
    db = get_supabase()
    response = db.table("ingestion_jobs").select("*").eq("document_id", document_id).order("created_at", desc=True).limit(1).execute()
    return response.data[0] if response.data else None
