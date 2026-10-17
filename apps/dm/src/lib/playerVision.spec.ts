import { describe, it, expect } from 'vitest'
import { attachLightToToken, createLightItem } from './light'
import { collectWorldLights, lightVisionOrigin, rotationToConeDirDeg } from './playerVision'

const MAP_W = 10
const MAP_H = 10

describe('playerVision/lightVisionOrigin', () => {
  it('luz estática usa item.x/item.y en world coords', () => {
    const item = createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!
    const origin = lightVisionOrigin(item, new Map())
    expect(origin).toEqual({ x: 0, z: 0 })
  })

  it('luz adjunta usa posición del token, no la del item', () => {
    const item = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-1')
    const charPos = new Map([['ch-1', { x: 3, z: -4 }]])
    const origin = lightVisionOrigin(item, charPos)
    expect(origin).toEqual({ x: 3, z: -4 })
  })

  it('token faltante → null (se saltea)', () => {
    const item = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 })!, 'ch-x')
    expect(lightVisionOrigin(item, new Map())).toBeNull()
  })
})

describe('playerVision/collectWorldLights', () => {
  it('luz estática entra con su posición de item', () => {
    const light = createLightItem('torch', { x: 0.2, y: 0.2 }, MAP_W, MAP_H)!
    const [w] = collectWorldLights([light], new Map(), null)
    expect(w.x).toBeCloseTo(-3, 5)
    expect(w.z).toBeCloseTo(-3, 5)
    expect(w.directionDeg).toBeNull() // una antorcha normal no es un cono
  })

  it('luz adjunta se ancla al token, no al item', () => {
    const own = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-mine')
    const charPos = new Map([['ch-mine', { x: 3, z: -4 }]])
    const [w] = collectWorldLights([own], charPos, 'ch-mine')
    expect(w.x).toBe(3)
    expect(w.z).toBe(-4)
  })

  it('shareCarriedLights=false excluye las antorchas de otros tokens, no las del mapa', () => {
    const staticLight = createLightItem('lantern', { x: 0.2, y: 0.2 }, MAP_W, MAP_H)!
    const other = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-other')
    const charPos = new Map([['ch-other', { x: 6, z: 6 }]])
    const lights = collectWorldLights([staticLight, other], charPos, 'ch-mine', { shareCarriedLights: false })
    expect(lights).toHaveLength(1)
    expect(lights[0].x).toBeCloseTo(-3, 5) // la estática, en su sitio
    expect(lights[0].z).toBeCloseTo(-3, 5)
  })

  it('shareCarriedLights default true incluye antorchas propias y ajenas', () => {
    const own = attachLightToToken(createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-mine')
    const other = attachLightToToken(createLightItem('candle', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-other')
    const charPos = new Map([
      ['ch-mine', { x: 1, z: 1 }],
      ['ch-other', { x: -3, z: -2 }],
    ])
    expect(collectWorldLights([own, other], charPos, 'ch-mine')).toHaveLength(2)
  })

  it('el cono propio sigue el facing del token; el de otro token usa su direction', () => {
    const mine = attachLightToToken(createLightItem('lanternDir', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-mine')
    const other = attachLightToToken(createLightItem('lanternDir', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-other')
    const charPos = new Map([
      ['ch-mine', { x: 0, z: 0, rotation: 0 }],
      ['ch-other', { x: 5, z: 5 }],
    ])
    const lights = collectWorldLights([mine, other], charPos, 'ch-mine')
    const [own, ajena] = lights
    // facing rot 0 = +Z → el cono propio mira -90° (ver rotationToConeDirDeg)
    expect(own.directionDeg).toBeCloseTo(rotationToConeDirDeg(0), 5)
    expect(ajena.directionDeg).toBe(0) // la dirección configurada en el item
  })

  it('una luz invisible no ilumina', () => {
    const light = { ...createLightItem('torch', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, visible: false }
    expect(collectWorldLights([light], new Map(), 'ch-mine')).toHaveLength(0)
  })

  it('rotationToConeDirDeg: facing +Z (rot 0) → dir -90°, rot π → +90°', () => {
    expect(rotationToConeDirDeg(0)).toBeCloseTo(-90, 5)
    expect(rotationToConeDirDeg(Math.PI)).toBeCloseTo(90, 5)
    expect(rotationToConeDirDeg(Math.PI / 2)).toBeCloseTo(0, 5)
  })

  it('coherencia facing: el cono propio apunta al vector forward WASD (sin r, cos r)', () => {
    // El vector forward del personaje es (sin r, cos r); el cono tiene que ir
    // para allá, no para el otro lado del eje.
    const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2, (135 * Math.PI) / 180]
    for (const r of rotations) {
      const cone = attachLightToToken(createLightItem('lanternDir', { x: 0.5, y: 0.5 }, MAP_W, MAP_H)!, 'ch-mine')
      const charPos = new Map([['ch-mine', { x: 0, z: 0, rotation: r }]])
      const [w] = collectWorldLights([cone], charPos, 'ch-mine')
      const dir = (w.directionDeg! * Math.PI) / 180
      const fwd = { fx: Math.sin(r), fz: Math.cos(r) }
      // el cono en coordenadas de mundo es (cos dir, -sin dir): el -sin es el
      // mismo volteo de ejes que usa el mask de luz
      const dot = Math.cos(dir) * fwd.fx - Math.sin(dir) * fwd.fz
      expect(dot).toBeCloseTo(1, 5)
    }
  })
})