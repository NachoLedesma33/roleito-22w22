import { SceneItem, WallMetadata, DoorMetadata } from '@core/domain/types'

export interface DrawState {
  mode: 'wall' | 'door'
  material: WallMetadata['material']
  doorMaterial: DoorMetadata['material']
  startPoint: { x: number; y: number } | null
  currentPoint: { x: number; y: number } | null
  wallHeight: number
  wallThickness: number
}

export function createEmptyDrawState(mode: 'wall' | 'door', material: WallMetadata['material'], doorMaterial: DoorMetadata['material']): DrawState {
  return {
    mode,
    material,
    doorMaterial,
    startPoint: null,
    currentPoint: null,
    wallHeight: 8,
    wallThickness: 10,
  }
}

export function createWallItem(state: DrawState, _campaignId: string, mapWidth: number = 10, mapHeight: number = 10): SceneItem | null {
  if (!state.startPoint || !state.currentPoint) return null

  const dx = state.currentPoint.x - state.startPoint.x
  const dy = state.currentPoint.y - state.startPoint.y
  if (Math.hypot(dx, dy) < 0.1) return null

  const nsx = (state.startPoint.x / mapWidth) + 0.5
  const nsy = (state.startPoint.y / mapHeight) + 0.5
  const nex = (state.currentPoint.x / mapWidth) + 0.5
  const ney = (state.currentPoint.y / mapHeight) + 0.5

  const id = `${state.mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const metadata: WallMetadata | DoorMetadata = state.mode === 'wall'
    ? {
        type: 'wall',
        wallType: 'solid',
        material: state.material,
        height: state.wallHeight,
        thickness: state.wallThickness,
        opacity: 0.0,
        lineOfSight: true,
        movement: true,
        soundOcclusion: 0.8,
      }
    : {
        type: 'door',
        state: 'closed',
        material: state.doorMaterial,
        autoClose: false,
      }

  return {
    id,
    name: state.mode === 'wall' ? 'Wall' : 'Door',
    x: 0,
    y: 0,
    layer: 1,
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
    shape: {
      type: 'line',
      points: [nsx, nsy, nex, ney],
      stroke: state.mode === 'wall' ? '#6b7280' : '#b45309',
      strokeWidth: 3,
    },
    metadata,
  }
}
