"""Formulario de contacto: guardado, consentimiento, spam y retencion.

El endpoint es publico (no pide PIN) por eso se prueba con `anon_client`:
solo se frenan los bots con honeypot, rate limit y validacion estricta.
"""

from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import select

from database import async_session
from models import ContactMessage

BASE = {
    "name": "Visitante",
    "email": "visitante@example.com",
    "subject": "Consulta sobre una campaña",
    "message": "Hola, tengo una duda sobre el manejo de las sesiones.",
    "consent": True,
    "website": "",
}


async def _count() -> int:
    async with async_session() as db:
        return len((await db.execute(select(ContactMessage))).scalars().all())


@pytest.fixture(autouse=True)
def reset_contact_state():
    from contact_routes import _contact_hits

    _contact_hits.clear()


@pytest.mark.asyncio
async def test_contact_guarda_mensaje_y_devuelve_ticket(anon_client):
    before = await _count()
    res = await anon_client.post(
        "/api/contact", json=BASE, headers={"X-Forwarded-For": f"198.51.100.{uuid4().int % 200 + 1}"}
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["stored"] is True
    assert data["ticket"]
    assert "visitante@example.com" not in res.text
    assert await _count() == before + 1


@pytest.mark.asyncio
async def test_contact_rechaza_sin_consentimiento(anon_client):
    payload = dict(BASE, consent=False)
    res = await anon_client.post("/api/contact", json=payload)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_contact_ignora_envio_con_honeypot(anon_client):
    before = await _count()
    res = await anon_client.post("/api/contact", json=dict(BASE, website="spam.example"))
    assert res.status_code == 200
    assert res.json()["stored"] is False
    assert await _count() == before


@pytest.mark.asyncio
async def test_contact_limita_envios_por_ip(anon_client, monkeypatch):
    monkeypatch.setenv("ROLEITO_CONTACT_MAX_PER_HOUR", "2")
    ip = f"203.0.113.{uuid4().int % 200 + 1}"
    for _ in range(2):
        res = await anon_client.post("/api/contact", json=BASE, headers={"X-Forwarded-For": ip})
        assert res.status_code == 200, res.text
    blocked = await anon_client.post("/api/contact", json=BASE, headers={"X-Forwarded-For": ip})
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_contact_valida_email(anon_client):
    res = await anon_client.post("/api/contact", json=dict(BASE, email="no-es-un-mail"))
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_contact_limita_longitud(anon_client):
    res = await anon_client.post("/api/contact", json=dict(BASE, message="x" * 5001))
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_contact_poda_mensajes_viejos_y_respondidos(anon_client):
    now = datetime.utcnow()
    async with async_session() as db:
        db.add_all(
            [
                ContactMessage(
                    ticket="old", name="Viejo", email="old@example.com", subject="s",
                    body="b", consent=True, created_at=now - timedelta(days=91),
                ),
                ContactMessage(
                    ticket="answered", name="Respondido", email="answered@example.com", subject="s",
                    body="b", consent=True, created_at=now - timedelta(days=40),
                    answered_at=now - timedelta(days=31),
                ),
                ContactMessage(
                    ticket="fresh", name="Fresco", email="fresh@example.com", subject="s",
                    body="b", consent=True, created_at=now,
                ),
            ]
        )
        await db.commit()

    res = await anon_client.post(
        "/api/contact", json=BASE, headers={"X-Forwarded-For": f"192.0.2.{uuid4().int % 200 + 1}"}
    )
    assert res.status_code == 200, res.text
    async with async_session() as db:
        tickets = set((await db.execute(select(ContactMessage.ticket))).scalars().all())
    assert "old" not in tickets
    assert "answered" not in tickets
    assert "fresh" in tickets
