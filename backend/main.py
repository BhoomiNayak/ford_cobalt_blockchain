"""
Ford Cobalt Supply Chain - FastAPI Backend
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from routes import mines, batches, shipments, compliance, esg, auth
from services.database import init_databases
from services.blockchain import init_web3
from middleware.rate_limiter import RateLimitMiddleware
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    await init_databases()
    await init_web3()
    print("✅ Ford Cobalt API ready")
    yield
    print("🔴 Shutting down")


app = FastAPI(
    title="Ford Cobalt Supply Chain API",
    description="Blockchain-based ethical cobalt sourcing traceability system",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, requests_per_minute=100)

# Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(mines.router, prefix="/api/v1/mines", tags=["Mines"])
app.include_router(batches.router, prefix="/api/v1/batches", tags=["Batches"])
app.include_router(shipments.router, prefix="/api/v1/shipments", tags=["Shipments"])
app.include_router(compliance.router, prefix="/api/v1/compliance", tags=["Compliance"])
app.include_router(esg.router, prefix="/api/v1/esg", tags=["ESG"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
