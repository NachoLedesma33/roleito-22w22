"""Un path de asset del JSON de import es datos del usuario, no confiable.

`data/assets/../../algo` salia de `ASSETS_DIR`: `asset_abs()` lo escribia
fuera y `import_asset_path()` podia dejar una columna apuntando a otro arbol.
La forma canonica es `data/assets/<...>` sin segmentos `..`.
"""

import base64
import os
from uuid import uuid4

import pytest

from services.assets import ASSETS_DIR, asset_abs, asset_rel, rewrite_campaign_prefix


@pytest.mark.parametrize(
    "rel",
    [
        "data/assets/../../secreto.txt",
        "data/assets/camp/../otra/x.png",
        "data\\assets\\..\\secreto.txt",
        "/etc/data/assets/x.png",
        "data/assets/camp/..\\secreto.txt",
    ],
)
def test_asset_rel_rechaza_paths_no_canonicos(rel):
    assert asset_rel(rel) is None


def test_asset_rel_acepta_absoluto_de_la_base():
    abs_path = os.path.join(ASSETS_DIR, "camp", "x.png")
    assert asset_rel(abs_path) == "data/assets/camp/x.png"


def test_asset_abs_rechaza_salida_del_arbol():
    with pytest.raises(ValueError):
        asset_abs("data/assets/../../secreto.txt")


def test_rewrite_rechaza_salida_del_arbol():
    with pytest.raises(ValueError):
        rewrite_campaign_prefix("data/assets/origen/../../secreto.txt", "destino")


@pytest.mark.asyncio
async def test_import_no_escribe_fuera_de_assets(client):
    nombre = f"traversal-{uuid4().hex[:8]}.txt"
    fuera = os.path.join(os.path.dirname(os.path.realpath(ASSETS_DIR)), nombre)
    try:
        camp = (await client.post("/api/campaigns", json={"name": "Origen Path"})).json()
        export = (await client.get(f"/api/campaigns/{camp['id']}/export")).json()
        export["assets"] = [
            {
                "path": f"data/assets/../../{nombre}",
                "data_base64": base64.b64encode(b"PWN").decode(),
            }
        ]

        res = await client.post("/api/campaigns/import", json={**export, "name": "Copia Path"})
        assert res.status_code == 200
        assert not os.path.exists(fuera)
    finally:
        if os.path.isfile(fuera):
            os.remove(fuera)
