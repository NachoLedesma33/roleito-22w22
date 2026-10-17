import { describe, expect, it } from 'vitest'
import { LightSourceConfig } from '@core/domain/types'
import { lightLevelAt, WorldLight } from './lightMask'
import { Occluder } from './lightOcclusion'

/** Mapa cuadrado de 10x10: 1 unidad de radio = 0.1 de fracción. */
const MAP_H = 10

function torch(over: Partial<LightSourceConfig> = {}): LightSourceConfig {
  return { mode: 'soft', color: '#ff9d45', intensity: 0.85, radius: 0.15, falloff: 0.7, ...over }
}

function worldLight(x: number, z: number, source: LightSourceConfig): WorldLight {
  return { x, z, source }
}

/** Muro vertical de (x, 0) a (x, 10), en coordenadas de mundo. */
function wallAt(x: number): Occluder {
  return { a: [x, -MAP_H / 2], b: [x, MAP_H / 2] }
}

describe('lightMask/lightLevelAt', () => {
  it('da la intensidad de la fuente en su propio centro y cae con la distancia', () => {
    const lights = [worldLight(0, 0, torch())]
    // radius 0.15 del alto = 1.5 unidades de mundo
    expect(lightLevelAt(0, 0, lights, [], MAP_H)).toBeCloseTo(0.85, 5)
    expect(lightLevelAt(1, 0, lights, [], MAP_H)).toBeCloseTo(0.85, 5) // dentro del plateau
    const near = lightLevelAt(1.1, 0, lights, [], MAP_H)
    const far = lightLevelAt(1.3, 0, lights, [], MAP_H)
    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(0)
    expect(lightLevelAt(1.5, 0, lights, [], MAP_H)).toBeCloseTo(0, 5) // en el borde, 0
    expect(lightLevelAt(9, 0, lights, [], MAP_H)).toBe(0) // mas alla del rango: corte temprano
  })

  it('respeta el plateau del falloff (dimRange de LIGHTING-SYSTEM.md)', () => {
    // radius 4 unidades (0.4), plateau 50%: full hasta 2, fade lineal hasta 4.
    const light = worldLight(0, 0, torch({ intensity: 1, radius: 0.4, falloff: 0.5 }))
    expect(lightLevelAt(0, 0, [light], [], MAP_H)).toBeCloseTo(1, 5)
    expect(lightLevelAt(2, 0, [light], [], MAP_H)).toBeCloseTo(1, 5) // borde del plateau
    expect(lightLevelAt(3, 0, [light], [], MAP_H)).toBeCloseTo(0.5, 5)
    expect(lightLevelAt(4, 0, [light], [], MAP_H)).toBeCloseTo(0, 5)
  })

  it('el modo hard corta en seco en el borde del rango', () => {
    const light = worldLight(0, 0, torch({ mode: 'hard', intensity: 1, radius: 0.4, falloff: 1 }))
    expect(lightLevelAt(3.9, 0, [light], [], MAP_H)).toBe(1)
    expect(lightLevelAt(4.1, 0, [light], [], MAP_H)).toBe(0)
  })

  it('un muro entre la luz y la celda la apaga (y solo a la celda de atrás)', () => {
    // Antorcha en x=0, muro vertical en x=2: la celda de atrás (x=3) queda a oscuras.
    const lights = [worldLight(0, 0, torch({ intensity: 1, radius: 0.4 }))]
    const occluders = [wallAt(2)]
    expect(lightLevelAt(1.5, 0, lights, occluders, MAP_H)).toBeGreaterThan(0)
    expect(lightLevelAt(3, 0, lights, occluders, MAP_H)).toBe(0)
    // el mismo punto, sin muro, sí tiene luz
    expect(lightLevelAt(3, 0, lights, [], MAP_H)).toBeGreaterThan(0)
  })

  it('el muro no apaga la luz si queda más lejos que la celda', () => {
    const lights = [worldLight(0, 0, torch({ intensity: 1, radius: 0.4 }))]
    expect(lightLevelAt(1, 0, lights, [wallAt(2)], MAP_H)).toBeGreaterThan(0)
  })

  it('suma las fuentes: dos antorchas tenues juntas llegan al umbral que una sola no', () => {
    const dim = torch({ intensity: 0.2, radius: 0.4 })
    const one = lightLevelAt(0, 0, [worldLight(-0.5, 0, dim)], [], MAP_H)
    const two = lightLevelAt(0, 0, [worldLight(-0.5, 0, dim), worldLight(0.5, 0, dim)], [], MAP_H)
    expect(one).toBeLessThan(0.25) // el umbral del plan para vision normal
    expect(two).toBeCloseTo(0.4, 5) // suma, sin saturar en 1
  })

  it('sin luces no hay luz (ni NaN)', () => {
    expect(lightLevelAt(3, 3, [], [wallAt(1)], MAP_H)).toBe(0)
  })

  it('una luz con cono no ilumina a sus espaldas', () => {
    const cone: WorldLight = {
      x: 0,
      z: 0,
      source: torch({ mode: 'directional', intensity: 1, radius: 0.4, angle: 90, direction: 0 }),
      directionDeg: 0, // hacia +x
    }
    expect(lightLevelAt(2, 0, [cone], [], MAP_H)).toBeCloseTo(1, 5)
    expect(lightLevelAt(1.5, 2, [cone], [], MAP_H)).toBe(0) // 53 grados: fuera del cono de 90
    // sin directionDeg resuelto ilumina en todas direcciones (la llamada decide)
    expect(lightLevelAt(1.5, 2, [{ ...cone, directionDeg: null }], [], MAP_H)).toBeGreaterThan(0)
  })

  it('mede el costo de una máscara grande: 10 luces en un mapa de 1200x800', () => {
    // El plan (PLAN-VISION-PERCEPCION.md, paso 2) mide aca para decidir si la
    // máscara entra a 256 de resolución o hay que bajarla.
    const lights: WorldLight[] = []
    for (let i = 0; i < 10; i++) {
      lights.push(worldLight((i - 5) * 100, (i % 3) * 200 - 100, torch({ radius: 0.15 })))
    }
    const occluders: Occluder[] = []
    for (let i = 0; i < 40; i++) {
      occluders.push({ a: [i * 25 - 500, -400], b: [i * 25 - 500, 400] })
    }
    const W = 256
    const H = Math.round((256 * 800) / 1200)
    const t0 = performance.now()
    let sum = 0
    for (let iy = 0; iy < H; iy++) {
      for (let ix = 0; ix < W; ix++) {
        const x = -600 + (ix / W) * 1200
        const z = -400 + (iy / H) * 800
        sum += lightLevelAt(x, z, lights, occluders, 800)
      }
    }
    const ms = performance.now() - t0
    console.log(`lightMask: ${W}x${H} celdas, 10 luces, 40 muros -> ${ms.toFixed(1)}ms (sum=${sum.toFixed(1)})`)
    expect(sum).toBeGreaterThan(0)
    // Cota holgada: mide el orden de magnitud (O(celdas x luces x muros)), no el
    // tiempo de una maquina puntual. Si esto se dispara, el algoritmo —no la
    // maquina— cambio.
    expect(ms).toBeLessThan(5000)
  })
})