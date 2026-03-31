from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from db.supabase_client import get_supabase
from db import users_db
from jwt_handler import verify_token

router = APIRouter()


async def require_developer(current_user: dict = Depends(verify_token)) -> dict:
    db = get_supabase()
    response = db.table("users").select("is_developer").eq("id", current_user["user_id"]).execute()
    if not response.data or not response.data[0].get("is_developer"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    date_from: Optional[str] = Query(None),
    date_to:   Optional[str] = Query(None),
    user_id:   Optional[str] = Query(None),
    agent_id:  Optional[str] = Query(None),
    _: dict = Depends(require_developer),
):
    db = get_supabase()

    def apply_date(q, table_has_created_at=True):
        if date_from:
            q = q.gte("created_at", date_from)
        if date_to:
            q = q.lte("created_at", date_to)
        return q

    # Users (exclude developer accounts)
    users_q = db.table("users").select("id", count="exact").eq("is_developer", False)
    if date_from: users_q = users_q.gte("created_at", date_from)
    if date_to:   users_q = users_q.lte("created_at", date_to)
    total_users = users_q.execute().count or 0

    # Agents (exclude system agents)
    agents_q = db.table("agents").select("id", count="exact").eq("is_system", False)
    if user_id:   agents_q = agents_q.eq("user_id", user_id)
    if date_from: agents_q = agents_q.gte("created_at", date_from)
    if date_to:   agents_q = agents_q.lte("created_at", date_to)
    total_agents = agents_q.execute().count or 0

    # Documents
    docs_q = db.table("documents").select("id", count="exact")
    if agent_id:  docs_q = docs_q.eq("agent_id", agent_id)
    if date_from: docs_q = docs_q.gte("created_at", date_from)
    if date_to:   docs_q = docs_q.lte("created_at", date_to)
    total_documents = docs_q.execute().count or 0

    # Parent chunks + tokens
    pc_q = db.table("parent_chunks").select("id, token_count", count="exact")
    if date_from: pc_q = pc_q.gte("created_at", date_from)
    if date_to:   pc_q = pc_q.lte("created_at", date_to)
    pc_res = pc_q.execute()
    total_parent_chunks = pc_res.count or 0
    parent_tokens = sum(r.get("token_count") or 0 for r in (pc_res.data or []))

    # Child chunks + tokens
    cc_q = db.table("child_chunks").select("id, token_count", count="exact")
    if date_from: cc_q = cc_q.gte("created_at", date_from)
    if date_to:   cc_q = cc_q.lte("created_at", date_to)
    cc_res = cc_q.execute()
    total_child_chunks = cc_res.count or 0
    child_tokens = sum(r.get("token_count") or 0 for r in (cc_res.data or []))

    # Users list for filter dropdown (exclude developers)
    all_users = db.table("users").select("id, username, first_name, last_name").eq("is_developer", False).order("created_at", desc=True).execute().data or []
    # Agents list for filter dropdown (exclude system agents)
    all_agents = db.table("agents").select("id, name, user_id").eq("is_system", False).order("created_at", desc=True).execute().data or []

    return {
        "total_users":         total_users,
        "total_agents":        total_agents,
        "total_documents":     total_documents,
        "total_parent_chunks": total_parent_chunks,
        "total_child_chunks":  total_child_chunks,
        "parent_tokens":       parent_tokens,
        "child_tokens":        child_tokens,
        "users":               all_users,
        "agents":              all_agents,
    }
