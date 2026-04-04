from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, agents, ingest, dashboard, chat, embed

import uvicorn
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve embed.js and Archelon logo publicly
@app.get("/embed.js")
async def serve_embed_js():
    from fastapi.responses import FileResponse
    return FileResponse("embed.js", media_type="application/javascript")

@app.get("/Archelon_logo.png")
async def serve_logo():
    from fastapi.responses import FileResponse
    import os
    logo_path = os.path.join(os.path.dirname(__file__), "Archelon_logo.png")
    return FileResponse(logo_path, media_type="image/png")

app.include_router(auth.router,      prefix="/api")
app.include_router(agents.router,    prefix="/api")
app.include_router(ingest.router,    prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(chat.router,      prefix="/api")
app.include_router(embed.router,     prefix="/api")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
