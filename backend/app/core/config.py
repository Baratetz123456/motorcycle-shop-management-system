import os

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:123@localhost:5432/motorcycle_shop"
)

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-for-local-dev")
JWT_ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() == "true"
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
