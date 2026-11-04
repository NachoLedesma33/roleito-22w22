/**
 * Levanta backend + frontend (prod, LAN) + tunnel en UNA sola terminal.
 * Build de produccion primero (nunca dev server por tunnel: demasiado lento).
 * Al hacer Ctrl+C se matan todos los procesos (incluido el tunnel).
 *
 *   npm run dev:all
 */
import { spawn, spawnSync } from 'node:child_process'

// 1. build de produccion (una vez)
console.log('[build] compilando frontend de produccion...')
const build = spawnSync('npm', ['run', 'build:prod'], { stdio: 'inherit', shell: true })
if (build.status !== 0) {
  console.error('[build] fallo el build. abortando.')
  process.exit(1)
}

const hijos = []
let terminado = false

function prefijo(color, nombre) {
  return `${color}[${nombre}]\x1b[0m `
}

function levantar(nombre, color, cmd, args) {
  const p = prefijo(color, nombre)
  const h = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true })
  hijos.push(h)
  const escribir = (buf) => {
    for (const linea of String(buf).split('\n')) {
      if (linea.trim()) console.log(p + linea)
    }
  }
  h.stdout.on('data', escribir)
  h.stderr.on('data', escribir)
  h.on('exit', (code) => console.log(p + `salio (codigo ${code})`))
  return h
}

function cerrar() {
  if (terminado) return
  terminado = true
  for (const h of hijos) { try { h.kill() } catch { /* ignore */ } }
  process.exit(0)
}

levantar('backend', '\x1b[36m', 'npm', ['run', 'dev:backend'])
levantar('frontend (prod, LAN)', '\x1b[35m', 'npm', ['run', 'serve:lan'])
levantar('tunnel', '\x1b[33m', 'npm', ['run', 'tunnel'])

process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)

console.log('\n  Ctrl+C para parar todo (backend + frontend + tunnel).\n')