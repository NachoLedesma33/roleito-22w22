"""Cerrar todas las sesiones: alcance por DM, no global.

Un DM puede querer desloguear otras pestañas o dispositivos después de ver
algo raro. El endpoint debe matar también la sesión que lo llama (para que la
UI pueda mandar al login) y no tocar la de otros DMs.
"""

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


async def _login(ac: AsyncClient, name: str, pin: str) -> str:
    res = await ac.post("/api/auth/login", json={"name": name, "pin": pin})
    assert res.status_code == 200, res.text
    return res.json()["token"]


@pytest.mark.asyncio
async def test_bulk_logout_mata_todas_las_sesiones_del_dm_y_no_otras():
    surname = uuid4().hex[:6]
    dm_a = f"DM A {surname}"
    dm_b = f"DM B {surname}"
    pin = "1234"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for name in (dm_a, dm_b):
            res = await ac.post("/api/auth/register", json={"name": name, "pin": pin})
            assert res.status_code == 200, res.text

        a1 = await _login(ac, dm_a, pin)
        a2 = await _login(ac, dm_a, pin)
        b1 = await _login(ac, dm_b, pin)

        res = await ac.delete(
            "/api/auth/sessions", headers={"Authorization": f"Bearer {a1}"}
        )
        assert res.status_code == 200, res.text
        assert res.json()["killed"] >= 2

        for token in (a1, a2):
            check = await ac.get(
                "/api/auth/me", headers={"Authorization": f"Bearer {token}"}
            )
            assert check.status_code == 401

        other = await ac.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {b1}"}
        )
        assert other.status_code == 200


@pytest.mark.asyncio
async def test_bulk_logout_requiere_token():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.delete("/api/auth/sessions")
    assert res.status_code == 401
