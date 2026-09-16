import { SceneItem } from '@core/domain/types'

export interface Occluder {
  a: [number, number]
  b: [number, number]
}

export function intersectRaySegment2D(
  px: number,
  py: number,
  dx: number,
  dy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number | null {
  const ex = bx - ax
  const ey = by - ay
  const denom = dx * ey - dy * ex
  if (Math.abs(denom) < 1e-9) return null
  const qx = ax - px
  const qy = ay - py
  const t = (qx * ey - qy * ex) / denom
  const s = (qx * dy - qy * dx) / denom
  if (t < 0 || s < 0 || s > 1) return null
  return t
}

export function buildOccluders(
  items: SceneItem[],
  mapWidth: number,
  mapHeight: number,
): Occluder[] {
  const out: Occluder[] = []
  for (const item of items) {
    if (item.metadata.type === 'wall' && item.shape?.type === 'line' && item.shape.points.length >= 4) {
      const p = item.shape.points
      out.push({
        a: [(p[0] - 0.5) * mapWidth, (p[1] - 0.5) * mapHeight],
        b: [(p[2] - 0.5) * mapWidth, (p[3] - 0.5) * mapHeight],
      })
    } else if (item.metadata.type === 'door' && item.shape?.type === 'line' && item.shape.points.length >= 4) {
      if (item.metadata.state === 'open') continue
      const p = item.shape.points
      out.push({ a: [p[0], p[1]], b: [p[2], p[3]] })
    } else if (item.metadata.type === 'zone') {
      if (item.shape?.type === 'rectangle') {
        const hw = item.width / 2
        const hh = item.height / 2
        const cx = item.x
        const cy = item.y
        out.push(
          { a: [cx - hw, cy - hh], b: [cx + hw, cy - hh] },
          { a: [cx + hw, cy - hh], b: [cx + hw, cy + hh] },
          { a: [cx + hw, cy + hh], b: [cx - hw, cy + hh] },
          { a: [cx - hw, cy + hh], b: [cx - hw, cy - hh] },
        )
      } else if (item.shape?.type === 'polygon' && item.shape.points.length >= 6) {
        const p = item.shape.points
        for (let i = 0; i + 2 < p.length + 1; i += 2) {
          const j = (i + 2) % p.length
          out.push({
            a: [(p[i] - 0.5) * mapHeight, (p[i + 1] - 0.5) * mapHeight],
            b: [(p[j] - 0.5) * mapHeight, (p[j + 1] - 0.5) * mapHeight],
          })
        }
      }
    }
  }
  return out
}

export function lightShapePoints(
  ox: number,
  oz: number,
  radiusWorld: number,
  directionDeg: number | null,
  angleDeg: number,
  occluders: Occluder[],
): Array<[number, number]> {
  const circular = directionDeg === null
  const total = circular ? 180 : Math.max(16, Math.round(angleDeg / 1.5))
  const half = circular ? Math.PI : (angleDeg / 2) * (Math.PI / 180)
  const dir = circular ? 0 : directionDeg! * (Math.PI / 180)
  const pts: Array<[number, number]> = []
  const trans = occluders.map((o) => ({
    a: [o.a[0] - ox, oz - o.a[1]] as [number, number],
    b: [o.b[0] - ox, oz - o.b[1]] as [number, number],
  }))
  for (let i = 0; i <= total; i++) {
    const ang = dir - half + (i / total) * (circular ? 2 * Math.PI : 2 * half)
    const dx = Math.cos(ang)
    const dy = Math.sin(ang)
    let minT = radiusWorld
    for (const s of trans) {
      const t = intersectRaySegment2D(0, 0, dx, dy, s.a[0], s.a[1], s.b[0], s.b[1])
      if (t !== null && t > 0.0001 && t < minT) minT = t
    }
    pts.push([Math.cos(ang) * minT, Math.sin(ang) * minT])
  }
  return pts
}