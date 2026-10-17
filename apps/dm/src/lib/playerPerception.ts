import { VisionConfig, VisionType } from '@core/domain/types'
import { AMBIENT_RADIUS } from './playerVision'

/**
 * Qué percibe un jugador, en una sola pasada.
 *
 * La regla del plan (`engineering/PLAN-VISION-PERCEPCION.md` §2):
 *
 *   visible(celda) = sin_obstruccion(celda) Y ( hay_luz(celda) O ve_en_oscuridad(celda) )
 *
 * - `sin_obstruccion` es la máscara del LoS que ya calcula el worker.
 * - `hay_luz` es `lightLevelAt` (mask de luz, `lightMask.ts`) contra el umbral.
 * - `ve_en_oscuridad` es el tipo de visión del personaje.
 *
 * Encima de eso, lo que el DM painted decide por celda (§3): `secreto` gana
 * siempre, `revelar` gana siempre, `cubrir` no cambia nada.
 *
 * Hoy el jugador no usa esto: su visión sigue siendo la unión de polígonos que
 * compiten por `zIndex`. Lo cablea el paso 4.
 */

/** Umbral de "hay luz" para una visión normal (§4bis.1, fijo y sin slider). */
export const LIGHT_THRESHOLD = 0.25

/** Intención del DM al pintar una celda de niebla. */
export type DmFogMode = 'cover' | 'secret' | 'reveal'

/**
 * Rejilla de celdas, en la misma convención que `computeVisibilityMask`:
 * `mask[row][col]`, con el mapa centrado en el origen y `[row][col] = [z][x]`.
 */
export interface PerceptionGrid {
  cols: number
  rows: number
  resolution: number
  mapWidth: number
  mapHeight: number
}

/** Muestreo de luz por celda. Lo resuelve `lightMask.ts`; acá solo se consulta. */
export type LightSampler = (worldX: number, worldZ: number) => number

/** Modo de niebla del DM por celda; `null` donde no pintó. */
export type DmFogGrid = (DmFogMode | null)[][]

export interface PerceptionInput {
  grid: PerceptionGrid
  /** `sin_obstruccion`: la máscara del LoS del worker. */
  los: boolean[][]
  lightAt: LightSampler
  charX: number
  charZ: number
  vision: VisionConfig
  dmFog?: DmFogGrid | null
}

export function cellCenterX(grid: PerceptionGrid, col: number): number {
  return -grid.mapWidth / 2 + (col + 0.5) * grid.resolution
}

export function cellCenterZ(grid: PerceptionGrid, row: number): number {
  return -grid.mapHeight / 2 + (row + 0.5) * grid.resolution
}

/**
 * Qué ve el personaje a oscuras, sin luz de por medio.
 *
 * `normal` conserva el círculo ambiente de `playerVision.ts` (0.15): bajo la
 * regla nueva es redundante —es "luz a distancia 0"— pero §4bis.2 lo deja a
 * propósito, para que el cambio sea medible contra el comportamiento anterior.
 *
 * `darkvision` ve hasta `vision_range`. Los otros tres tipos (`blindsight`,
 * `tremorsense`, `truesight`) filtran por tipo de entidad, que esta máscara no
 * modela (§6): hasta que existan se comportan como `normal`.
 */
function seesInDark(type: VisionType, dist: number, range: number): boolean {
  if (type === 'darkvision') return dist <= range
  return dist <= AMBIENT_RADIUS
}

/**
 * Atenuación del borde de la visión: `dimRange` es la meseta a intensidad
 * completa y de ahí al `range` cae a 0. Sin `dimRange`, el corte es seco.
 */
function dimAlpha(dist: number, range: number, dimRange: number | undefined): number {
  if (!dimRange || dimRange <= 0 || dimRange >= range) return 1
  const alpha = (range - dist) / (range - dimRange)
  return alpha < 0 ? 0 : alpha > 1 ? 1 : alpha
}

/**
 * Alpha de visión de una celda: 1 la ve de plano, 0 no la ve, y en el medio la
 * attenuated del borde (`dimRange`).
 *
 * No depende del render: el worker la calcula y `FogOverlay` la pinta.
 */
export function perceptionAlpha(input: PerceptionInput, col: number, row: number): number {
  const mode = input.dmFog?.[row]?.[col] ?? null
  if (mode === 'secret') return 0
  if (mode === 'reveal') return 1

  if (!input.los[row]?.[col]) return 0

  const x = cellCenterX(input.grid, col)
  const z = cellCenterZ(input.grid, row)
  const dist = Math.hypot(x - input.charX, z - input.charZ)
  const range = input.vision.range

  if (dist > range) return 0
  if (input.lightAt(x, z) >= LIGHT_THRESHOLD) return dimAlpha(dist, range, input.vision.dimRange)
  if (!seesInDark(input.vision.type, dist, range)) return 0
  return dimAlpha(dist, range, input.vision.dimRange)
}

/**
 * La máscara completa, en el mismo orden que `los`: `[row][col]` aplastado a
 * `row * cols + col`.
 */
export function composePerceptionMask(input: PerceptionInput): Float32Array {
  const { cols, rows } = input.grid
  const alpha = new Float32Array(cols * rows)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      alpha[row * cols + col] = perceptionAlpha(input, col, row)
    }
  }
  return alpha
}