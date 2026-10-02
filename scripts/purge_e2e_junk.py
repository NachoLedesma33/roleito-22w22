"""Purga SOLO la basura que crearon los tests. Nunca lo demás.

Regla dura: nada se borra si no sabemos que lo creó una corrida de e2e.

Fuentes de verdad (en este orden):

1. **Registro** (`%TEMP%/roleito-e2e-ids.txt`): ids de campañas y DMs que
   crearon los tests. El fixture `tests/fixtures/campaign-fixture.ts` los
   escribe al crearlos. Es la única fuente que sigue valiendo después de que el
   fixture borra la campaña por la API: la fila ya no está, pero la carpeta
   `data/assets/{id}/` sigue en disco.
2. **Fila presente** en `campaigns`/`dms`: se borra si se llama `E2E %` o si
   `created_at >= --since` (lo usan global-setup/global-teardown). Sus carpetas
   de assets van con ella, porque la fila ya nos dice que es de test.
3. Carpeta de assets sin fila: se borra **solo** si su id está en el registro.
   Cualquier otra carpeta se reporta y se deja como está.

Uso:
    python scripts/purge_e2e_junk.py                  # purga lo de test
    python scripts/purge_e2e_junk.py --dry-run        # muestra qué purgaría
    python scripts/purge_e2e_junk.py --report         # inventario: qué es
                                                       # de test y qué no
"""

import argparse
import os
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "roleito.db"
ASSETS_ROOT = ROOT / "data" / "assets"
REGISTRY = Path(tempfile.gettempdir()) / "roleito-e2e-ids.txt"

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
    """Solo carpetas con forma de id de campaña (uuid)."""
    return len(name) == 36 and name.count("-") == 4


def read_registry() -> set[str]:
    if not REGISTRY.exists():
        return set()
    return {
        line.strip()
        for line in REGISTRY.read_text(encoding="utf-8", errors="ignore").splitlines()
        if line.strip()
    }


def kb(n: int) -> str:
    return f"{n / 1024 / 1024:.1f} MB" if n >= 1024 * 1024 else f"{n // 1024} KB"


def asset_dirs() -> list[Path]:
    if not ASSETS_ROOT.is_dir():
        return []
    return [p for p in ASSETS_ROOT.iterdir() if p.is_dir() and is_campaign_id(p.name)]


def report(con: sqlite3.Connection) -> int:
    """Inventario completo: qué es de test (se purgaría) y qué no (intocable)."""
    cur = con.cursor()
    camps = cur.execute("SELECT id, name, created_at FROM campaigns ORDER BY created_at").fetchall()
    dms = cur.execute("SELECT id, name, created_at FROM dms ORDER BY created_at").fetchall()
    registered = read_registry()
    dirs = asset_dirs()
    live = {r[0] for r in camps}

    print(f"campañas: {len(camps)}  DMs: {len(dms)}  carpetas de assets: {len(dirs)}")
    print("\n[test] se purgarían:")
    for cid, name, when in camps:
        if name.startswith("E2E "):
            print(f"  campaña {name!r} ({cid}, {when})")
    for did, name, when in dms:
        if name.startswith("E2E "):
            print(f"  DM {name!r} ({did}, {when})")
    for p in dirs:
        if p.name in live:
            continue
        tag = "" if p.name in registered else "  <- NO se borra: no está en el registro"
        print(f"  assets huérfanos {p.name} ({kb(dir_size(p))}){tag}")

    keep_c = sum(1 for c in camps if not c[1].startswith("E2E "))
    keep_d = sum(1 for d in dms if not d[1].startswith("E2E "))
    survivors = live - {c[0] for c in camps if c[1].startswith("E2E ")}
    keep_dirs = [p for p in dirs if p.name in survivors]
    keep_assets = sum(dir_size(p) for p in keep_dirs)
    print(f"\n[no test] NO se tocan: {keep_c} campañas, {keep_d} DMs, "
          f"{len(keep_dirs)} carpetas de assets ({kb(keep_assets)})")
    for cid, name, when in camps:
        if not name.startswith("E2E "):
            print(f"  campaña {name!r} ({cid}, {when})")
    for did, name, when in dms:
        if not name.startswith("E2E "):
            print(f"  DM {name!r} ({did}, {when})")
    print(f"\nregistro: {REGISTRY} ({len(registered)} ids)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Purga la basura de e2e de data/roleito.db")
    ap.add_argument("--since", help="borra campañas creadas desde esta marca (YYYY-MM-DD HH:MM:SS)")
    ap.add_argument("--dry-run", action="store_true", help="muestra qué borraría, no borra")
    ap.add_argument("--report", action="store_true", help="inventario: qué es de test y qué no")
    args = ap.parse_args()

    if not DB_PATH.exists():
        print(f"no existe {DB_PATH}")
        return 0

    con = sqlite3.connect(DB_PATH)
    if args.report:
        return report(con)

    cur = con.cursor()
    registered = read_registry()

    where = "name LIKE 'E2E Campaign %'"
    params: list = []
    if args.since:
        where = "(name LIKE 'E2E Campaign %' OR created_at >= ?)"
        params.append(args.since)

    cur.execute(f"SELECT id, name FROM campaigns WHERE {where}", params)
    campaigns = cur.fetchall()
    cur.execute("SELECT id, name FROM dms WHERE name LIKE 'E2E DM %'")
    dms = cur.fetchall()

    # Carpetas que sí vamos a borrar: las de las campañas de esta purga (su fila
    # ya las delató como test) + las huérfanas registradas por el fixture.
    doomed_ids = {c[0] for c in campaigns} | registered
    doomed_dirs = [p for p in asset_dirs() if p.name in doomed_ids]

    if not campaigns and not dms and not doomed_dirs:
        print("e2e purge: nada que limpiar")
        con.close()
        return 0

    freed = sum(dir_size(p) for p in doomed_dirs)
    print(f"e2e purge: {len(campaigns)} campañas, {len(dms)} DMs, "
          f"{len(doomed_dirs)} carpetas de assets ({kb(freed)})")
    for cid, name in campaigns[:20]:
        print(f"  - campaña {name!r} ({cid})")
    if len(campaigns) > 20:
        print(f"  ... y {len(campaigns) - 20} más")
    for did, name in dms[:20]:
        print(f"  - DM {name!r} ({did})")

    if args.dry_run:
        # Las campañas que se van a borrar todavía están en la tabla: proyectar
        # el estado final para contar las huérfanas de verdad.
        survivors = {r[0] for r in cur.execute("SELECT id FROM campaigns").fetchall()} - doomed_ids
        untouched = [p for p in asset_dirs() if p.name not in doomed_ids and p.name not in survivors]
        if untouched:
            print(f"dry-run: {len(untouched)} carpetas de assets huérfanas SIN borrar "
                  f"({kb(sum(dir_size(p) for p in untouched))}) — no están en el registro")
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
    con.close()

    for p in doomed_dirs:
        shutil.rmtree(p, ignore_errors=True)
    # El registro se consume: lo que no se borró (carpetas huérfanas sin
    # registro) queda fuera, pero las campañas test ya no existen.
    REGISTRY.write_text("", encoding="utf-8")

    print("e2e purge: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
