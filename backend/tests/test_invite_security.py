"""El invite es una credencial: se rota, expira y se revoca.

Un codigo que vive para siempre en el Discord de la mesa es una puerta abierta.
La expiracion viaja en `settings_json` (`invite_expires_at`) para no agregar
columnas: el invite ya es un secreto transportado por URL, no un recurso novo.
"""

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from database import async_session
from main import app
from models import Campaign


async def _campaign(client: AsyncClient, name: str) -> dict:
    res = await client.post("/api/campaigns", json={"name": name})
    assert res.status_code == 200
    return res.json()


async def _expire_invite(campaign_id: str, value: datetime | None) -> None:
    async with async_session() as db:
        result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
        campaign = result.scalar_one()
        settings = dict(campaign.settings_json or {})
        if value is None:
            settings.pop("invite_expires_at", None)
        else:
            settings["invite_expires_at"] = value.isoformat()
        campaign.settings_json = settings
        await db.commit()


@pytest.mark.asyncio
async def test_rotar_invite_invalida_el_codigo_anterior(client, anon_client):
    campaign = await _campaign(client, f"Invite Rotate {uuid4().hex[:6]}")
    old = (await client.post(f"/api/campaigns/{campaign['id']}/invite-code")).json()["invite_code"]
    assert (await anon_client.get(f"/api/campaigns/invite/{old}")).status_code == 200

    new = (await client.post(f"/api/campaigns/{campaign['id']}/invite-code")).json()["invite_code"]
    assert new != old
    assert (await anon_client.get(f"/api/campaigns/invite/{old}")).status_code == 404
    assert (await anon_client.get(f"/api/campaigns/invite/{new}")).status_code == 200
    assert (await anon_client.get(f"/api/campaigns/invite/{old}/revision")).status_code == 404


@pytest.mark.asyncio
async def test_invite_expirado_no_abre_la_campana(client, anon_client):
    campaign = await _campaign(client, f"Invite Expired {uuid4().hex[:6]}")
    code = (await client.post(f"/api/campaigns/{campaign['id']}/invite-code")).json()["invite_code"]
    await _expire_invite(campaign["id"], datetime.utcnow() - timedelta(minutes=1))

    assert (await anon_client.get(f"/api/campaigns/invite/{code}")).status_code == 404
    assert (await anon_client.get(f"/api/campaigns/invite/{code}/revision")).status_code == 404


@pytest.mark.asyncio
async def test_codigo_legacy_sin_expiracion_no_abre_la_campana(client, anon_client):
    campaign = await _campaign(client, f"Invite Legacy {uuid4().hex[:6]}")
    code = (await client.post(f"/api/campaigns/{campaign['id']}/invite-code")).json()["invite_code"]
    await _expire_invite(campaign["id"], None)

    assert (await anon_client.get(f"/api/campaigns/invite/{code}")).status_code == 404


@pytest.mark.asyncio
async def test_revocar_invite_cierra_tambien_el_link_fijo(client, anon_client):
    campaign = await _campaign(client, f"Invite Revoke {uuid4().hex[:6]}")
    code = (await client.post(f"/api/campaigns/{campaign['id']}/invite-code")).json()["invite_code"]
    await client.put(f"/api/campaigns/{campaign['id']}/public-join", json={"enabled": True})
    assert (await anon_client.get("/api/campaigns/active-invite")).status_code == 200

    res = await client.delete(f"/api/campaigns/{campaign['id']}/invite-code")
    assert res.status_code == 200
    assert (await anon_client.get(f"/api/campaigns/invite/{code}")).status_code == 404
    assert (await anon_client.get("/api/campaigns/active-invite")).status_code == 404
