"""Derechos de datos del DM: exportación y borrado del perfil.

El perfil DM no tiene correo: la unidad identificable es el perfil local (nombre
+ PIN) y sus sesiones. Las campañas viven en la DB compartida de la instancia,
así que el borrado del perfil NO puede llevarse por delante campañas ajenas.
"""

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


async def _register(ac: AsyncClient, label: str) -> dict:
    res = await ac.post(
        "/api/auth/register",
        json={"name": f"{label} {uuid4().hex[:6]}", "pin": "1234"},
    )
    assert res.status_code == 200, res.text
    return res.json()


@pytest.mark.asyncio
async def test_export_da_perfil_sesiones_y_campanas_del_dm():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        dm = await _register(ac, "DM Export")
        headers = {"Authorization": f"Bearer {dm['token']}"}
        created = await ac.post(
            "/api/campaigns",
            json={"name": f"Campana {uuid4().hex[:6]}", "description": ""},
            headers=headers,
        )
        assert created.status_code == 200, created.text
        campaign_id = created.json()["id"]

        res = await ac.get("/api/auth/me/export", headers=headers)
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["dm"]["id"] == dm["dm_id"]
        assert body["dm"]["name"] == dm["dm_name"]
        assert len(body["sessions"]) == 1
        assert any(c["campaign"]["id"] == campaign_id for c in body["campaigns"])


@pytest.mark.asyncio
async def test_export_sin_token_da_401():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/auth/me/export")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_borrar_dm_mata_sus_sesiones_y_no_toca_otro_perfil():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        dm_a = await _register(ac, "DM Delete A")
        dm_b = await _register(ac, "DM Delete B")
        again_a = await ac.post(
            "/api/auth/login", json={"name": dm_a["dm_name"], "pin": "1234"}
        )
        assert again_a.status_code == 200, again_a.text
        token_a2 = again_a.json()["token"]
        headers_b = {"Authorization": f"Bearer {dm_b['token']}"}

        created = await ac.post(
            "/api/campaigns",
            json={"name": f"Campana {uuid4().hex[:6]}", "description": ""},
            headers={"Authorization": f"Bearer {dm_a['token']}"},
        )
        assert created.status_code == 200, created.text
        campaign_id = created.json()["id"]

        res = await ac.request(
            "DELETE",
            "/api/auth/me",
            json={"confirmation": "DELETE"},
            headers={"Authorization": f"Bearer {dm_a['token']}"},
        )
        assert res.status_code == 200, res.text
        assert res.json() == {
            "ok": True,
            "deleted_dm": dm_a["dm_id"],
            "sessions": 2,
            "campaigns": 0,
        }

        for token in (dm_a["token"], token_a2):
            check = await ac.get(
                "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
            )
            assert check.status_code == 401
        other = await ac.get("/api/auth/me", headers=headers_b)
        assert other.status_code == 200, other.text
        assert other.json()["dm_id"] == dm_b["dm_id"]

        campaign = await ac.get(f"/api/campaigns/{campaign_id}", headers=headers_b)
        assert campaign.status_code == 200, campaign.text


@pytest.mark.asyncio
async def test_borrar_dm_rechaza_confirmacion_erronea():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        dm = await _register(ac, "DM Confirm")
        headers = {"Authorization": f"Bearer {dm['token']}"}
        res = await ac.request(
            "DELETE", "/api/auth/me", json={"confirmation": "NO"}, headers=headers
        )
        assert res.status_code == 422
        still = await ac.get("/api/auth/me", headers=headers)
        assert still.status_code == 200
