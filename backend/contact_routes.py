"""Formulario publico de contacto: guardado local, antispam y correo TLS.

La direccion del destinatario y las credenciales SMTP viven en variables de
entorno (`.env.example`): el repo es publico, asi que ningun correo ni secreto
se guarda aca. Sin SMTP habilitado el mensaje se guarda igual y la UI muestra
el ticket: certeza de guardado, no de entrega.
"""

from __future__ import annotations

import logging
import os
import smtplib
import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta
from email.message import EmailMessage
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import and_, delete, or_

from database import async_session as get_db
from models import ContactMessage
from rate_limit import client_key, is_loopback

logger = logging.getLogger("roleito.contact")

router = APIRouter(prefix="", tags=["contact"])

RETENTION_DAYS = 90
ANSWERED_RETENTION_DAYS = 30
WINDOW_SECONDS = 3600

_contact_hits: dict[str, deque[float]] = defaultdict(deque)


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80, pattern=r"^[^\r\n]+$")
    email: str = Field(
        ..., min_length=5, max_length=254,
        pattern=r"^[^@\s\r\n]+@[^@\s\r\n]+\.[^@\s\r\n]+$",
    )
    subject: str = Field(..., min_length=3, max_length=120, pattern=r"^[^\r\n]+$")
    message: str = Field(..., min_length=10, max_length=5000)
    consent: Literal[True]
    website: str = Field(default="", max_length=200)  # honeypot: los bots lo rellenan


def _allow(ip: str) -> bool:
    max_hits = int(os.getenv("ROLEITO_CONTACT_MAX_PER_HOUR", "3"))
    now = time.monotonic()
    hits = _contact_hits[ip]
    while hits and now - hits[0] >= WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= max_hits:
        return False
    hits.append(now)
    return True


def _send_email(row: ContactMessage) -> bool:
    if os.getenv("ROLEITO_CONTACT_SMTP_ENABLED", "0") != "1":
        return False
    recipient = os.getenv("ROLEITO_CONTACT_EMAIL")
    host = os.getenv("ROLEITO_SMTP_HOST")
    user = os.getenv("ROLEITO_SMTP_USER")
    password = os.getenv("ROLEITO_SMTP_PASSWORD")
    if not all([recipient, host, user, password]):
        logger.warning("Contacto: SMTP habilitado pero faltan variables de entorno")
        return False

    port = int(os.getenv("ROLEITO_SMTP_PORT", "587"))
    mail = EmailMessage()
    mail["From"] = user
    mail["To"] = recipient
    mail["Reply-To"] = row.email
    mail["Subject"] = f"[Roleito] {row.subject}"
    mail.set_content(
        f"Ticket: {row.ticket}\nNombre: {row.name}\nEmail: {row.email}\n"
        f"Asunto: {row.subject}\n\n{row.body}"
    )
    try:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(mail)
        return True
    except Exception:  # noqa: BLE001 — el guardado ya esta hecho; solo falla el correo
        logger.exception("No se pudo enviar el correo de contacto")
        return False


@router.post("/contact")
async def submit_contact(body: ContactCreate, request: Request):
    ip, via_proxy = client_key(request.headers, request.client.host if request.client else None)
    # El DM local nunca se frena; detras del tunel es un visitante mas.
    if not (not via_proxy and is_loopback(ip)) and not _allow(ip):
        raise HTTPException(status_code=429, detail="Demasiados mensajes. Probá más tarde.")

    if body.website.strip():
        return {"ok": True, "stored": False, "ticket": None, "email_sent": False}

    ticket = f"ROL-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.utcnow()
    async with get_db() as db:
        await db.execute(
            delete(ContactMessage).where(
                or_(
                    ContactMessage.created_at < now - timedelta(days=RETENTION_DAYS),
                    and_(
                        ContactMessage.answered_at.isnot(None),
                        ContactMessage.answered_at < now - timedelta(days=ANSWERED_RETENTION_DAYS),
                    ),
                )
            )
        )
        row = ContactMessage(
            ticket=ticket,
            name=body.name.strip(),
            email=body.email.strip(),
            subject=body.subject.strip(),
            body=body.message.strip(),
            consent=True,
        )
        db.add(row)
        await db.commit()

    return {
        "ok": True,
        "stored": True,
        "ticket": ticket,
        "email_sent": _send_email(row),
    }
