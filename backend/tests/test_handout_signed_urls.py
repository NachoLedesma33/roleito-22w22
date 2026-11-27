"""El handout expone URL firmada para que el jugador pueda ver la imagen.

`image_path` sigue siendo la ruta de disco (la usa el DM); `image_url` es la
que el navegador pone en `<img src>`, con expiración y firma.
"""

from uuid import uuid4

import pytest


@pytest.mark.asyncio
async def test_handout_exponde_url_firmada(client, monkeypatch):
    monkeypatch.setenv("ROLEITO_ASSET_SIGNING_SECRET", "test-secret")
    suffix = uuid4().hex[:8]
    camp = (await client.post("/api/campaigns", json={"name": f"Handout Sign {suffix}"})).json()
    image_path = f"data/assets/{camp['id']}/handouts/h1/image.png"

    res = await client.post(
        f"/api/campaigns/{camp['id']}/handouts",
        json={
            "title": "Carta",
            "content": "texto",
            "image_path": image_path,
            "visible_to_players": True,
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["image_path"] == image_path
    assert body["image_url"].startswith("/api/static/")
    assert "exp=" in body["image_url"]
    assert "sig=" in body["image_url"]
