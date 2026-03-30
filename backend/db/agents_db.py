"""
agents_db.py — All Supabase queries for the agents table.
"""

from db.supabase_client import get_supabase


async def create_agent(user_id: str, name: str, description: str = None, instructions: str = None, model: str = "mistral-small-latest") -> dict:
    db = get_supabase()
    response = db.table("agents").insert({
        "user_id":      user_id,
        "name":         name,
        "description":  description,
        "instructions": instructions,
        "model":        model,
    }).execute()
    return response.data[0]


async def get_agents_by_user(user_id: str) -> list:
    db = get_supabase()
    response = db.table("agents").select("*").eq("user_id", user_id).eq("is_active", True).execute()
    return response.data


async def get_agent_by_id(agent_id: str, user_id: str) -> dict:
    db = get_supabase()
    response = db.table("agents").select("*").eq("id", agent_id).eq("user_id", user_id).single().execute()
    return response.data


async def update_agent(agent_id: str, user_id: str, updates: dict) -> dict:
    db = get_supabase()
    response = db.table("agents").update(updates).eq("id", agent_id).eq("user_id", user_id).execute()
    return response.data[0] if response.data else None


async def delete_agent(agent_id: str, user_id: str):
    db = get_supabase()
    db.table("agents").delete().eq("id", agent_id).eq("user_id", user_id).execute()
