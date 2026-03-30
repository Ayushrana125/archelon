"""
agents.py — Agent CRUD routes. All routes protected by JWT.
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from jwt_handler import verify_token
from db import agents_db, documents_db

router = APIRouter()


class CreateAgentRequest(BaseModel):
    name:         str
    description:  Optional[str] = None
    instructions: Optional[str] = None
    model:        Optional[str] = "mistral-small-latest"


class UpdateAgentRequest(BaseModel):
    name:         Optional[str] = None
    description:  Optional[str] = None
    instructions: Optional[str] = None
    model:        Optional[str] = None


@router.post("/agents")
async def create_agent(body: CreateAgentRequest, current_user: dict = Depends(verify_token)):
    agent = await agents_db.create_agent(
        user_id      = current_user["user_id"],
        name         = body.name,
        description  = body.description,
        instructions = body.instructions,
        model        = body.model,
    )
    return agent


@router.get("/agents")
async def get_agents(current_user: dict = Depends(verify_token)):
    agents = await agents_db.get_agents_by_user(current_user["user_id"])
    return agents


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: str, current_user: dict = Depends(verify_token)):
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.patch("/agents/{agent_id}")
async def update_agent(agent_id: str, body: UpdateAgentRequest, current_user: dict = Depends(verify_token)):
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    agent = await agents_db.update_agent(agent_id, current_user["user_id"], updates)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.delete("/agents/{agent_id}")
async def delete_agent(agent_id: str, current_user: dict = Depends(verify_token)):
    await agents_db.delete_agent(agent_id, current_user["user_id"])
    return {"message": "Agent deleted"}


@router.get("/agents/{agent_id}/documents")
async def get_agent_documents(agent_id: str, current_user: dict = Depends(verify_token)):
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    documents = await documents_db.get_documents_by_agent(agent_id)
    return documents


@router.delete("/agents/{agent_id}/documents/{document_id}")
async def delete_document(agent_id: str, document_id: str, current_user: dict = Depends(verify_token)):
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await documents_db.delete_document(document_id, agent_id)
    return {"message": "Document deleted"}


@router.get("/agents/{agent_id}/documents/{document_id}/history")
async def get_document_history(agent_id: str, document_id: str, current_user: dict = Depends(verify_token)):
    agent = await agents_db.get_agent_by_id(agent_id, current_user["user_id"])
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    job = await documents_db.get_ingestion_job_by_document(document_id)
    return job or {}
