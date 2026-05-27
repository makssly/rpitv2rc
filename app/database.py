import aiosqlite
from passlib.context import CryptContext
from app.config import DB_PATH, ADMIN_USERNAME, ADMIN_PASSWORD

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()

        # Create admin user on first run
        cursor = await db.execute(
            "SELECT id FROM users WHERE username = ?", (ADMIN_USERNAME,)
        )
        existing = await cursor.fetchone()
        if not existing:
            hashed = pwd_context.hash(ADMIN_PASSWORD)
            await db.execute(
                "INSERT INTO users (username, hashed_password, is_admin) VALUES (?, ?, 1)",
                (ADMIN_USERNAME, hashed),
            )
            await db.commit()
