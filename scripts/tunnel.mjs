/**
 * El túnel gratis: publica el juego en internet sin dominio y sin pagar.
 *
 * Hay tres formas gratis, y la diferencia es la que importa:
 *
 * - **tunnelmole** (gratis, open source, SIN cuenta y SIN instalar nada:
 *   `npx tunnelmole 5173`): da una URL https al instante, pero es ALEATORIA
 *   cada vez que se levanta → el link de Discord hay que compartirlo en cada
 *   partida. Ojo: el subdominio fijo (`tmole 5173 as mesa.tunnelmole.net`)
 *   en el servicio hospedado pide una suscripción, y autoalojarlo pide un
 *   servidor propio.
 * - **Cloudflare quick tunnel** (gratis, SIN cuenta): un binario y listo, URL
 *   aleatoria también. Con `--allowed-mail` agrega un login de un solo uso
 *   por email (gratis, y el visitante no necesita cuenta).
 * - **Tailscale Funnel** (gratis, plan Personal): la URL es FIJA
 *   (`https://<maquina>.<tailnet>.ts.net`) → el link de Discord no cambia
 *   nunca → el atajo `/join` (el link fijo) sirve para siempre. Pide una
 *   cuenta gratuita de Tailscale y habilitar Funnel (una vez, con login).
 *
 * Si algún día se consigue un dominio propio, el camino sigue siendo el
 * mismo: `cloudflared tunnel run <nombre>` con el túnel nombrado (eso pide
 * cuenta de Cloudflare + el dominio). Nada de lo que hay acá se pierde.
 *
 * Uso:
 *   node scripts/tunnel.mjs                 -> el que esté disponible
 *   node scripts/tunnel.mjs tunnelmole      -> el de cero instalación
 *   node scripts/tunnel.mjs cloudflared     -> quick tunnel de Cloudflare
 *   node scripts/tunnel.mjs tailscale       -> Funnel (URL fija)
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { platform } from 'node:os'
import { pathToFileURL } from 'node:url'

export const PUERTO_WEB = 5173

/** Donde se deja la URL publica del tunel, para que la app la sepa sola. */
export const ARCHIVO_URL = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'data',
  'tunnel_url.txt',
)

/**
 * Ademas, un archivo ESTATICO que el frontend puede leer sin backend.
 *
 * El backend es la fuente oficial (`/api/network/public-url`), pero si el
 * puerto 8000 esta tomado por un proceso viejo (un zombi de Windows ✗) el
 * menu cae en localhost y el DM pierde el link del tunel ✗. Con este
 * archivo, el frontend lo lee directo del disco: funciona siempre ✓.
 */
export const ARCHIVOS_PUBLICOS = [
  join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'dm', 'dist', 'tunnel-url.txt'),
  join(dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'dm', 'public', 'tunnel-url.txt'),
]

/** Escribe la URL publica del tunel (la app la lee y la usa sola). */
export function guardarUrlPublica(url) {
  let ok = false
  try {
    mkdirSync(dirname(ARCHIVO_URL), { recursive: true })
    writeFileSync(ARCHIVO_URL, url, 'utf8')
    ok = true
  } catch {
    // si falla, se sigue con los archivos estaticos
  }
  for (const archivo of ARCHIVOS_PUBLICOS) {
    try {
      mkdirSync(dirname(archivo), { recursive: true })
      writeFileSync(archivo, url, 'utf8')
      ok = true
    } catch {
      // el archivo estatico es un extra: si falla, el del backend sigue
    }
  }
  return ok
}

/** Borra la URL (el tunel se cerro: esa URL ya no lleva a nada). */
export function borrarUrlPublica() {
  for (const archivo of [ARCHIVO_URL, ...ARCHIVOS_PUBLICOS]) {
    try {
      if (existsSync(archivo)) rmSync(archivo, { force: true })
    } catch {
      // nada que hacer
    }
  }
}

/**
 * ¿Está instalado el comando?
 *
 * No se prueba con `--version`: en Windows un comando inexistente tambien
 * sale con codigo 1 ("no se reconoce como un comando"), asi que un binario
 * ausente pasaba por instalado ✗. `where` (Windows) / `command -v` (Unix)
 * responden 0 solo si el comando existe ✓.
 */
export function tieneComando(cmd) {
  // `where.exe` a pelo (no con shell: true): con shell, node avisa (DEP0190)
  // de que los argumentos no van escapados ✗.
  const probe =
    platform() === 'win32'
      ? spawnSync('where.exe', [cmd], { stdio: 'ignore' })
      : spawnSync('sh', ['-c', `command -v ${cmd}`], { stdio: 'ignore' })
  return probe.status === 0
}

/**
 * El comando como hay que invocarlo en esta plataforma.
 *
 * En Windows, `npx` es un `.cmd` y Node no lo puede spawnear sin shell
 * (EINVAL ✗); con `shell: true` node avisa (DEP0190) de que los argumentos
 * no van escapados ✗. La salida: invocar `cmd.exe /c <cmd> ...` a mano
 * (cmd.exe es un .exe de verdad ✓) y sin shell ✓ -> no hay aviso y los
 * argumentos llegan enteros ✓.
 */
export function invocar(cmd, args = []) {
  if (platform() !== 'win32') return { cmd, args, shell: false }
  const esExe = cmd.toLowerCase().endsWith('.exe')
  if (esExe) return { cmd, args, shell: false }
  return { cmd: 'cmd.exe', args: ['/c', cmd, ...args], shell: false }
}

/** tunnelmole: gratis, open source, sin cuenta y sin instalar (npx). */
export function comandoTunnelmole(puerto = PUERTO_WEB) {
  return {
    tipo: 'tunnelmole',
    cmd: 'npx',
    args: ['--yes', 'tunnelmole', String(puerto)],
    urlFija: false,
    // La salida trae las dos URLs (http y https); la que sirve es la https.
    patron: /https:\/\/[a-z0-9-]+\.tunnelmole\.net/i,
    nota:
      'tunnelmole NO proxea el WebSocket: el jugador cae al sondeo ' +
      '(funciona, con 250 ms a 2 s de retraso). Para el WS en vivo: ' +
      'cloudflared o Tailscale.',
  }
}

/** Cloudflare quick tunnel: gratis, sin cuenta (un binario). */
export function comandoCloudflared(puerto = PUERTO_WEB) {
  return {
    tipo: 'cloudflared',
    cmd: 'cloudflared',
    args: ['tunnel', '--url', `http://localhost:${puerto}`],
    urlFija: false,
    patron: /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i,
    nota: 'El WS del jugador pasa ✓. La URL cambia en cada partida.',
  }
}

/** Tailscale Funnel: gratis y con URL FIJA (la que sirve para el link fijo). */
export function comandoTailscale(puerto = PUERTO_WEB) {
  return {
    tipo: 'tailscale',
    cmd: 'tailscale',
    // `--bg` deja el túnel corriendo en segundo plano y devuelve la URL.
    args: ['funnel', '--bg', String(puerto)],
    urlFija: true,
    patron: /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net/i,
    nota: 'El WS del jugador pasa ✓ y la URL es fija ✓.',
  }
}

/**
 * Lo que hay que saber de cada túnel.
 *
 * `nota` sale por consola cuando el túnel levanta: son las dos diferencias
 * que importan en una partida (el WS del POV y si la URL cambia).
 */
export const TUNELES = {
  tunnelmole: comandoTunnelmole,
  cloudflared: comandoCloudflared,
  tailscale: comandoTailscale,
}

/**
 * Elige el túnel: el forzado, o el primero disponible.
 *
 * El orden por defecto pone a tunnelmole primero porque es el único que no
 * necesita instalar NADA (npx lo baja solo). Si lo que se quiere es un link
 * FIJO, el que sirve es Tailscale Funnel (`tailscale funnel --bg 5173`).
 */
export function elegirTunel(forzado = null) {
  if (forzado) {
    const factory = TUNELES[forzado]
    if (!factory) return null
    return factory()
  }
  // El que mejor para jugar: el WS del POV pasa y (si se puede) la URL es
  // fija. tunnelmole es el plan C: no instala nada, pero no proxea el WS.
  if (tieneComando('tailscale')) return comandoTailscale()
  if (tieneComando('cloudflared')) return comandoCloudflared()
  // tunnelmole siempre "está": npx lo baja la primera vez.
  return comandoTunnelmole()
}

/** Saca la URL publica de la salida del túnel. */
export function parseUrl(texto, patron) {
  const m = String(texto).match(patron)
  return m ? m[0] : null
}

/** Instrucciones de instalación (cuando falta el binario). */
export function instrucciones(platforma = platform()) {
  const comun = [
    '  Las tres opciones son gratis y no piden un plan pago:',
    '',
    '  A) URL FIJA (la unica con link de Discord que no cambia): Tailscale Funnel',
    '     - instalá Tailscale (Windows: https://tailscale.com/download/windows)',
    '       y creá una cuenta gratis (plan Personal)',
    '     - tailscale funnel --bg 5173',
    '       (la primera vez abre una pagina para aprobar Funnel)',
    '     - la URL es https://<maquina>.<tailnet>.ts.net y NO cambia nunca',
    '',
    '  B) SIN INSTALAR NADA: tunnelmole (gratis, open source, sin cuenta)',
    '     - npx tunnelmole 5173',
    '     - la URL es https://<algo>.tunnelmole.net y CAMBIA en cada partida',
    '',
    '  C) Cloudflare quick tunnel (gratis, sin cuenta, un binario)',
    '     - https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/',
    '     - cloudflared tunnel --url http://localhost:5173',
    '     - la URL es https://<algo>.trycloudflare.com y CAMBIA en cada partida',
    '     - con --allowed-mail agrega un login de un solo uso por email (gratis)',
  ]
  if (platforma === 'win32') {
    return comun
  }
  return comun
}

/** Copia un texto al portapapeles (si el sistema lo tiene). */
export function copiarAlPortapapeles(texto) {
  const cmd = platform() === 'win32' ? 'clip' : 'pbcopy'
  try {
    const p = spawn(cmd, [], { stdio: ['pipe', 'ignore', 'ignore'], shell: true })
    p.stdin.write(texto)
    p.stdin.end()
    return true
  } catch {
    return false
  }
}

// ── modo CLI ────────────────────────────────────────────────────────
// `pathToFileURL` y no un string a mano: en Windows el path tiene
// backslashes y el file URL tres slashes.
const esCli =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (esCli) {
  const forzado = process.argv[2] || null
  const tunel = elegirTunel(forzado)

  if (!tunel) {
    console.log(instrucciones().join('\n'))
    process.exit(1)
  }

  console.log(`Levantando el tunel ${tunel.tipo} (puerto ${PUERTO_WEB})...`)
  const como = invocar(tunel.cmd, tunel.args)
  const hijo = spawn(como.cmd, como.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: como.shell,
  })

  let url = null
  const avisar = (texto) => {
    for (const linea of String(texto).split('\n')) {
      if (!linea.trim()) continue
      if (!url) {
        const hallada = parseUrl(linea, tunel.patron)
        if (hallada) {
          url = hallada
          console.log(`\n  \x1b[32mTUNEL LISTO:\x1b[0m ${url}`)
          if (copiarAlPortapapeles(url)) console.log('  (copiado al portapapeles)')
          if (guardarUrlPublica(url)) {
            console.log('  (la app ya la sabe: menu "Invitar" -> URL publica)')
          }
          if (!tunel.urlFija) {
            console.log(
              '  \x1b[33mOjo:\x1b[0m esta URL es efimera (cambia en cada partida):\n' +
                '  comparti el link DE LA PARTIDA (el que tiene el codigo), no el fijo.',
            )
          } else {
            console.log('  Esta URL es fija: el link /join de Discord no cambia nunca.')
          }
          if (tunel.nota) console.log(`  ${tunel.nota}`)
          console.log('')
          continue
        }
      }
      console.log(linea)
    }
  }

  hijo.stdout.on('data', avisar)
  hijo.stderr.on('data', avisar)
  hijo.on('exit', (code) => {
    borrarUrlPublica()
    console.log(`El tunel salio (codigo ${code})`)
    process.exit(code ?? 0)
  })
  process.on('SIGINT', () => {
    borrarUrlPublica()
    hijo.kill()
    process.exit(0)
  })
}
