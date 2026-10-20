import { describe, expect, it } from 'vitest'
import { PerceptionMask } from './playerPerception'
import { cellCenterX } from './playerPerception'
import { computeSensed, sensedIds } from './playerSense'

const MAP = { width: 10, height: 10 }
const COLS = 20
const ROWS = 20
const RES = MAP.width / COLS

const me = { sceneCharId: 'sc-me', x: 0, z: 0 }

function blindMask(): PerceptionMask {
  return { cols: COLS, rows: ROWS, data: new Float32Array(COLS * ROWS) }
}

function maskSeeingOnly(x: number, z: number): PerceptionMask {
  const m = blindMask()
  const col = Math.floor((x + MAP.width / 2) / RES)
  const row = Math.floor((z + MAP.height / 2) / RES)
  m.data[row * COLS + col] = 1
  return m
}

const goblin = { sceneCharId: 'sc-goblin', x: 3, z: 0 }
const otherMe = { ...me }

function senseWith(vision: { type: string; range: number }, mask: PerceptionMask | null, chars = [goblin, otherMe]) {
  return computeSensed(chars, 'sc-me', { x: me.x, z: me.z }, vision, mask, MAP)
}

function maskSeesHelper(mask: PerceptionMask, x: number, z: number): boolean {
  const res = MAP.width / mask.cols
  const col = Math.floor((x + MAP.width / 2) / res)
  const row = Math.floor((z + MAP.height / 2) / res)
  return mask.data[row * mask.cols + col] >= 0.5
}

describe('playerSense/computeSensed', () => {
  it('blindsight detecta una criatura a rango que el jugador no ve', () => {
    const sensed = senseWith({ type: 'blindsight', range: 6 }, blindMask())
    expect(sensedIds(sensed)).toEqual(new Set(['sc-goblin']))
  })

  it('tremorsense y truesight detectan igual que blindsight', () => {
    for (const type of ['tremorsense', 'truesight']) {
      expect(sensedIds(senseWith({ type, range: 6 }, blindMask()))).toEqual(new Set(['sc-goblin']))
    }
  })

  it('sin mascara (worker sin responder) no detecta nada', () => {
    expect(senseWith({ type: 'blindsight', range: 6 }, null)).toEqual([])
  })

  it('normal o darkvision no detectan criaturas', () => {
    for (const type of ['normal', 'darkvision']) {
      expect(senseWith({ type, range: 6 }, blindMask())).toEqual([])
    }
  })

  it('lo que el jugador ya ve no se marca como detectado', () => {
    const mask = maskSeeingOnly(goblin.x, goblin.z)
    expect(senseWith({ type: 'blindsight', range: 6 }, mask)).toEqual([])
  })

  it('fuera de vision_range no se detecta', () => {
    const far = { sceneCharId: 'sc-far', x: 8, z: 0 }
    expect(sensedIds(senseWith({ type: 'blindsight', range: 6 }, blindMask(), [far]))).toEqual(new Set())
  })

  it('el propio personaje nunca se detecta a si mismo', () => {
    expect(sensedIds(senseWith({ type: 'blindsight', range: 6 }, blindMask(), [otherMe]))).toEqual(new Set())
  })

  it('los tokens llegan sin el flag visible (el backend ya filtra los ocultos)', () => {
    const plain = { sceneCharId: 'sc-plain', x: 2, z: 0 }
    expect(sensedIds(senseWith({ type: 'blindsight', range: 6 }, blindMask(), [plain]))).toEqual(new Set(['sc-plain']))
  })

  it('la mascara muestreada usa el centro de la celda de mundo', () => {
    const mask = maskSeeingOnly(2.75, 0)
    const grid = { cols: COLS, rows: ROWS, resolution: RES, mapWidth: MAP.width, mapHeight: MAP.height }
    const col = Math.floor((2.75 + MAP.width / 2) / RES)
    expect(cellCenterX(grid, col)).toBeCloseTo(2.75, 5)
    expect(maskSeesHelper(mask, 2.75, 0)).toBe(true)
    expect(maskSeesHelper(mask, 2.9, 0)).toBe(true)
  })
})
