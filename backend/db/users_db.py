from db.supabase_client import get_supabase


async def create_user(first_name: str, last_name: str, username: str, email: str,
                      password_hash: str, company_name: str = None, website: str = None) -> dict:
    db = get_supabase()
    response = db.table("users").insert({
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "company_name": company_name,
        "website": website,
    }).execute()
    return response.data[0] if response.data else None


async def get_user_by_email(email: str) -> dict:
    db = get_supabase()
    response = db.table("users").select("*").eq("email", email).single().execute()
    return response.data


async def get_user_by_username(username: str) -> dict:
    db = get_supabase()
    response = db.table("users").select("*").eq("username", username).single().execute()
    return response.data


async def username_exists(username: str) -> bool:
    db = get_supabase()
    response = db.table("users").select("id").eq("username", username).execute()
    return len(response.data) > 0


async def email_exists(email: str) -> bool:
    db = get_supabase()
    response = db.table("users").select("id").eq("email", email).execute()
    return len(response.data) > 0


async def delete_user(user_id: str):
    db = get_supabase()
    db.table("users").delete().eq("id", user_id).execute()
