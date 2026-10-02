import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = resolve(__dirname, '..');

const PY = existsSync(join(ROOT, 'venv', 'Scripts', 'python.exe'))
  ? join(ROOT, 'venv', 'Scripts', 'python.exe')
  : existsSync(join(ROOT, 'venv', 'bin', 'python'))
    ? join(ROOT, 'venv', 'bin', 'python')
    : 'python';

export const START_FILE = join(tmpdir(), 'roleito-e2e-start.txt');

// 'YYYY-MM-DD HH:MM:SS' — comparable como texto contra created_at de SQLAlchemy.
export function purgeSince(start: string): void {
  const script = `
import sqlite3
start = ${JSON.stringify(start)}
con = sqlite3.connect("data/roleito.db")
cur = con.cursor()
ids = [r[0] for r in cur.execute("SELECT id FROM campaigns WHERE created_at >= ?", (start,)).fetchall()]
dms = [r[0] for r in cur.execute("SELECT id FROM dms WHERE name LIKE 'E2E DM %'").fetchall()]
if not ids and not dms:
    print("e2e teardown: nada que limpiar")
    raise SystemExit(0)
if ids:
    ph = ",".join("?" * len(ids))
    # hijos de hijos primero (los padres siguen existiendo todavia)
    for sql in (
        f"DELETE FROM scene_characters WHERE scene_id IN (SELECT id FROM scenes WHERE campaign_id IN ({ph}))",
        f"DELETE FROM map_markers WHERE map_id IN (SELECT id FROM maps WHERE campaign_id IN ({ph}))",
        f"DELETE FROM dm_notebook_versions WHERE notebook_id IN (SELECT id FROM dm_notebooks WHERE campaign_id IN ({ph}))",
        f"DELETE FROM combat_combatants WHERE combat_id IN (SELECT id FROM combats WHERE campaign_id IN ({ph}))",
        f"DELETE FROM player_fog WHERE scene_id IN (SELECT id FROM scenes WHERE campaign_id IN ({ph}))",
    ):
        cur.execute(sql, ids)
    for table in (
        "characters", "npcs", "locations", "events", "relationships", "players",
        "sessions", "assets", "dice_rolls", "scenes", "maps", "dm_notebooks",
        "quests", "handouts", "combats", "campaign_calendars", "progress_clocks",
        "light_requests",
    ):
        cur.execute(f"DELETE FROM {table} WHERE campaign_id IN ({ph})", ids)
    cur.execute(f"DELETE FROM campaigns WHERE id IN ({ph})", ids)
if dms:
    dph = ",".join("?" * len(dms))
    cur.execute(f"DELETE FROM auth_sessions WHERE dm_id IN ({dph})", dms)
    cur.execute(f"DELETE FROM dms WHERE id IN ({dph})", dms)
con.commit()
print(f"e2e teardown: {len(ids)} campañas, {len(dms)} DMs de test borrados")
con.close()
`;
  try {
    execFileSync(PY, ['-c', script], { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.warn('[e2e teardown] cleanup skipped:', err instanceof Error ? err.message : err);
  }
}

export default function globalTeardown() {
  if (!existsSync(START_FILE)) {
    console.warn('[e2e teardown] sin marca de inicio, no se purga nada');
    return;
  }
  purgeSince(readFileSync(START_FILE, 'utf8').trim());
}

export function readStart(): string | null {
  return existsSync(START_FILE) ? readFileSync(START_FILE, 'utf8').trim() : null;
}

export function writeStart(value: string): void {
  mkdirSync(tmpdir(), { recursive: true });
  writeFileSync(START_FILE, value, 'utf8');
}