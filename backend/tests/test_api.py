"""
Integration tests for FastAPI backend endpoints.
"""
import pytest
import asyncio
import pytest_asyncio
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock

# Patch blockchain before importing app
with patch("services.blockchain.init_web3", new_callable=AsyncMock):
    with patch("services.database.init_postgres", new_callable=AsyncMock):
        from main import app
        from services.database import get_mongo_db
        from middleware.auth import get_current_user


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture
async def client():
    app.dependency_overrides.clear()
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def mock_db():
    """Mock MongoDB collection."""
    db = MagicMock()
    db.mines.find_one = AsyncMock(return_value=None)
    db.mines.insert_one = AsyncMock()
    db.mines.find = MagicMock(return_value=MagicMock(
        sort=MagicMock(return_value=MagicMock(
            limit=MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
        ))
    ))
    db.batches.find_one = AsyncMock(return_value=None)
    db.batches.insert_one = AsyncMock()
    db.shipments.find_one = AsyncMock(return_value=None)
    db.shipments.insert_one = AsyncMock()
    return db


class TestHealth:
    @pytest.mark.asyncio
    async def test_health_check(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"


class TestAuth:
    @pytest.mark.asyncio
    async def test_login_wrong_credentials(self, client):
        with patch("services.database.AsyncSessionLocal") as mock_session:
            mock_session.return_value.__aenter__ = AsyncMock(return_value=MagicMock(
                execute=AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
            ))
            resp = await client.post("/api/v1/auth/login", json={"email": "x@x.com", "password": "wrong"})
            assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_protected_route_no_token(self, client):
        resp = await client.get("/api/v1/mines/")
        assert resp.status_code == 403  # No Bearer token


class TestMines:
    @pytest.mark.asyncio
    async def test_get_mine_not_found(self, client, mock_db):
        app.dependency_overrides[get_mongo_db] = lambda: mock_db
        app.dependency_overrides[get_current_user] = lambda: {"role": "admin", "email": "a@b.com", "ethereum_address": ""}
        resp = await client.get(
            "/api/v1/mines/0xdeadbeef",
            headers={"Authorization": "Bearer fake-token"}
        )
        assert resp.status_code == 404


class TestBatches:
    @pytest.mark.asyncio
    async def test_get_provenance_not_found(self, client, mock_db):
        app.dependency_overrides[get_mongo_db] = lambda: mock_db
        resp = await client.get("/api/v1/batches/nonexistent/provenance")
        assert resp.status_code in (401, 403, 404)  # auth or not found


class TestShipments:
    @pytest.mark.asyncio
    async def test_iot_shipment_not_found(self, client, mock_db):
        app.dependency_overrides[get_mongo_db] = lambda: mock_db
        resp = await client.post(
            "/api/v1/shipments/fake-id/iot",
            json={
                "timestamp": "2024-01-01T00:00:00Z",
                "temperature_c": 25.0,
                "device_id": "DEV-001"
            }
        )
        assert resp.status_code == 404


class TestESG:
    @pytest.mark.asyncio
    async def test_esg_report_requires_auth(self, client):
        resp = await client.get("/api/v1/esg/report")
        assert resp.status_code in (401, 403)
