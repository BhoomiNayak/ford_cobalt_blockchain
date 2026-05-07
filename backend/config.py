"""
Application configuration via environment variables.
"""
from typing import List
from pydantic import BaseSettings, validator


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "ford_cobalt"

    # PostgreSQL
    POSTGRES_URL: str = "postgresql://postgres:postgres@localhost:5432/ford_cobalt_auth"

    # Blockchain
    WEB3_PROVIDER_URL: str = "http://localhost:8545"
    MINE_REGISTRY_ADDRESS: str = ""
    BATCH_TRACKING_ADDRESS: str = ""
    COMPLIANCE_VERIFIER_ADDRESS: str = ""
    DEPLOYER_PRIVATE_KEY: str = ""

    # IPFS
    IPFS_API_URL: str = "http://localhost:5001"
    IPFS_GATEWAY_URL: str = "https://ipfs.io/ipfs"

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    @validator("ALLOWED_ORIGINS", pre=True)
    def parse_origins(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True

        @classmethod
        def parse_env_var(cls, field_name, raw_val):
            if field_name == "ALLOWED_ORIGINS":
                return raw_val
            return BaseSettings.Config.parse_env_var(field_name, raw_val)


settings = Settings()
