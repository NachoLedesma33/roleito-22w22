"""El lockout de PIN se aplica por IP real del visitante, no por socket.

Detras del tunel todo llega desde loopback: si se usara `request.client.host`,
un visitante podria dejar sin login a todos los demas (y al DM local).
"""

from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture(autouse=True)
def reset_lockout_state():
    from auth import _failed_attempts, _locked_until

    _failed_attempts.clear()
    _locked_until.clear()


@pytest.fixture
async def dm_credentials():
    name = f"Lockout DM {uuid4().hex[:6]}"
    pin = "1234"
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/auth/register", json={"name": name, "pin": pin})
    assert res.status_code == 200
    return name, pin


@pytest.mark.asyncio
async def test_lockout_por_ip_real_no_cierra_el_login_a_otro_visitante(dm_credentials):
    name, pin = dm_credentials
    ip_a = "203.0.113.10"
    ip_b = "203.0.113.11"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for _ in range(5):
            res = await ac.post(
                "/api/auth/login",
                json={"name": name, "pin": "9999"},
                headers={"X-Forwarded-For": ip_a},
            )
            assert res.status_code == 401

        locked = await ac.post(
            "/api/auth/login",
            json={"name": name, "pin": pin},
            headers={"X-Forwarded-For": ip_a},
        )
        assert locked.status_code == 429

        other = await ac.post(
            "/api/auth/login",
            json={"name": name, "pin": pin},
            headers={"X-Forwarded-For": ip_b},
        )
        assert other.status_code == 200


@pytest.mark.asyncio
async def test_cf_connecting_ip_gana_a_xff_en_el_lockout(dm_credentials):
    name, pin = dm_credentials
    real_ip = "198.51.100.7"

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for _ in range(5):
            res = await ac.post(
                "/api/auth/login",
                json={"name": name, "pin": "9999"},
                headers={"CF-Connecting-IP": real_ip, "X-Forwarded-For": "192.0.2.99"},
            )
            assert res.status_code == 401

        locked = await ac.post(
            "/api/auth/login",
            json={"name": name, "pin": pin},
            headers={"CF-Connecting-IP": real_ip, "X-Forwarded-For": "192.0.2.99"},
        )
        assert locked.status_code == 429

        other = await ac.post(
            "/api/auth/login",
            json={"name": name, "pin": pin},
            headers={"CF-Connecting-IP": "198.51.100.8", "X-Forwarded-For": "192.0.2.99"},
        )
        assert other.status_code == 200
