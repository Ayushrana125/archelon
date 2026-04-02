from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, agents, ingest, dashboard, chat

import uvicorn
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,      prefix="/api")
app.include_router(agents.router,    prefix="/api")
app.include_router(ingest.router,    prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(chat.router,      prefix="/api")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
