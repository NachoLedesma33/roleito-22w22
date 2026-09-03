from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from models import Base
from pathlib import Path
import logging

logger = logging.getLogger("roleito.db")

DB_PATH = Path(__file__).parent.parent / "data" / "roleito.db"
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
]

VIDA_ATTRS = ["vigor", "intelligence", "dexterity", "cunning"]

DATA_MIGRATIONS = [
    # VIDA cualitativo: atributos numéricos legacy → "/" (neutro)
    *[f"UPDATE {t} SET {a} = '/' WHERE typeof({a}) = 'integer'" for t in ("characters", "npcs") for a in VIDA_ATTRS],
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
