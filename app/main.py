import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import FILES_ROOT
from app.database import init_db
from app.routers import auth_router, files_router, users_router

# Set umask: files → 644, directories → 755
os.umask(0o022)

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    FILES_ROOT.mkdir(parents=True, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="File Manager", lifespan=lifespan)

# API routers
app.include_router(auth_router.router)
app.include_router(files_router.router)
app.include_router(files_router.download_router)
app.include_router(users_router.router)

# Static assets (js, css)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# Catch-all → serve SPA
@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    return FileResponse(str(STATIC_DIR / "index.html"))
