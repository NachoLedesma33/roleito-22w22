import { describe, it, expect } from 'vitest'
import { SceneItem, SceneLayer, WallMetadata } from '@core/domain/types'
import { approvedItems, isPendingReview } from './pendingReview'
import { extractBlockingWallLines, extractZonePolygons, type ShadowItem } from './wall-collision'
import { buildOccluders } from './lightOcclusion'
import { buildLoSOccluders } from './losSystem'

describe('isPendingReview', () => {
  it('solo lo pendiente explicito cuenta', () => {
    expect(isPendingReview({ pendingReview: true })).toBe(true)
    expect(isPendingReview({ pendingReview: false })).toBe(false)
    // Los items que el DM dibujo a mano nunca tuvieron el flag.
    expect(isPendingReview({})).toBe(false)
  })
})

describe('approvedItems', () => {
  it('saca los pendientes y deja el resto', () => {
    const items = [
      { id: 'a' },
      { id: 'b', pendingReview: true },
      { id: 'c', pendingReview: false },
    ]
    expect(approvedItems(items).map((i) => i.id)).toEqual(['a', 'c'])
  })

  it('con items sin flag no cambia nada', () => {
    const items = [{ id: 'a' }, { id: 'b' }]
    expect(approvedItems(items)).toHaveLength(2)
  })
})

/**
 * La geometria que salio de una deteccion y el DM todavia no aprobo es una
 * PROPUESTA: no puede bloquear, ocluir ni encerrar. Si lo hiciera, el jugador
 * estorba con muros que nadie aprobo (y el DM los ve iguales a los aprobados).
 */

function wall(pending: boolean): SceneItem {
  return {
    id: pending ? 'wall-pendiente' : 'wall-aprobado',
    name: 'muro',
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    width: 0,
    height: 0,
    zIndex: 0,
    layer: SceneLayer.MAP,
    visible: true,
    locked: false,
    disableHit: false,
    disableAutoZIndex: false,
    attachmentIds: [],
    disableAttachmentBehavior: [],
    metadata: {
      type: 'wall',
      wallType: 'solid',
      material: 'stone',
      height: 8,
      thickness: 10,
      opacity: 0.12,
      lineOfSight: true,
      movement: true,
      soundOcclusion: 0.8,
    } as WallMetadata,
    shape: { type: 'line', points: [0.2, 0.5, 0.8, 0.5], stroke: '#fff', strokeWidth: 1 },
    ...(pending ? { pendingReview: true } : {}),
  }
}

describe('geometria pendiente de revision', () => {
  it('un muro pendiente no bloquea el movimiento', () => {
    expect(extractBlockingWallLines([wall(true)])).toHaveLength(0)
    expect(extractBlockingWallLines([wall(false)])).toHaveLength(1)
  })

  it('un muro pendiente no ocluye la luz', () => {
    expect(buildOccluders([wall(true)], 10, 10)).toHaveLength(0)
    expect(buildOccluders([wall(false)], 10, 10)).toHaveLength(1)
  })

  it('un muro pendiente no ocluye la vision', () => {
    expect(buildLoSOccluders([wall(true)], 10, 10)).toHaveLength(0)
    expect(buildLoSOccluders([wall(false)], 10, 10)).toHaveLength(1)
  })

  it('una zona pendiente no encierra al token', () => {
    const zona = (pending: boolean): ShadowItem =>
      ({
        metadata: { type: 'zone' },
        shape: { type: 'polygon', points: [0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6] },
        ...(pending ? { pendingReview: true } : {}),
      }) as ShadowItem

    expect(extractZonePolygons([zona(true)])).toHaveLength(0)
    expect(extractZonePolygons([zona(false)])).toHaveLength(1)
  })
})
