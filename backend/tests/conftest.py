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
import tempfile
from pathlib import Path

_TEST_DB_DIR = Path(tempfile.gettempdir()) / "roleito-pytest"
_TEST_DB = _TEST_DB_DIR / "roleito.db"

_TEST_DB_DIR.mkdir(parents=True, exist_ok=True)
if _TEST_DB.exists():
    _TEST_DB.unlink()

os.environ["ROLEITO_DB_PATH"] = str(_TEST_DB)
os.environ["ROLEITO_SKIP_SEEDS"] = "1"