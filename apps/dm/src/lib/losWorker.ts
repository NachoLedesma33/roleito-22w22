import { buildLoSOccluders, computeCharacterLoS } from './losSystem'
import { buildDmFogGrid } from './fogMask'
import { lightLevelAt } from './lightMask'
import { buildPerceptionMask, PerceptionMask } from './playerPerception'
import { accumulateExplored } from './exploredMemory'
import { collectWorldLights, type CharPos } from './playerVision'
import type { SceneItem, VisionConfig } from '@core/domain/types'

export interface LosJob {
  kind: 'los'
  jobId: number
  itemsKey: string
  items?: SceneItem[]
  sceneCharId: string
  entityId: string
  x: number
  z: number
  rotation: number
  visions: VisionConfig[]
  mapW: number
  mapH: number
  res: number
  /** Posiciones de los tokens: las antorchas portatiles siguen a su dueño. */
  charPos?: Record<string, CharPos>
  /** Las luces de otros tokens no se comparten si el jugador no lo pidió. */
  shareCarriedLights?: boolean
  /** Lo que el jugador ya exploró en esta escena (RLE plano, mismo orden). */
  explored?: Uint8Array | null
  /** Acumular lo nuevo a lo ya visto (solo con la política del DM encendida). */
  accumulate?: boolean
}

interface LosResult {
  kind: 'los'
  jobId: number
  mask: PerceptionMask | null
  /**
   * Lo visto ahora, unido a lo ya recordado, en Uint8Array plano. El main thread
   * lo guarda; el worker no toca localStorage.
   */
  explored?: Uint8Array | null
}

let occluderKey: string | null = null
let occluders: ReturnType<typeof buildLoSOccluders> = []
let cachedItems: SceneItem[] = []

/**
 * Percepción del jugador, en una sola pasada.
 *
 * Antes el worker devolvía la máscara de LoS convertida en un polígono con
 * `zIndex: 1000`, y ese polígono competía con la niebla del DM por el orden de
 * pintado: la visión ganaba siempre. Ahora devuelve el alpha por celda y no
 * compite con nada (`engineering/PLAN-VISION-PERCEPCION.md` §4.1).
 */
self.onmessage = (e: MessageEvent) => {
  const job = e.data as LosJob
  if (!job || job.kind !== 'los') return

  // Muros y luces son casi estáticos: solo reconstruir si itemsKey cambió.
  if (job.items && job.itemsKey !== occluderKey) {
    occluders = buildLoSOccluders(job.items, job.mapW, job.mapH)
    cachedItems = job.items
    occluderKey = job.itemsKey
  }

  const los = computeCharacterLoS(
    { sceneCharId: job.sceneCharId, entityId: job.entityId, x: job.x, z: job.z, rotation: job.rotation, visions: job.visions },
    occluders,
    job.mapW,
    job.mapH,
    job.res,
  )

  let mask: PerceptionMask | null = null
  let explored: Uint8Array | null = null
  const vision = job.visions[0]
  const cols = los?.[0]?.length ?? 0
  const rows = los?.length ?? 0
  if (los && vision) {
    const charPos = new Map(Object.entries(job.charPos ?? {}))
    const lights = collectWorldLights(cachedItems, charPos, job.sceneCharId, {
      shareCarriedLights: job.shareCarriedLights,
    })
    const dmFog = buildDmFogGrid(cachedItems, cols, rows)
    mask = buildPerceptionMask({
      grid: { cols, rows, resolution: job.res, mapWidth: job.mapW, mapHeight: job.mapH },
      los,
      lightAt: (x, z) => lightLevelAt(x, z, lights, occluders, job.mapH),
      charX: job.x,
      charZ: job.z,
      // La perception es por personaje: con varias-batch el LoS es la unión, pero
      // la regla de "qué ve en la oscuridad" es la de su tipo de vision.
      vision,
      dmFog,
      explored: job.explored ?? null,
    })

    if (job.accumulate) {
      // Lo acumulado se arma aparte de la máscara que se pinta: el `dimRange`
      // atenúa una celda que se ve, pero para "la descubrí" alcanza con un bit.
      const prior = job.explored ?? new Uint8Array(cols * rows)
      const flat = new Uint8Array(cols * rows)
      for (let i = 0; i < flat.length; i++) flat[i] = mask.data[i] > 0 ? 1 : 0
      explored = accumulateExplored(prior, flat)
    }
  }

  const result: LosResult = { kind: 'los', jobId: job.jobId, mask, explored }
  // Los buffers viajan por TRANSFERENCIA, no por copia: la mascara puede pesar
  // 1,5 MB y copiarla varias veces por segundo generaba decenas de MB/s de
  // basura (el POV del jugador se comia la RAM). El worker crea la mascara y el
  // array de "explorado" nuevos en cada trabajo, asi que no los necesita mas.
  const transfers: ArrayBuffer[] = []
  if (mask) transfers.push(mask.data.buffer as ArrayBuffer)
  if (explored) transfers.push(explored.buffer as ArrayBuffer)
  ;(self as unknown as Worker).postMessage(result, transfers)
}