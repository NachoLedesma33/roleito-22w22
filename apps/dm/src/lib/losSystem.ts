/**
 * Line of Sight system.
 * Computes per-character visibility and combined party vision.
 */

import { SceneItem, VisionConfig } from '@core/domain/types'
import { Occluder } from './lightOcclusion'
import { computeVisibilityMask, masksUnion, maskToPoints } from './losRaycast'
import { FogRegion } from './fogMask'

export interface CharVisionState {
  sceneCharId: string
  entityId: string
  x: number
  z: number
  rotation: number
  visions: VisionConfig[]
}

export function buildLoSOccluders(
  items: SceneItem[],
  mapWidth: number,
  mapHeight: number,
  excludeOpenDoors: boolean = true,
): Occluder[] {
  const occluders: Occluder[] = []

  for (const item of items) {
    if (!item.visible) continue

    if (item.metadata.type === 'wall' && item.shape?.type === 'line' && item.shape.points.length >= 4) {
      const p = item.shape.points
      occluders.push({
        a: [(p[0] - 0.5) * mapWidth, (p[1] - 0.5) * mapHeight],
        b: [(p[2] - 0.5) * mapWidth, (p[3] - 0.5) * mapHeight],
      })
    } else if (item.metadata.type === 'door') {
      if (excludeOpenDoors && (item.metadata as { state?: string }).state === 'open') continue
      if (item.shape?.type === 'line' && item.shape.points.length >= 4) {
        const p = item.shape.points
        occluders.push({
          a: [(p[0] - 0.5) * mapWidth, (p[1] - 0.5) * mapHeight],
          b: [(p[2] - 0.5) * mapWidth, (p[3] - 0.5) * mapHeight],
        })
      }
    } else if (item.metadata.type === 'zone') {
      if (item.shape?.type === 'rectangle') {
        const hw = item.width / 2
        const hh = item.height / 2
        const cx = item.x
        const cy = item.y
        occluders.push(
          { a: [cx - hw, cy - hh], b: [cx + hw, cy - hh] },
          { a: [cx + hw, cy - hh], b: [cx + hw, cy + hh] },
          { a: [cx + hw, cy + hh], b: [cx - hw, cy + hh] },
          { a: [cx - hw, cy + hh], b: [cx - hw, cy - hh] },
        )
      } else if (item.shape?.type === 'polygon' && item.shape.points.length >= 6) {
        const p = item.shape.points
        for (let i = 0; i + 2 < p.length + 1; i += 2) {
          const j = (i + 2) % p.length
          occluders.push({
            a: [(p[i] - 0.5) * mapWidth, (p[i + 1] - 0.5) * mapHeight],
            b: [(p[j] - 0.5) * mapHeight, (p[j + 1] - 0.5) * mapHeight],
          })
        }
      }
    }
  }

  return occluders
}

export function computeCharacterLoS(
  state: CharVisionState,
  occluders: Occluder[],
  mapWidth: number,
  mapHeight: number,
  resolution: number = 0.05,
): boolean[][] | null {
  if (state.visions.length === 0) return null

  let combined: boolean[][] | null = null

  for (const vision of state.visions) {
    const mask = computeVisibilityMask(
      state.x,
      state.z,
      vision,
      occluders,
      mapWidth,
      mapHeight,
      resolution,
    )

    if (combined === null) {
      combined = mask
    } else {
      combined = masksUnion(combined, mask)
    }
  }

  return combined
}

export function computePartyLoS(
  characters: CharVisionState[],
  occluders: Occluder[],
  mapWidth: number,
  mapHeight: number,
  resolution: number = 0.05,
): boolean[][] | null {
  let combined: boolean[][] | null = null

  for (const char of characters) {
    const mask = computeCharacterLoS(char, occluders, mapWidth, mapHeight, resolution)
    if (mask === null) continue

    if (combined === null) {
      combined = mask
    } else {
      combined = masksUnion(combined, mask)
    }
  }

  return combined
}

export function losMaskToVisionRegion(
  mask: boolean[][],
  resolution: number,
  mapWidth: number,
  mapHeight: number,
  id: string,
): FogRegion | null {
  const points = maskToPoints(mask, resolution, mapWidth, mapHeight)
  if (points.length < 6) return null

  return {
    id,
    points,
    revealed: true,
    zIndex: 1000,
  }
}

export function isInLoS(
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
      const ex = occ.b[0] - occ.a[0]
      const ey = occ.b[1] - occ.a[1]
      const denom = dx * ey - dy * ex
      if (Math.abs(denom) < 1e-9) continue

      const qx = occ.a[0] - ox
      const qy = occ.a[1] - oy
      const t = (qx * ey - qy * ex) / denom
      const s = (qx * dy - qy * dx) / denom

      if (t > 0 && t < 1 && s >= 0 && s <= 1) {
        return false
      }
    }
  }

  return true
}
