"""Purga la basura de e2e de la base local.

Dos criterios, ambos seguros con las campañas reales:

1. Ventana temporal (`--since "YYYY-MM-DD HH:MM:SS"`): todo lo creado desde
   esa marca. La usan global-setup/global-teardown de Playwright.
2. Nombre: campañas `E2E Campaign %` y DMs `E2E DM %`, sin importar la fecha.
   Es lo que captura las pruebas manuales (probes HTTP, checks de upload).

Además borra `data/assets/{campaign_id}/` huérfanas: borrar la fila no borra el
disco, y los uploads de los tests acumulan cientos de MB.

Uso:
    python scripts/purge_e2e_junk.py
    python scripts/purge_e2e_junk.py --since "2026-10-02 01:44:52"
    python scripts/purge_e2e_junk.py --dry-run
"""

import argparse
import os
import shutil
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "roleito.db"
ASSETS_ROOT = ROOT / "data" / "assets"

# Tablas por campaign_id. Los "hijos de hijos" van primero, mientras sus padres
# todavía existen (si borrás scenes antes que scene_characters, el subquery no
# encuentra nada y quedan huérfanos).
CHILD_TABLES = (
    "characters",
    "npcs",
    "locations",
    "events",
    "relationships",
    "players",
    "sessions",
    "assets",
    "dice_rolls",
    "scenes",
    "maps",
    "dm_notebooks",
    "quests",
    "handouts",
    "combats",
    "campaign_calendars",
    "progress_clocks",
    "light_requests",
)

GRANDCHILD_SQL = (
    "DELETE FROM scene_characters WHERE scene_id IN (SELECT id FROM scenes WHERE campaign_id IN ({ph}))",
    "DELETE FROM map_markers WHERE map_id IN (SELECT id FROM maps WHERE campaign_id IN ({ph}))",
    "DELETE FROM dm_notebook_versions WHERE notebook_id IN (SELECT id FROM dm_notebooks WHERE campaign_id IN ({ph}))",
    "DELETE FROM combat_combatants WHERE combat_id IN (SELECT id FROM combats WHERE campaign_id IN ({ph}))",
    "DELETE FROM player_fog WHERE scene_id IN (SELECT id FROM scenes WHERE campaign_id IN ({ph}))",
)

# Segunda pasada: filas cuyo padre ya no existe (restos de purgas viejas).
ORPHAN_RULES = (
    ("scene_characters", "scene_id NOT IN (SELECT id FROM scenes)"),
    ("map_markers", "map_id NOT IN (SELECT id FROM maps)"),
    ("dm_notebook_versions", "notebook_id NOT IN (SELECT id FROM dm_notebooks)"),
    ("combat_combatants", "combat_id NOT IN (SELECT id FROM combats)"),
    ("player_fog", "scene_id NOT IN (SELECT id FROM scenes)"),
)


def dir_size(path: Path) -> int:
    total = 0
    for root, _, files in os.walk(path):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
            except OSError:
                pass
    return total


def is_campaign_id(name: str) -> bool:
    """Solo carpetas con forma de id de campaña (uuid): cualquier otra cosa
    bajo data/assets no es nuestra para borrar."""
    return len(name) == 36 and name.count("-") == 4


def main() -> int:
    ap = argparse.ArgumentParser(description="Purga la basura e2e de data/roleito.db")
    ap.add_argument("--since", help="borra campañas creadas desde esta marca (YYYY-MM-DD HH:MM:SS)")
    ap.add_argument("--dry-run", action="store_true", help="solo muestra qué borraría")
    args = ap.parse_args()

    if not DB_PATH.exists():
        print(f"no existe {DB_PATH}")
        return 0

    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()

    where = "name LIKE 'E2E Campaign %'"
    params: list = []
    if args.since:
        where = f"(name LIKE 'E2E Campaign %' OR created_at >= ?)"
        params.append(args.since)

    cur.execute(f"SELECT id, name FROM campaigns WHERE {where}", params)
    campaigns = cur.fetchall()
    cur.execute("SELECT id, name FROM dms WHERE name LIKE 'E2E DM %'")
    dms = cur.fetchall()

    live = {r[0] for r in cur.execute("SELECT id FROM campaigns").fetchall()}
    # Las campañas que se van a borrar todavía están "vivas": proyectar el
    # estado final para que el conteo y el dry-run sean los reales.
    live -= {c[0] for c in campaigns}
    asset_orphans = []
    if ASSETS_ROOT.is_dir():
        asset_orphans = [
            p
            for p in ASSETS_ROOT.iterdir()
            if p.is_dir() and p.name not in live and is_campaign_id(p.name)
        ]

    if not campaigns and not dms and not asset_orphans:
        print("e2e purge: nada que limpiar")
        return 0

    freed = sum(dir_size(p) for p in asset_orphans)
    print(f"e2e purge: {len(campaigns)} campañas, {len(dms)} DMs, {len(asset_orphans)} carpetas de assets huérfanas ({freed // 1024} KB)")
    for cid, name in campaigns[:20]:
        print(f"  - campaña {name!r} ({cid})")
    if len(campaigns) > 20:
        print(f"  ... y {len(campaigns) - 20} más")
    for did, name in dms[:20]:
        print(f"  - DM {name!r} ({did})")

    if args.dry_run:
        print("dry-run: no se borró nada")
        con.close()
        return 0

    if campaigns:
        ids = [c[0] for c in campaigns]
        ph = ",".join("?" * len(ids))
        for sql in GRANDCHILD_SQL:
            cur.execute(sql.format(ph=ph), ids)
        for table in CHILD_TABLES:
            cur.execute(f"DELETE FROM {table} WHERE campaign_id IN ({ph})", ids)
        cur.execute(f"DELETE FROM campaigns WHERE id IN ({ph})", ids)

    if dms:
        dids = [d[0] for d in dms]
        dph = ",".join("?" * len(dids))
        cur.execute(f"DELETE FROM auth_sessions WHERE dm_id IN ({dph})", dids)
        cur.execute(f"DELETE FROM dms WHERE id IN ({dph})", dids)

    # Segunda pasada: hijos que quedaron sin padre al borrar las campañas.
    for table, cond in ORPHAN_RULES:
        cur.execute(f"DELETE FROM {table} WHERE {cond}")
    for table in CHILD_TABLES:
        cur.execute(
            f"DELETE FROM {table} WHERE campaign_id IS NULL OR campaign_id NOT IN (SELECT id FROM campaigns)"
        )

    con.commit()
    con.execute("VACUUM")

    # Recién ahora, con las campañas ya fuera de la tabla: `live` ya no las
    # incluye, así que sus carpetas de assets quedan huérfanas de verdad.
    live = {r[0] for r in cur.execute("SELECT id FROM campaigns").fetchall()}
    orphans = [
        p
        for p in (ASSETS_ROOT.iterdir() if ASSETS_ROOT.is_dir() else [])
        if p.is_dir() and p.name not in live and is_campaign_id(p.name)
    ]
    con.close()

    for p in orphans:
        shutil.rmtree(p, ignore_errors=True)

    print("e2e purge: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())