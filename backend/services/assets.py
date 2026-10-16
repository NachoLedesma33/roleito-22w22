"""Assets: dónde viven, cómo viajan en export/import y cómo se guardan o borran.

`ASSETS_DIR` estaba escrito en cinco módulos con dos variantes (una normalizada
y otra no), y el "borrar el archivo viejo antes de guardar el nuevo" repetido en
cada endpoint de upload. Acá vive una sola vez, junto con la traducción entre
la columna (ABSOLUTO) y el JSON de transporte (RELATIVO canónico).

Un path de columna = `ASSETS_DIR/campaña/...` (absoluto).
Un path de JSON = `data/assets/campaña/...` (con `/`, para cruzar SO).
"""

import base64
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import NPC, Asset, Character, Map, Scene

ASSETS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "assets")
)

# Tope por archivo en el export: un mapa de 100 MB no va dentro de un JSON de
# campaña. Si lo supera, el asset no viaja (queda fuera del JSON) y la columna
# sigue apuntando al archivo original.
MAX_ASSET_BYTES = 8 * 1024 * 1024


def save_campaign_file(
    campaign_id: str, *parts: str, filename: str, content: bytes
) -> str:
    """Escribe un archivo bajo `data/assets/<campaña>/<parts...>` y devuelve el absoluto."""
    target_dir = os.path.join(ASSETS_DIR, campaign_id, *parts)
    os.makedirs(target_dir, exist_ok=True)
    file_path = os.path.join(target_dir, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path


def remove_asset_file(path: str | None) -> None:
    """Borra el archivo solo si vive bajo `data/assets`.

    El path viene de la base, que puede apuntar a cualquier lado: el prefijo es
    la garantía de que no vamos a borrar un archivo de afuera.
    """
    if not path:
        return
    root = os.path.realpath(ASSETS_DIR)
    real = os.path.realpath(path)
    if real.startswith(root + os.sep) and os.path.isfile(real):
        os.remove(real)


def rewrite_campaign_prefix(rel: str, campaign_id: str) -> str:
    """Cambia la campaña de un path relativo canónico `data/assets/...`.

    Export e import viajan con la campaña de origen en el path. Al importar los
    bytes se escriben en la carpeta de la campaña **destino**: si no, la campaña
    importada queda apuntando a los archivos de la otra y borrar la de origen
    rompería la copia.
    """
    parts = rel[len("data/assets/"):].split("/", 1)
    tail = parts[1] if len(parts) > 1 else ""
    return f"data/assets/{campaign_id}/{tail}"


def asset_rel(path: str | None) -> str | None:
    """Reduce un path de columna al forma relativo portable 'data/assets/...'."""
    if not path:
        return None
    norm = path.replace("\\", "/")
    idx = norm.find("data/assets")
    if idx == -1:
        return None
    return norm[idx:]


def asset_abs(rel: str) -> str:
    """El absoluto de un path relativo canónico."""
    suffix = rel[len("data/assets"):].lstrip("/").replace("/", os.sep)
    return os.path.join(ASSETS_DIR, suffix)


def import_asset_path(value: str | None) -> str | None:
    """Re-absolutiza un path que venía en el JSON. Sin cambio si no es de assets."""
    rel = asset_rel(value)
    if not rel:
        return value
    return asset_abs(rel)


def embed_asset(path: str | None) -> dict | None:
    """El asset como base64 para el JSON de export, o None si no se puede."""
    rel = asset_rel(path)
    if not rel:
        return None
    try:
        size = os.path.getsize(path)
    except OSError:
        return None
    if size > MAX_ASSET_BYTES:
        return None
    try:
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode("ascii")
    except OSError:
        return None
    return {"path": rel, "data_base64": data}


async def collect_assets(db: AsyncSession, campaign_id: str) -> list[dict]:
    """Todos los archivos de una campaña, deduplicados y embebidos.

    El dedupe es por path, así que un mismo archivo referenciado por un mapa y
    por una escena viaja una sola vez.
    """
    refs: dict[str, str] = {}

    maps_r = await db.execute(select(Map).where(Map.campaign_id == campaign_id))
    for m in maps_r.scalars().all():
        refs[m.file_path] = m.file_path
        if m.thumbnail_path:
            refs[m.thumbnail_path] = m.thumbnail_path

    scenes_r = await db.execute(select(Scene).where(Scene.campaign_id == campaign_id))
    for s in scenes_r.scalars().all():
        if s.background_path:
            refs[s.background_path] = s.background_path
        if s.audio_path:
            refs[s.audio_path] = s.audio_path

    chars_r = await db.execute(select(Character).where(Character.campaign_id == campaign_id))
    for c in chars_r.scalars().all():
        for p in (c.portrait_path, c.model_path):
            if p:
                refs[p] = p

    npcs_r = await db.execute(select(NPC).where(NPC.campaign_id == campaign_id))
    for n in npcs_r.scalars().all():
        for p in (n.portrait_path, n.model_path):
            if p:
                refs[p] = p

    assets_r = await db.execute(select(Asset).where(Asset.campaign_id == campaign_id))
    for a in assets_r.scalars().all():
        refs[a.file_path] = a.file_path

    out = []
    for p in refs.values():
        emb = embed_asset(p)
        if emb:
            out.append(emb)
    return out