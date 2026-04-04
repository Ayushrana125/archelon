"""
ingestor.py — Orchestrates the full document ingestion pipeline.
Called as a background task — job_id and document_id already created by router.
Pipeline: parsing → chunking → saving → embedding → done
"""

import os
import time
from ingestion.document_parser import parse_document
from ingestion.chunker import build_parent_chunks, build_child_chunks
from ingestion.embedding_service import embed_chunks
from db import chunks_db
from db.token_usage_db import insert_embedding_event


async def ingest_document(agent_id: str, user_id: str, file_path: str, original_filename: str, job_id: str, document_id: str):
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

        # Zip bomb / parser explosion guard — parsed content must be reasonable
        total_content_size = sum(len(str(e)) for e in elements)
        if total_content_size > 5_000_000:  # 5MB of extracted text is excessive
            raise ValueError("Parsed content too large. File may be malformed.")

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

        parent_id_map  = await chunks_db.batch_insert_parent_chunks(document_id, parents)
        inserted_children = await chunks_db.batch_insert_child_chunks(parent_id_map, children)
        await chunks_db.update_document_status(document_id, len(children))

        # Step 4 — Embed
        # Build list of {id, content, token_count} from inserted rows
        child_chunks_for_embed = [
            {
                "id":          row["id"],
                "content":     row["content"],
                "token_count": row["token_count"],
            }
            for row in inserted_children
        ]

        total_batches = max(1, -(-len(child_chunks_for_embed) // 150))  # rough ceil estimate
        await chunks_db.update_ingestion_job(job_id, "embedding", metadata={
            "step":           "embedding",
            "filename":       filename,
            "file_size":      file_size,
            "filetype":       filetype.upper(),
            "elements":       len(elements),
            "parent_chunks":  len(parents),
            "child_chunks":   len(children),
            "total_tokens":   total_tokens,
            "avg_tokens":     avg_tokens,
            "embed_batches":  0,
            "embed_total":    total_batches,
        })

        # Track batch progress and update job metadata live
        current_meta = {
            "step":           "embedding",
            "filename":       filename,
            "file_size":      file_size,
            "filetype":       filetype.upper(),
            "elements":       len(elements),
            "parent_chunks":  len(parents),
            "child_chunks":   len(children),
            "total_tokens":   total_tokens,
            "avg_tokens":     avg_tokens,
            "embed_total":    total_batches,
        }

        async def on_batch_done(batch_num, total):
            current_meta["embed_batches"] = batch_num
            current_meta["embed_total"]   = total
            await chunks_db.update_ingestion_job(job_id, "embedding", metadata=dict(current_meta))

        embeddings = None
        for attempt in range(3):
            try:
                embeddings = await embed_chunks(child_chunks_for_embed, on_batch_done=on_batch_done)
                break
            except RuntimeError as e:
                if attempt == 2:
                    raise
                wait = 2 ** attempt  # 1s, 2s
                print(f"[ingestor] Embedding attempt {attempt + 1} failed, retrying in {wait}s: {e}")
                await chunks_db.update_ingestion_job(job_id, "embedding", metadata={
                    **current_meta,
                    "embed_retry": attempt + 1,
                })
                import asyncio
                await asyncio.sleep(wait)

        # Step 5 — Save vectors
        await chunks_db.update_ingestion_job(job_id, "vectorizing", metadata={
            **current_meta,
            "step": "vectorizing",
        })
        await chunks_db.update_child_chunk_embeddings(embeddings)

        duration_ms = round((time.time() - start_time) * 1000)

        # Step 6 — Done
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

        await insert_embedding_event(
            agent_id=agent_id,
            user_id=user_id,
            embedding_tokens=total_tokens,
            job_id=job_id,
        )

    except Exception as e:
        error_msg = str(e)
        # Write error to job first
        await chunks_db.update_ingestion_job(job_id, "error", error=error_msg)
        # Mark document as errored but don't delete it — deleting cascades and removes the job row
        # User will see the error in the UI and can delete the document manually or retry
        await chunks_db.update_document_status(document_id, 0, status="error")
