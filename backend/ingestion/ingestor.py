"""
ingestor.py — Orchestrates the full document ingestion pipeline.
Called as a background task — job_id and document_id already created by router.
"""

import os
import time
from ingestion.document_parser import parse_document
from ingestion.chunker import build_parent_chunks, build_child_chunks
from db import chunks_db


async def ingest_document(agent_id: str, file_path: str, original_filename: str, job_id: str, document_id: str):
    start_time = time.time()
    filename   = original_filename
    file_size  = os.path.getsize(file_path)

    try:
        # Step 1 — Parse
        await chunks_db.update_ingestion_job(job_id, "parsing", metadata={
            "step":      "parsing",
            "filename":  filename,
            "file_size": file_size,
        })

        elements, doc_title, filetype = parse_document(file_path)

        from db.supabase_client import get_supabase
        get_supabase().table("documents").update({"filetype": filetype}).eq("id", document_id).execute()

        # Step 2 — Chunk
        await chunks_db.update_ingestion_job(job_id, "chunking", metadata={
            "step":      "chunking",
            "filename":  filename,
            "file_size": file_size,
            "filetype":  filetype.upper(),
            "elements":  len(elements),
        })

        parents  = build_parent_chunks(elements, doc_title)
        children = build_child_chunks(parents)

        total_tokens = sum(p.token_count for p in parents)
        avg_tokens   = round(total_tokens / len(parents)) if parents else 0

        # Step 3 — Save
        await chunks_db.update_ingestion_job(job_id, "saving", metadata={
            "step":          "saving",
            "filename":      filename,
            "file_size":     file_size,
            "filetype":      filetype.upper(),
            "elements":      len(elements),
            "parent_chunks": len(parents),
            "child_chunks":  len(children),
            "total_tokens":  total_tokens,
            "avg_tokens":    avg_tokens,
        })

        parent_id_map = await chunks_db.batch_insert_parent_chunks(document_id, parents)
        await chunks_db.batch_insert_child_chunks(parent_id_map, children)
        await chunks_db.update_document_status(document_id, len(children))

        duration_ms = round((time.time() - start_time) * 1000)

        # Step 4 — Done
        await chunks_db.update_ingestion_job(job_id, "done", metadata={
            "step":          "done",
            "filename":      filename,
            "file_size":     file_size,
            "filetype":      filetype.upper(),
            "elements":      len(elements),
            "parent_chunks": len(parents),
            "child_chunks":  len(children),
            "total_tokens":  total_tokens,
            "avg_tokens":    avg_tokens,
            "duration_ms":   duration_ms,
        })

    except Exception as e:
        await chunks_db.update_ingestion_job(job_id, "error", error=str(e))
        await chunks_db.update_document_status(document_id, 0, status="error")
        raise
