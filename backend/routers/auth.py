from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import bcrypt
from db import users_db
from jwt_handler import create_token

router = APIRouter()


class SignupRequest(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    website: Optional[str] = None


class LoginRequest(BaseModel):
    identifier: str
    password: str


@router.post("/auth/signup")
async def signup(body: SignupRequest):
    if await users_db.username_exists(body.username):
        raise HTTPException(status_code=400, detail="Username already taken")

    if await users_db.email_exists(body.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()

    user = await users_db.create_user(
        first_name=body.first_name,
        last_name=body.last_name,
        username=body.username,
        email=body.email,
        password_hash=password_hash,
        company_name=body.company_name,
        website=body.website,
    )

    token = create_token(user["id"], user["email"])

    return {
        "token": token,
        "user": {
            "id":         user["id"],
            "username":   user["username"],
            "email":      user["email"],
            "first_name": user["first_name"],
            "last_name":  user["last_name"],
        }
    }


@router.post("/auth/login")
async def login(body: LoginRequest):
    if "@" in body.identifier:
        user = await users_db.get_user_by_email(body.identifier)
    else:
        user = await users_db.get_user_by_username(body.identifier)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["email"])

    return {
        "token": token,
        "user": {
            "id":         user["id"],
            "username":   user["username"],
            "email":      user["email"],
            "first_name": user["first_name"],
            "last_name":  user["last_name"],
        }
    }
