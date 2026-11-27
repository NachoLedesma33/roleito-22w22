"""Assets privados: firma con expiración en la URL, sin cookies ni Bearer.

Los handouts viajan al jugador en `<img>`; el navegador no manda headers ahí.
La firma va en query y el backend la valida antes de servir el archivo.
"""

import os
from uuid import uuid4

import pytest

from services.assets import ASSETS_DIR, signed_asset_url


@pytest.fixture
def private_file(monkeypatch):
    monkeypatch.setenv("ROLEITO_ASSET_SIGNING_SECRET", "test-secret")
    campaign = f"_probe_{uuid4().hex[:8]}"
    rel = f"{campaign}/handouts/image.png"
    path = os.path.join(ASSETS_DIR, campaign, "handouts", "image.png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as fh:
        fh.write(b"private")
    yield rel, path
    os.remove(path)
    os.rmdir(os.path.dirname(path))
    os.rmdir(os.path.dirname(os.path.dirname(path)))


@pytest.mark.asyncio
async def test_handout_sin_firma_da_403(anon_client, private_file):
    rel, _ = private_file
    res = await anon_client.get(f"/api/static/{rel}")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_handout_con_firma_valida_se_sirve(anon_client, private_file):
    rel, _ = private_file
    res = await anon_client.get(signed_asset_url(rel))
    assert res.status_code == 200
    assert res.content == b"private"


@pytest.mark.asyncio
async def test_firma_expirada_da_403(anon_client, private_file):
    rel, _ = private_file
    res = await anon_client.get(signed_asset_url(rel, ttl=-1))
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_firma_con_path_absoluto_se_sirve(anon_client, private_file):
    """La columna guarda el path absoluto; la URL debe canonizarlo."""
    _, path = private_file
    res = await anon_client.get(signed_asset_url(path))
    assert res.status_code == 200
    assert res.content == b"private"
