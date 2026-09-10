import { SceneItem, SceneLayer, ZoneMetadata } from '@core/domain/types'

export const ZONE_COLORS: Record<string, string> = {
  emerald: '#10b981',
  sky: '#38bdf8',
  amber: '#fbbf24',
  violet: '#a78bfa',
  rose: '#fb7185',
  slate: '#94a3b8',
}

export const ZONE_DEFAULT_COLOR = '#10b981'

export interface ZoneDraft {
  mode: 'rect' | 'polygon'
  points: { x: number; y: number }[]
  startPoint: { x: number; y: number } | null
  currentPoint: { x: number; y: number } | null
}

export function createEmptyZoneDraft(mode: 'rect' | 'polygon'): ZoneDraft {
  return {
    mode,
    points: [],
    startPoint: null,
    currentPoint: null,
  }
}

export function createZoneItem(
  draft: ZoneDraft,
  fillColor: string,
  mapWidth: number = 10,
  mapHeight: number = 10,
): SceneItem | null {
  let polygon: { x: number; y: number }[]
  if (draft.mode === 'rect') {
    if (!draft.startPoint || !draft.currentPoint) return null
    const a = draft.startPoint
    const b = draft.currentPoint
    polygon = [
      { x: a.x, y: a.y },
      { x: b.x, y: a.y },
      { x: b.x, y: b.y },
      { x: a.x, y: b.y },
    ]
  } else {
    if (draft.points.length < 3) return null
    polygon = draft.points
  }

  const norm = polygon.map((p) => ({
    x: Math.round(((p.x / mapWidth) + 0.5) * 10000) / 10000,
    y: Math.round(((p.y / mapHeight) + 0.5) * 10000) / 10000,
  }))

  const points: number[] = []
  for (const p of norm) {
    points.push(p.x, p.y)
  }

  const id = `zone-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const metadata: ZoneMetadata = {
    type: 'zone',
    zoneType: 'polygon',
    origin: 'manual',
    touchedByDm: false,
    shadowOnly: false,
    fillColor,
    fillOpacity: 0.35,
    portals: [],
  }

  const item: SceneItem = {
    id,
    name: 'Zone',
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
    layer: SceneLayer.OVERLAY,
    shape: {
      type: 'polygon',
      points,
      fill: fillColor,
      stroke: fillColor,
      strokeWidth: 2,
    },
    metadata,
  }

  return item
}