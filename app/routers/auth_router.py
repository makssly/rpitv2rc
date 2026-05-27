from datetime import timedelta

import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.auth import verify_password, create_access_token, get_current_user
from app.config import DB_PATH, ACCESS_TOKEN_EXPIRE_MINUTES, COOKIE_SECURE

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM users WHERE username = ?", (form_data.username,)
        )
        user = await cursor.fetchone()

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        {"sub": user["username"]},
        timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=COOKIE_SECURE,
    )
    return {
        "message": "Login successful",
        "username": user["username"],
        "is_admin": bool(user["is_admin"]),
    }


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", samesite="lax", secure=COOKIE_SECURE)
    return {"message": "Logged out"}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "username": current_user["username"],
        "is_admin": bool(current_user["is_admin"]),
    }
