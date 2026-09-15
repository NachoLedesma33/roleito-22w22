import { LightMetadata, LightMode, LightSourceConfig, SceneItem, SceneLayer } from '@core/domain/types'

export interface LightPreset {
  name: string
  mode: LightMode
  color: string
  intensity: number
  radius: number
  angle?: number
  direction?: number
  falloff?: number
}

export const LIGHT_PRESETS: Record<string, LightPreset> = {
  torch: { name: 'Torch', mode: 'hard', color: '#ff9d45', intensity: 0.85, radius: 0.15 },
  lantern: { name: 'Lantern', mode: 'soft', color: '#ffcf7d', intensity: 0.8, radius: 0.28, falloff: 0.7 },
  campfire: { name: 'Campfire', mode: 'soft', color: '#ff6b2b', intensity: 0.95, radius: 0.45, falloff: 0.5 },
  candle: { name: 'Candle', mode: 'hard', color: '#ffe08a', intensity: 0.7, radius: 0.08 },
  lanternDir: { name: 'Lantern (cone)', mode: 'directional', color: '#ffe08a', intensity: 0.9, radius: 0.3, angle: 90, direction: 0, falloff: 0.6 },
  magic: { name: 'Magic', mode: 'soft', color: '#7dc8ff', intensity: 0.9, radius: 0.35, falloff: 0.6 },
}

export function normalizeLightConfig(config: Partial<LightSourceConfig>): LightSourceConfig {
  return {
    mode: config.mode ?? 'hard',
    color: config.color ?? '#ffffff',
    intensity: Math.min(1, Math.max(0, config.intensity ?? 1)),
    radius: Math.max(0.02, config.radius ?? 0.2),
    angle: config.angle ?? (config.mode === 'directional' ? 90 : undefined),
    direction: config.direction ?? 0,
    falloff: config.falloff,
  }
}

export function clampIntensity(intensity: number): number {
  return Math.min(1, Math.max(0, intensity))
}

export function hexToRgba(hex: string, alpha: number): string {
  let c = (hex ?? '').replace('#', '')
  if (c.length === 3) c = c.split('').map((x) => x + x).join('')
  if (c.length !== 6) return `rgba(255,255,255,${alpha})`
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function coneSectorPoints(
  cx: number,
  cy: number,
  radius: number,
  directionDeg: number,
  angleDeg: number,
  segments = 16,
): number[] {
  const half = (angleDeg / 2) * (Math.PI / 180)
  const dir = directionDeg * (Math.PI / 180)
  const pts: number[] = [cx, cy]
  for (let i = 0; i <= segments; i++) {
    const a = dir - half + (i / segments) * 2 * half
    pts.push(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
  }
  return pts
}

export function lightGlowOpacity(light: LightMetadata): number {
  const src = normalizeLightConfig(light.source)
  return clampIntensity(src.intensity) * (src.mode === 'hard' ? 0.45 : 0.55)
}

export function createLightItem(
  presetKey: string,
  point: { x: number; y: number },
  mapWidth = 10,
  mapHeight = 10,
): SceneItem | null {
  const preset = LIGHT_PRESETS[presetKey]
  if (!preset) return null
  const source = normalizeLightConfig(preset)
  return {
    id: `light-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: preset.name,
    x: (point.x - 0.5) * mapWidth,
    y: (point.y - 0.5) * mapHeight,
    zIndex: 10,
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
    layer: SceneLayer.EFFECTS_ABOVE,
    metadata: { type: 'light', source },
  }
}

export function attachLightToToken(light: SceneItem, tokenId: string): SceneItem {
  const meta = light.metadata as LightMetadata
  return { ...light, metadata: { ...meta, attachedTo: tokenId } }
}

export function detachLight(light: SceneItem): SceneItem {
  const meta = light.metadata as LightMetadata
  const next = { ...meta }
  delete next.attachedTo
  return { ...light, metadata: next }
}

export function isLightAttached(light: SceneItem): boolean {
  return light.metadata?.type === 'light' && !!((light.metadata as LightMetadata).attachedTo)
}