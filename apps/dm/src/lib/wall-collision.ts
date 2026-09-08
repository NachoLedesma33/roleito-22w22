/**
 * Wall collision detection for token movement.
 * Checks if a point (token center) intersects any wall segment.
 * Uses point-segment distance with token radius.
 */

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

export type ZonePolygon = { points: [number, number][] }

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
  metadata?: { type?: string }
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
      zones.push({ points: pts })
    } else if (shape?.type === 'rectangle') {
      const w = (item.width ?? 0) / 2
      const h = (item.height ?? 0) / 2
      const cx = (item.x ?? 0) / mapW + 0.5
      const cy = (item.y ?? 0) / mapH + 0.5
      zones.push({
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

/** Whether movement from (prevX,prevZ) to (x,z) crosses any zone border. */
export function crossZoneBorder(
  prevX: number, prevZ: number,
  x: number, z: number,
  zones: ZonePolygon[],
): boolean {
  for (const zone of zones) {
    const prevIn = pointInPolygon(prevX, prevZ, zone.points)
    const nextIn = pointInPolygon(x, z, zone.points)
    if (prevIn !== nextIn) return true
  }
  return false
}

export function insideAnyZone(x: number, z: number, zones: ZonePolygon[]): boolean {
  for (const zone of zones) {
    if (pointInPolygon(x, z, zone.points)) return true
  }
  return false
}
