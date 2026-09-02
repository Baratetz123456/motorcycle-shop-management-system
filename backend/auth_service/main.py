import sys
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
import bcrypt

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from shared.database import get_db
from auth_service import models, schemas

# Security configurations
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-key-for-local-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

app = FastAPI(title="Auth Service")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/login", response_model=schemas.TokenResponse)
async def login(credentials: schemas.LoginRequest, session: AsyncSession = Depends(get_db)):
    stmt = select(models.User).where(models.User.email == credentials.email)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        # Using 401 Unauthorized for bad credentials
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role
    }

# Helper endpoint to seed a default admin user for testing
@app.post("/seed-admin", status_code=201)
async def seed_admin(session: AsyncSession = Depends(get_db)):
    admin_email = "admin@motoshop.com"
    stmt = select(models.User).where(models.User.email == admin_email)
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
        return {"msg": "Admin already exists"}
        
    hashed_pw = get_password_hash("admin123")
    admin_user = models.User(email=admin_email, password_hash=hashed_pw, role="admin")
    session.add(admin_user)
    await session.commit()
    
    return {"msg": "Admin user created", "email": admin_email, "password": "admin123"}
