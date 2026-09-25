import { buildLoSOccluders, computeCharacterLoS, losMaskToVisionRegion } from './losSystem'
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
}

interface LosResult {
  kind: 'los'
  jobId: number
  region: { points: number[]; revealed: boolean; zIndex: number } | null
}

let occluderKey: string | null = null
let occluders: ReturnType<typeof buildLoSOccluders> = []

self.onmessage = (e: MessageEvent) => {
  const job = e.data as LosJob
  if (!job || job.kind !== 'los') return

  // Muros son casi estáticos: solo reconstruir occluders si itemsKey cambió.
  if (job.items && job.itemsKey !== occluderKey) {
    occluders = buildLoSOccluders(job.items, job.mapW, job.mapH)
    occluderKey = job.itemsKey
  }

  const mask = computeCharacterLoS(
    { sceneCharId: job.sceneCharId, entityId: job.entityId, x: job.x, z: job.z, rotation: job.rotation, visions: job.visions },
    occluders,
    job.mapW,
    job.mapH,
    job.res,
  )
  const region = mask ? losMaskToVisionRegion(mask, job.res, job.mapW, job.mapH, 'los-mine') : null
  const result: LosResult = {
    kind: 'los',
    jobId: job.jobId,
    region: region ? { points: region.points, revealed: region.revealed, zIndex: region.zIndex } : null,
  }
  self.postMessage(result)
}