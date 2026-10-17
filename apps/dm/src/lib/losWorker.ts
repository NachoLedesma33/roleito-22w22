import { buildLoSOccluders, computeCharacterLoS } from './losSystem'
import { buildDmFogGrid } from './fogMask'
import { lightLevelAt } from './lightMask'
import { buildPerceptionMask, PerceptionMask } from './playerPerception'
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
}

interface LosResult {
  kind: 'los'
  jobId: number
  mask: PerceptionMask | null
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
  const vision = job.visions[0]
  if (los && vision) {
    const cols = los[0]?.length ?? 0
    const rows = los.length
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
    })
  }

  const result: LosResult = { kind: 'los', jobId: job.jobId, mask }
  // Sin lista de transferencia: el buffer de un Float32Array es ArrayBufferLike y
// `self` tipa como Window en este proyecto. Copiar ~60KB cada 250ms (y solo
// cuando el personaje se movió) no es el cuello de botella.
  self.postMessage(result)
}