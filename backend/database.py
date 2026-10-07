from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base
from datetime import datetime
from pathlib import Path
import logging
import os

logger = logging.getLogger("roleito.db")

# ROLEITO_DB_PATH: pytest lo sobreescribe (ver tests/conftest.py) para no escribir
# sobre la base de dev, que es la que usa la app.
DB_PATH = Path(os.environ.get("ROLEITO_DB_PATH") or Path(__file__).parent.parent / "data" / "roleito.db")
DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DB_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

MIGRATIONS = [
    ("scenes", "map_id", "ALTER TABLE scenes ADD COLUMN map_id TEXT"),
    ("map_markers", "target_scene_id", "ALTER TABLE map_markers ADD COLUMN target_scene_id TEXT"),
    ("characters", "inventory_json", "ALTER TABLE characters ADD COLUMN inventory_json TEXT DEFAULT '[]'"),
    ("characters", "spells_json", "ALTER TABLE characters ADD COLUMN spells_json TEXT DEFAULT '[]'"),
    ("npcs", "inventory_json", "ALTER TABLE npcs ADD COLUMN inventory_json TEXT DEFAULT '[]'"),
    ("npcs", "spells_json", "ALTER TABLE npcs ADD COLUMN spells_json TEXT DEFAULT '[]'"),
    ("characters", "max_pv", "ALTER TABLE characters ADD COLUMN max_pv INTEGER DEFAULT 10"),
    ("characters", "max_pm", "ALTER TABLE characters ADD COLUMN max_pm INTEGER DEFAULT 10"),
    ("characters", "defense", "ALTER TABLE characters ADD COLUMN defense INTEGER DEFAULT 5"),
    ("npcs", "max_pv", "ALTER TABLE npcs ADD COLUMN max_pv INTEGER DEFAULT 10"),
    ("npcs", "max_pm", "ALTER TABLE npcs ADD COLUMN max_pm INTEGER DEFAULT 10"),
    ("npcs", "defense", "ALTER TABLE npcs ADD COLUMN defense INTEGER DEFAULT 5"),
    # SQLite rechaza ADD COLUMN con default no constante; el valor lo llena el
    # modelo (default=datetime.utcnow) y las filas viejas quedan en NULL.
    ("characters", "updated_at", "ALTER TABLE characters ADD COLUMN updated_at TIMESTAMP"),
    ("npcs", "updated_at", "ALTER TABLE npcs ADD COLUMN updated_at TIMESTAMP"),
    ("scene_characters", "updated_at", "ALTER TABLE scene_characters ADD COLUMN updated_at TIMESTAMP"),
    ("characters", "player_notes", "ALTER TABLE characters ADD COLUMN player_notes TEXT DEFAULT ''"),
    ("characters", "model_path", "ALTER TABLE characters ADD COLUMN model_path TEXT"),
    ("npcs", "model_path", "ALTER TABLE npcs ADD COLUMN model_path TEXT"),
    ("scene_characters", "rotation", "ALTER TABLE scene_characters ADD COLUMN rotation FLOAT DEFAULT 0.0"),
    ("scenes", "map_scale", "ALTER TABLE scenes ADD COLUMN map_scale FLOAT DEFAULT 1.0"),
    ("scenes", "grid_size", "ALTER TABLE scenes ADD COLUMN grid_size FLOAT DEFAULT 0.0"),
    ("scenes", "grid_snap", "ALTER TABLE scenes ADD COLUMN grid_snap INTEGER DEFAULT 0"),
    ("scene_characters", "token_scale", "ALTER TABLE scene_characters ADD COLUMN token_scale FLOAT DEFAULT 1.0"),
    ("scene_characters", "move_speed", "ALTER TABLE scene_characters ADD COLUMN move_speed FLOAT DEFAULT 1.0"),
    ("scene_characters", "brightness", "ALTER TABLE scene_characters ADD COLUMN brightness FLOAT DEFAULT 0.0"),
    ("scene_characters", "vx", "ALTER TABLE scene_characters ADD COLUMN vx FLOAT DEFAULT 0.0"),
    ("scene_characters", "vz", "ALTER TABLE scene_characters ADD COLUMN vz FLOAT DEFAULT 0.0"),
    ("scene_characters", "vrot", "ALTER TABLE scene_characters ADD COLUMN vrot FLOAT DEFAULT 0.0"),
    ("scene_characters", "last_move_at", "ALTER TABLE scene_characters ADD COLUMN last_move_at FLOAT DEFAULT 0.0"),
    ("scene_characters", "facing_offset", "ALTER TABLE scene_characters ADD COLUMN facing_offset FLOAT DEFAULT 0.0"),
    ("scenes", "items_json", "ALTER TABLE scenes ADD COLUMN items_json TEXT DEFAULT '[]'"),
    ("scenes", "model_y_offset", "ALTER TABLE scenes ADD COLUMN model_y_offset FLOAT DEFAULT 0.0"),
    ("scene_characters", "vision_type", "ALTER TABLE scene_characters ADD COLUMN vision_type TEXT DEFAULT 'normal'"),
    ("scene_characters", "vision_range", "ALTER TABLE scene_characters ADD COLUMN vision_range FLOAT DEFAULT 6.0"),
    ("combats", "next_seq", "ALTER TABLE combats ADD COLUMN next_seq INTEGER DEFAULT 0"),
    ("combat_combatants", "pending_roll", "ALTER TABLE combat_combatants ADD COLUMN pending_roll INTEGER DEFAULT 0"),
    ("scene_characters", "statuses_json", "ALTER TABLE scene_characters ADD COLUMN statuses_json TEXT DEFAULT '[]'"),
    ("scenes", "weather", "ALTER TABLE scenes ADD COLUMN weather TEXT"),
    ("scenes", "weather_intensity", "ALTER TABLE scenes ADD COLUMN weather_intensity FLOAT DEFAULT 1.0"),
]

VIDA_ATTRS = ["vigor", "intelligence", "dexterity", "cunning"]


def _spells_to_catalog(table: str, entity_type: str) -> list[str]:
    """spells_json (blob por ficha) -> abilities + character_abilities.

    Corre en cada arranque. La fila vieja se limpia SOLO si su backfill dejó al
    menos un enlace: si algo falla se reintenta sola la proxima vez, y una fila
    ya migrada no vuelve a rellenar spells_json — que es lo que hace que un
    conjuro que el DM borre despues no resucite en cada reinicio.
    """
    src = (
        f"SELECT id, campaign_id, spells_json FROM {table} "
        "WHERE json_valid(COALESCE(spells_json, '[]')) "
        "AND spells_json IS NOT NULL AND spells_json <> '[]'"
    )
    # CASE alrededor de json_each: si la fila no es JSON valido, json_each no
    # llega a lanzar aunque el WHERE se evalue despues.
    each = "json_each(CASE WHEN json_valid(c.spells_json) THEN c.spells_json ELSE '[]' END)"
    return [
        (
            "INSERT OR IGNORE INTO abilities "
            "(id, campaign_id, name, description, level, cost_pm) "
            "SELECT json_extract(j.value, '$.id'), c.campaign_id, "
            "COALESCE(json_extract(j.value, '$.name'), 'Nuevo conjuro'), "
            "COALESCE(json_extract(j.value, '$.description'), ''), "
            "COALESCE(json_extract(j.value, '$.level'), 1), "
            "COALESCE(json_extract(j.value, '$.cost_pm'), 1) "
            f"FROM ({src}) c, {each} j "
            "WHERE json_extract(j.value, '$.id') IS NOT NULL"
        ),
        (
            "INSERT OR IGNORE INTO character_abilities "
            "(entity_type, entity_id, ability_id) "
            f"SELECT '{entity_type}', c.id, json_extract(j.value, '$.id') "
            f"FROM ({src}) c, {each} j "
            "WHERE json_extract(j.value, '$.id') IS NOT NULL"
        ),
        (
            f"UPDATE {table} SET spells_json = '[]' "
            "WHERE spells_json IS NOT NULL AND spells_json <> '[]' "
            "AND EXISTS (SELECT 1 FROM character_abilities ca "
            f"WHERE ca.entity_type = '{entity_type}' AND ca.entity_id = {table}.id)"
        ),
    ]


DATA_MIGRATIONS = [
    # VIDA cualitativo: atributos numéricos legacy → "/" (neutro)
    *[f"UPDATE {t} SET {a} = '/' WHERE typeof({a}) = 'integer'" for t in ("characters", "npcs") for a in VIDA_ATTRS],
    # Rotaciones legacy almacenadas en grados (|r| > π) → radianes. Toda la
    # convención runtime es en radianes; idempotente (tras convertir |r| ≤ π).
    "UPDATE scene_characters SET rotation = rotation * pi() / 180 WHERE ABS(rotation) > pi()",
    # Calendarios legacy: filas creadas antes del fix de init quedaron con
    # year=1 (default del modelo, nunca inicializado con fecha real).
    # Re-sincronizar a la fecha real; no toca filas avanzadas manualmente
    # (year >= 2) ni filas nuevas (year = año real).
    f"UPDATE campaign_calendars SET year = {datetime.now().year}, month = {datetime.now().month}, day = {datetime.now().day} "
    "WHERE year = 1",
    # spells_json -> catalogo (ver _spells_to_catalog)
    *_spells_to_catalog("characters", "character"),
    *_spells_to_catalog("npcs", "npc"),
]


async def _migrate():
    async with engine.begin() as conn:
        def _run_migrations(sync_conn):
            for table, col, stmt in MIGRATIONS:
                try:
                    result = sync_conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                    has_col = any(r[1] == col for r in result)
                    if not has_col:
                        sync_conn.execute(text(stmt))
                        logger.info(f"Migration: added {table}.{col}")
                except Exception as e:
                    logger.warning(f"Migration skip {table}.{col}: {e}")
            for stmt in DATA_MIGRATIONS:
                try:
                    sync_conn.execute(text(stmt))
                except Exception as e:
                    logger.warning(f"Data migration skip: {e}")
        await conn.run_sync(_run_migrations)


async def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _migrate()
    # ROLEITO_SKIP_SEEDS: los tests no necesitan los DMs/campañas demo, y
    # seed_demo/seed_demo_2 copian assets a data/assets/ (basura en cada corrida).
    if os.environ.get("ROLEITO_SKIP_SEEDS"):
        return
    await seed_test_dm()
    await seed_demo()
    await seed_demo_2()


async def seed_test_dm():
    from models import DM
    from auth import hash_pin

    async with async_session() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM dms"))
        if result.scalar() > 0:
            return
        dm = DM(name="Test DM", pin_hash=hash_pin("123456"))
        session.add(dm)
        await session.commit()
        logger.info("Test DM seeded (PIN: 123456)")


async def seed_demo():
    from models import Campaign, Scene, Character, NPC, SceneCharacter
    import shutil

    async with async_session() as session:
        result = await session.execute(text("SELECT COUNT(*) FROM campaigns WHERE name LIKE :pattern"), {"pattern": "%Taberna del Grifo%"})
        if result.scalar() > 0:
            return

        assets = Path(__file__).parent.parent / "tests" / "assets"
        portraits_dir = assets / "portraits" / "velazquez_portraits"
        maps_dir = assets / "maps"

        campaign = Campaign(
            name="Demo — La Taberna del Grifo Helado",
            description="Campaña DEMO con assets reales. Para probar el VTT.",
            invite_code="DEMO2024",
        )
        session.add(campaign)
        await session.flush()

        scenes = {}
        for name in ["Taberna del Grifo Helado", "Bosque Salvaje", "Cripta Antigua"]:
            scene = Scene(campaign_id=campaign.id, name=name, status="active" if name == "Taberna del Grifo Helado" else "inactive")
            session.add(scene)
            await session.flush()
            scenes[name] = scene

        bg_map = {
            "Taberna del Grifo Helado": "tavern-1536.jpg",
            "Bosque Salvaje": "forest-wilderness-1024.jpg",
            "Cripta Antigua": "dungeon-crypt-1024.jpg",
        }
        data_dir = Path(__file__).parent.parent / "data"
        for name, filename in bg_map.items():
            src = maps_dir / filename
            scene_assets_dir = data_dir / "assets" / campaign.id / "scenes" / scenes[name].id
            scene_assets_dir.mkdir(parents=True, exist_ok=True)
            dst = scene_assets_dir / f"background{Path(filename).suffix}"
            if src.exists():
                shutil.copy2(src, dst)
                scenes[name].background_path = str(dst)

        party = [
            dict(name="Aria", race="Elfa", class_="Exploradora", vigor="/", intelligence="-", dexterity="+", cunning="+", max_pv=12, max_pm=9, defense=6),
            dict(name="Borin", race="Enano", class_="Guerrero", vigor="+", intelligence="-", dexterity="/", cunning="-", max_pv=18, max_pm=6, defense=5),
            dict(name="Lyra", race="Humana", class_="Maga", vigor="-", intelligence="+", dexterity="/", cunning="/", max_pv=8, max_pm=16, defense=4),
            dict(name="Tomás", race="Humano", class_="Clérigo", vigor="/", intelligence="+", dexterity="-", cunning="+", max_pv=14, max_pm=14, defense=5),
        ]
        chars = []
        for i, c in enumerate(party):
            char = Character(campaign_id=campaign.id, type="player", **c)
            session.add(char)
            await session.flush()
            chars.append(char)
            src = portraits_dir / ["female_01.png", "male_02.png", "female_03.png", "male_05.png"][i]
            portrait_dir = data_dir / "assets" / campaign.id / "characters" / char.id
            portrait_dir.mkdir(parents=True, exist_ok=True)
            dst = portrait_dir / "portrait.png"
            if src.exists():
                shutil.copy2(src, dst)
                char.portrait_path = str(dst)

        for i, char in enumerate(chars):
            sc = SceneCharacter(
                scene_id=scenes["Taberna del Grifo Helado"].id,
                entity_type="character", entity_id=char.id,
                x=-2 + i * 1.4, y=0, z=1 if i % 2 == 0 else -1,
                visible=True, order=i,
            )
            session.add(sc)

        npc_data = [
            ("Grimble el Tabernero", "Medioelfo rechoncho, siempre limpia la misma jarra.", "male_08.png"),
            ("Capitán Dain", "Guardia retirado que bebe en la esquina. Ojos entrenados.", "male_12.png"),
        ]
        for name, desc, portrait_file in npc_data:
            npc = NPC(campaign_id=campaign.id, name=name, description=desc, vigor="/", intelligence="/", dexterity="+", cunning="-", max_pv=10, max_pm=8, defense=5)
            session.add(npc)
            await session.flush()
            src = portraits_dir / portrait_file
            portrait_dir = data_dir / "assets" / campaign.id / "npcs" / npc.id
            portrait_dir.mkdir(parents=True, exist_ok=True)
            dst = portrait_dir / "portrait.png"
            if src.exists():
                shutil.copy2(src, dst)
                npc.portrait_path = str(dst)
            sc = SceneCharacter(
                scene_id=scenes["Taberna del Grifo Helado"].id,
                entity_type="npc", entity_id=npc.id,
                x=3, y=0, z=0, visible=True, order=4,
            )
            session.add(sc)

        await session.commit()
        logger.info(f"Demo campaign seeded: {campaign.id}")


async def seed_demo_2():
    from models import Campaign, Scene
    import shutil

    async with async_session() as session:
        result = await session.execute(
            text("SELECT COUNT(*) FROM campaigns WHERE name LIKE :pattern"),
            {"pattern": "%Sandbox de Pruebas%"},
        )
        if result.scalar() > 0:
            return

        assets = Path(__file__).parent.parent / "tests" / "assets"
        maps_dir = assets / "maps"
        data_dir = Path(__file__).parent.parent / "data"

        campaign = Campaign(
            name="Demo 2 — Sandbox de Pruebas",
            description="Campaña DEMO vacía para probar creación de personajes y modelos 3D.",
            invite_code="DEMO2025",
        )
        session.add(campaign)
        await session.flush()

        bg_map = {
            "Taberna del Grifo Helado": "tavern-1536.jpg",
            "Bosque Salvaje": "forest-wilderness-1024.jpg",
            "Cripta Antigua": "dungeon-crypt-1024.jpg",
        }
        for i, (name, filename) in enumerate(bg_map.items()):
            scene = Scene(
                campaign_id=campaign.id,
                name=name,
                status="active" if i == 0 else "inactive",
            )
            session.add(scene)
            await session.flush()

            src = maps_dir / filename
            scene_assets_dir = data_dir / "assets" / campaign.id / "scenes" / scene.id
            scene_assets_dir.mkdir(parents=True, exist_ok=True)
            dst = scene_assets_dir / f"background{Path(filename).suffix}"
            if src.exists():
                shutil.copy2(src, dst)
                scene.background_path = str(dst)

        await session.commit()
        logger.info(f"Demo 2 campaign seeded: {campaign.id}")


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
