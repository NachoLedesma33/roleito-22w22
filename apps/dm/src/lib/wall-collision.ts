/**
 * Wall collision detection for token movement.
 * Checks if a point (token center) intersects any wall segment.
 * Uses point-segment distance with token radius.
 */

import { PortalRef } from '@core/domain/types'

function pointSegmentDistance(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-10) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function checkWallCollision(
  x: number, z: number,
  walls: [number, number, number, number][],
  tokenRadius: number = 0.03,
): boolean {
  for (const [x1, z1, x2, z2] of walls) {
    const dist = pointSegmentDistance(x, z, x1, z1, x2, z2);
    if (dist < tokenRadius) {
      return true;
    }
  }
  return false;
}

export interface ZonePolygon {
  id?: string
  points: [number, number][]
}

function pointInPolygon(x: number, z: number, poly: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1]
    const xj = poly[j][0], zj = poly[j][1]
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export interface ShadowItem {
  id?: string
  metadata?: { type?: string; portals?: PortalRef[] }
  shape?: { type?: string; points?: number[] }
  x?: number
  y?: number
  width?: number
  height?: number
}

/**
 * Extract closed zone polygons from items in normalized 0-1 coords.
 * Polygon zones use shape.points (normalized). Rectangle zones use the
 * item center/size in scene units, converted via the same mapW/mapH used
 * to draw them.
 */
export function extractZonePolygons(items: ShadowItem[], mapW: number = 10, mapH: number = 10): ZonePolygon[] {
  const zones: ZonePolygon[] = []
  for (const item of items) {
    if (item.metadata?.type !== 'zone') continue
    const shape = item.shape
    if (shape?.type === 'polygon') {
      if (!shape.points || shape.points.length < 6) continue
      const pts: [number, number][] = []
      for (let i = 0; i + 1 < shape.points.length; i += 2) {
        pts.push([shape.points[i], shape.points[i + 1]])
      }
      zones.push({ id: item.id, points: pts })
    } else if (shape?.type === 'rectangle') {
      const w = (item.width ?? 0) / 2
      const h = (item.height ?? 0) / 2
      const cx = (item.x ?? 0) / mapW + 0.5
      const cy = (item.y ?? 0) / mapH + 0.5
      zones.push({
        id: item.id,
        points: [
          [cx - w / mapW, cy - h / mapH],
          [cx + w / mapW, cy - h / mapH],
          [cx + w / mapW, cy + h / mapH],
          [cx - w / mapW, cy + h / mapH],
        ],
      })
    }
  }
  return zones
}

export interface PortalZoneSegment {
  portalId: string
  zoneId: string
  zoneA: string
  zoneB: string
  open: boolean
  x1: number
  y1: number
  x2: number
  y2: number
}

export const PORTAL_CROSS_TOL = 0.08

/**
 * Extract portal segments from zone metadata in normalized 0-1 coords.
 * Portals are mirrored on both zones (zoneA and zoneB), so each segment
 * appears twice; collision routing is idempotent.
 */
export function extractPortals(items: ShadowItem[]): PortalZoneSegment[] {
  const segments: PortalZoneSegment[] = []
  for (const item of items) {
    if (item.metadata?.type !== 'zone' || !item.id) continue
    const portals = item.metadata.portals ?? []
    for (const p of portals) {
      const [a, b] = p.localEdge
      segments.push({
        portalId: p.id,
        zoneId: item.id,
        zoneA: p.zoneA,
        zoneB: p.zoneB,
        open: p.state === 'open',
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
      })
    }
  }
  return segments
}

function segmentIntersectionPoint(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number,
): [number, number] | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 1e-10) return null
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
  if (t < -1e-9 || t > 1 + 1e-9 || u < -1e-9 || u > 1 + 1e-9) return null
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
}

function crossingIntersection(
  prevX: number, prevZ: number,
  x: number, z: number,
  poly: [number, number][],
): [number, number] | null {
  let best: [number, number] | null = null
  let bestDist = Infinity
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const hit = segmentIntersectionPoint(prevX, prevZ, x, z, a[0], a[1], b[0], b[1])
    if (!hit) continue
    const dist = Math.hypot(hit[0] - prevX, hit[1] - prevZ)
    if (dist < bestDist) {
      bestDist = dist
      best = hit
    }
  }
  return best
}

function passesThroughOpenPortal(
  ix: number, iy: number,
  zone: ZonePolygon,
  portals: PortalZoneSegment[],
): boolean {
  const zoneId = zone.id
  if (!zoneId) return false
  for (const p of portals) {
    if (!p.open) continue
    if (zoneId !== p.zoneA && zoneId !== p.zoneB) continue
    if (pointSegmentDistance(ix, iy, p.x1, p.y1, p.x2, p.y2) < PORTAL_CROSS_TOL) return true
  }
  return false
}

/** Whether movement from (prevX,prevZ) to (x,z) crosses any zone border
 *  without passing through an open portal. */
export function crossZoneBorder(
  prevX: number, prevZ: number,
  x: number, z: number,
  zones: ZonePolygon[],
  portals: PortalZoneSegment[] = [],
): boolean {
  for (const zone of zones) {
    const prevIn = pointInPolygon(prevX, prevZ, zone.points)
    const nextIn = pointInPolygon(x, z, zone.points)
    if (prevIn === nextIn) continue
    const hit = crossingIntersection(prevX, prevZ, x, z, zone.points)
    if (!hit) return true
    if (!passesThroughOpenPortal(hit[0], hit[1], zone, portals)) return true
  }
  return false
}

export function insideAnyZone(x: number, z: number, zones: ZonePolygon[]): boolean {
  for (const zone of zones) {
    if (pointInPolygon(x, z, zone.points)) return true
  }
  return false
}
