import pytest
from httpx import AsyncClient, ASGITransport
from main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_create_campaign(client):
    response = await client.post("/api/campaigns", json={"name": "Test Campaign"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Campaign"
    assert "id" in data


@pytest.mark.asyncio
async def test_list_campaigns(client):
    await client.post("/api/campaigns", json={"name": "Campaign 1"})
    await client.post("/api/campaigns", json={"name": "Campaign 2"})
    response = await client.get("/api/campaigns")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2
