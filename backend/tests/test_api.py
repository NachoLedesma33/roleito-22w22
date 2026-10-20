import asyncio
import math
import os
from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient, ASGITransport
from main import app
from sqlalchemy import text

from database import async_session, init_db


@pytest.fixture(scope="session", autouse=True)
async def _db():
    await init_db()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_login_by_profile_name(client):
    """El login es nombre + PIN: el id interno no viaja a la pantalla."""
    reg = await client.post("/api/auth/register", json={"name": "Gandalf", "pin": "1234"})
    assert reg.status_code == 200, reg.text

    res = await client.post("/api/auth/login", json={"name": "Gandalf", "pin": "1234"})
    assert res.status_code == 200, res.text
    assert res.json()["dm_name"] == "Gandalf"

    # Sin espacios y sin importar mayúsculas: es un nombre, no un id.
    res = await client.post("/api/auth/login", json={"name": "  gandalf ", "pin": "1234"})
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_login_no_enumera_perfiles(client):
    """Nombre inexistente y PIN malo devuelven lo mismo, o el atacante usa la
    diferencia (404 vs 401) para saber qué perfiles existen."""
    await client.post("/api/auth/register", json={"name": "Bilbo", "pin": "1234"})

    inexistente = await client.post(
        "/api/auth/login", json={"name": "NoExiste", "pin": "1234"}
    )
    pin_malo = await client.post("/api/auth/login", json={"name": "Bilbo", "pin": "9999"})

    assert inexistente.status_code == pin_malo.status_code == 401
    assert inexistente.json()["detail"] == pin_malo.json()["detail"]


@pytest.mark.asyncio
async def test_login_sin_identificador_rechazado(client):
    res = await client.post("/api/auth/login", json={"pin": "1234"})
    assert res.status_code == 422


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
async def test_scene_characters_statuses_roundtrip(client):
    camp = (await client.post("/api/campaigns", json={"name": "Status Camp"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Arena"})).json()
    cid, sid = camp["id"], scen["id"]
    char = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Lira"})).json()

    res = await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}/characters",
        json=[{
            "entity_type": "character",
            "entity_id": char["id"],
            "x": 0.0,
            "z": 0.0,
            "visible": True,
            "order": 0,
            "statuses": ["poisoned", "concentrating"],
        }],
    )
    assert res.status_code == 200, res.text
    assert res.json()[0]["statuses"] == ["poisoned", "concentrating"]

    # GET devuelve statuses parseado (JSON string → list).
    got = (await client.get(f"/api/campaigns/{cid}/scenes/{sid}/characters")).json()
    assert got[0]["statuses"] == ["poisoned", "concentrating"]

    # Snapshot del jugador incluye statuses (escena activa).
    await client.put(f"/api/campaigns/{cid}/scenes/{sid}", json={"status": "active"})
    code = (await client.post(f"/api/campaigns/{cid}/invite-code")).json()["invite_code"]
    snap = (await client.get(f"/api/campaigns/invite/{code}")).json()
    assert snap["characters"][0]["statuses"] == ["poisoned", "concentrating"]

    # Reemplazo sin statuses → se limpian.
    res = await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}/characters",
        json=[{
            "entity_type": "character",
            "entity_id": char["id"],
            "x": 0.0,
            "z": 0.0,
            "visible": True,
            "order": 0,
        }],
    )
    assert res.status_code == 200, res.text
    assert res.json()[0]["statuses"] == []


@pytest.mark.asyncio
async def test_player_snapshot_includes_token_vision(client):
    """La visión que el DM configura por token tiene que viajar al jugador.

    Paso 1 de docs/engineering/PLAN-VISION-PERCEPCION.md: el snapshot del
    jugador serializaba la colocación del token pero no `vision_type`/
    `vision_range`, así que el cliente caía siempre a sus defaults.
    """
    camp = (await client.post("/api/campaigns", json={"name": "Vision Camp"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Cripta"})).json()
    cid, sid = camp["id"], scen["id"]
    vane = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Vane"})).json()
    bardo = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Bardo"})).json()

    res = await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}/characters",
        json=[
            {
                "entity_type": "character",
                "entity_id": vane["id"],
                "x": 0.0,
                "z": 0.0,
                "visible": True,
                "order": 0,
                "vision_type": "darkvision",
                "vision_range": 14.0,
            },
            {
                # Sin configurar: el snapshot trae los defaults, no null.
                "entity_type": "character",
                "entity_id": bardo["id"],
                "x": 2.0,
                "z": 2.0,
                "visible": True,
                "order": 1,
            },
        ],
    )
    assert res.status_code == 200, res.text

    await client.put(f"/api/campaigns/{cid}/scenes/{sid}", json={"status": "active"})
    code = (await client.post(f"/api/campaigns/{cid}/invite-code")).json()["invite_code"]

    snap = (await client.get(f"/api/campaigns/invite/{code}")).json()
    got = {c["entity_id"]: c for c in snap["characters"]}
    assert got[vane["id"]]["vision_type"] == "darkvision"
    assert got[vane["id"]]["vision_range"] == pytest.approx(14.0)
    assert got[bardo["id"]]["vision_type"] == "normal"
    assert got[bardo["id"]]["vision_range"] == pytest.approx(6.0)


@pytest.mark.asyncio
async def test_player_snapshot_includes_remember_explored(client):
    """La política de mesa "recordar lo explorado" viaja en el snapshot.

    Paso 6 de docs/engineering/PLAN-VISION-PERCEPCION.md: el DM la enciende por
    escena y el jugador la recibe para decidir si acumula la máscara en
    localStorage.
    """
    camp = (await client.post("/api/campaigns", json={"name": "Memory Camp"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Sala"})).json()
    cid, sid = camp["id"], scen["id"]

    # Default: sin recordar.
    await client.put(f"/api/campaigns/{cid}/scenes/{sid}", json={"status": "active"})
    code = (await client.post(f"/api/campaigns/{cid}/invite-code")).json()["invite_code"]
    snap = (await client.get(f"/api/campaigns/invite/{code}")).json()
    assert snap["remember_explored"] is False

    # El DM la enciende.
    res = await client.put(
        f"/api/campaigns/{cid}/scenes/{sid}", json={"remember_explored": True}
    )
    assert res.status_code == 200, res.text
    assert res.json()["remember_explored"] is True

    # Y viaja en el snapshot del jugador.
    snap = (await client.get(f"/api/campaigns/invite/{code}")).json()
    assert snap["remember_explored"] is True


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
async def test_quest_mutations_change_revision(client):
    """Crear/editar/borrar una quest tiene que cambiar la revision del jugador.

    Si no, el WS empuja una revision identica, applyRevision sale por el
    early-return y el panel de misiones del jugador no se entera.
    """
    camp = (await client.post("/api/campaigns", json={"name": "Rev Camp"})).json()
    cid = camp["id"]
    code = (await client.post(f"/api/campaigns/{cid}/invite-code")).json()["invite_code"]

    async def revision() -> str:
        res = await client.get(f"/api/campaigns/invite/{code}/revision")
        assert res.status_code == 200, res.text
        return res.json()["revision"]

    before = await revision()

    q = (
        await client.post(
            f"/api/campaigns/{cid}/quests",
            json={"title": "Q", "description": "d", "status": "active", "objectives": []},
        )
    ).json()
    after_create = await revision()
    assert after_create != before

    await client.put(
        f"/api/campaigns/{cid}/quests/{q['id']}",
        json={"title": "Q2", "description": "d", "status": "completed", "objectives": []},
    )
    after_update = await revision()
    assert after_update != after_create

    await client.delete(f"/api/campaigns/{cid}/quests/{q['id']}")
    assert await revision() != after_update


@pytest.mark.asyncio
async def test_delete_campaign_purges_children(client):
    """Borrar una campaña no debe dejar filas huérfanas en las tablas nuevas."""
    camp = (await client.post("/api/campaigns", json={"name": "Purge Camp"})).json()
    cid = camp["id"]

    scen = (await client.post(f"/api/campaigns/{cid}/scenes", json={"name": "Arena"})).json()
    await client.post(f"/api/campaigns/{cid}/scenes/{scen['id']}/combat")
    await client.post(
        f"/api/campaigns/{cid}/quests",
        json={"title": "Q", "description": "d", "status": "active", "objectives": []},
    )
    await client.post(
        f"/api/campaigns/{cid}/handouts",
        json={"title": "H", "content": "c", "image_path": None, "visible_to_players": True},
    )
    await client.post(f"/api/campaigns/{cid}/clocks", json={"title": "Reloj", "segments_total": 6})

    # Una habilidad en el catalogo, sabida por un personaje.
    purge_char = (
        await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Purge Mage"})
    ).json()
    put_spell = await client.put(
        f"/api/campaigns/{cid}/characters/{purge_char['id']}",
        json={
            "spells_json": [
                {"id": "purge-spell", "name": "Purgar", "description": "", "level": 1, "cost_pm": 1}
            ]
        },
    )
    assert put_spell.status_code == 200, put_spell.text

    res = await client.delete(f"/api/campaigns/{cid}")
    assert res.status_code == 200, res.text
    assert (await client.get(f"/api/campaigns/{cid}")).status_code == 404

    for path in ("quests", "handouts", "clocks", "calendar", "light-requests"):
        body = (await client.get(f"/api/campaigns/{cid}/{path}")).json()
        rows = body if isinstance(body, list) else body.get("clocks", [])
        assert rows == [], f"{path} quedó huérfano: {rows}"

    # abilities no tiene tabla madre que lo cubra el GET de arriba: se chequea
    # directo, mas los enlaces de character_abilities.
    async with async_session() as s:
        orphans = (
            await s.execute(
                text(
                    "SELECT COUNT(*) FROM abilities "
                    "WHERE campaign_id NOT IN (SELECT id FROM campaigns)"
                )
            )
        ).scalar()
        orphan_links = (
            await s.execute(
                text(
                    "SELECT COUNT(*) FROM character_abilities "
                    "WHERE ability_id NOT IN (SELECT id FROM abilities)"
                )
            )
        ).scalar()
    assert orphans == 0, f"abilities huérfanas: {orphans}"
    assert orphan_links == 0, f"character_abilities huérfanas: {orphan_links}"


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


@pytest.mark.asyncio
async def test_calendar_advance_and_clocks(client):
    camp = (await client.post("/api/campaigns", json={"name": "Cal Camp"})).json()
    cid = camp["id"]
    now = datetime.now()
    date_now = now.date()

    # GET crea el calendario con la fecha REAL actual.
    st = (await client.get(f"/api/campaigns/{cid}/calendar")).json()
    assert st["year"] == date_now.year and st["month"] == date_now.month and st["day"] == date_now.day
    assert len(st["month_names"]) == 12
    assert st["clocks"] == []

    # +31 días.
    st = (await client.put(f"/api/campaigns/{cid}/calendar", json={"add_days": 31})).json()
    exp = (date_now + timedelta(days=31))
    assert st["year"] == exp.year and st["month"] == exp.month and st["day"] == exp.day

    # +360 días más.
    st = (await client.put(f"/api/campaigns/{cid}/calendar", json={"add_days": 360})).json()
    exp = (date_now + timedelta(days=31 + 360))
    assert st["year"] == exp.year and st["month"] == exp.month and st["day"] == exp.day

    # Retroceder 1.
    st = (await client.put(f"/api/campaigns/{cid}/calendar", json={"add_days": -1})).json()
    exp = (date_now + timedelta(days=31 + 360 - 1))
    assert st["year"] == exp.year and st["month"] == exp.month and st["day"] == exp.day

    # Un mismo calendario persiste (no se resetea a "hoy").
    st = (await client.get(f"/api/campaigns/{cid}/calendar")).json()
    assert st["day"] == exp.day and st["month"] == exp.month

    # Clocks CRUD.
    res = await client.post(
        f"/api/campaigns/{cid}/clocks",
        json={"title": "Ritual de invocación", "segments_total": 6},
    )
    assert res.status_code == 200, res.text
    clock = res.json()
    assert clock["segments_total"] == 6 and clock["segments_filled"] == 0
    assert clock["visible_to_players"] is True

    # Tick +3.
    res = await client.put(
        f"/api/campaigns/{cid}/clocks/{clock['id']}",
        json={"segments_filled": 3},
    )
    assert res.status_code == 200
    assert res.json()["segments_filled"] == 3

    # Ocultar al jugador.
    res = await client.put(
        f"/api/campaigns/{cid}/clocks/{clock['id']}",
        json={"visible_to_players": False},
    )
    assert res.status_code == 200
    assert res.json()["visible_to_players"] is False
    assert res.json()["segments_filled"] == 3  # el tick persiste

    # GET público devuelve todo; el filtro lo hace el cliente.
    st = (await client.get(f"/api/campaigns/{cid}/calendar")).json()
    assert len(st["clocks"]) == 1
    assert st["clocks"][0]["segments_filled"] == 3

    # Eliminar clock.
    res = await client.delete(f"/api/campaigns/{cid}/clocks/{clock['id']}")
    assert res.status_code == 200
    st = (await client.get(f"/api/campaigns/{cid}/calendar")).json()
    assert st["clocks"] == []

    # 404s.
    res = await client.get("/api/campaigns/no-such/calendar")
    assert res.status_code == 404
    res = await client.put(f"/api/campaigns/{cid}/clocks/nope", json={"segments_filled": 1})
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_alta_de_personajes_y_npcs_respeta_el_contrato(client):
    """El POST devuelve la ficha completa y los default de vida.

    Sin esto nadie miraba el alta de NPCs: el unico rojo de la division por
    dominio (2026-10-16, CI) fue un `inventory_json` que volvia `{}` en vez de
    `[]` y reventaba el `NPCResponse` con 500.
    """
    camp = (await client.post("/api/campaigns", json={"name": "Altas Camp"})).json()
    cid = camp["id"]

    char = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Aria"})).json()
    assert char["inventory_json"] == []
    assert char["spells_json"] == []
    assert (char["max_pv"], char["max_pm"], char["defense"]) == (10, 10, 5)
    assert char["current_pv"] == char["max_pv"]
    assert char["current_pm"] == char["max_pm"]

    npc = await client.post(f"/api/campaigns/{cid}/npcs", json={"name": "Taberna"})
    assert npc.status_code == 200, npc.text
    npc = npc.json()
    assert npc["inventory_json"] == []
    assert npc["spells_json"] == []
    assert (npc["max_pv"], npc["max_pm"], npc["defense"]) == (10, 10, 5)
    assert npc["current_pv"] == npc["max_pv"]

    # El GET y el listado devuelven lo mismo que el alta.
    assert (await client.get(f"/api/campaigns/{cid}/npcs/{npc['id']}")).json() == npc
    assert (await client.get(f"/api/campaigns/{cid}/npcs")).json() == [npc]

    # Y subir un retrato (upload_routes) devuelve la ficha, no un dict pelado.
    res = await client.post(
        f"/api/campaigns/{cid}/npcs/{npc['id']}/portrait",
        files={"file": ("p.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )
    assert res.status_code == 200, res.text
    assert res.json()["inventory_json"] == []


async def _correr_backfill_de_spells():
    from database import _spells_to_catalog

    async with async_session() as s:
        for stmt in _spells_to_catalog("characters", "character"):
            await s.execute(text(stmt))
        await s.commit()


@pytest.mark.asyncio
async def test_spells_es_un_catalogo_compartido(client):
    """Una habilidad definida una vez; dos personajes la saben y la comparten."""
    camp = (await client.post("/api/campaigns", json={"name": "Habilidades Camp"})).json()
    cid = camp["id"]
    a = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Aria"})).json()
    b = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Borin"})).json()

    spell = {"id": "spell-fuego", "name": "Bola de Fuego", "description": "d", "level": 3, "cost_pm": 5}
    res = await client.put(f"/api/campaigns/{cid}/characters/{a['id']}", json={"spells_json": [spell]})
    assert res.status_code == 200, res.text
    got = (await client.get(f"/api/campaigns/{cid}/characters/{a['id']}")).json()
    assert [s["id"] for s in got["spells_json"]] == ["spell-fuego"]

    # B aprende la misma habilidad: mismo id, una sola fila en el catalogo.
    res = await client.put(f"/api/campaigns/{cid}/characters/{b['id']}", json={"spells_json": [spell]})
    assert res.status_code == 200, res.text

    # Editarla desde A se ve en B: el catalogo es de campana, no de ficha.
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{a['id']}",
        json={"spells_json": [{**spell, "cost_pm": 7}]},
    )
    assert res.status_code == 200, res.text
    got_b = (await client.get(f"/api/campaigns/{cid}/characters/{b['id']}")).json()
    assert got_b["spells_json"][0]["cost_pm"] == 7

    # El catalogo la muestra una sola vez, con dos fichas que la saben.
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert [x["id"] for x in catalogo] == ["spell-fuego"]
    assert catalogo[0]["owners"] == 2

    # Borrarla de A solo quita el enlace: B sigue sabiendola.
    res = await client.put(f"/api/campaigns/{cid}/characters/{a['id']}", json={"spells_json": []})
    assert res.status_code == 200, res.text
    got = (await client.get(f"/api/campaigns/{cid}/characters/{a['id']}")).json()
    assert got["spells_json"] == []
    got_b = (await client.get(f"/api/campaigns/{cid}/characters/{b['id']}")).json()
    assert [s["name"] for s in got_b["spells_json"]] == ["Bola de Fuego"]
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert catalogo[0]["owners"] == 1  # A la desaprendio; no desaparece del catalogo

    # Dos filas en abilities para el mismo id = una sola.
    async with async_session() as s:
        n = (await s.execute(text("SELECT COUNT(*) FROM abilities WHERE id = 'spell-fuego'"))).scalar()
    assert n == 1


@pytest.mark.asyncio
async def test_icono_viaja_con_el_catalogo(client):
    """El icono es un campo de la fila compartida, no de la ficha."""
    camp = (await client.post("/api/campaigns", json={"name": "Iconos Camp"})).json()
    cid = camp["id"]
    a = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Aria"})).json()
    b = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Borin"})).json()

    spell = {
        "id": "spell-rayo",
        "name": "Rayo",
        "description": "d",
        "level": 2,
        "cost_pm": 3,
        "icon": "bolt",
    }
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{a['id']}", json={"spells_json": [spell]}
    )
    assert res.status_code == 200, res.text
    got = (await client.get(f"/api/campaigns/{cid}/characters/{a['id']}")).json()
    assert got["spells_json"][0]["icon"] == "bolt"

    # B aprende la misma habilidad: el icono viene con ella.
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{b['id']}", json={"spells_json": [spell]}
    )
    assert res.status_code == 200, res.text
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert catalogo[0]["icon"] == "bolt"
    assert catalogo[0]["owners"] == 2

    # Cambiarlo desde A se ve en B, igual que el nombre.
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{a['id']}",
        json={"spells_json": [{**spell, "icon": "flame"}]},
    )
    assert res.status_code == 200, res.text
    got_b = (await client.get(f"/api/campaigns/{cid}/characters/{b['id']}")).json()
    assert got_b["spells_json"][0]["icon"] == "flame"

    # Un payload sin la clave icon no lo borra: los escritores viejos no lo traen.
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{a['id']}",
        json={"spells_json": [{"id": "spell-rayo", "name": "Rayo", "description": "d", "level": 2, "cost_pm": 3}]},
    )
    assert res.status_code == 200, res.text
    got_b = (await client.get(f"/api/campaigns/{cid}/characters/{b['id']}")).json()
    assert got_b["spells_json"][0]["icon"] == "flame"

    # La paleta se fija por endpoint, sin pasar por el guardado de la ficha.
    res = await client.put(f"/api/campaigns/{cid}/abilities/spell-rayo/icon/skull")
    assert res.status_code == 200, res.text
    assert res.json()["icon"] == "skull"
    got_b = (await client.get(f"/api/campaigns/{cid}/characters/{b['id']}")).json()
    assert got_b["spells_json"][0]["icon"] == "skull"

    # Quitarlo deja la UI en el fallback (inicial del nombre).
    res = await client.delete(f"/api/campaigns/{cid}/abilities/spell-rayo/icon")
    assert res.status_code == 200, res.text
    assert res.json()["icon"] is None
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert catalogo[0]["icon"] is None

    # Otra campaña no llega a la fila por id suelto.
    res = await client.put(f"/api/campaigns/{cid}/abilities/no-existe/icon/star")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_audio_de_habilidad_sube_viaja_y_borra(client):
    """El audio vive en la fila del catálogo y viaja igual que el icono."""
    camp = (await client.post("/api/campaigns", json={"name": "Audio Camp"})).json()
    cid = camp["id"]
    a = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Aria"})).json()
    b = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Borin"})).json()

    spell = {
        "id": "spell-audio-c5",
        "name": "Eco",
        "description": "d",
        "level": 1,
        "cost_pm": 1,
    }
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{a['id']}", json={"spells_json": [spell]}
    )
    assert res.status_code == 200, res.text

    # Subida multipart: queda path absoluto bajo data/assets.
    res = await client.post(
        f"/api/campaigns/{cid}/abilities/spell-audio-c5/audio",
        files={"file": ("echo.mp3", b"\x00\x01mp3", "audio/mpeg")},
    )
    assert res.status_code == 200, res.text
    audio_path = res.json()["audio_path"]
    assert audio_path and "audio.mp3" in audio_path.replace("\\", "/")

    # La ficha que la sabe y el catálogo la ven; B la aprende con audio.
    got = (await client.get(f"/api/campaigns/{cid}/characters/{a['id']}")).json()
    assert got["spells_json"][0]["audio_path"] == audio_path
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert catalogo[0]["audio_path"] == audio_path
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{b['id']}", json={"spells_json": [spell]}
    )
    assert res.status_code == 200, res.text
    got_b = (await client.get(f"/api/campaigns/{cid}/characters/{b['id']}")).json()
    assert got_b["spells_json"][0]["audio_path"] == audio_path

    # Un payload sin la clave no lo borra (escritores viejos).
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{a['id']}",
        json={"spells_json": [{"id": "spell-audio-c5", "name": "Eco", "description": "d", "level": 1, "cost_pm": 1}]},
    )
    assert res.status_code == 200, res.text
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert catalogo[0]["audio_path"] == audio_path

    # DELETE lo quita de la fila y del catálogo.
    res = await client.delete(f"/api/campaigns/{cid}/abilities/spell-audio-c5/audio")
    assert res.status_code == 200, res.text
    assert res.json()["audio_path"] is None
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert catalogo[0]["audio_path"] is None

    # Otra campaña no llega a la fila por id suelto.
    res = await client.post(
        f"/api/campaigns/{cid}/abilities/no-existe/audio",
        files={"file": ("x.mp3", b"x", "audio/mpeg")},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_ability_borra_catalogo_y_enlaces(client):
    """Borrar una habilidad la saca del catálogo y de todas las fichas."""
    camp = (await client.post("/api/campaigns", json={"name": "Borrar Camp"})).json()
    cid = camp["id"]
    a = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Aria"})).json()
    b = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Borin"})).json()

    spell = {
        "id": "spell-borrar",
        "name": "Borrar",
        "description": "d",
        "level": 1,
        "cost_pm": 1,
        "icon": "star",
    }
    for char in (a, b):
        res = await client.put(
            f"/api/campaigns/{cid}/characters/{char['id']}", json={"spells_json": [spell]}
        )
        assert res.status_code == 200, res.text
    catalogo = (await client.get(f"/api/campaigns/{cid}/abilities")).json()
    assert catalogo[0]["owners"] == 2

    # Otra campaña no llega a la fila por id suelto.
    otra = (await client.post("/api/campaigns", json={"name": "Otra Camp"})).json()
    res = await client.delete(f"/api/campaigns/{otra['id']}/abilities/spell-borrar")
    assert res.status_code == 404

    res = await client.delete(f"/api/campaigns/{cid}/abilities/spell-borrar")
    assert res.status_code == 200, res.text
    assert res.json() == {"status": "deleted", "id": "spell-borrar"}

    # Del catálogo desaparece para los dos: el borrado es de la campaña.
    assert (await client.get(f"/api/campaigns/{cid}/abilities")).json() == []
    for char in (a, b):
        got = (await client.get(f"/api/campaigns/{cid}/characters/{char['id']}")).json()
        assert got["spells_json"] == []

    # Enlaces primero, fila después: ni uno ni otro queda huérfano.
    async with async_session() as s:
        links = (
            await s.execute(
                text("SELECT COUNT(*) FROM character_abilities WHERE ability_id = 'spell-borrar'")
            )
        ).scalar()
        filas = (
            await s.execute(text("SELECT COUNT(*) FROM abilities WHERE id = 'spell-borrar'"))
        ).scalar()
    assert links == 0
    assert filas == 0

    # Borrar dos veces: ya no existe.
    res = await client.delete(f"/api/campaigns/{cid}/abilities/spell-borrar")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_use_ability_gasta_pm_y_deja_evento_canon_en_world_state(client):
    """Usar descuenta PM y deja ability_used CANON, que el World State aplica."""
    camp = (await client.post("/api/campaigns", json={"name": "Usar Camp"})).json()
    cid = camp["id"]
    char = (
        await client.post(
            f"/api/campaigns/{cid}/characters",
            json={"name": "Aria", "max_pm": 8},
        )
    ).json()
    spell = {"id": "spell-luz", "name": "Luz", "description": "d", "level": 1, "cost_pm": 3}
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{char['id']}", json={"spells_json": [spell]}
    )
    assert res.status_code == 200, res.text

    # Sin sesión activa: gasta igual, pero no hay fila posible
    # (Event.session_id es NOT NULL) y event_id vuelve null.
    res = await client.post(
        f"/api/campaigns/{cid}/abilities/spell-luz/use",
        json={"character_id": char["id"]},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["character"]["current_pm"] == 5
    assert body["event_id"] is None
    assert (await client.get(f"/api/campaigns/{cid}/events")).json() == []

    # Con sesión activa el evento nace CANON (auto-canon de bajo impacto).
    sess = (
        await client.post(
            f"/api/campaigns/{cid}/sessions", json={"number": 1, "date": "2026-10-07"}
        )
    ).json()
    res = await client.post(f"/api/campaigns/{cid}/sessions/{sess['id']}/start")
    assert res.status_code == 200, res.text

    res = await client.post(
        f"/api/campaigns/{cid}/abilities/spell-luz/use",
        json={"character_id": char["id"]},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["character"]["current_pm"] == 2
    assert body["event_id"]

    eventos = [
        e
        for e in (await client.get(f"/api/campaigns/{cid}/events")).json()
        if e["type"] == "ability_used"
    ]
    assert len(eventos) == 1
    ev = eventos[0]
    assert ev["status"] == "CANON"
    assert ev["actor_id"] == char["id"]
    assert ev["target_id"] == "spell-luz"
    assert "Luz" in ev["description"]
    assert ev["session_id"] == sess["id"]

    # El motor de World State lo aplica sin que nadie lo apruebe.
    # Se corre el motor directo y no por GET /world-state: ese endpoint guarda
    # un snapshot en disco y en pytest eso dejaría archivos en data/snapshots.
    from core.world.engine import WorldStateEngine

    async with async_session() as s:
        state = await WorldStateEngine(s).compute(cid)
    assert body["event_id"] in state.applied_events


@pytest.mark.asyncio
async def test_use_ability_valida_pm_aprendizaje_y_existencia(client):
    """Sin PM, sin haberla aprendido o sin fila: 400/404, sin gastar ni evento."""
    camp = (await client.post("/api/campaigns", json={"name": "Usar Guard Camp"})).json()
    cid = camp["id"]
    sabe = (
        await client.post(
            f"/api/campaigns/{cid}/characters",
            json={"name": "Aria", "max_pm": 1},
        )
    ).json()
    novato = (
        await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Borin"})
    ).json()
    spell = {"id": "spell-luz-guard", "name": "Luz", "description": "d", "level": 1, "cost_pm": 3}
    res = await client.put(
        f"/api/campaigns/{cid}/characters/{sabe['id']}", json={"spells_json": [spell]}
    )
    assert res.status_code == 200, res.text

    sess = (
        await client.post(
            f"/api/campaigns/{cid}/sessions", json={"number": 1, "date": "2026-10-07"}
        )
    ).json()
    res = await client.post(f"/api/campaigns/{cid}/sessions/{sess['id']}/start")
    assert res.status_code == 200, res.text

    # La aprendió pero 3 PM no entran en 1: no gasta y no deja evento.
    res = await client.post(
        f"/api/campaigns/{cid}/abilities/spell-luz-guard/use",
        json={"character_id": sabe["id"]},
    )
    assert res.status_code == 400, res.text
    assert res.json()["detail"] == "PM insuficientes"

    # No la sabe: se valida antes que los PM.
    res = await client.post(
        f"/api/campaigns/{cid}/abilities/spell-luz-guard/use",
        json={"character_id": novato["id"]},
    )
    assert res.status_code == 400, res.text
    assert "no sabe" in res.json()["detail"]

    # Habilidad o ficha de otra campaña: ni llega a tocar PM.
    otra = (await client.post("/api/campaigns", json={"name": "Otra"})).json()
    res = await client.post(
        f"/api/campaigns/{otra['id']}/abilities/spell-luz-guard/use",
        json={"character_id": sabe["id"]},
    )
    assert res.status_code == 404
    res = await client.post(
        f"/api/campaigns/{cid}/abilities/no-existe/use",
        json={"character_id": sabe["id"]},
    )
    assert res.status_code == 404

    got = (await client.get(f"/api/campaigns/{cid}/characters/{sabe['id']}")).json()
    assert got["current_pm"] == 1
    assert (await client.get(f"/api/campaigns/{cid}/events")).json() == []


@pytest.mark.asyncio
async def test_backfill_de_spells_json_legacy(client):
    """El blob viejo pasa al catalogo, y lo que el DM borre no resucita."""
    camp = (await client.post("/api/campaigns", json={"name": "Backfill Camp"})).json()
    cid = camp["id"]
    char = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Legolas"})).json()

    legacy = '[{"id":"spell-flecha","name":"Flecha Magica","description":"x","level":1,"cost_pm":2}]'
    async with async_session() as s:
        await s.execute(
            text("UPDATE characters SET spells_json = :v WHERE id = :i"),
            {"v": legacy, "i": char["id"]},
        )
        await s.commit()

    await _correr_backfill_de_spells()

    got = (await client.get(f"/api/campaigns/{cid}/characters/{char['id']}")).json()
    assert [x["id"] for x in got["spells_json"]] == ["spell-flecha"]
    assert got["spells_json"][0]["cost_pm"] == 2

    # La fila legacy quedo vacia tras migrar: es lo que impide la resurreccion.
    async with async_session() as s:
        row = (
            await s.execute(text("SELECT spells_json FROM characters WHERE id = :i"), {"i": char["id"]})
        ).scalar()
    assert row == "[]"

    # El DM borra el conjuro y vuelve a correr el backfill: no reaparece.
    async with async_session() as s:
        await s.execute(
            text("DELETE FROM character_abilities WHERE entity_id = :i"), {"i": char["id"]}
        )
        await s.commit()
    await _correr_backfill_de_spells()
    got = (await client.get(f"/api/campaigns/{cid}/characters/{char['id']}")).json()
    assert got["spells_json"] == []


# ---------------------------------------------------------------------------
# Dados: contrato congelado (Fase 0 del PLAN-DADOS-3D.md). Estos tests fijan el
# comportamiento ACTUAL del endpoint de tiradas para no romperlo al sumar datos 3D.
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_dice_create_devuelve_lo_guardado(client):
    """El endpoint de tiradas persiste y devuelve el payload tal cual."""
    camp = (await client.post("/api/campaigns", json={"name": "Dice Camp"})).json()
    payload = {
        "roller_name": "DM",
        "dice_type": 20,
        "count": 3,
        "results": [7, 20, 3],
        "total": 30,
        "label": "Sigilo",
    }
    res = await client.post(f"/api/campaigns/{camp['id']}/rolls", json=payload)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["campaign_id"] == camp["id"]
    assert body["roller_name"] == "DM"
    assert body["dice_type"] == 20
    assert body["count"] == 3
    assert body["results"] == [7, 20, 3]
    assert body["total"] == 30
    assert body["label"] == "Sigilo"
    assert body["entity_type"] is None
    assert body["id"]
    assert body["created_at"]


@pytest.mark.asyncio
async def test_dice_valida_longitud_de_results_contra_count(client):
    """`results` debe traer exactamente `count` elementos (422)."""
    camp = (await client.post("/api/campaigns", json={"name": "Dice Len"})).json()
    res = await client.post(
        f"/api/campaigns/{camp['id']}/rolls",
        json={"roller_name": "DM", "dice_type": 6, "count": 3, "results": [1, 2], "total": 3},
    )
    assert res.status_code == 422
    assert res.json()["detail"] == "results length must match count"


@pytest.mark.asyncio
async def test_dice_schema_valida_rangos_de_tipo_y_cantidad(client):
    """El schema valida dice_type en 4..20 y count en 1..15 (422 fuera de rango).

    Quirk documentado: el rango 4..20 deja pasar tipos que no son dados reales
    (ej. 5); el backend no los restringe a {4,6,8,10,12,20}. El tope de count
    acompaña a MAX_DICE=15 de la mesa 3D de apps/dm.
    """
    camp = (await client.post("/api/campaigns", json={"name": "Dice Range"})).json()
    cid = camp["id"]

    async def crear(dice_type, count, results):
        return await client.post(
            f"/api/campaigns/{cid}/rolls",
            json={
                "roller_name": "DM",
                "dice_type": dice_type,
                "count": count,
                "results": results,
                "total": sum(results),
            },
        )

    assert (await crear(3, 1, [1])).status_code == 422
    assert (await crear(100, 1, [1])).status_code == 422
    assert (await crear(6, 0, [])).status_code == 422
    assert (await crear(6, 16, [1] * 16)).status_code == 422
    assert (await crear(5, 1, [1])).status_code == 200
    assert (await crear(6, 15, [1] * 15)).status_code == 200


@pytest.mark.asyncio
async def test_dice_campana_inexistente_404(client):
    res = await client.post(
        "/api/campaigns/no-existe/rolls",
        json={"roller_name": "DM", "dice_type": 6, "count": 1, "results": [4], "total": 4},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_dice_historial_se_recorta_a_20_por_entidad(client):
    """Cada entity_id conserva las 20 tiradas mas nuevas (trim al crear)."""
    camp = (await client.post("/api/campaigns", json={"name": "Dice Trim"})).json()
    cid = camp["id"]
    char = (await client.post(f"/api/campaigns/{cid}/characters", json={"name": "Tirador"})).json()

    for i in range(23):
        res = await client.post(
            f"/api/campaigns/{cid}/rolls",
            json={
                "entity_type": "character",
                "entity_id": char["id"],
                "roller_name": "DM",
                "dice_type": 6,
                "count": 1,
                "results": [i + 1],
                "total": i + 1,
            },
        )
        assert res.status_code == 200, res.text
        await asyncio.sleep(0.003)

    hist = (await client.get(f"/api/campaigns/{cid}/rolls/history/{char['id']}")).json()
    assert len(hist) == 20
    assert sorted(r["results"][0] for r in hist) == list(range(4, 24))


@pytest.mark.asyncio
async def test_dice_recent_orden_ascendente_y_filtro_since(client):
    """`recent` devuelve en orden cronologico ascendente y filtra por `since`."""
    camp = (await client.post("/api/campaigns", json={"name": "Dice Recent"})).json()
    cid = camp["id"]

    for v in (1, 2, 3):
        await client.post(
            f"/api/campaigns/{cid}/rolls",
            json={"roller_name": "DM", "dice_type": 6, "count": 1, "results": [v], "total": v},
        )
        await asyncio.sleep(0.003)

    recent = (await client.get(f"/api/campaigns/{cid}/rolls/recent")).json()
    assert [r["results"][0] for r in recent] == [1, 2, 3]

    futuro = int(datetime.utcnow().timestamp() * 1000) + 60_000
    vacio = (await client.get(f"/api/campaigns/{cid}/rolls/recent?since={futuro}")).json()
    assert vacio == []


@pytest.mark.asyncio
async def test_dice_recent_all_orden_descendente(client):
    """`recent/all` devuelve en orden cronologico descendente."""
    camp = (await client.post("/api/campaigns", json={"name": "Dice All"})).json()
    cid = camp["id"]

    for v in (1, 2, 3):
        await client.post(
            f"/api/campaigns/{cid}/rolls",
            json={"roller_name": "DM", "dice_type": 6, "count": 1, "results": [v], "total": v},
        )
        await asyncio.sleep(0.003)

    todos = (await client.get(f"/api/campaigns/{cid}/rolls/recent/all")).json()
    assert [r["results"][0] for r in todos][:3] == [3, 2, 1]


@pytest.mark.asyncio
async def test_import_copia_asset_que_no_viajo_en_el_bundle(client):
    """Un asset pesado no viaja en el export (tope de 8 MB), pero al importar de
    esta misma máquina se copia a la campaña destino.

    Antes la columna quedaba apuntando a la campaña de ORIGEN: la importada
    funcionaba hasta que se borraba la original.
    """
    from services.assets import asset_abs, asset_rel

    camp = (await client.post("/api/campaigns", json={"name": "Camp Origen"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Cripta"})).json()
    rel = f"data/assets/{camp['id']}/scenes/{scen['id']}/background.png"
    src_abs = asset_abs(rel)
    created: list[str] = []

    # El archivo existe en disco pero queda fuera del bundle (es lo que hace
    # embed_asset con los >8 MB): el path viaja en background_path de la escena,
    # los bytes no.
    os.makedirs(os.path.dirname(src_abs), exist_ok=True)
    with open(src_abs, "wb") as f:
        f.write(b"PNG-pesado")
    async with async_session() as db:
        await db.execute(
            text("UPDATE scenes SET background_path = :p WHERE id = :i"),
            {"p": src_abs, "i": scen["id"]},
        )
        await db.commit()

    export = (await client.get(f"/api/campaigns/{camp['id']}/export")).json()
    # El bundle trae el path de la campaña de origen; los bytes del asset quedan
    # afuera (el test los simula sacándolos, igual que un archivo >8 MB).
    export["assets"] = []
    assert asset_rel(export["scenes"][0]["background_path"]) == rel

    try:
        res = await client.post("/api/campaigns/import", json={**export, "name": "Copia"})
        assert res.status_code == 200, res.text
        imported_id = res.json()["id"]
        got = (await client.get(f"/api/campaigns/{imported_id}/scenes")).json()
        new_path = got[0]["background_path"]
        created.append(new_path)

        # La columna apunta a la campaña destino, no a la de origen.
        assert asset_rel(new_path) == f"data/assets/{imported_id}/scenes/{scen['id']}/background.png"
        assert new_path != src_abs
        assert os.path.isfile(new_path)
        with open(new_path, "rb") as f:
            assert f.read() == b"PNG-pesado"

        # Borrar la campaña de origen no rompe la copia.
        os.remove(src_abs)
        assert os.path.isfile(new_path)
    finally:
        for path in created:
            if os.path.isfile(path):
                os.remove(path)


@pytest.mark.asyncio
async def test_import_sin_fuente_deja_el_path_original(client):
    """Si el archivo pesado no existe en esta máquina (vino de otra), no hay
    qué copiar: el path queda como estaba, sin inventar bytes."""
    from services.assets import asset_abs, asset_rel

    camp = (await client.post("/api/campaigns", json={"name": "Camp Lejana"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Torre"})).json()
    rel = f"data/assets/{camp['id']}/scenes/{scen['id']}/background.png"
    src_abs = asset_abs(rel)
    os.makedirs(os.path.dirname(src_abs), exist_ok=True)
    with open(src_abs, "wb") as f:
        f.write(b"PNG")
    async with async_session() as db:
        await db.execute(
            text("UPDATE scenes SET background_path = :p WHERE id = :i"),
            {"p": src_abs, "i": scen["id"]},
        )
        await db.commit()

    export = (await client.get(f"/api/campaigns/{camp['id']}/export")).json()
    export["assets"] = []  # simula un asset >8 MB: el path viaja, los bytes no
    assert asset_rel(export["scenes"][0]["background_path"]) == rel
    os.remove(src_abs)  # la fuente ya no está: simula el bundle que vino de otra máquina

    res = await client.post("/api/campaigns/import", json={**export, "name": "Sin fuente"})
    assert res.status_code == 200, res.text
    got = (await client.get(f"/api/campaigns/{res.json()['id']}/scenes")).json()
    assert asset_rel(got[0]["background_path"]) == rel


@pytest.mark.asyncio
async def test_detect_walls_no_persiste_la_propuesta(client):
    """La detección devuelve una propuesta, no geometría guardada.

    El DM la aprueba en la UI y es el frontend (PUT /items) quien persiste el
    grafo. El endpoint antes appendeaba a items_json y ese write se pisaba con
    el save del frontend: si el save fallaba, la escena quedaba con los muros
    duplicados (una copia por intento de detección).
    """
    import cv2
    import numpy as np

    from services.assets import asset_abs

    camp = (await client.post("/api/campaigns", json={"name": "Camp Detectar"})).json()
    scen = (await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Plano"})).json()

    # Un plano con tres paredes verticales.
    img = np.full((300, 400, 3), 255, np.uint8)
    for x in (60, 150, 240):
        cv2.line(img, (x, 40), (x, 260), (0, 0, 0), thickness=3)
    rel = f"data/assets/{camp['id']}/scenes/{scen['id']}/background.png"
    bg_abs = asset_abs(rel)
    os.makedirs(os.path.dirname(bg_abs), exist_ok=True)
    cv2.imwrite(bg_abs, img)
    async with async_session() as db:
        await db.execute(
            text("UPDATE scenes SET background_path = :p WHERE id = :i"),
            {"p": bg_abs, "i": scen["id"]},
        )
        await db.commit()

    try:
        res = await client.post(f"/api/campaigns/{camp['id']}/scenes/{scen['id']}/detect-walls")
        assert res.status_code == 200, res.text
        body = res.json()
        # La propuesta viene en la respuesta...
        assert body["wall_count"] >= 1
        assert len(body["items"]) >= 1

        # ...pero la escena sigue vacía: nadie la aprobó.
        items = (
            await client.get(f"/api/campaigns/{camp['id']}/scenes/{scen['id']}/items")
        ).json()["items"]
        assert items == []
    finally:
        if os.path.isfile(bg_abs):
            os.remove(bg_abs)


@pytest.mark.asyncio
async def test_process_session_propone_eventos_para_aprobacion(client, monkeypatch):
    """El agente propone eventos PROPOSED y el DM los aprueba.

    Antes el endpoint solo devolvia JSON: el DM tenia que copiar los eventos a
    mano. Ahora cada evento queda en la DB con status PROPOSED, el mismo camino
    que /narrative/parse (la IA propone, el DM autoriza).
    """
    from uuid import uuid4

    from infrastructure.ai.mock import MockProvider
    import agent_routes

    monkeypatch.setattr(agent_routes, "get_provider_for_agent", lambda: MockProvider())

    reg = await client.post(
        "/api/auth/register", json={"name": f"DM Agentes {uuid4().hex[:6]}", "pin": "1234"}
    )
    headers = {"Authorization": f"Bearer {reg.json()['token']}"}

    camp = (await client.post("/api/campaigns", json={"name": "Camp Agentes"})).json()
    ses_res = await client.post(
        f"/api/campaigns/{camp['id']}/sessions",
        json={
            "number": 1,
            "date": "2026-10-20",
            "title": "Sesion 1",
            "summary": "La party entro a la mazmorra",
        },
    )
    assert ses_res.status_code == 200, ses_res.text
    ses = ses_res.json()

    res = await client.post(
        f"/api/campaigns/{camp['id']}/agents/process-session",
        json={"session_id": ses["id"]},
        headers=headers,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "success"
    # El provider mock devuelve 2 eventos de la sesion.
    assert len(body["proposed_events"]) == 2

    events = (await client.get(f"/api/campaigns/{camp['id']}/events")).json()
    assert len(events) == 2
    # PROPOSED, no APPROVED: la IA propone y el DM decide.
    assert all(e["status"] == "PROPOSED" for e in events)
    assert {e["id"] for e in events} == {p["event_id"] for p in body["proposed_events"]}
    # El actor que el modelo no pudo resolver queda sin asignar, no inventado.
    assert all(e["description"] for e in events)


@pytest.mark.asyncio
async def test_orchestrator_le_pasa_el_contexto_real_de_la_campana(client, monkeypatch):
    """El orquestador coordina, pero sin DB sus sub-agentes responden al aire.

    Ahora arma el contexto con los datos de la campaña (personajes, NPCs,
    lugares y los últimos eventos) y se lo pasa al Lore.
    """
    from core.agents.base import AgentResult
    from core.agents.orchestrator import OrchestratorAgent, TaskType
    from infrastructure.ai.mock import MockProvider

    monkeypatch.setattr(
        "core.agents.orchestrator.get_provider_for_agent", lambda: MockProvider()
    )

    camp = (
        await client.post(
            "/api/campaigns", json={"name": "Camp Orquestador", "description": "La campaña"}
        )
    ).json()
    char = (
        await client.post(
            f"/api/campaigns/{camp['id']}/characters",
            json={
                "name": "Aria",
                "type": "player",
                "vigor": "/",
                "intelligence": "/",
                "dexterity": "/",
                "cunning": "/",
            },
        )
    ).json()
    ses = (
        await client.post(
            f"/api/campaigns/{camp['id']}/sessions",
            json={"number": 1, "date": "2026-10-20", "title": "Sesion 1"},
        )
    ).json()
    ev_res = await client.post(
        f"/api/campaigns/{camp['id']}/sessions/{ses['id']}/events",
        json={
            "session_id": ses["id"],
            "type": "DIALOGUE",
            "actor_id": char["id"],
            "description": "Aria hablo con el guard",
        },
    )
    assert ev_res.status_code == 200, ev_res.text

    captured: dict = {}

    class FakeLore:
        async def run(self, **kwargs):
            captured.update(kwargs)
            return AgentResult(status="success", data=None, agent_id="lore")

    async with async_session() as db:
        orch = OrchestratorAgent(db)
        orch.lore_agent = FakeLore()
        await orch.execute(TaskType.LORE_INQUIRY, camp["id"], query="¿Que sabe de Aria?")

    # El sub-agente recibio la campana real, no un placeholder.
    assert captured["characters"][0]["name"] == "Aria"
    assert captured["events"][0]["description"] == "Aria hablo con el guard"
    assert "Camp Orquestador" in captured["campaign_context"]


@pytest.mark.asyncio
async def test_orchestrator_de_campana_inexistente_da_404(client):
    reg = await client.post("/api/auth/register", json={"name": "DM Orq 404", "pin": "1234"})
    headers = {"Authorization": f"Bearer {reg.json()['token']}"}

    res = await client.post(
        "/api/orchestrator/campaña-que-no-existe/execute",
        headers=headers,
        json={"task_type": "lore_inquiry", "query": "?"},
    )
    assert res.status_code == 404, res.text


@pytest.mark.asyncio
async def test_agentes_ingest_world_state_y_scene(client, monkeypatch):
    """Los tres agentes que faltaban expuestos por HTTP.

    Ingestion normaliza y segmenta (no juzga canon), World State responde con
    el estado real de la campaña y Scene propone la configuración visual.
    """
    from uuid import uuid4

    from infrastructure.ai.mock import MockProvider
    import agent_routes

    monkeypatch.setattr(agent_routes, "get_provider_for_agent", lambda: MockProvider())

    reg = await client.post(
        "/api/auth/register", json={"name": f"DM Agentes {uuid4().hex[:6]}", "pin": "1234"}
    )
    headers = {"Authorization": f"Bearer {reg.json()['token']}"}

    camp = (await client.post("/api/campaigns", json={"name": "Camp Exposición"})).json()
    await client.post(
        f"/api/campaigns/{camp['id']}/characters",
        json={
            "name": "Aria",
            "type": "player",
            "vigor": "/",
            "intelligence": "/",
            "dexterity": "/",
            "cunning": "/",
        },
    )
    await client.post(
        f"/api/campaigns/{camp['id']}/quests",
        json={"title": "La mazmorra perdida", "status": "active"},
    )

    # INGEST: normaliza y segmenta, sin juzgar canon.
    res = await client.post(
        f"/api/campaigns/{camp['id']}/agents/ingest",
        headers=headers,
        json={"text": "La party entro a la mazmorra.\n\n\nSe encounteron a los goblins.", "title": "Notas"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["agent_id"] == "ingestion"
    assert body["status"] == "success"
    assert body["data"]["chars"] > 0
    assert len(body["data"]["segments"]) == 2
    # Texto vacio -> error, no excepcion.
    res = await client.post(
        f"/api/campaigns/{camp['id']}/agents/ingest",
        headers=headers,
        json={"text": "   "},
    )
    assert res.json()["status"] == "error"

    # WORLD STATE: responde con el estado real de la campaña.
    res = await client.post(
        f"/api/campaigns/{camp['id']}/agents/world-state",
        headers=headers,
        json={"question": "¿Dónde está Aria?"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["agent_id"] == "world-state"
    assert body["status"] == "success"
    assert body["data"]["answer"]
    # Y el estado sobre el que respondió es el de la campaña, no un invento.
    assert any(c["name"] == "Aria" for c in body["state"]["characters"])
    assert any(q["title"] == "La mazmorra perdida" for q in body["state"]["quests"])

    # SCENE: propone la configuración visual.
    res = await client.post(
        f"/api/campaigns/{camp['id']}/agents/scene",
        headers=headers,
        json={"scene_description": "Una cripta inundada de agua negra", "mood": "dread"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["agent_id"] == "scene"
    assert body["status"] == "success"
    assert body["data"]["environment"]
    assert body["data"]["lighting"]
