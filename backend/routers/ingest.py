"""
ingest.py — Document upload and ingestion status routes.
All routes protected by JWT.
"""

import os
import tempfile
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from jwt_handler import verify_token
from db import chunks_db, agents_db
from ingestion.ingestor import ingest_document

router = APIRouter()

MAX_FILE_SIZE  = 10 * 1024 * 1024   # 10MB per file
MAX_TOTAL_SIZE = 10 * 1024 * 1024   # 10MB total
MAX_FILES      = 5
ALLOWED_TYPES  = {"application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"}
ALLOWED_EXTS   = {".pdf", ".docx", ".txt"}


@router.post("/ingest")
async def ingest(
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

    # Validate file sizes and types
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
        await file.seek(0)

    # Process each file
    results = []
    for file in files:
        content = await file.read()
        ext     = os.path.splitext(file.filename)[1].lower()

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            result = await ingest_document(agent_id, tmp_path, original_filename=file.filename)
            result["filename"] = file.filename
            results.append(result)
        finally:
            os.unlink(tmp_path)

    return {"files": results}


@router.get("/ingest/status/{job_id}")
async def get_ingest_status(job_id: str, current_user: dict = Depends(verify_token)):
    job = await chunks_db.get_ingestion_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
