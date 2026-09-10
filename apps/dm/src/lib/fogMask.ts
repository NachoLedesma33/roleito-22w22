import { SceneItem, FogMetadata, SceneLayer, ShapePolygon } from '@core/domain/types'

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

export function pointInPolygon(px: number, py: number, ring: number[]): boolean {
  let inside = false
  const n = ring.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2]
    const yi = ring[i * 2 + 1]
    const xj = ring[j * 2]
    const yj = ring[j * 2 + 1]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function zoneCentroid(points: number[]): { x: number; y: number } {
  let sx = 0
  let sy = 0
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    sx += points[i * 2]
    sy += points[i * 2 + 1]
  }
  return { x: sx / Math.max(1, n), y: sy / Math.max(1, n) }
}

export interface ZoneFogToggle {
  items: SceneItem[]
  applied: 'reveal' | 'hide' | 'none'
}

export function toggleZoneFog(items: SceneItem[], zoneId: string, zonePolygon: [number, number][]): ZoneFogToggle {
  const poly = zonePolygon.length === 0 ? [] : zonePolygon.flat()
  const fogIds = new Set(
    items
      .filter((item) => isFogItem(item) && item.shape?.type === 'polygon')
      .filter((item) => {
        const c = zoneCentroid((item.shape as ShapePolygon).points)
        return pointInPolygon(c.x, c.y, poly)
      })
      .map((item) => item.id),
  )
  if (fogIds.size > 0) {
    return { items: items.filter((item) => !fogIds.has(item.id)), applied: 'reveal' }
  }
  if (poly.length < 6) return { items, applied: 'none' }
  const fogItem: SceneItem = {
    id: `fog-zone-${zoneId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Fog',
    x: 0,
    y: 0,
    zIndex: 0,
    scale: 1,
    rotation: 0,
    width: 0,
    height: 0,
    opacity: 1,
    visible: true,
    locked: false,
    disableHit: false,
    disableAutoZIndex: false,
    attachmentIds: [],
    disableAttachmentBehavior: [],
    layer: SceneLayer.FOG,
    shape: { type: 'polygon', points: poly, fill: '#000000' },
    metadata: { type: 'fog', fogType: 'static', revealed: false },
  }
  return { items: [...items, fogItem], applied: 'hide' }
}