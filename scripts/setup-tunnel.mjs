#!/usr/bin/env node
// Setup one-time del tunnel remoto (Tailscale Funnel) para un clon nuevo.
// No instala software sin confirmacion: imprime los pasos exactos por OS.
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TS_CANDIDATES = [
  'tailscale',
  'C:\\Program Files\\Tailscale\\tailscale.exe',
  '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
  '/usr/bin/tailscale',
  '/usr/local/bin/tailscale',
];

function hasTailscale() {
  for (const c of TS_CANDIDATES) {
    const r = spawnSync(c, ['version'], { stdio: 'ignore' });
    if (r.status === 0) return c;
  }
  return null;
}

const ts = hasTailscale();
const plat = platform();

console.log('=== Roleito: setup de tunnel remoto (Tailscale Funnel) ===\n');

if (!ts) {
  console.log('Tailscale NO esta instalado. Instalalo una vez:\n');
  if (plat === 'win32') {
    console.log('  Windows:  winget install --id Tailscale.Tailscale --source winget --accept-source-agreements --accept-package-agreements');
  } else if (plat === 'darwin') {
    console.log('  macOS:    brew install --cask tailscale   (o descarga desde https://tailscale.com/download/mac)');
  } else {
    console.log('  Linux:    curl -fsSL https://tailscale.com/install.sh | sh');
  }
  console.log('\nLuego re-ejecuta:  npm run setup:tunnel');
  process.exit(0);
}

console.log(`Tailscale detectado: ${ts}\n`);

// 1. login (interactivo, abre navegador)
const status = spawnSync(ts, ['status', '--json'], { encoding: 'utf8' });
let loggedIn = false;
try { loggedIn = JSON.parse(status.stdout || '{}').BackendState === 'Running'; } catch {}
if (!loggedIn) {
  console.log('Paso 1/2: login (se abre el navegador). Ejecuta manualmente:');
  console.log(`  "${ts}" up\n`);
  console.log('Cuando termines, vuelve a correr:  npm run setup:tunnel');
  process.exit(0);
}
console.log('Login OK.\n');

// 2. funnel
console.log('Paso 2/2: habilitando Funnel en el puerto 5173...');
const funnel = spawnSync(ts, ['funnel', '--bg', '--yes', '5173'], { encoding: 'utf8', timeout: 30000 });
console.log(funnel.stdout || '');
if (funnel.status !== 0) {
  console.log('Si Funnel no esta habilitado en tu tailnet, abre el link que imprime arriba y activalo.');
  console.log('Luego re-ejecuta este script.\n');
  process.exit(1);
}

// 3. obtener URL
const st = spawnSync(ts, ['status', '--json'], { encoding: 'utf8' });
let url = null;
try {
  const j = JSON.parse(st.stdout || '{}');
  const self = j.Self || {};
  const dns = self.DNSName || '';
  if (dns) url = 'https://' + dns.replace(/\.$/, '/');
} catch {}
if (url) {
  const tunnelFile = join(ROOT, 'data', 'tunnel_url.txt');
  const publicFile = join(ROOT, 'apps', 'dm', 'public', 'tunnel-url.txt');
  writeFileSync(tunnelFile, url, 'utf8');
  if (existsSync(join(ROOT, 'apps', 'dm', 'public'))) writeFileSync(publicFile, url, 'utf8');
  console.log(`\nURL fija guardada: ${url}`);
  console.log('Los jugadores usan: ' + url + 'campaigns/join/<CODIGO>\n');
} else {
  console.log('\nNo pude detectar la URL. Corre `tailscale status` y copiala a data/tunnel_url.txt manualmente.\n');
}
console.log('Listo. La URL no cambia entre partidas.\n');