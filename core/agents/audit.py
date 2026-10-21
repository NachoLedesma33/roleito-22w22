"""Auditoria de las llamadas a la IA (C9 del plan de seguridad).

Que se le pregunto al modelo, con que proveedor y modelo, cuanto tardo,
cuantos tokens y si salio bien.

**El prompt no se guarda.** Puede contener datos de la campana (nombres,
notas, eventos). Se guarda su hash (sha256): alcanza para ver que dos
llamadas son la misma, sin filtrar el texto.

El log es local (`data/ai_audit.log`, gitignored) y una linea JSON por llamada.
"""

from __future__ import annotations

import hashlib
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from infrastructure.ai.base import simple_messages

from core.agents.budget import (
    BudgetExceeded,
    current_campaign,
    ensure_within_budget,
    record_usage,
)

AUDIT_PATH = Path(__file__).resolve().parents[2] / "data" / "ai_audit.log"

MAX_BYTES = 2 * 1024 * 1024
KEEP_LINES = 1000


def prompt_hash(prompt: str, system: str = "") -> str:
    """La huella del prompt. Misma entrada, misma huella."""
    raw = f"{system}\x00{prompt}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:16]


def record_call(
    *,
    agent_id: str,
    provider: str,
    model: str | None,
    prompt: str,
    system: str = "",
    status: str = "ok",
    latency_ms: int = 0,
    usage: Any = None,
    attempts: int = 1,
    error: str | None = None,
) -> None:
    """Una linea al log. Nunca rompe la llamada: si el log falla, la llamada sigue."""
    entry: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "agent": agent_id,
        "provider": provider,
        "model": model,
        "status": status,
        "latency_ms": latency_ms,
        "prompt_sha": prompt_hash(prompt, system),
        "prompt_chars": len(prompt),
        "attempts": attempts,
    }
    if usage:
        entry["usage"] = usage
    if error:
        entry["error"] = error[:200]
    try:
        _append(entry)
    except OSError:
        pass


def _append(entry: dict) -> None:
    AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
    _rotate_if_needed()
    with AUDIT_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _rotate_if_needed() -> None:
    """El log no crece sin limite: si pasa el tope, quedan las ultimas lineas."""
    try:
        if AUDIT_PATH.stat().st_size <= MAX_BYTES:
            return
        lines = AUDIT_PATH.read_text(encoding="utf-8").splitlines()[-KEEP_LINES:]
        AUDIT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except OSError:
        pass


def read_audit(limit: int = 50) -> list[dict]:
    """Las ultimas llamadas, la mas reciente primero."""
    try:
        lines = AUDIT_PATH.read_text(encoding="utf-8").splitlines()
    except OSError:
        return []
    selected = lines[-limit:] if limit > 0 else lines
    out: list[dict] = []
    for line in reversed(selected):
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


async def audited_call(
    *,
    agent_id: str,
    provider: Any,
    prompt: str,
    system: str = "",
    model: str | None = None,
    max_tokens: int = 512,
    temperature: float = 0.7,
    image_base64: str | None = None,
    image_mime: str | None = None,
) -> str:
    """La llamada al modelo, auditada.

    Es el unico camino por el que los agentes habla con un provider: asi el
    log no se puede esquivar por olvidarse de auditar una llamada.
    """
    name = getattr(provider, "name", "?")
    if hasattr(provider, "last_usage"):
        # El provider guarda el uso de la ultima llamada: se limpia para no
        # reportar los tokens de la llamada anterior.
        provider.last_usage = None

    # El tope se aplica ANTES de salir a internet (C8): si la campaña ya
    # alcanzo su tope, la llamada no se hace y no se gasta nada.
    campaign = current_campaign()
    if campaign:
        try:
            ensure_within_budget(campaign)
        except BudgetExceeded as e:
            record_call(
                agent_id=agent_id,
                provider=name,
                model=model,
                prompt=prompt,
                system=system,
                status="blocked",
                error=str(e),
            )
            raise

    start = time.perf_counter()
    try:
        raw = await provider.complete(
            simple_messages(system, prompt, image_base64, image_mime),
            model=model,
            max_tokens=max_tokens,
            temperature=temperature,
        )
    except Exception as e:
        attempts = getattr(provider, "last_attempts", 1) or 1
        record_call(
            agent_id=agent_id,
            provider=name,
            model=model,
            prompt=prompt,
            system=system,
            status="error",
            latency_ms=int((time.perf_counter() - start) * 1000),
            attempts=attempts,
            error=str(e),
        )
        if campaign:
            record_usage(campaign, attempts=attempts)
        raise

    attempts = getattr(provider, "last_attempts", 1) or 1
    record_call(
        agent_id=agent_id,
        provider=name,
        model=model,
        prompt=prompt,
        system=system,
        status="ok",
        latency_ms=int((time.perf_counter() - start) * 1000),
        attempts=attempts,
        usage=getattr(provider, "last_usage", None),
    )
    if campaign:
        record_usage(campaign, attempts=attempts)
    return raw
