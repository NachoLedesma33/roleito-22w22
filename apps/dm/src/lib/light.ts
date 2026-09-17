import { FlickerConfig, LightMetadata, LightMode, LightSourceConfig, PulseConfig, SceneItem, SceneLayer } from '@core/domain/types'

export interface LightPreset {
  name: string
  mode: LightMode
  color: string
  intensity: number
  radius: number
  angle?: number
  direction?: number
  falloff?: number
  flicker?: FlickerConfig
  pulse?: PulseConfig
}

export const LIGHT_PRESETS: Record<string, LightPreset> = {
  torch: { name: 'Torch', mode: 'hard', color: '#ff9d45', intensity: 0.85, radius: 0.15, flicker: { speed: 0.3, variance: 0.1, enabled: true } },
  lantern: { name: 'Lantern', mode: 'soft', color: '#ffcf7d', intensity: 0.8, radius: 0.28, falloff: 0.7, flicker: { speed: 0.1, variance: 0.05, enabled: true } },
  campfire: { name: 'Campfire', mode: 'soft', color: '#ff6b2b', intensity: 0.95, radius: 0.45, falloff: 0.5, flicker: { speed: 0.5, variance: 0.2, enabled: true } },
  candle: { name: 'Candle', mode: 'hard', color: '#ffe08a', intensity: 0.7, radius: 0.08, flicker: { speed: 0.4, variance: 0.15, enabled: true } },
  lanternDir: { name: 'Lantern (cone)', mode: 'directional', color: '#ffe08a', intensity: 0.9, radius: 0.3, angle: 90, direction: 0, falloff: 0.6 },
  magic: { name: 'Magic', mode: 'soft', color: '#7dc8ff', intensity: 0.9, radius: 0.35, falloff: 0.6, pulse: { speed: 1.0, variance: 0.3, enabled: true } },
}

export function normalizeLightConfig(config: Partial<LightSourceConfig>): LightSourceConfig {
  const mode = config.mode ?? 'hard'
  return {
    mode,
    color: config.color ?? '#ffffff',
    intensity: Math.min(1, Math.max(0, config.intensity ?? 1)),
    radius: Math.max(0.02, config.radius ?? 0.2),
    angle: config.angle ?? (mode === 'directional' ? 90 : undefined),
    direction: config.direction ?? 0,
    falloff: config.falloff ?? (mode === 'soft' ? 0.6 : undefined),
    flicker: config.flicker ? { speed: config.flicker.speed ?? 0.3, variance: config.flicker.variance ?? 0.1, enabled: config.flicker.enabled ?? false } : undefined,
    pulse: config.pulse ? { speed: config.pulse.speed ?? 0.6, variance: config.pulse.variance ?? 0.2, enabled: config.pulse.enabled ?? false } : undefined,
  }
}

export function animateLightIntensity(source: LightSourceConfig, time: number): number {
  const cfg = normalizeLightConfig(source)
  let modulation = 1.0
  if (cfg.flicker?.enabled) {
    modulation += Math.sin(time * cfg.flicker.speed * Math.PI * 2) * cfg.flicker.variance
  }
  if (cfg.pulse?.enabled) {
    modulation += Math.sin(time * cfg.pulse.speed * Math.PI * 2) * cfg.pulse.variance
  }
  return Math.max(0, Math.min(1, modulation))
}

export interface LightZones {
  brightRadius: number
  dimRadius: number
  radius: number
}

export function lightIntensityAt(source: LightSourceConfig, distance: number): number {
  const cfg = normalizeLightConfig(source)
  const radius = Math.max(1e-6, cfg.radius)
  const t = Math.min(1, Math.max(0, distance / radius))
  if (cfg.mode === 'hard') {
    const edge = cfg.falloff ?? 1
    return t <= edge ? cfg.intensity : 0
  }
  const plateau = Math.min(0.99, cfg.falloff ?? 0)
  if (t <= plateau) return cfg.intensity
  return cfg.intensity * Math.max(0, (1 - t) / Math.max(1e-6, 1 - plateau))
}

export function computeLightZones(source: LightSourceConfig): LightZones {
  const cfg = normalizeLightConfig(source)
  if (cfg.mode === 'hard') {
    const bright = Math.min(1, cfg.falloff ?? 1)
    return { brightRadius: cfg.radius * bright, dimRadius: cfg.radius * bright, radius: cfg.radius }
  }
  const plateau = Math.min(0.99, cfg.falloff ?? 0)
  const brightT = Math.min(1, 1 - 0.5 * (1 - plateau))
  const dimT = Math.min(1, 1 - 0.1 * (1 - plateau))
  return { brightRadius: cfg.radius * brightT, dimRadius: cfg.radius * dimT, radius: cfg.radius }
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

export function updateLightSource(light: SceneItem, patch: Partial<LightSourceConfig>): SceneItem | null {
  if (light.metadata?.type !== 'light') return null
  const prev = normalizeLightConfig((light.metadata as LightMetadata).source)
  const source = normalizeLightConfig({ ...prev, ...patch })
  return { ...light, metadata: { ...(light.metadata as LightMetadata), source } }
}