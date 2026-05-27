import aiosqlite
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_password_hash, require_admin
from app.config import DB_PATH

router = APIRouter(prefix="/api/users", tags=["users"])


class UserCreate(BaseModel):
    username: str
    password: str


class PasswordChange(BaseModel):
    password: str


@router.get("")
async def list_users(admin: dict = Depends(require_admin)):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, username, is_admin, created_at FROM users ORDER BY id"
        )
        users = await cursor.fetchall()
    return [dict(u) for u in users]


@router.post("")
async def create_user(body: UserCreate, admin: dict = Depends(require_admin)):
    hashed = get_password_hash(body.password)
    try:
        async with aiosqlite.connect(DB_PATH) as db:
            await db.execute(
                "INSERT INTO users (username, hashed_password, is_admin) VALUES (?, ?, 0)",
                (body.username, hashed),
            )
            await db.commit()
    except Exception:
        raise HTTPException(status_code=400, detail="Username already exists")
    return {"message": "User created"}


@router.delete("/{user_id}")
async def delete_user(user_id: int, admin: dict = Depends(require_admin)):
    if admin["id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, is_admin FROM users WHERE id = ?", (user_id,)
        )
        user = await cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user["is_admin"]:
            raise HTTPException(status_code=400, detail="Cannot delete admin users")
        await db.execute("DELETE FROM users WHERE id = ?", (user_id,))
        await db.commit()
    return {"message": "User deleted"}


@router.post("/{user_id}/password")
async def change_password(
    user_id: int, body: PasswordChange, admin: dict = Depends(require_admin)
):
    hashed = get_password_hash(body.password)
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        user = await cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        await db.execute(
            "UPDATE users SET hashed_password = ? WHERE id = ?", (hashed, user_id)
        )
        await db.commit()
    return {"message": "Password updated"}
