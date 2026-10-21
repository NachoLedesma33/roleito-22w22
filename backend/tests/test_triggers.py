"""Triggers de zona: entrar a la zona dispara su evento en el bus."""

import pytest


def _zone(points, triggers):
    return {
        "id": "zone-trampa-1",
        "name": "Sala de la trampa",
        "type": "shape",
        "shape": {"type": "polygon", "points": points, "fill": "#334155"},
        "position": {"x": 0, "y": 0, "z": 0},
        "rotation": 0,
        "scale": 1,
        "layer": 1,
        "zIndex": 0,
        "locked": False,
        "visible": True,
        "metadata": {
            "type": "zone",
            "zoneType": "polygon",
            "origin": "manual",
            "touchedByDm": False,
            "shadowOnly": False,
            "fillColor": "#334155",
            "fillOpacity": 0.35,
            "portals": [],
            "triggers": triggers,
        },
    }


# La zona cubre el cuadrante de -5..0 (normalizado 0..0.5).
ZONA = [0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.0, 0.5]


async def _escena_con_zona(client, triggers):
    camp = (await client.post("/api/campaigns", json={"name": "Camp Triggers"})).json()
    scene = (
        await client.post(f"/api/campaigns/{camp['id']}/scenes", json={"name": "Sala"})
    ).json()
    char = (
        await client.post(
            f"/api/campaigns/{camp['id']}/characters",
            json={"name": "Aria", "type": "player", "max_pm": 6},
        )
    ).json()
    await client.put(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/characters",
        json=[
            {
                "entity_id": char["id"],
                "entity_type": "character",
                "x": 2.0,
                "z": 2.0,
                "rotation": 0,
                "visible": True,
            }
        ],
    )
    res = await client.put(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/items",
        json={"items": [_zone(ZONA, triggers)]},
    )
    assert res.status_code == 200, res.text
    return camp, scene, char


@pytest.mark.asyncio
async def test_entrar_a_la_zona_dispara_el_trigger(client):
    from core.events.bus import get_event_bus

    bus = get_event_bus()
    bus.clear_history()
    camp, scene, char = await _escena_con_zona(
        client, [{"id": "trg-1", "eventType": "trap.triggered", "enabled": True}]
    )

    res = await client.patch(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/move",
        json={"character_id": char["id"], "x": -2.0, "z": -2.0},
    )
    assert res.status_code == 200, res.text

    history = bus.get_history("trap.triggered")
    assert len(history) == 1, history
    assert history[0].data["zone_id"] == "zone-trampa-1"
    assert history[0].data["entity_id"] == char["id"]


@pytest.mark.asyncio
async def test_moverse_dentro_de_la_zona_no_repite_el_trigger(client):
    from core.events.bus import get_event_bus

    bus = get_event_bus()
    bus.clear_history()
    camp, scene, char = await _escena_con_zona(
        client, [{"id": "trg-1", "eventType": "trap.triggered", "enabled": True}]
    )

    # Entra.
    await client.patch(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/move",
        json={"character_id": char["id"], "x": -2.0, "z": -2.0},
    )
    # Se mueve dentro: no vuelve a disparar.
    await client.patch(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/move",
        json={"character_id": char["id"], "x": -3.0, "z": -3.0},
    )

    assert len(bus.get_history("trap.triggered")) == 1


@pytest.mark.asyncio
async def test_salir_y_volver_a_entrar_vuelve_a_disparar(client):
    """Entrar dispara; quedarse adentro no; salir y volver a entrar, si."""
    from core.events.bus import get_event_bus

    bus = get_event_bus()
    bus.clear_history()
    camp, scene, char = await _escena_con_zona(
        client, [{"id": "trg-1", "eventType": "trap.triggered", "enabled": True}]
    )

    # Entra.
    await client.patch(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/move",
        json={"character_id": char["id"], "x": -2.0, "z": -2.0},
    )
    assert len(bus.get_history("trap.triggered")) == 1

    # Sale de la zona (al otro lado del cuadrante).
    await client.patch(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/move",
        json={"character_id": char["id"], "x": 2.0, "z": 2.0},
    )
    assert len(bus.get_history("trap.triggered")) == 1

    # Vuelve a entrar: vuelve a disparar.
    await client.patch(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/move",
        json={"character_id": char["id"], "x": -2.0, "z": -2.0},
    )
    assert len(bus.get_history("trap.triggered")) == 2


@pytest.mark.asyncio
async def test_un_trigger_apagado_no_dispara(client):
    from core.events.bus import get_event_bus

    bus = get_event_bus()
    bus.clear_history()
    camp, scene, char = await _escena_con_zona(
        client, [{"id": "trg-1", "eventType": "trap.triggered", "enabled": False}]
    )

    await client.patch(
        f"/api/campaigns/{camp['id']}/scenes/{scene['id']}/move",
        json={"character_id": char["id"], "x": -2.0, "z": -2.0},
    )

    assert bus.get_history("trap.triggered") == []
