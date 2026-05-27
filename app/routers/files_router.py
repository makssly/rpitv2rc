import os
import shutil
from uuid import uuid4
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.auth import get_current_user
from app.config import FILES_ROOT, MAX_UPLOAD_BYTES, UPLOAD_FILE_SIZE_LIMIT_MB

router = APIRouter(tags=["files"])
download_router = APIRouter(tags=["download"])

UPLOAD_CHUNK_SIZE = 1024 * 1024


def _files_root() -> Path:
    return FILES_ROOT.resolve()


def _parse_relative_path(rel: str) -> tuple[str, ...]:
    rel = rel or ""
    if rel.startswith("/") or "\\" in rel or "\x00" in rel:
        raise HTTPException(status_code=400, detail="Invalid path")

    parts = tuple(part for part in rel.split("/") if part)
    if any(part in {".", ".."} for part in parts):
        raise HTTPException(status_code=400, detail="Path traversal not allowed")
    return parts


def _ensure_inside_root(path: Path) -> None:
    try:
        path.relative_to(_files_root())
    except ValueError:
        raise HTTPException(status_code=400, detail="Path traversal not allowed")


def validate_child_name(name: str, field: str = "name") -> str:
    clean = (name or "").strip()
    if (
        not clean
        or clean in {".", ".."}
        or "/" in clean
        or "\\" in clean
        or "\x00" in clean
    ):
        raise HTTPException(status_code=400, detail=f"Invalid {field}")
    return clean


def resolve_path(rel: str) -> Path:
    """Resolve a relative path inside FILES_ROOT and guard against traversal."""
    root = _files_root()
    parts = _parse_relative_path(rel)
    candidate = root.joinpath(*parts)

    current = root
    for part in parts:
        current = current / part
        if current.is_symlink():
            raise HTTPException(status_code=400, detail="Symlink paths are not allowed")

    try:
        full = candidate.resolve()
    except OSError:
        raise HTTPException(status_code=400, detail="Invalid path")
    _ensure_inside_root(full)
    return full


# ── Directory listing ────────────────────────────────────────────────────────

@router.get("/api/files")
@router.get("/api/files/{path:path}")
async def list_files(
    path: str = "",
    _user: dict = Depends(get_current_user),
):
    full = resolve_path(path)
    if not full.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not full.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    items = []
    root = _files_root()
    visible_items = [item for item in full.iterdir() if not item.is_symlink()]
    for item in sorted(visible_items, key=lambda x: (not x.is_dir(), x.name.lower())):
        stat = item.stat()
        items.append(
            {
                "name": item.name,
                "type": "directory" if item.is_dir() else "file",
                "size": stat.st_size if item.is_file() else None,
                "modified": stat.st_mtime,
                "path": str(item.relative_to(root)).replace("\\", "/"),
            }
        )
    return {"path": path, "items": items}


# ── Upload ───────────────────────────────────────────────────────────────────

@router.post("/api/upload")
@router.post("/api/upload/{path:path}")
async def upload_file(
    file: UploadFile = File(...),
    path: str = "",
    _user: dict = Depends(get_current_user),
):
    dir_path = resolve_path(path)
    if not dir_path.is_dir():
        raise HTTPException(status_code=400, detail="Target is not a directory")

    filename = validate_child_name(file.filename or "", "filename")
    file_path = dir_path / filename
    _ensure_inside_root(file_path.resolve(strict=False))
    if file_path.is_symlink():
        raise HTTPException(status_code=400, detail="Symlink targets are not allowed")
    if file_path.exists() and file_path.is_dir():
        raise HTTPException(status_code=400, detail="Target is a directory")

    temp_path = dir_path / f".{filename}.upload-{uuid4().hex}.tmp"
    bytes_written = 0
    try:
        with temp_path.open("xb") as out:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE):
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            "File is too large to be uploaded. "
                            f"Current limit per file is {UPLOAD_FILE_SIZE_LIMIT_MB} MB."
                        ),
                    )
                out.write(chunk)
        temp_path.replace(file_path)
    except HTTPException:
        if temp_path.exists():
            temp_path.unlink()
        raise
    except OSError:
        if temp_path.exists():
            temp_path.unlink()
        raise HTTPException(status_code=400, detail="Upload failed")
    finally:
        await file.close()

    os.chmod(file_path, 0o644)
    return {"message": "File uploaded", "name": filename}


# ── Create directory ─────────────────────────────────────────────────────────

class MkdirRequest(BaseModel):
    name: str


@router.post("/api/mkdir")
@router.post("/api/mkdir/{path:path}")
async def make_directory(
    request: MkdirRequest,
    path: str = "",
    _user: dict = Depends(get_current_user),
):
    parent = resolve_path(path)
    name = validate_child_name(request.name)
    new_dir = parent / name
    _ensure_inside_root(new_dir.resolve(strict=False))
    if new_dir.exists() or new_dir.is_symlink():
        raise HTTPException(status_code=400, detail="Already exists")
    new_dir.mkdir(parents=False)
    os.chmod(new_dir, 0o755)
    return {"message": "Directory created"}


# ── Rename ───────────────────────────────────────────────────────────────────

class RenameRequest(BaseModel):
    new_name: str


@router.patch("/api/files/{path:path}")
async def rename_item(
    path: str,
    request: RenameRequest,
    _user: dict = Depends(get_current_user),
):
    full = resolve_path(path)
    if not full.exists():
        raise HTTPException(status_code=404, detail="Not found")

    new_name = validate_child_name(request.new_name, "new_name")
    new_path = full.parent / new_name
    _ensure_inside_root(new_path.resolve(strict=False))
    if new_path.exists() or new_path.is_symlink():
        raise HTTPException(status_code=400, detail="Name already taken")

    full.rename(new_path)
    if new_path.is_file():
        os.chmod(new_path, 0o644)
    return {"message": "Renamed successfully"}


# ── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/api/files/{path:path}")
async def delete_item(
    path: str,
    _user: dict = Depends(get_current_user),
):
    full = resolve_path(path)
    if not full.exists():
        raise HTTPException(status_code=404, detail="Not found")

    if full.is_dir():
        shutil.rmtree(full)
    else:
        full.unlink()
    return {"message": "Deleted"}


# ── Download ─────────────────────────────────────────────────────────────────

@download_router.get("/api/download/{path:path}")
async def download_file(
    path: str,
    _user: dict = Depends(get_current_user),
):
    full = resolve_path(path)
    if not full.exists() or not full.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(
        path=str(full),
        filename=full.name,
        media_type="application/octet-stream",
    )
