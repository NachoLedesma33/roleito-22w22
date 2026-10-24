/**
 * Levanta backend + frontend (dev, LAN) + tunnel en UNA sola terminal.
 * Al hacer Ctrl+C se matan todos los procesos (incluido el tunnel).
 *
 *   npm run dev:all
 */
import { spawn } from 'node:child_process'

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
  for (const h of hijos) { try { h.kill() } catch {} }
  process.exit(0)
}

levantar('backend', '\x1b[36m', 'npm', ['run', 'dev:backend'])
levantar('frontend (LAN)', '\x1b[35m', 'npm', ['run', 'dev:lan'])
levantar('tunnel', '\x1b[33m', 'npm', ['run', 'tunnel'])

process.on('SIGINT', cerrar)
process.on('SIGTERM', cerrar)

console.log('\n  Ctrl+C para parar todo (backend + frontend + tunnel).\n')