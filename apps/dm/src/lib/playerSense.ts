import type { PerceptionMask } from './playerPerception'

/**
 * Detección de criaturas por sentidos especiales (`engineering/PLAN-VISION-PERCEPCION.md` §6).
 *
 * La máscara de percepción modela TERRENO, no entidades: no sabe si hay un
 * goblin detrás de la pared. Los sentidos especiales (blindsight, tremorsense,
 * truesight) sí detectan criaturas: un token que el jugador no ve —fuera de su
 * LoS o con estado `invisible`— pero está a rango, se percibe igual.
 *
 * Simplificación asumida (decisión de producto, 2026-10-19): la detección es
 * por distancia pura, no filtra por tipo de entidad (vuelo/etéreo para
 * tremorsense, invisibles para truesight): el modelo de tokens no tiene esos
 * campos. Cuando existan, el filtro va acá.
 */

export interface SensedChar {
  sceneCharId: string
  x: number
  z: number
}

/** ¿La celda de mundo (x,z) es visible para el jugador en esta máscara? */
function maskSees(mask: PerceptionMask, x: number, z: number, mapWidth: number, mapHeight: number): boolean {
  const resolution = mapWidth / mask.cols
  const col = Math.floor((x + mapWidth / 2) / resolution)
  const row = Math.floor((z + mapHeight / 2) / resolution)
  if (col < 0 || row < 0 || col >= mask.cols || row >= mask.rows) return false
  return mask.data[row * mask.cols + col] >= 0.5
}

/**
 * Criaturas que el personaje detecta pero NO ve.
 *
 * Un token entra si: es un personaje ajeno, está a rango, el jugador no lo ve
 * realmente en la máscara de percepción (LoS + luz) y tiene la visión que
 * habilita la detección. El filtro de tokens ocultos ya lo hace el backend en
 * el snapshot del jugador (`routes.py` solo serializa `visible == 1`), así que
 * no se repite acá.
 *
 * `mask` puede ser `null` (la máscara del worker todavía no llegó): sin ella no
 * hay "lo ve en el terreno", así que no se detecta nada.
 */
export function computeSensed(
  chars: { sceneCharId: string; x: number; z: number }[],
  mySceneCharId: string | null,
  pos: { x: number; z: number },
  vision: { type: string; range: number },
  mask: PerceptionMask | null,
  map: { width: number; height: number },
): SensedChar[] {
  const canSense = vision.type === 'blindsight' || vision.type === 'tremorsense' || vision.type === 'truesight'
  if (!canSense || !mySceneCharId || !mask) return []
  const sensed: SensedChar[] = []
  for (const c of chars) {
    if (c.sceneCharId === mySceneCharId) continue
    if (Math.hypot(c.x - pos.x, c.z - pos.z) > vision.range) continue
    if (maskSees(mask, c.x, c.z, map.width, map.height)) continue
    sensed.push({ sceneCharId: c.sceneCharId, x: c.x, z: c.z })
  }
  return sensed
}

/** Para comparar en tests y leer en el render. */
export function sensedIds(sensed: SensedChar[]): Set<string> {
  return new Set(sensed.map((s) => s.sceneCharId))
}
