import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from database import init_db


@pytest.fixture(scope="session", autouse=True)
async def _db():
    await init_db()


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


@pytest.mark.asyncio
async def test_player_fog_roundtrip(client):
    camp = (await client.post("/api/campaigns", json={"name": "Fog Campaign"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Dungeon"})).json()
    scene_id = scen["id"]
    player_id = "char-player-1"
    regions = [
        {"points": [0.1, 0.1, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2], "revealed": True},
        {"points": [0.5, 0.5, 0.6, 0.5, 0.6, 0.6], "revealed": True},
    ]

    res = await client.put(
        f"/api/campaigns/{camp['id']}/players/{player_id}/fog/{scene_id}",
        json={"regions": regions},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["player_id"] == player_id
    assert data["scene_id"] == scene_id
    assert len(data["regions"]) == 2
    assert data["regions"][0]["points"] == regions[0]["points"]
    assert data["regions"][0]["revealed"] is True

    res = await client.get(f"/api/campaigns/{camp['id']}/players/{player_id}/fog/{scene_id}")
    assert res.status_code == 200
    data = res.json()
    assert len(data["regions"]) == 2
    assert data["regions"][1]["points"] == regions[1]["points"]


@pytest.mark.asyncio
async def test_player_fog_empty_when_missing(client):
    camp = (await client.post("/api/campaigns", json={"name": "Fog Campaign 2"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Tavern"})).json()
    res = await client.get(f"/api/campaigns/{camp['id']}/players/ghost/fog/{scen['id']}")
    assert res.status_code == 200
    assert res.json()["regions"] == []


@pytest.mark.asyncio
async def test_player_fog_rejects_scene_of_other_campaign(client):
    camp_a = (await client.post("/api/campaigns", json={"name": "Fog A"})).json()
    camp_b = (await client.post("/api/campaigns", json={"name": "Fog B"})).json()
    scen_a = (await client.post(f"/api/campaigns/{camp_a['id']}/scenes", json={"name": "Room A"})).json()

    res = await client.put(
        f"/api/campaigns/{camp_b['id']}/players/p1/fog/{scen_a['id']}",
        json={"regions": []},
    )
    assert res.status_code == 404
