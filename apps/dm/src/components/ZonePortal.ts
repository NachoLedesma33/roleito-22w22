import { Point2D, PortalRef, SceneItem, ZoneMetadata } from '@core/domain/types'
import { ZonePolygon } from '../lib/wall-collision'

export const PORTAL_LEN = 0.1
export const PORTAL_SNAP_TOL = 0.08

export interface ZoneGeometry {
  id: string
  points: [number, number][]
}

export function zonesToGeometry(zones: ZonePolygon[]): ZoneGeometry[] {
  const out: ZoneGeometry[] = []
  for (const zone of zones) {
    if (!zone.id) continue
    out.push({ id: zone.id, points: zone.points })
  }
  return out
}

export interface EdgeSnap {
  zoneId: string
  point: Point2D
  a: Point2D
  b: Point2D
}

export function snapToZoneEdge(
  point: Point2D,
  zones: ZoneGeometry[],
  tolerance: number = PORTAL_SNAP_TOL,
): EdgeSnap | null {
  let best: EdgeSnap | null = null
  let bestDist = tolerance
  for (const zone of zones) {
    const pts = zone.points
    const n = pts.length
    for (let i = 0; i < n; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % n]
      const dx = b[0] - a[0]
      const dy = b[1] - a[1]
      const lenSq = dx * dx + dy * dy
      const t = lenSq < 1e-10 ? 0 : Math.max(0, Math.min(1, ((point.x - a[0]) * dx + (point.y - a[1]) * dy) / lenSq))
      const px = a[0] + t * dx
      const py = a[1] + t * dy
      const dist = Math.hypot(point.x - px, point.y - py)
      if (dist < bestDist) {
        bestDist = dist
        best = {
          zoneId: zone.id,
          point: { x: px, y: py },
          a: { x: a[0], y: a[1] },
          b: { x: b[0], y: b[1] },
        }
      }
    }
  }
  return best
}

export function buildPortalLocalEdge(edge: Pick<EdgeSnap, 'point' | 'a' | 'b'>): [Point2D, Point2D] {
  const dx = edge.b.x - edge.a.x
  const dy = edge.b.y - edge.a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const half = PORTAL_LEN / 2
  return [
    { x: edge.point.x - ux * half, y: edge.point.y - uy * half },
    { x: edge.point.x + ux * half, y: edge.point.y + uy * half },
  ]
}

export function createPortalBetween(
  zoneA: SceneItem,
  zoneB: SceneItem,
  localEdge: [Point2D, Point2D],
): { zoneA: SceneItem; zoneB: SceneItem } {
  const id = `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const portal: PortalRef = {
    id,
    zoneA: zoneA.id,
    zoneB: zoneB.id,
    state: 'open',
    localEdge,
    activatesOn: null,
  }
  const metaA = zoneA.metadata as ZoneMetadata
  const metaB = zoneB.metadata as ZoneMetadata
  return {
    zoneA: { ...zoneA, metadata: { ...metaA, portals: [...metaA.portals, portal] } },
    zoneB: { ...zoneB, metadata: { ...metaB, portals: [...metaB.portals, portal] } },
  }
}

export function cyclePortalState(items: SceneItem[], portalId: string): SceneItem[] {
  const next = items.map((item) => {
    if (item.metadata.type !== 'zone') return item
    const meta = item.metadata as ZoneMetadata
    const portal = meta.portals.find((p) => p.id === portalId)
    if (!portal) return item
    const st: PortalRef['state'] = portal.state === 'open' ? 'closed' : portal.state === 'closed' ? 'locked' : 'open'
    return {
      ...item,
      metadata: {
        ...meta,
        portals: meta.portals.map((p) => (p.id === portalId ? { ...p, state: st } : p)),
      },
    }
  })
  return next
}

export function removePortal(items: SceneItem[], portalId: string): SceneItem[] {
  return items.map((item) => {
    if (item.metadata.type !== 'zone') return item
    const meta = item.metadata as ZoneMetadata
    if (!meta.portals.some((p) => p.id === portalId)) return item
    return {
      ...item,
      metadata: { ...meta, portals: meta.portals.filter((p) => p.id !== portalId) },
    }
  })
}

export type PortalState = PortalRef['state']

export const PORTAL_COLORS: Record<PortalRef['state'], string> = {
  open: '#22c55e',
  closed: '#ef4444',
  locked: '#f59e0b',
}