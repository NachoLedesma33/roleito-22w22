import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');

const PY = existsSync(join(ROOT, 'venv', 'Scripts', 'python.exe'))
  ? join(ROOT, 'venv', 'Scripts', 'python.exe')
  : existsSync(join(ROOT, 'venv', 'bin', 'python'))
    ? join(ROOT, 'venv', 'bin', 'python')
    : 'python';

const CLEANUP = `
import os, sqlite3
db_path = os.path.join(os.getcwd(), "data", "roleito.db")
con = sqlite3.connect(db_path)
cur = con.cursor()
rows = cur.execute("SELECT id FROM dms WHERE name LIKE 'E2E DM %'").fetchall()
if rows:
    ids = [r[0] for r in rows]
    ph = ",".join("?" * len(ids))
    cur.execute(f"DELETE FROM auth_sessions WHERE dm_id IN ({ph})", ids)
    cur.execute(f"DELETE FROM dms WHERE id IN ({ph})", ids)
    con.commit()
    print(f"e2e teardown: deleted {len(ids)} test DMs")
else:
    print("e2e teardown: no test DMs to clean")
con.close()
`;

export default function globalTeardown() {
  try {
    execFileSync(PY, ['-c', CLEANUP], { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.warn('[e2e teardown] DM cleanup skipped:', err instanceof Error ? err.message : err);
  }
}