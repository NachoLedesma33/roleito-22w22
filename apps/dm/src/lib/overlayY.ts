export type RenderMode = '2d' | '3d'

export const DEFAULT_RENDER_MODE: RenderMode = '2d'

export const Y2D = {
  map: 0,
  grid: 0.015,
  wallFootprint: 0.02,
  wallHeight: 0.05,
  zoneFill: 0.025,
  zoneOutline: 0.03,
  zoneVertexY: 0.025,
  portal: 0.035,
  portalHandle: 0.045,
  portalBarMid: 0.045,
  portalBarHigh: 0.055,
  lightHalo: 0.03,
  lightRing: 0.04,
  lightMarker: 0.045,
  lightAttachRing: 0.045,
  lightSelectionRing: 0.055,
  fog: 0.08,
  draft: 0.05,
  draftHandle: 0.045,
  draftPreview: 0.05,
  fogBrushRing: 0.06,
  fogRectFill: 0,
  fogRectEdge: 0.012,
  fogBrushCursor: 0.07,
  lightPlaceHover: 0.06,
  lightPlaceRing: 0.08,
  lightPlaceSphere: 0.12,
  wallPreview: 0.05,
  zonePreviewVertex: 0.045,
} as const

export type OverlayYKeys = typeof Y2D

function y3d() {
  return {
    map: 0,
    grid: 0.02,
    wallFootprint: 0.025,
    wallHeight: 0.5,
    zoneFill: 0.02,
    zoneOutline: 0.035,
    zoneVertexY: 0.1,
    portal: 0.045,
    portalHandle: 0.06,
    portalBarMid: 0.045,
    portalBarHigh: 0.075,
    lightHalo: 0.045,
    lightRing: 0.045,
    lightMarker: 0.15,
    lightAttachRing: 0.26,
    lightSelectionRing: 0.05,
    fog: 6,
    draft: 0.08,
    draftHandle: 0.1,
    draftPreview: 0.09,
    fogBrushRing: 0.02,
    fogRectFill: 0,
    fogRectEdge: 0.012,
    fogBrushCursor: 0.07,
    lightPlaceHover: 0.06,
    lightPlaceRing: 0.06,
    lightPlaceSphere: 0.12,
    wallPreview: 0.08,
    zonePreviewVertex: 0.1,
  } as const
}

export function getY(mode: RenderMode) {
  return mode === '2d' ? Y2D : y3d()
}
