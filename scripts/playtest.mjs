/**
 * Playtest remoto: levanta todo lo que el DM necesita antes de la partida.
 *
 *   1. el backend (FastAPI, en 127.0.0.1:8000)
 *   2. el frontend de produccion (los bundles, en 127.0.0.1:5173)
 *
 * Y recuerda lo que falta (el tunel), porque el tunel depende de la
 * configuracion del DM (el dominio, la cuenta de Cloudflare) y no se puede
 * adivinar desde aca.
 *
 * Para jugar por la LAN (todos en la misma wifi) alcanza con `npm run dev:lan`.
 */

import { spawn } from 'node:child_process'

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

setTimeout(() => {
  console.log(
    [
      '',
      '  \x1b[32mListo.\x1b[0m El juego esta en http://localhost:5173',
      '',
      '  Para que los jugadores de otra casa o ciudad entren, falta el TUNEL:',
      '    1. con un dominio propio (link fijo):  cloudflared tunnel run mesa',
      '    2. sin dominio (link efimero):      cloudflared tunnel --url http://localhost:5173',
      '',
      '  Y despues: menu "Invitar" -> pegar la URL publica -> copiar el link.',
      '  Para jugar en la misma wifi: npm run dev:lan',
      '',
    ].join('\n'),
  )
}, 4000)
