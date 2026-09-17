import { SceneItem, LightMetadata } from '@core/domain/types'
import { FogRegion, circlePoints } from './fogMask'
import { normalizeLightConfig } from './light'
import { buildOccluders, lightShapePoints } from './lightOcclusion'

export const AMBIENT_RADIUS = 0.05

export interface CharPos {
  x: number
  z: number
}

export function lightVisionOrigin(item: SceneItem, charPos: Map<string, CharPos>): CharPos | null {
  const meta = item.metadata as LightMetadata
  if (meta.attachedTo) {
    const p = charPos.get(meta.attachedTo)
    return p ? { x: p.x, z: p.z } : null
  }
  return { x: item.x, z: item.y }
}

export function lightToVisionRegion(
  item: SceneItem,
  origin: CharPos,
  occluders: ReturnType<typeof buildOccluders>,
  mapWidth: number,
  mapHeight: number,
): FogRegion | null {
  const source = normalizeLightConfig((item.metadata as LightMetadata).source)
  const radiusWorld = source.radius * mapHeight
  const direction = source.mode === 'directional' ? (source.direction ?? 0) : null
  const pts = lightShapePoints(origin.x, origin.z, radiusWorld, direction, source.angle ?? 90, occluders)
  if (pts.length < 3) return null
  const points: number[] = []
  for (const [px, py] of pts) {
    const wx = origin.x + px
    const wz = origin.z - py
    points.push(mapWidth > 0 ? wx / mapWidth + 0.5 : 0.5, mapHeight > 0 ? wz / mapHeight + 0.5 : 0.5)
  }
  return { id: `vision-${item.id}`, points, revealed: true, zIndex: 1000 }
}

export interface VisionOptions {
  shareCarriedLights?: boolean
}

export function computeVisionRegions(
  items: SceneItem[],
  charPos: Map<string, CharPos>,
  ownSceneCharId: string | null,
  mapWidth: number,
  mapHeight: number,
  opts: VisionOptions = {},
): FogRegion[] {
  const regions: FogRegion[] = []
  const own = ownSceneCharId ? charPos.get(ownSceneCharId) : null
  if (own) {
    regions.push({
      id: 'vision-ambient',
      points: circlePoints(own.x / mapWidth + 0.5, own.z / mapHeight + 0.5, AMBIENT_RADIUS),
      revealed: true,
      zIndex: 1000,
    })
  }
  const occluders = buildOccluders(items, mapWidth, mapHeight)
  for (const item of items) {
    if (!item.visible || item.metadata.type !== 'light') continue
    const meta = item.metadata as LightMetadata
    if (meta.attachedTo && meta.attachedTo !== ownSceneCharId && opts.shareCarriedLights === false) continue
    const origin = lightVisionOrigin(item, charPos)
    if (!origin) continue
    const region = lightToVisionRegion(item, origin, occluders, mapWidth, mapHeight)
    if (region) regions.push(region)
  }
  return regions
}