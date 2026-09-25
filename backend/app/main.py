import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base, init_db_schemas
from app.modules.auth.router import router as auth_router
from app.modules.inventory.router import router as inventory_router
from app.modules.sales.router import router as sales_router
from app.modules.repairs.router import router as repairs_router
from app.modules.audit.router import router as audit_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db_schemas(engine, Base.metadata)
    except Exception as e:
        print(f"Notice: init_db_schemas on startup: {e}")
    yield

app = FastAPI(
    title="MotoShop POS - Modular Monolith API",
    description="Consolidated zero-cost serverless backend for MotoShop Management System",
    version="2.0.0-MODULAR-MONOLITH",
    lifespan=lifespan
)

# CORS configuration: allows same-origin CloudFront and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ],
    allow_origin_regex=r"https://.*\.cloudfront\.net",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"]
)

# Mount domain routers under /api/v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(inventory_router, prefix="/api/v1")
app.include_router(sales_router, prefix="/api/v1")
app.include_router(repairs_router, prefix="/api/v1")
app.include_router(audit_router, prefix="/api/v1")

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "motoshop-modular-monolith",
        "version": "2.0.0"
    }

# AWS Lambda Serverless Entrypoint (Mangum ASGI Adapter)
try:
    from mangum import Mangum
    handler = Mangum(app, lifespan="off")
except ImportError:
    handler = None
