"""Dónde viven los archivos de assets y cómo se guardan o se borran.

`ASSETS_DIR` estaba escrito en cinco módulos con dos variantes (una normalizada
y otra no), y el "borrar el archivo viejo antes de guardar el nuevo" repetido en
cada endpoint de upload. Acá vive una sola vez.

Una columna de path guarda el ABSOLUTO (`ASSETS_DIR/campaña/...`), que es lo que
comparte la lógica de export/import; el transporte JSON lo reduce a
`data/assets/...` (ver `routes._asset_rel`).
"""

import os

ASSETS_DIR = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "data", "assets")
)


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