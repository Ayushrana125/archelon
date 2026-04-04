"""
api_keys_db.py — API key management for embed deployments.
Keys are hashed before storage — raw key shown only once at generation.
Presence of a row = active. Deletion = disabled.
"""

import hashlib
import secrets
from db.supabase_client import get_supabase


def _hash_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode()).hexdigest()


async def generate_api_key(user_id: str, agent_id: str, widget_name: str = None, allowed_origins: list = None) -> dict:
    """Generate a new API key for an agent. Deletes any existing key first."""
    db = get_supabase()

    # Delete existing key for this agent if any
    db.table("api_keys").delete().eq("agent_id", agent_id).execute()

    # Generate new key
    raw_key = "arch_live_" + secrets.token_urlsafe(32)
    key_hash = _hash_key(raw_key)
    key_prefix = raw_key[:20] + "..."

    db.table("api_keys").insert({
        "user_id":         user_id,
        "agent_id":        agent_id,
        "key_hash":        key_hash,
        "key_prefix":      key_prefix,
        "widget_name":     widget_name,
        "allowed_origins": allowed_origins or [],
    }).execute()

    return {
        "raw_key":    raw_key,   # shown once, never stored
        "key_prefix": key_prefix,
        "agent_id":   agent_id,
    }


async def get_key_by_agent(agent_id: str) -> dict | None:
    """Get the active key record for an agent (without raw key)."""
    db = get_supabase()
    res = db.table("api_keys").select("id, agent_id, user_id, key_prefix, widget_name, allowed_origins, created_at, last_used_at").eq("agent_id", agent_id).execute()
    return res.data[0] if res.data else None


async def validate_api_key(raw_key: str) -> dict | None:
    """Validate a raw API key. Returns the key record if valid, None if not."""
    db = get_supabase()
    key_hash = _hash_key(raw_key)
    res = db.table("api_keys").select("*").eq("key_hash", key_hash).execute()
    if not res.data:
        return None
    record = res.data[0]
    # Update last_used_at
    db.table("api_keys").update({"last_used_at": "now()"}).eq("id", record["id"]).execute()
    return record


async def update_key_settings(agent_id: str, widget_name: str = None, allowed_origins: list = None):
    """Update widget name and allowed origins without regenerating the key."""
    db = get_supabase()
    updates = {}
    if widget_name is not None:
        updates["widget_name"] = widget_name
    if allowed_origins is not None:
        updates["allowed_origins"] = allowed_origins
    if updates:
        db.table("api_keys").update(updates).eq("agent_id", agent_id).execute()


async def delete_api_key(agent_id: str):
    """Delete the API key for an agent (disables embed)."""
    db = get_supabase()
    db.table("api_keys").delete().eq("agent_id", agent_id).execute()
