"""Aísla los tests de la base de dev.

`database.py` resuelve la DB a <root>/data/roleito.db, que es la misma que usa
la app: sin esto cada `pytest` deja campañas, escenas y personajes de basura en
la base real. Estos dos env vars tienen que estar puestos ANTES de que se
importe `database` (lo hace `main`, importado por los módulos de test), y pytest
carga los conftest antes de los tests.

- ROLEITO_DB_PATH: base propia, en temp, borrada en cada corrida.
- ROLEITO_SKIP_SEEDS: sin DMs/campañas demo (además seed_demo copia assets a
  data/assets/{campaign_id}/, o sea basura en disco por corrida).
"""

import os
import sys
import tempfile
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

# El repo raiz: `core` (los eventos, el mundo, los agentes) vive ahi, no en
# `backend/`. `main.py` tambien lo agrega, pero los tests que importan `core`
# lo necesitan antes (al collection).
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

_TEST_DB_DIR = Path(tempfile.gettempdir()) / "roleito-pytest"
_TEST_DB = _TEST_DB_DIR / "roleito.db"

_TEST_DB_DIR.mkdir(parents=True, exist_ok=True)
if _TEST_DB.exists():
    _TEST_DB.unlink()

os.environ["ROLEITO_DB_PATH"] = str(_TEST_DB)
os.environ["ROLEITO_SKIP_SEEDS"] = "1"


def _app():
    """La app, importada DESPUES de que existan los env vars.

    Importar `main` importa `database`, que resuelve el path de la base en el
    momento del import: si se importa antes de poner `ROLEITO_DB_PATH`, los
    tests pegan contra la base de dev de verdad.
    """
    from main import app

    return app


@pytest.fixture(scope="session", autouse=True)
async def _db():
    """Crea las tablas de la base temporal (una vez por corrida).

    Vive aca y no en un archivo de test: `ASGITransport` no corre el
    lifespan de la app, asi que sin esto los archivos que no dependen del
    fixture de otro archivo pegan contra una base sin tablas.
    """
    from database import init_db

    await init_db()


@pytest.fixture(scope="session")
async def _dm_token():
    """El DM con el que hablan los tests.

    La superficie de la campana (personajes, misiones, escenas, ...) pide rol
    DM: los tests la usan TODA la vida, asi que el cliente la lleva puesta.
    """
    from uuid import uuid4

    transport = ASGITransport(app=_app())
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        reg = await ac.post(
            "/api/auth/register",
            json={"name": f"Test DM {uuid4().hex[:6]}", "pin": "1234"},
        )
    return reg.json()["token"]


@pytest.fixture
async def client(_dm_token):
    transport = ASGITransport(app=_app())
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"Authorization": f"Bearer {_dm_token}"},
    ) as ac:
        yield ac


@pytest.fixture
async def anon_client():
    """Un cliente SIN token: para probar que la superficie pide rol."""
    transport = ASGITransport(app=_app())
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
