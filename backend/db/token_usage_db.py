"""
token_usage_db.py — Insert and aggregate token usage events.
"""

from db.supabase_client import get_supabase


async def insert_embedding_event(agent_id: str, user_id: str, embedding_tokens: int, job_id: str):
    db = get_supabase()
    db.table("token_usage").insert({
        "agent_id":         agent_id,
        "user_id":          user_id,
        "event_type":       "embedding",
        "embedding_tokens": embedding_tokens,
        "job_id":           job_id,
    }).execute()
    await _increment_user_tokens(user_id, embedding_tokens)


async def insert_query_event(
    agent_id: str, user_id: str,
    input_tokens: int, output_tokens: int,
    user_message: str, agent_response: str,
):
    print(f"[token_usage] insert_query_event called — agent={agent_id} user={user_id} input={input_tokens} output={output_tokens}")
    try:
        db = get_supabase()
        res = db.table("token_usage").insert({
            "agent_id":       agent_id,
            "user_id":        user_id,
            "event_type":     "query",
            "input_tokens":   input_tokens,
            "output_tokens":  output_tokens,
            "user_message":   user_message,
            "agent_response": agent_response,
        }).execute()
        print(f"[token_usage] insert result: {res.data}")
        await _increment_user_tokens(user_id, input_tokens + output_tokens)
    except Exception as e:
        print(f"[token_usage] ERROR in insert_query_event: {e}")


async def _increment_user_tokens(user_id: str, amount: int):
    if amount <= 0:
        return
    db = get_supabase()
    res = db.table("users").select("tokens_used").eq("id", user_id).execute()
    current = res.data[0]["tokens_used"] if res.data else 0
    db.table("users").update({"tokens_used": (current or 0) + amount}).eq("id", user_id).execute()


async def get_user_token_balance(user_id: str) -> dict:
    db = get_supabase()
    res = db.table("users").select("token_limit, tokens_used").eq("id", user_id).execute()
    if not res.data:
        return {"token_limit": 25000, "tokens_used": 0, "tokens_remaining": 25000}
    row = res.data[0]
    token_limit = row.get("token_limit") or 25000
    tokens_used = row.get("tokens_used") or 0
    remaining = max(0, token_limit - tokens_used)
    return {
        "token_limit":      token_limit,
        "tokens_used":      tokens_used,
        "tokens_remaining": remaining,
    }


async def get_agent_total_tokens(agent_id: str) -> int:
    db = get_supabase()
    res = db.table("token_usage").select("embedding_tokens, input_tokens, output_tokens").eq("agent_id", agent_id).execute()
    total = 0
    for row in (res.data or []):
        total += (row["embedding_tokens"] or 0) + (row["input_tokens"] or 0) + (row["output_tokens"] or 0)
    return total
