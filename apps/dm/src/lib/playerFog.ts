import { FogRegion } from './fogMask'
import { circlePoints } from './fogMask'

export const EXPLORE_RADIUS = 0.12

function regionCenter(r: FogRegion): { x: number; y: number } {
  let sx = 0
  let sy = 0
  const n = r.points.length / 2
  for (let i = 0; i < n; i++) {
    sx += r.points[i * 2]
    sy += r.points[i * 2 + 1]
  }
  return { x: sx / Math.max(1, n), y: sy / Math.max(1, n) }
}

export function exploredToFogRegion(points: number[], index: number): FogRegion {
  return {
    id: `pexp-${index}`,
    points,
    revealed: true,
    zIndex: 1000,
  }
}

export function isAlreadyExplored(regions: FogRegion[], cx: number, cy: number, radius: number): boolean {
  for (const r of regions) {
    if (!r.revealed) continue
    const c = regionCenter(r)
    if (Math.hypot(c.x - cx, c.y - cy) <= radius) return true
  }
  return false
}

export function exploredPointsFor(cx: number, cy: number, radius: number): number[] {
  return circlePoints(cx, cy, radius)
}