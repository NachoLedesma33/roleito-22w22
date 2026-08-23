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


async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
