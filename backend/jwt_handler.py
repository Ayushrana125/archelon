"""
jwt_handler.py — JWT token creation and verification.
"""

import os
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, Header
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM  = "HS256"
EXPIRY_HRS = 24


def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email":   email,
        "exp":     datetime.utcnow() + timedelta(hours=EXPIRY_HRS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(authorization: str = Header(...)) -> dict:
    """
    FastAPI dependency — extracts and verifies JWT from Authorization header.
    Usage: user = Depends(verify_token)
    Returns: { "user_id": "...", "email": "..." }
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"user_id": payload["user_id"], "email": payload["email"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
