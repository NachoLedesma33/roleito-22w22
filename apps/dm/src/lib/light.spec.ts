import { describe, expect, it } from 'vitest'
import {
  LIGHT_PRESETS,
  attachLightToToken,
  clampIntensity,
  computeLightZones,
  coneSectorPoints,
  createLightItem,
  detachLight,
  hexToRgba,
  isLightAttached,
  lightGlowOpacity,
  lightIntensityAt,
  normalizeLightConfig,
  updateLightSource,
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

  it('updateLightSource actualiza propiedades preservando el resto sin mutar', () => {
    const item = createLightItem('torch', { x: 0.5, y: 0.5 })!
    const upd = updateLightSource(item, { color: '#00ff00', intensity: 0.4 })!
    expect(upd).not.toBe(item)
    expect((upd.metadata as LightMetadata).source.color).toBe('#00ff00')
    expect((upd.metadata as LightMetadata).source.intensity).toBe(0.4)
    expect((upd.metadata as LightMetadata).source.mode).toBe('hard')
    expect((upd.metadata as LightMetadata).source.radius).toBeCloseTo(0.15, 5)
    expect((item.metadata as LightMetadata).source.color).toBe('#ff9d45')
  })

  it('updateLightSource cambia a directional y normaliza angle por defecto', () => {
    const item = createLightItem('candle', { x: 0.5, y: 0.5 })!
    const upd = updateLightSource(item, { mode: 'directional' })!
    expect((upd.metadata as LightMetadata).source.mode).toBe('directional')
    expect((upd.metadata as LightMetadata).source.angle).toBe(90)
  })

  it('updateLightSource devuelve null si el item no es luz', () => {
    const item = { ...createLightItem('torch', { x: 0.5, y: 0.5 })!, metadata: { type: 'wall' } }
    expect(updateLightSource(item as never, { color: '#fff' })).toBeNull()
  })
})

describe('light/zones (E8)', () => {
  it('soft sin falloff explicito hereda falloff 0.6', () => {
    const cfg = normalizeLightConfig({ mode: 'soft', intensity: 0.5, radius: 0.3 })
    expect(cfg.falloff).toBeCloseTo(0.6, 5)
    expect(normalizeLightConfig({}).falloff).toBeUndefined()
  })

  it('hard sin falloff: zona bright = radio completo, sin banda dim (borde duro al borde)', () => {
    const zones = computeLightZones({ mode: 'hard', color: '#fff', intensity: 1, radius: 0.2 })
    expect(zones.brightRadius).toBeCloseTo(0.2, 5)
    expect(zones.dimRadius).toBeCloseTo(0.2, 5)
    expect(zones.radius).toBeCloseTo(0.2, 5)
  })

  it('hard con falloff 0.4: bright recorta al 40% y dim = bright (sin banda)', () => {
    const zones = computeLightZones({ mode: 'hard', color: '#fff', intensity: 1, radius: 0.2, falloff: 0.4 })
    expect(zones.brightRadius).toBeCloseTo(0.08, 5)
    expect(zones.dimRadius).toBeCloseTo(0.08, 5)
  })

  it('soft con falloff 0 → bright al 50% y dim al 90% del radio', () => {
    const zones = computeLightZones({ mode: 'soft', color: '#fff', intensity: 1, radius: 0.4, falloff: 0 } as const)
    expect(zones.brightRadius).toBeCloseTo(0.2, 5)
    expect(zones.dimRadius).toBeCloseTo(0.36, 5)
  })

  it('soft falloff 0.6: bright al 80%, dim al 96% (banda de transicion real)', () => {
    const zones = computeLightZones({ mode: 'soft', color: '#fff', intensity: 1, radius: 0.3, falloff: 0.6 } as const)
    expect(zones.brightRadius).toBeCloseTo(0.24, 5)
    expect(zones.dimRadius).toBeCloseTo(0.288, 5)
    expect(zones.brightRadius).toBeLessThan(zones.dimRadius)
    expect(zones.dimRadius).toBeLessThan(zones.radius)
  })

  it('intensidad mantiene plateau hasta falloff y decae lineal hasta 0 al radio', () => {
    const src = { mode: 'soft', color: '#fff', intensity: 0.8, radius: 0.2, falloff: 0.5 } as const
    expect(lightIntensityAt(src, 0)).toBeCloseTo(0.8, 5)
    expect(lightIntensityAt(src, 0.1)).toBeCloseTo(0.8, 5)
    expect(lightIntensityAt(src, 0.15)).toBeCloseTo(0.4, 5)
    expect(lightIntensityAt(src, 0.2)).toBe(0)
    expect(lightIntensityAt(src, 0.3)).toBe(0)
  })

  it('intensidad hard: plena dentro del edge, 0 fuera (salto duro)', () => {
    const src = { mode: 'hard', color: '#fff', intensity: 0.9, radius: 0.2, falloff: 0.5 } as const
    expect(lightIntensityAt(src, 0.0999)).toBeCloseTo(0.9, 5)
    expect(lightIntensityAt(src, 0.1001)).toBe(0)
  })

  it('zonas respetan intensidad baja (escala, no cruza umbrales del config)', () => {
    const zones = computeLightZones({ mode: 'soft', color: '#fff', intensity: 0.2, radius: 0.3, falloff: 0.6 } as const)
    expect(zones.brightRadius).toBeCloseTo(0.24, 5)
  })
})