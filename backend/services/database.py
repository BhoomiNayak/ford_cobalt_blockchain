"""
Database initialization and connection management.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func

from config import settings

# ──────────────────────────────────────────────
# MongoDB (Motor)
# ──────────────────────────────────────────────

mongo_client: AsyncIOMotorClient = None
mongo_db = None


async def init_databases():
    global mongo_client, mongo_db
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    mongo_db = mongo_client[settings.MONGODB_DB]

    # Create indexes
    await mongo_db.batches.create_index("mine_id")
    await mongo_db.batches.create_index("status")
    await mongo_db.batches.create_index("created_at")
    await mongo_db.batches.create_index([("mine_id", 1), ("status", 1)])

    await mongo_db.shipments.create_index("batch_id")
    await mongo_db.shipments.create_index("status")
    await mongo_db.shipments.create_index("carrier_id")

    await mongo_db.audit_logs.create_index("timestamp")
    await mongo_db.audit_logs.create_index("actor")
    await mongo_db.audit_logs.create_index("resource_id")

    await mongo_db.mines.create_index("operator_id")
    await mongo_db.mines.create_index("status")

    # PostgreSQL
    await init_postgres()

    print("✅ Databases initialized")


def get_mongo_db():
    return mongo_db


# ──────────────────────────────────────────────
# PostgreSQL (SQLAlchemy async)
# ──────────────────────────────────────────────

Base = declarative_base()
engine = None
AsyncSessionLocal = None


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="viewer")  # admin|auditor|operator|viewer
    organization = Column(String, nullable=True)
    ethereum_address = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    key_hash = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)


async def init_postgres():
    global engine, AsyncSessionLocal
    db_url = settings.POSTGRES_URL.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(db_url, echo=settings.APP_ENV == "development")
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ PostgreSQL tables created")


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
