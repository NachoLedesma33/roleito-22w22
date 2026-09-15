import { describe, expect, it } from 'vitest'
import {
  LIGHT_PRESETS,
  attachLightToToken,
  clampIntensity,
  coneSectorPoints,
  createLightItem,
  detachLight,
  hexToRgba,
  isLightAttached,
  lightGlowOpacity,
  normalizeLightConfig,
} from './light'
import { LightMetadata, SceneLayer } from '@core/domain/types'

describe('light/normalizeLightConfig', () => {
  it('defaults a config minima (hard, blanco, intensidad y radio sanos)', () => {
    const cfg = normalizeLightConfig({})
    expect(cfg.mode).toBe('hard')
    expect(cfg.color).toBe('#ffffff')
    expect(cfg.intensity).toBe(1)
    expect(cfg.radius).toBeGreaterThanOrEqual(0.02)
  })

  it('clampa intensidad fuera de [0,1] y radio negativo', () => {
    const cfg = normalizeLightConfig({ intensity: 3, radius: -1 })
    expect(cfg.intensity).toBe(1)
    expect(cfg.radius).toBeGreaterThanOrEqual(0.02)
    expect(normalizeLightConfig({ intensity: -0.5 }).intensity).toBe(0)
  })

  it('mode directional hereda angle por defecto (90° linterna)', () => {
    const cfg = normalizeLightConfig({ mode: 'directional', direction: 45 })
    expect(cfg.mode).toBe('directional')
    expect(cfg.angle).toBe(90)
    expect(cfg.direction).toBe(45)
  })
})

describe('light/presets', () => {
  it('presets torch/lantern/campfire existen con datos validos', () => {
    for (const key of ['torch', 'lantern', 'campfire', 'candle', 'lanternDir', 'magic']) {
      const p = LIGHT_PRESETS[key]
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.intensity).toBeGreaterThan(0)
      expect(p.intensity).toBeLessThanOrEqual(1)
      expect(p.radius).toBeGreaterThan(0)
      expect(['hard', 'soft', 'directional']).toContain(p.mode)
    }
  })

  it('lanternDir es directional con cono de 90 grados', () => {
    const p = LIGHT_PRESETS.lanternDir
    expect(p.mode).toBe('directional')
    expect(p.angle).toBe(90)
  })
})

describe('light/createLightItem', () => {
  it('crea item con metadata light, capa EFFECTS_ABOVE y posicion world desde punto normalizado', () => {
    const item = createLightItem('torch', { x: 0.75, y: 0.25 }, 20, 10)
    expect(item).not.toBeNull()
    expect(item!.metadata.type).toBe('light')
    expect(item!.layer).toBe(SceneLayer.EFFECTS_ABOVE)
    expect(item!.x).toBeCloseTo((0.75 - 0.5) * 20, 5)
    expect(item!.y).toBeCloseTo((0.25 - 0.5) * 10, 5)
  })

  it('preset desconocido devuelve null (sin item)', () => {
    expect(createLightItem('nope', { x: 0.5, y: 0.5 })).toBeNull()
  })

  it('usa defaults de mapa cuadrado 10x10 si no se pasan', () => {
    const item = createLightItem('candle', { x: 0, y: 0 })
    expect(item!.x).toBeCloseTo(-5, 5)
    expect(item!.y).toBeCloseTo(-5, 5)
  })
})

describe('light/helpers', () => {
  it('clampIntensity limita a [0,1]', () => {
    expect(clampIntensity(1.5)).toBe(1)
    expect(clampIntensity(-0.2)).toBe(0)
    expect(clampIntensity(0.5)).toBe(0.5)
  })

  it('hexToRgba convierte hex 6 y 3 a rgba con alpha', () => {
    expect(hexToRgba('#ff9d45', 0.5)).toBe('rgba(255,157,69,0.5)')
    expect(hexToRgba('#f90', 0.25)).toBe('rgba(255,153,0,0.25)')
    expect(hexToRgba('bogus', 0.5)).toBe('rgba(255,255,255,0.5)')
  })

  it('coneSectorPoints genera sector centrado en direction con radio pedido', () => {
    const pts = coneSectorPoints(0.5, 0.5, 0.2, 0, 90)
    expect(pts.length % 2).toBe(0)
    expect(pts[0]).toBe(0.5)
    expect(pts[1]).toBe(0.5)
    const first = [pts[2], pts[3]]
    const last = [pts[pts.length - 2], pts[pts.length - 1]]
    expect(Math.hypot(first[0] - 0.5, first[1] - 0.5)).toBeCloseTo(0.2, 5)
    expect(Math.hypot(last[0] - 0.5, last[1] - 0.5)).toBeCloseTo(0.2, 5)
  })

  it('lightGlowOpacity escala con intensidad y distingue hard de soft', () => {
    const hard: LightMetadata = {
      type: 'light',
      source: { mode: 'hard', color: '#fff', intensity: 1, radius: 0.2 },
    }
    const soft: LightMetadata = {
      type: 'light',
      source: { mode: 'soft', color: '#fff', intensity: 0.5, radius: 0.2 },
    }
    expect(lightGlowOpacity(hard)).toBeCloseTo(0.45)
    expect(lightGlowOpacity(soft)).toBeCloseTo(0.275)
  })

  it('attachLightToToken asocia metadata.attachedTo sin mutar el original', () => {
    const item = createLightItem('torch', { x: 0.5, y: 0.5 })!
    const attached = attachLightToToken(item, 'scenechar-42')
    expect(attached).not.toBe(item)
    expect((attached.metadata as LightMetadata).attachedTo).toBe('scenechar-42')
    expect((item.metadata as LightMetadata).attachedTo).toBeUndefined()
  })

  it('detachLight elimina attachedTo sin mutar el original', () => {
    const item = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 })!, 'scenechar-7')
    const detached = detachLight(item)
    expect(detached).not.toBe(item)
    expect((detached.metadata as LightMetadata).attachedTo).toBeUndefined()
    expect((item.metadata as LightMetadata).attachedTo).toBe('scenechar-7')
  })

  it('isLightAttached distingue luz adjunta de una libre', () => {
    expect(isLightAttached(attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 })!, 'sc'))).toBe(true)
    expect(isLightAttached(createLightItem('torch', { x: 0.5, y: 0.5 })!)).toBe(false)
  })
})