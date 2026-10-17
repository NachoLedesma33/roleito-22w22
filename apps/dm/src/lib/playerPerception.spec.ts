import { describe, expect, it } from 'vitest'
import { VisionConfig } from '@core/domain/types'
import {
  composePerceptionMask,
  LIGHT_THRESHOLD,
  PerceptionGrid,
  perceptionAlpha,
} from './playerPerception'
import { AMBIENT_RADIUS } from './playerVision'
import type { DmFogMode } from './fogMask'

/** Mapa de 10x10 centrado en el origen, celda de 0.5 (como la máscara del LoS). */
const GRID: PerceptionGrid = { cols: 20, rows: 20, resolution: 0.5, mapWidth: 10, mapHeight: 10 }

function cell(x: number, z: number, grid: PerceptionGrid = GRID): { col: number; row: number } {
  return {
    col: Math.floor((x + grid.mapWidth / 2) / grid.resolution),
    row: Math.floor((z + grid.mapHeight / 2) / grid.resolution),
  }
}

const CHAR = { x: 0, z: 0 }

const normal: VisionConfig = { type: 'normal', range: 6, dimRange: 3 }
const darkvision: VisionConfig = { type: 'darkvision', range: 6 }

/** Todo el mapa con luz y sin obstrucción; se recorta celda por celda en cada test. */
function openMask(): boolean[][] {
  return Array.from({ length: GRID.rows }, () => Array<boolean>(GRID.cols).fill(true))
}

/** Luz constante: 0 = oscuridad total. */
const light = (level: number) => () => level

/** Luz solo en un círculo alrededor de (x,z), como una antorcha. */
function torchAt(x: number, z: number, radius: number, level: number) {
  return (px: number, pz: number) => (Math.hypot(px - x, pz - z) <= radius ? level : 0)
}

describe('playerPerception/perceptionAlpha', () => {
  it('un normal a oscuras ve exactamente el círculo ambiente y el resto negro', () => {
    // §4bis.2: el parche de 0.15 no se toca, así que tiene que seguir siendo
    // medible: misma celda, mismo radio, antes y después de este cambio.
    // Rejilla fina a propósito: con celda de 0.5 no hay ni un centro de celda
    // dentro de un radio de 0.15.
    const fine: PerceptionGrid = { cols: 200, rows: 200, resolution: 0.05, mapWidth: 10, mapHeight: 10 }
    const los: boolean[][] = Array.from({ length: fine.rows }, () => Array<boolean>(fine.cols).fill(true))
    const at = (x: number) => cell(x, 0, fine)
    const base = { grid: fine, los, lightAt: light(0), charX: 0, charZ: 0, vision: normal }
    const inside = at(AMBIENT_RADIUS * 0.5)
    const outside = at(AMBIENT_RADIUS + 0.1)
    expect(inside.col).toBeLessThan(fine.cols)
    expect(outside.col).toBeLessThan(fine.cols)
    expect(perceptionAlpha(base, inside.col, inside.row)).toBe(1)
    expect(perceptionAlpha(base, outside.col, outside.row)).toBe(0)
  })

  it('el umbral de luz decide para una visión normal', () => {
    const los = openMask()
    const target = cell(3, 0) // 3 unidades: dentro del rango, fuera del ambiente
    const dim = perceptionAlpha({ grid: GRID, los, lightAt: light(LIGHT_THRESHOLD - 0.05), charX: 0, charZ: 0, vision: normal }, target.col, target.row)
    const lit = perceptionAlpha({ grid: GRID, los, lightAt: light(LIGHT_THRESHOLD + 0.05), charX: 0, charZ: 0, vision: normal }, target.col, target.row)
    expect(dim).toBe(0)
    expect(lit).toBeGreaterThan(0)
  })

  it('la luz no habilita lo que está fuera del rango de visión', () => {
    // Luz al 100% pero celda en la esquina (6.7 unidades) con vision_range 6: la
    // luz describe el mundo, la visión describe al personaje.
    const los = openMask()
    const far = cell(4.75, 4.75)
    expect(perceptionAlpha({ grid: GRID, los, lightAt: light(1), charX: 0, charZ: 0, vision: normal }, far.col, far.row)).toBe(0)
  })

  it('darkvision ve en la oscuridad hasta su rango', () => {
    const los = openMask()
    const inside = cell(4, 0)
    const outside = cell(4.75, 4.75)
    expect(perceptionAlpha({ grid: GRID, los, lightAt: light(0), charX: 0, charZ: 0, vision: darkvision }, inside.col, inside.row)).toBe(1)
    expect(perceptionAlpha({ grid: GRID, los, lightAt: light(0), charX: 0, charZ: 0, vision: darkvision }, outside.col, outside.row)).toBe(0)
  })

  it('sin obstrucción recorta aunque haya luz y esté en rango', () => {
    const los = openMask()
    const target = cell(2, 0)
    los[target.row][target.col] = false // un muro en medio
    expect(perceptionAlpha({ grid: GRID, los, lightAt: light(1), charX: 0, charZ: 0, vision: darkvision }, target.col, target.row)).toBe(0)
  })

  it('"secreto" del DM tapa lo iluminado y "revelar" muestra lo oscuro', () => {
    const los = openMask()
    const litCell = cell(3, 0)
    const darkCell = cell(4, 4)
    const base = { grid: GRID, los, charX: 0, charZ: 0, vision: darkvision }
    const fog = (mode: DmFogMode) => {
      const m: (DmFogMode | null)[][] = Array.from({ length: GRID.rows }, () => Array<DmFogMode | null>(GRID.cols).fill(null))
      m[litCell.row][litCell.col] = mode
      m[darkCell.row][darkCell.col] = mode
      return m
    }
    expect(perceptionAlpha({ ...base, lightAt: light(1), dmFog: fog('secret') }, litCell.col, litCell.row)).toBe(0)
    expect(perceptionAlpha({ ...base, lightAt: light(0), dmFog: fog('secret') }, darkCell.col, darkCell.row)).toBe(0)
    expect(perceptionAlpha({ ...base, lightAt: light(0), dmFog: fog('reveal') }, darkCell.col, darkCell.row)).toBe(1)
  })

  it('"secreto" le gana a la luz Y a la visión en la oscuridad', () => {
    // Es la diferencia con "cubrir": la zona queda negra para el jugador sea cual
    // sea su percepción. Es el único modo que "oculta de verdad".
    const los = openMask()
    const lit = cell(3, 0)
    const fog: (DmFogMode | null)[][] = Array.from({ length: GRID.rows }, () => Array<DmFogMode | null>(GRID.cols).fill(null))
    fog[lit.row][lit.col] = 'secret'
    const base = { grid: GRID, los, charX: 0, charZ: 0, vision: darkvision }
    expect(perceptionAlpha({ ...base, lightAt: light(1), dmFog: fog }, lit.col, lit.row)).toBe(0)
    expect(perceptionAlpha({ ...base, lightAt: light(0), dmFog: fog }, lit.col, lit.row)).toBe(0)
    // y una celda vecina sin pintar se sigue viendo igual
    expect(perceptionAlpha({ ...base, lightAt: light(1), dmFog: fog }, lit.col + 1, lit.row)).toBeGreaterThan(0)
  })

  it('"cubrir" no cambia lo que el personaje percibe', () => {
    const los = openMask()
    const target = cell(3, 0)
    const covered: ('cover' | null)[][] = Array.from({ length: GRID.rows }, () => Array<null | 'cover'>(GRID.cols).fill('cover'))
    expect(perceptionAlpha({ grid: GRID, los, lightAt: light(1), charX: 0, charZ: 0, vision: darkvision, dmFog: covered }, target.col, target.row)).toBe(1)
  })

  it('"revelar" gana incluso a la obstrucción', () => {
    const los = openMask()
    const target = cell(3, 0)
    los[target.row][target.col] = false
    const revealed: ('reveal' | null)[][] = Array.from({ length: GRID.rows }, () => Array<null | 'reveal'>(GRID.cols).fill(null))
    revealed[target.row][target.col] = 'reveal'
    expect(perceptionAlpha({ grid: GRID, los, lightAt: light(0), charX: 0, charZ: 0, vision: darkvision, dmFog: revealed }, target.col, target.row)).toBe(1)
  })

  it('dimRange atenúa el borde de la visión en vez de cortarlo en seco', () => {
    const los = openMask()
    const inner = cell(2, 0) // dentro del plateau (dimRange 3)
    const edge = cell(4, 0) // entre dimRange y range
    const outside = cell(4.75, 4.75) // más allá del rango
    const args = { grid: GRID, los, lightAt: light(1), charX: 0, charZ: 0, vision: normal }
    expect(perceptionAlpha(args, inner.col, inner.row)).toBe(1)
    const edgeAlpha = perceptionAlpha(args, edge.col, edge.row)
    expect(edgeAlpha).toBeGreaterThan(0)
    expect(edgeAlpha).toBeLessThan(1)
    expect(perceptionAlpha(args, outside.col, outside.row)).toBe(0)
  })

  it('sin dimRange el borde es seco (darkvision)', () => {
    const los = openMask()
    const args = { grid: GRID, los, lightAt: light(1), charX: 0, charZ: 0, vision: { type: 'darkvision' as const, range: 6 } }
    expect(perceptionAlpha(args, 0, 0)).toBe(0) // esquina lejana
    const near = cell(1, 0)
    expect(perceptionAlpha(args, near.col, near.row)).toBe(1)
  })

  it('una antorcha ilumina lo que alcanza y no lo de enfrente del muro', () => {
    // El recorte por muro lo hace el LoS (los); el mask solo no lo pisa.
    const los = openMask()
    const behind = cell(-3, 0)
    los[behind.row][behind.col] = false
    expect(perceptionAlpha({ grid: GRID, los, lightAt: torchAt(3, 0, 6, 0.8), charX: 0, charZ: 0, vision: darkvision }, behind.col, behind.row)).toBe(0)
    const lit = cell(3, 0)
    expect(perceptionAlpha({ grid: GRID, los, lightAt: torchAt(3, 0, 6, 0.8), charX: 0, charZ: 0, vision: darkvision }, lit.col, lit.row)).toBe(1)
  })

  it('los tipos sin implementar se comportan como normal (plan §6)', () => {
    const los = openMask()
    const target = cell(3, 0)
    for (const type of ['blindsight', 'tremorsense', 'truesight'] as const) {
      expect(perceptionAlpha({ grid: GRID, los, lightAt: light(0), charX: 0, charZ: 0, vision: { type, range: 6 } }, target.col, target.row)).toBe(0)
      expect(perceptionAlpha({ grid: GRID, los, lightAt: light(1), charX: 0, charZ: 0, vision: { type, range: 6 } }, target.col, target.row)).toBe(1)
    }
  })
})

describe('playerPerception/composePerceptionMask', () => {
  it('devuelve un alpha por celda, en el mismo orden que la máscara del LoS', () => {
    const los = openMask()
    const input = {
      grid: GRID,
      los,
      lightAt: torchAt(0, 0, 2, 0.9),
      charX: CHAR.x,
      charZ: CHAR.z,
      vision: darkvision,
    }
    const alpha = composePerceptionMask(input)
    expect(alpha).toBeInstanceOf(Float32Array)
    expect(alpha.length).toBe(GRID.rows * GRID.cols)
    for (const [col, row] of [[0, 0], [10, 10], [19, 19], [10, 0]]) {
      expect(alpha[row * GRID.cols + col]).toBeCloseTo(perceptionAlpha(input, col, row), 5)
    }
  })

  it('la máscara completa es 1 dentro de la visión y 0 fuera', () => {
    const los = openMask()
    const alpha = composePerceptionMask({
      grid: GRID,
      los,
      lightAt: light(0),
      charX: 0,
      charZ: 0,
      vision: darkvision,
    })
    const far = cell(4.75, 4.75)
    expect(alpha[far.row * GRID.cols + far.col]).toBe(0)
    const near = cell(2, 2)
    expect(alpha[near.row * GRID.cols + near.col]).toBe(1)
  })
})
