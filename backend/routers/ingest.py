"""
ingest.py — Document upload and ingestion status routes.
All routes protected by JWT.
"""

import os
import re
import uuid
import tempfile
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from jwt_handler import verify_token
from db import chunks_db, agents_db
from db.token_usage_db import get_user_token_balance
from db.api_keys_db import update_key_settings
from ingestion.ingestor import ingest_document
from db.supabase_client import get_supabase

router = APIRouter()

MAX_FILE_SIZE  = 2 * 1024 * 1024   # 2MB per file
MAX_TOTAL_SIZE = 6 * 1024 * 1024   # 6MB total across all files in one upload
MAX_FILES      = 5
ALLOWED_EXTS   = {".pdf", ".docx", ".txt"}


def sanitize_filename(name: str) -> str:
    name = os.path.basename(name)              # strip path traversal e.g. ../../etc/passwd
    name = re.sub(r'[^\w\s\-.]', '', name)     # strip special chars, keep word chars, spaces, hyphens, dots
    name = name.strip('. ')                    # strip leading/trailing dots and spaces
    return name[:100] or 'document'            # max 100 chars, fallback if empty


async def run_ingestion(agent_id: str, user_id: str, tmp_path: str, original_filename: str, job_id: str, document_id: str):
    """Background task — runs ingestion and cleans up temp file."""
    try:
        await ingest_document(
            agent_id=agent_id,
            user_id=user_id,
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

    # Check token balance
    balance = await get_user_token_balance(current_user["user_id"])
    if balance["tokens_remaining"] <= 0:
        raise HTTPException(status_code=402, detail="Token limit reached. Upgrade your plan to continue.")

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
            raise HTTPException(status_code=400, detail=f"{file.filename}: exceeds 2MB limit")
        total_size += len(content)
        if total_size > MAX_TOTAL_SIZE:
            raise HTTPException(status_code=400, detail="Total file size exceeds 6MB limit")
        file_contents.append((sanitize_filename(file.filename), ext, content, len(content)))

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
        background_tasks.add_task(run_ingestion, agent_id, current_user["user_id"], tmp_path, filename, job_id, document_id)

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


@router.post("/embed/{agent_id}/logo")
async def upload_logo(
    agent_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token),
):
    # Verify agent belongs to user
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Validate file type
    allowed = {'.png', '.jpg', '.jpeg', '.webp', '.svg'}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, WEBP, SVG allowed")

    # Validate file size — 500KB max
    content = await file.read()
    if len(content) > 500 * 1024:
        raise HTTPException(status_code=400, detail="Logo must be under 500KB")

    # Upload to Supabase Storage
    filename = f"{agent_id}_{uuid.uuid4().hex[:8]}{ext}"
    db = get_supabase()
    res = db.storage.from_("widget-logos").upload(
        path=filename,
        file=content,
        file_options={"content-type": file.content_type, "upsert": "true"},
    )

    # Get public URL
    public_url = db.storage.from_("widget-logos").get_public_url(filename)

    # Save to api_keys
    await update_key_settings(agent_id, logo_url=public_url)

    return {"logo_url": public_url}
