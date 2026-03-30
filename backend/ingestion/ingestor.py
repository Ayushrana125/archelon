"""
ingestor.py — Orchestrates the full document ingestion pipeline.

Flow:
  1. Parse document (PDF/DOCX) → elements
  2. Build parent chunks from elements
  3. Build child chunks from parent chunks
  4. Insert everything into Supabase
"""

import os
from ingestion.document_parser import parse_document
from ingestion.chunker import build_parent_chunks, build_child_chunks
from db import chunks_db


async def ingest_document(agent_id: str, file_path: str) -> dict:
    """
    Full ingestion pipeline for a single document.
    Returns summary dict with document_id and chunk counts.
    """

    # Step 1 — Parse
    elements, doc_title, filetype = parse_document(file_path)
    file_size = os.path.getsize(file_path)
    filename  = os.path.basename(file_path)

    # Step 2 — Chunk
    parents  = build_parent_chunks(elements, doc_title)
    children = build_child_chunks(parents)

    # Step 3 — Create document row
    document_id = await chunks_db.create_document(agent_id, filename, filetype, file_size)

    # Step 4 — Insert parent chunks, map local IDs to Supabase UUIDs
    parent_id_map = {}
    for idx, parent in enumerate(parents):
        supabase_id               = await chunks_db.insert_parent_chunk(document_id, parent, idx)
        parent_id_map[parent.parent_id] = supabase_id

    # Step 5 — Insert child chunks using mapped parent UUIDs
    for idx, child in enumerate(children):
        parent_uuid = parent_id_map[child.parent_id]
        await chunks_db.insert_child_chunk(parent_uuid, child, idx)

    # Step 6 — Update document status
    await chunks_db.update_document_status(document_id, len(children))

    return {
        "document_id":    document_id,
        "doc_title":      doc_title,
        "filetype":       filetype,
        "parent_chunks":  len(parents),
        "child_chunks":   len(children),
        "status":         "processed",
    }
