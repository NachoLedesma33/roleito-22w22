/**
 * Line of Sight raycasting engine.
 * Pure functions for visibility calculation using Bresenham-like stepping.
 */

import { VisionConfig } from '@core/domain/types'
import { Occluder } from './lightOcclusion'

export interface LOSRay {
  dx: number
  dy: number
  steps: number
}

export function castRay(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  occluders: Occluder[],
  maxRange: number,
): boolean {
  const dx = tx - ox
  const dy = ty - oy
  const dist = Math.hypot(dx, dy)
  if (dist > maxRange) return false
  if (dist < 1e-9) return true

  const steps = Math.ceil(dist / 0.02)
  const xInc = dx / steps
  const yInc = dy / steps

  let x = ox
  let y = oy

  for (let i = 0; i < steps; i++) {
    x += xInc
    y += yInc

    for (const occ of occluders) {
      if (segmentIntersectsPoint(occ.a[0], occ.a[1], occ.b[0], occ.b[1], x, y, 0.015)) {
        return false
      }
    }
  }

  return true
}

function segmentIntersectsPoint(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  px: number,
  py: number,
  radius: number,
): boolean {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-10) return Math.hypot(px - ax, py - ay) < radius

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const projX = ax + t * dx
  const projY = ay + t * dy
  return Math.hypot(px - projX, py - projY) < radius
}

export function castRayDDA(
  ox: number,
  oy: number,
  tx: number,
  ty: number,
  occluders: Occluder[],
  maxRange: number,
  cellSize: number = 0.05,
): boolean {
  const dx = tx - ox
  const dy = ty - oy
  const dist = Math.hypot(dx, dy)
  if (dist > maxRange) return false
  if (dist < 1e-9) return true

  const stepX = dx > 0 ? 1 : -1
  const stepY = dy > 0 ? 1 : -1

  let tMaxX =
    ((Math.floor(ox / cellSize) + (dx > 0 ? 1 : 0)) * cellSize - ox) / dx
  let tMaxY =
    ((Math.floor(oy / cellSize) + (dy > 0 ? 1 : 0)) * cellSize - oy) / dy

  const tDeltaX = Math.abs(cellSize / dx)
  const tDeltaY = Math.abs(cellSize / dy)

  let cellX = Math.floor(ox / cellSize)
  let cellY = Math.floor(oy / cellSize)
  const targetCellX = Math.floor(tx / cellSize)
  const targetCellY = Math.floor(ty / cellSize)

  let t = 0

  while (cellX !== targetCellX || cellY !== targetCellY) {
    if (tMaxX < tMaxY) {
      t = tMaxX
      cellX += stepX
      tMaxX += tDeltaX
    } else {
      t = tMaxY
      cellY += stepY
      tMaxY += tDeltaY
    }

    if (t > 1) break

    const cx = ox + dx * t
    const cy = oy + dy * t

    for (const occ of occluders) {
      if (segmentIntersectsPoint(occ.a[0], occ.a[1], occ.b[0], occ.b[1], cx, cy, cellSize * 0.4)) {
        return false
      }
    }
  }

  return true
}

export function computeVisibilityMask(
  ox: number,
  oy: number,
  vision: VisionConfig,
  occluders: Occluder[],
  mapWidth: number,
  mapHeight: number,
  resolution: number = 0.05,
): boolean[][] {
  const range = vision.range > 0 ? vision.range : Math.max(mapWidth, mapHeight)
  const halfW = mapWidth / 2
  const halfH = mapHeight / 2

  const cols = Math.ceil(mapWidth / resolution)
  const rows = Math.ceil(mapHeight / resolution)
  const mask: boolean[][] = []

  for (let r = 0; r < rows; r++) {
    mask[r] = []
    for (let c = 0; c < cols; c++) {
      const wx = -halfW + (c + 0.5) * resolution
      const wz = -halfH + (r + 0.5) * resolution

      const dist = Math.hypot(wx - ox, wz - oy)
      if (dist > range) {
        mask[r][c] = false
        continue
      }

      if (vision.angle && vision.angle < 360) {
        const dir = vision.direction ?? 0
        const dirRad = (dir * Math.PI) / 180
        const angleRad = (vision.angle * Math.PI) / 180
        const toTarget = Math.atan2(wz - oy, wx - ox)
        let diff = toTarget - dirRad
        while (diff > Math.PI) diff -= 2 * Math.PI
        while (diff < -Math.PI) diff += 2 * Math.PI
        if (Math.abs(diff) > angleRad / 2) {
          mask[r][c] = false
          continue
        }
      }

      mask[r][c] = castRayDDA(ox, oy, wx, wz, occluders, range, resolution)
    }
  }

  return mask
}

export function maskToCells(
  mask: boolean[][],
  resolution: number,
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number }[] {
  const cells: { x: number; y: number }[] = []
  const halfW = mapWidth / 2
  const halfH = mapHeight / 2

  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c]) {
        cells.push({
          x: -halfW + (c + 0.5) * resolution,
          y: -halfH + (r + 0.5) * resolution,
        })
      }
    }
  }

  return cells
}

export function masksUnion(a: boolean[][], b: boolean[][]): boolean[][] {
  const rows = Math.max(a.length, b.length)
  const result: boolean[][] = []

  for (let r = 0; r < rows; r++) {
    const colsA = a[r]?.length ?? 0
    const colsB = b[r]?.length ?? 0
    const cols = Math.max(colsA, colsB)
    result[r] = []
    for (let c = 0; c < cols; c++) {
      result[r][c] = (a[r]?.[c] ?? false) || (b[r]?.[c] ?? false)
    }
  }

  return result
}

export function maskToPoints(
  mask: boolean[][],
  resolution: number,
  mapWidth: number,
  mapHeight: number,
): number[] {
  const points: number[] = []
  const halfW = mapWidth / 2
  const halfH = mapHeight / 2

  for (let r = 0; r < mask.length; r++) {
    for (let c = 0; c < mask[r].length; c++) {
      if (mask[r][c]) {
        const wx = (-halfW + (c + 0.5) * resolution) / mapWidth + 0.5
        const wy = (-halfH + (r + 0.5) * resolution) / mapHeight + 0.5
        points.push(wx, wy)
      }
    }
  }

  return points
}
