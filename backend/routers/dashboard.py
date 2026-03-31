from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from db.supabase_client import get_supabase
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
    _: dict = Depends(require_developer),
):
    db = get_supabase()

    # Total users (exclude developers)
    users_q = db.table("users").select("id", count="exact").eq("is_developer", False)
    if date_from: users_q = users_q.gte("created_at", date_from)
    if date_to:   users_q = users_q.lte("created_at", date_to)
    total_users = users_q.execute().count or 0

    # Total agents (exclude system)
    agents_q = db.table("agents").select("id", count="exact").eq("is_system", False)
    if date_from: agents_q = agents_q.gte("created_at", date_from)
    if date_to:   agents_q = agents_q.lte("created_at", date_to)
    total_agents = agents_q.execute().count or 0

    # Total documents
    docs_q = db.table("documents").select("id", count="exact")
    if date_from: docs_q = docs_q.gte("created_at", date_from)
    if date_to:   docs_q = docs_q.lte("created_at", date_to)
    total_documents = docs_q.execute().count or 0

    # Parent chunks + tokens
    pc_res = db.table("parent_chunks").select("id, token_count", count="exact").execute()
    total_parent_chunks = pc_res.count or 0
    parent_tokens = sum(r.get("token_count") or 0 for r in (pc_res.data or []))

    # Child chunks + tokens
    cc_res = db.table("child_chunks").select("id, parent_id, token_count", count="exact").execute()
    total_child_chunks = cc_res.count or 0
    child_tokens = sum(r.get("token_count") or 0 for r in (cc_res.data or []))

    # --- Build enriched users list ---
    all_users_raw = db.table("users").select("id, username, first_name, last_name").eq("is_developer", False).execute().data or []
    all_agents_raw = db.table("agents").select("id, name, user_id").eq("is_system", False).execute().data or []

    # Count agents per user
    agent_count_by_user = {}
    for a in all_agents_raw:
        agent_count_by_user[a["user_id"]] = agent_count_by_user.get(a["user_id"], 0) + 1

    all_users = sorted(
        [{**u, "agent_count": agent_count_by_user.get(u["id"], 0)} for u in all_users_raw],
        key=lambda u: u["agent_count"], reverse=True
    )

    # --- Build enriched agents list with token_count and owner name ---
    all_docs = db.table("documents").select("id, agent_id").execute().data or []
    doc_to_agent = {d["id"]: d["agent_id"] for d in all_docs}

    all_parents = db.table("parent_chunks").select("id, document_id").execute().data or []
    parent_to_doc = {p["id"]: p["document_id"] for p in all_parents}

    token_by_agent = {}
    for cc in (cc_res.data or []):
        doc_id = parent_to_doc.get(cc["parent_id"])
        agent_id = doc_to_agent.get(doc_id) if doc_id else None
        if agent_id:
            token_by_agent[agent_id] = token_by_agent.get(agent_id, 0) + (cc.get("token_count") or 0)

    user_lookup = {u["id"]: u for u in all_users_raw}

    all_agents = sorted(
        [{
            **a,
            "token_count": token_by_agent.get(a["id"], 0),
            "owner": f"{user_lookup[a['user_id']]['first_name']} {user_lookup[a['user_id']]['last_name']}" if a["user_id"] in user_lookup else "—",
        } for a in all_agents_raw],
        key=lambda a: a["token_count"], reverse=True
    )

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
