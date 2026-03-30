"""
ingestor.py — Orchestrates the full document ingestion pipeline.

Flow:
  1. Create document row + ingestion job
  2. Parse document → update job with parse stats
  3. Build chunks → update job with chunk stats
  4. Batch insert into Supabase → update job as done
"""

import os
import time
from ingestion.document_parser import parse_document
from ingestion.chunker import build_parent_chunks, build_child_chunks
from db import chunks_db


async def ingest_document(agent_id: str, file_path: str, original_filename: str = None) -> dict:
    start_time = time.time()
    filename   = original_filename or os.path.basename(file_path)
    file_size  = os.path.getsize(file_path)

    # Step 1 — Create document row + ingestion job
    document_id = await chunks_db.create_document(agent_id, filename, "pdf", file_size)
    job_id      = await chunks_db.create_ingestion_job(document_id)

    try:
        # Step 2 — Parse document
        await chunks_db.update_ingestion_job(job_id, "parsing", metadata={
            "step": "parsing",
            "filename": filename,
            "file_size": file_size,
        })

        elements, doc_title, filetype = parse_document(file_path)

        # Update document filetype now that we know it
        from db.supabase_client import get_supabase
        get_supabase().table("documents").update({"filetype": filetype}).eq("id", document_id).execute()

        await chunks_db.update_ingestion_job(job_id, "chunking", metadata={
            "step":      "chunking",
            "filename":  filename,
            "file_size": file_size,
            "filetype":  filetype.upper(),
            "elements":  len(elements),
        })

        # Step 3 — Build chunks
        parents  = build_parent_chunks(elements, doc_title)
        children = build_child_chunks(parents)

        total_tokens = sum(p.token_count for p in parents)
        avg_tokens   = round(total_tokens / len(parents)) if parents else 0

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

        # Step 4 — Batch insert
        parent_id_map = await chunks_db.batch_insert_parent_chunks(document_id, parents)
        await chunks_db.batch_insert_child_chunks(parent_id_map, children)
        await chunks_db.update_document_status(document_id, len(children))

        duration_ms = round((time.time() - start_time) * 1000)

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

        return {
            "job_id":        job_id,
            "document_id":   document_id,
            "status":        "done",
            "parent_chunks": len(parents),
            "child_chunks":  len(children),
            "duration_ms":   duration_ms,
        }

    except Exception as e:
        await chunks_db.update_ingestion_job(job_id, "error", error=str(e))
        await chunks_db.update_document_status(document_id, 0, status="error")
        raise
