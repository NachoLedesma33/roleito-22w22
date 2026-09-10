import { SceneItem, FogMetadata } from '@core/domain/types'

export interface FogRegion {
  id: string
  points: number[]
  revealed: boolean
  zIndex: number
}

export function extractFogRegions(items: SceneItem[]): FogRegion[] {
  const regions: FogRegion[] = []
  for (const item of items) {
    if (item.metadata.type !== 'fog') continue
    const shape = item.shape
    if (!shape || shape.type !== 'polygon') continue
    if (shape.points.length < 6) continue
    regions.push({
      id: item.id,
      points: shape.points,
      revealed: (item.metadata as FogMetadata).revealed ?? false,
      zIndex: item.zIndex,
    })
  }
  return regions
}

export function circlePoints(cx: number, cy: number, radius: number, segments = 16): number[] {
  const pts: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
  }
  return pts
}

export function isFogItem(item: SceneItem): boolean {
  return item.metadata.type === 'fog'
}