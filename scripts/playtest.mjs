/**
 * Playtest remoto: levanta todo lo que el DM necesita antes de la partida.
 *
 *   1. el backend (FastAPI, en 127.0.0.1:8000)
 *   2. el frontend de produccion (los bundles, en 127.0.0.1:5173)
 *   3. el tunel (el que este instalado: tunnelmole / cloudflared / tailscale)
 *
 * El tunel es lo unico que depende de algo externo (una cuenta, un binario),
 * asi que si no hay ninguno instalado el script lo dice y sigue: el DM puede
 * levantarlo despues con `npm run tunnel`.
 *
 * Para jugar por la LAN (todos en la misma wifi) alcanza con `npm run dev:lan`.
 */

import { spawn } from 'node:child_process'
import {
  elegirTunel,
  parseUrl,
  copiarAlPortapapeles,
  instrucciones,
  invocar,
} from './tunnel.mjs'

const pasos = [
  {
    nombre: 'backend',
    color: '\x1b[36m',
    cmd: 'npm',
    args: ['run', 'dev:backend'],
  },
  {
    nombre: 'frontend (build de produccion)',
    color: '\x1b[35m',
    cmd: 'npm',
    args: ['run', 'serve:prod'],
  },
]

const hijos = []
let terminado = false

function cerrar() {
  if (terminado) return
  terminado = true
  for (const h of hijos) {
    try {
      h.kill()
    } catch {
      // ya estaba muerto
    }
  }
  process.exit(0)
}

for (const paso of pasos) {
  const hijo = spawn(paso.cmd, paso.args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true })
  hijos.push(hijo)
  const prefijo = `${paso.color}[${paso.nombre}]\x1b[0m `
  const escribir = (buffer) => {
    for (const linea of String(buffer).split('\n')) {
      if (linea.trim()) console.log(prefijo + linea)
    }
  }
  hijo.stdout.on('data', escribir)
  hijo.stderr.on('data', escribir)
  hijo.on('exit', (code) => {
    console.log(`${prefijo}salio (codigo ${code})`)
  })
}

process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)

// ── el túnel ────────────────────────────────────────────────────────
const tunel = elegirTunel(process.env.ROLEITO_TUNEL || null)

if (!tunel) {
  console.log('\n  \x1b[33mNo hay ningun tunel instalado.\x1b[0m')
  console.log(instrucciones().join('\n'))
  console.log('')
} else {
  const como = invocar(tunel.cmd, tunel.args)
  const hijo = spawn(como.cmd, como.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: como.shell,
  })
  hijos.push(hijo)
  const prefijo = '\x1b[33m[tunel]\x1b[0m '
  let url = null
  const avisar = (buffer) => {
    for (const linea of String(buffer).split('\n')) {
      if (!linea.trim()) continue
      if (!url) {
        const hallada = parseUrl(linea, tunel.patron)
        if (hallada) {
          url = hallada
          console.log(`\n  \x1b[32mTUNEL LISTO:\x1b[0m ${url}`)
          if (copiarAlPortapapeles(url)) console.log('  (copiado al portapapeles)')
          if (tunel.urlFija) {
            console.log('  URL fija: el link /join de Discord no cambia nunca.')
          } else {
            console.log(
              '  \x1b[33mOjo:\x1b[0m la URL es efimera (cambia en cada partida):\n' +
                '  comparti el link DE LA PARTIDA (el que trae el codigo).',
            )
          }
          if (tunel.nota) console.log(`  ${tunel.nota}`)
          console.log('')
          continue
        }
      }
      console.log(prefijo + linea)
    }
  }
  hijo.stdout.on('data', avisar)
  hijo.stderr.on('data', avisar)
  hijo.on('exit', (code) => {
    console.log(`${prefijo}salio (codigo ${code})`)
  })
}

setTimeout(() => {
  console.log(
    [
      '',
      '  \x1b[32mListo.\x1b[0m El juego esta en http://localhost:5173',
      '',
      '  Que hacen los jugadores:',
      '    1. menu "Invitar" -> pegar la URL del tunel -> copiar el link',
      '    2. (opcional) activar "Partida abierta" -> el link fijo /join',
      '    3. mandar ese link al grupo de Discord',
      '',
      '  Para jugar en la misma wifi: npm run dev:lan',
      '  Para exponer el juego: npm run tunnel  (o `npm run playtest` ya lo',
      '  levanta). El tunel de Tailscale es el unico con URL fija.',
      '',
    ].join('\n'),
  )
}, 6000)
