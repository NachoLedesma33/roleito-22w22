import asyncio
import math

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


@pytest.mark.asyncio
async def test_light_request_roundtrip(client):
    camp = (await client.post("/api/campaigns", json={"name": "Light Camp"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Cave"})).json()
    campaign_id = camp["id"]

    payload = {
        "player_id": "player-1",
        "character_name": "Aria",
        "scene_id": scen["id"],
        "token_id": "tok-1",
    }
    res = await client.post(f"/api/campaigns/{campaign_id}/light-requests", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "pending"
    assert data["character_name"] == "Aria"
    assert data["token_id"] == "tok-1"

    res = await client.get(f"/api/campaigns/{campaign_id}/light-requests")
    assert res.status_code == 200
    assert len(res.json()) == 1

    rid = data["id"]
    res = await client.post(f"/api/campaigns/{campaign_id}/light-requests/{rid}/resolve")
    assert res.status_code == 200
    assert res.json()["status"] == "granted"

    res = await client.get(f"/api/campaigns/{campaign_id}/light-requests?status_filter=pending")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_light_request_rejects_scene_of_other_campaign(client):
    camp_a = (await client.post("/api/campaigns", json={"name": "Light A"})).json()
    camp_b = (await client.post("/api/campaigns", json={"name": "Light B"})).json()
    scen_a = (await client.post(f"/api/campaigns/{camp_a['id']}/scenes", json={"name": "Ruins"})).json()

    payload = {
        "player_id": "p1",
        "character_name": "Borin",
        "scene_id": scen_a["id"],
        "token_id": "tok-1",
    }
    res = await client.post(f"/api/campaigns/{camp_b['id']}/light-requests", json=payload)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_light_request_resolve_missing_404(client):
    camp = (await client.post("/api/campaigns", json={"name": "Light C"})).json()
    res = await client.post(f"/api/campaigns/{camp['id']}/light-requests/nope/resolve")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_scene_characters_normalizes_rotation(client):
    camp = (await client.post("/api/campaigns", json={"name": "Rot Camp"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Arena"})).json()
    cid = camp["id"]
    sid = scen["id"]

    res = await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}/characters",
        json=[
            {"entity_type": "character", "entity_id": "char-a", "x": 0.0, "z": 0.0,
             "rotation": 4.5 * math.pi, "visible": True, "order": 0},
            {"entity_type": "character", "entity_id": "char-b", "x": 1.0, "z": 1.0,
             "rotation": 0.0, "visible": True, "order": 1},
        ],
    )
    assert res.status_code == 200, res.text
    got = {c["entity_id"]: c["rotation"] for c in res.json()}
    assert got["char-a"] == pytest.approx(math.pi / 2)
    assert got["char-b"] == pytest.approx(0.0, abs=1e-5)


@pytest.mark.asyncio
async def test_player_move_normalizes_rotation_and_clamps(client):
    camp = (await client.post("/api/campaigns", json={"name": "Move Camp"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Arena"})).json()
    cid = camp["id"]
    sid = scen["id"]

    res = await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}",
        json={"map_scale": 5.0},
    )
    assert res.status_code == 200

    res = await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}/characters",
        json=[{
            "entity_type": "character",
            "entity_id": "char-1",
            "x": 0.0,
            "z": 0.0,
            "rotation": 0.0,
            "visible": True,
            "order": 0,
        }],
    )
    assert res.status_code == 200

    res = await client.patch(
        f"/api/campaigns/{cid}/scenes/{sid}/move",
        json={"character_id": "char-1", "x": 999.0, "z": -999.0, "rotation": 4.5 * math.pi},
    )
    assert res.status_code == 200, res.text
    data = res.json()

    half = 5 * 10 / 2
    assert data["x"] == pytest.approx(half - 0.4)
    assert data["z"] == pytest.approx(-(half - 0.4))
    assert data["rotation"] == pytest.approx(math.pi / 2)
    assert data["vx"] == pytest.approx(0.0)
    assert data["vz"] == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_player_move_estimates_velocity(client):
    camp = (await client.post("/api/campaigns", json={"name": "Move Vel"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Vel Arena"})).json()
    cid = camp["id"]
    sid = scen["id"]

    await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}",
        json={"map_scale": 5.0},
    )

    await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}/characters",
        json=[{
            "entity_type": "character",
            "entity_id": "char-1",
            "x": 0.0,
            "z": 0.0,
            "rotation": 0.0,
            "visible": True,
            "order": 0,
        }],
    )

    res = await client.patch(
        f"/api/campaigns/{cid}/scenes/{sid}/move",
        json={"character_id": "char-1", "x": 20.0, "z": 10.0, "rotation": 0.0},
    )
    assert res.status_code == 200

    await asyncio.sleep(0.13)

    res = await client.patch(
        f"/api/campaigns/{cid}/scenes/{sid}/move",
        json={"character_id": "char-1", "x": 26.0, "z": 16.0, "rotation": 0.0},
    )
    assert res.status_code == 200
    data = res.json()

    assert data["vx"] > 0
    assert data["vz"] > 0
    assert data["vz"] == pytest.approx(data["vx"], rel=0.5)
    assert data["vrot"] == pytest.approx(0.0)


@pytest.mark.asyncio
async def test_combat_roundtrip_and_ordering(client):
    camp = (await client.post("/api/campaigns", json={"name": "Combat A"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Arena"})).json()
    cid, sid = camp["id"], scen["id"]

    res = await client.post(f"/api/campaigns/{cid}/scenes/{sid}/combat")
    assert res.status_code == 200, res.text
    combat = res.json()
    assert combat["status"] == "active"
    assert combat["round"] == 1
    assert combat["current_turn"] == 0
    assert combat["combatants"] == []

    res = await client.post(f"/api/campaigns/{cid}/scenes/{sid}/combat")
    assert res.status_code == 400

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[
            {"entity_type": "npc", "entity_id": "goblin-a", "initiative": 6},
            {"entity_type": "character", "entity_id": "aria", "initiative": 4},
            {"entity_type": "npc", "entity_id": "goblin-b", "initiative": 6},
        ],
    )
    assert res.status_code == 200, res.text
    got = res.json()
    order = [(c["entity_id"], c["initiative"], c["roll_seq"]) for c in got["combatants"]]
    assert order == [("goblin-a", 6, 1), ("goblin-b", 6, 3), ("aria", 4, 2)]

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[{"entity_type": "character", "entity_id": "borin"}],
    )
    assert res.status_code == 200, res.text
    got = res.json()
    ids = [c["entity_id"] for c in got["combatants"]]
    assert ids == ["goblin-a", "goblin-b", "aria", "borin"]
    assert got["combatants"][-1]["initiative"] is None

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[{"entity_type": "character", "entity_id": "aria", "initiative": 6}],
    )
    assert res.status_code == 200, res.text
    got = res.json()
    aria = next(c for c in got["combatants"] if c["entity_id"] == "aria")
    assert aria["initiative"] == 6
    assert aria["roll_seq"] == 4
    assert [c["entity_id"] for c in got["combatants"]] == [
        "goblin-a", "goblin-b", "aria", "borin",
    ]

    for _ in range(4):
        res = await client.post(f"/api/campaigns/{cid}/combat/{combat['id']}/next")
        assert res.status_code == 200, res.text
    got = res.json()
    assert got["round"] == 2
    assert got["current_turn"] == 0

    res = await client.post(f"/api/campaigns/{cid}/combat/{combat['id']}/end")
    assert res.status_code == 200
    assert res.json()["status"] == "ended"

    res = await client.post(f"/api/campaigns/{cid}/combat/{combat['id']}/next")
    assert res.status_code == 400

    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat")
    assert res.status_code == 200
    assert res.json() is None


@pytest.mark.asyncio
async def test_combat_initiative_range_and_missing(client):
    camp = (await client.post("/api/campaigns", json={"name": "Combat B"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Arena"})).json()
    cid, sid = camp["id"], scen["id"]

    res = await client.post(f"/api/campaigns/{cid}/scenes/{sid}/combat")
    assert res.status_code == 200
    combat = res.json()

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[{"entity_type": "npc", "entity_id": "goblin-x", "initiative": 9}],
    )
    assert res.status_code == 422

    res = await client.post(f"/api/campaigns/{cid}/combat/nope/next")
    assert res.status_code == 404

    res = await client.post(f"/api/campaigns/{cid}/combat/{combat['id']}/end")
    assert res.status_code == 200
    res = await client.post(f"/api/campaigns/{cid}/combat/{combat['id']}/end")
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_combat_pending_and_player_roll(client):
    camp = (await client.post("/api/campaigns", json={"name": "Combat Pending"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Arena"})).json()
    cid, sid = camp["id"], scen["id"]

    res = await client.post(f"/api/campaigns/{cid}/scenes/{sid}/combat")
    assert res.status_code == 200
    combat = res.json()

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[
            {"entity_type": "character", "entity_id": "aria"},
            {"entity_type": "npc", "entity_id": "goblin-a"},
        ],
    )
    assert res.status_code == 200, res.text

    # El char tiene prompt activo; el npc no.
    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat/pending/aria")
    assert res.status_code == 200
    pending = res.json()
    assert pending["combat_id"] == combat["id"]
    assert pending["entity_id"] == "aria"

    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat/pending/goblin-a")
    assert res.status_code == 200
    assert res.json() is None

    # El jugador tira → seq asignado, pending limpio.
    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/initiative-roll",
        json={"entity_type": "character", "entity_id": "aria", "initiative": 4},
    )
    assert res.status_code == 200, res.text
    aria = next(c for c in res.json()["combatants"] if c["entity_id"] == "aria")
    assert aria["initiative"] == 4
    assert aria["roll_seq"] == 1

    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat/pending/aria")
    assert res.json() is None

    # Tirar de nuevo sin pending → 400; npc vía player roll → 400.
    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/initiative-roll",
        json={"entity_type": "character", "entity_id": "aria", "initiative": 5},
    )
    assert res.status_code == 400

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/initiative-roll",
        json={"entity_type": "npc", "entity_id": "goblin-a", "initiative": 6},
    )
    assert res.status_code == 400

    # DM tira por un char con pending → el prompt se cancela.
    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[{"entity_type": "character", "entity_id": "borin"}],
    )
    assert res.status_code == 200
    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat/pending/borin")
    assert res.json()["entity_id"] == "borin"

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[{"entity_type": "character", "entity_id": "borin", "initiative": 2}],
    )
    assert res.status_code == 200, res.text
    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat/pending/borin")
    assert res.json() is None

    # Sin combate activo → pending None.
    await client.post(f"/api/campaigns/{cid}/combat/{combat['id']}/end")
    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat/pending/aria")
    assert res.json() is None


@pytest.mark.asyncio
async def test_combat_queue_concurrent(client):
    camp = (await client.post("/api/campaigns", json={"name": "Combat Cola"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Arena"})).json()
    cid, sid = camp["id"], scen["id"]

    res = await client.post(f"/api/campaigns/{cid}/scenes/{sid}/combat")
    assert res.status_code == 200
    combat = res.json()

    res = await client.post(
        f"/api/campaigns/{cid}/combat/{combat['id']}/combatants",
        json=[
            {"entity_type": "character", "entity_id": "c1"},
            {"entity_type": "character", "entity_id": "c2"},
            {"entity_type": "character", "entity_id": "c3"},
        ],
    )
    assert res.status_code == 200

    # 3 jugadores tiran al mismo tiempo → seqs distintos (cola FIFO).
    responses = await asyncio.gather(*[
        client.post(
            f"/api/campaigns/{cid}/combat/{combat['id']}/initiative-roll",
            json={"entity_type": "character", "entity_id": cid_, "initiative": init_},
        )
        for cid_, init_ in [("c1", 6), ("c2", 3), ("c3", 6)]
    ])
    assert all(r.status_code == 200 for r in responses), [r.text for r in responses]

    res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat")
    got = res.json()
    seqs = sorted(c["roll_seq"] for c in got["combatants"])
    assert seqs == [1, 2, 3]
    assert [c["entity_id"] for c in got["combatants"]] in (
        ["c1", "c3", "c2"],
        ["c3", "c1", "c2"],
    )

    # Ningún pending activo tras la cola.
    for cid_ in ("c1", "c2", "c3"):
        res = await client.get(f"/api/campaigns/{cid}/scenes/{sid}/combat/pending/{cid_}")
        assert res.json() is None


@pytest.mark.asyncio
async def test_quests_crud(client):
    camp = (await client.post("/api/campaigns", json={"name": "Quest Camp"})).json()
    cid = camp["id"]

    res = await client.post(
        f"/api/campaigns/{cid}/quests",
        json={
            "title": "Salvar la taberna",
            "description": "El gremio exige el rescate.",
            "status": "active",
            "objectives": [
                {"label": "Hablar con Grimble"},
                {"label": "Recuperar el barril"},
                {"label": "Volver", "done": True},
            ],
            "reward": "100 gp",
            "visible_to_players": True,
        },
    )
    assert res.status_code == 200, res.text
    q = res.json()
    assert q["title"] == "Salvar la taberna"
    assert len(q["objectives"]) == 3
    assert q["objectives"][2]["done"] is True
    assert q["reward"] == "100 gp"

    quests = (await client.get(f"/api/campaigns/{cid}/quests")).json()
    assert len(quests) == 1

    res = await client.put(
        f"/api/campaigns/{cid}/quests/{q['id']}",
        json={
            "title": "Salvar la taberna",
            "description": "Actualizada.",
            "status": "completed",
            "objectives": [
                {"label": "Hablar con Grimble", "done": True},
                {"label": "Recuperar el barril", "done": True},
            ],
            "reward": "100 gp + fama",
            "visible_to_players": True,
        },
    )
    assert res.status_code == 200, res.text
    q2 = res.json()
    assert q2["status"] == "completed"
    assert len(q2["objectives"]) == 2
    assert q2["reward"] == "100 gp + fama"

    res = await client.post(
        f"/api/campaigns/{cid}/quests",
        json={"title": "Draft oculta", "status": "draft", "visible_to_players": False},
    )
    assert res.status_code == 200
    hidden = res.json()
    assert hidden["visible_to_players"] is False

    # GET devuelve todo; el filtro de visibilidad lo hace el cliente jugador.
    quests = (await client.get(f"/api/campaigns/{cid}/quests")).json()
    assert len(quests) == 2

    res = await client.delete(f"/api/campaigns/{cid}/quests/{hidden['id']}")
    assert res.status_code == 200
    quests = (await client.get(f"/api/campaigns/{cid}/quests")).json()
    assert len(quests) == 1

    # 404: quest inexistente / campaña inexistente.
    res = await client.put(f"/api/campaigns/{cid}/quests/nope", json={"title": "x"})
    assert res.status_code == 404
    res = await client.post("/api/campaigns/no-such/quests", json={"title": "x"})
    assert res.status_code == 404
