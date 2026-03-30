"""
ingest.py — Document upload and ingestion status routes.
All routes protected by JWT.
"""

import os
import tempfile
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from jwt_handler import verify_token
from db import chunks_db, agents_db
from ingestion.ingestor import ingest_document

router = APIRouter()

MAX_FILE_SIZE  = 10 * 1024 * 1024
MAX_TOTAL_SIZE = 10 * 1024 * 1024
MAX_FILES      = 5
ALLOWED_EXTS   = {".pdf", ".docx", ".txt"}


async def run_ingestion(agent_id: str, tmp_path: str, original_filename: str, job_id: str, document_id: str):
    """Background task — runs ingestion and cleans up temp file."""
    try:
        await ingest_document(
            agent_id=agent_id,
            file_path=tmp_path,
            original_filename=original_filename,
            job_id=job_id,
            document_id=document_id,
        )
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@router.post("/ingest")
async def ingest(
    background_tasks: BackgroundTasks,
    agent_id: str = Form(...),
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(verify_token),
):
    # Verify agent belongs to user
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Validate file count
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} files allowed")

    # Validate sizes and types, read content
    file_contents = []
    total_size = 0
    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(status_code=400, detail=f"{file.filename}: only PDF, DOCX, TXT allowed")
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"{file.filename}: exceeds 10MB limit")
        total_size += len(content)
        if total_size > MAX_TOTAL_SIZE:
            raise HTTPException(status_code=400, detail="Total file size exceeds 10MB limit")
        file_contents.append((file.filename, ext, content, len(content)))

    # Create document rows + ingestion jobs upfront, save files to temp
    results = []
    for filename, ext, content, file_size in file_contents:
        # Create document row
        document_id = await chunks_db.create_document(agent_id, filename, ext.lstrip("."), file_size)
        # Create ingestion job
        job_id = await chunks_db.create_ingestion_job(document_id)

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        # Queue background task
        background_tasks.add_task(run_ingestion, agent_id, tmp_path, filename, job_id, document_id)

        results.append({
            "job_id":      job_id,
            "document_id": document_id,
            "filename":    filename,
            "file_size":   file_size,
            "status":      "pending",
        })

    # Return immediately with all job_ids
    return {"files": results}


@router.get("/ingest/status/{job_id}")
async def get_ingest_status(job_id: str, current_user: dict = Depends(verify_token)):
    job = await chunks_db.get_ingestion_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
