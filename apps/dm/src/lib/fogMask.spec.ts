import { describe, expect, it } from 'vitest'
import { SceneItem, SceneLayer, ShapePolygon } from '@core/domain/types'
import { buildDmFogGrid, circlePoints, extractFogRegions, fogBrushRadius, fogItemMode, isFogItem, pointInPolygon, toggleZoneFog } from './fogMask'

function fogItem(id: string, revealed: boolean, points: number[], zIndex = 0): SceneItem {
  return {
    id,
    name: 'Fog',
    x: 0,
    y: 0,
    zIndex,
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
    layer: SceneLayer.FOG,
    shape: { type: 'polygon', points, fill: '#000000' },
    metadata: { type: 'fog', fogType: 'static', revealed },
  }
}

function strokeItem(id: string, points: number[], brushRadius: number, mode?: string): SceneItem {
  const item = fogItem(id, false, points)
  item.metadata = {
    ...(item.metadata as object),
    brushRadius,
    ...(mode ? { mode } : {}),
  } as typeof item.metadata
  return item
}

describe('fogMask/buildDmFogGrid', () => {
  const COLS = 20
  const ROWS = 20

  it('sin `mode`, el item viejo se lee por `revealed` (false=cover, true=reveal)', () => {
    // Los items de antes de los 3 modos no tienen `mode`, y `revealed: true`
    // significaba "esto está descubierto" (un agujero en la niebla).
    const items = [
      fogItem('f1', false, [0.25, 0.25, 0.75, 0.25, 0.75, 0.75, 0.25, 0.75]),
      fogItem('f2', true, [0.0, 0.0, 0.25, 0.0, 0.25, 0.25, 0.0, 0.25]),
    ]
    const grid = buildDmFogGrid(items, COLS, ROWS)
    expect(grid[10][10]).toBe('cover')
    expect(grid[2][2]).toBe('reveal')
    expect(grid[10][19]).toBeNull()
    expect(grid.length).toBe(ROWS)
    expect(grid[0].length).toBe(COLS)
  })

  it('`mode` manda sobre `revealed` cuando está', () => {
    const item = fogItem('f3', false, [0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.0, 0.5])
    item.metadata = { ...(item.metadata as object), mode: 'secret' } as typeof item.metadata
    const grid = buildDmFogGrid([item], COLS, ROWS)
    expect(grid[5][5]).toBe('secret')
  })

  it('una región revelada queda reveal solo en su polígono', () => {
    const items = [fogItem('f4', true, [0.0, 0.0, 0.5, 0.0, 0.5, 0.5, 0.0, 0.5])]
    const grid = buildDmFogGrid(items, COLS, ROWS)
    expect(grid[5][5]).toBe('reveal')
    expect(grid[15][15]).toBeNull()
  })

  it('sin items de niebla la rejilla es toda null', () => {
    const grid = buildDmFogGrid([], COLS, ROWS)
    expect(grid.every((row) => row.every((c) => c === null))).toBe(true)
  })

  it('un item que no es fog no pinta nada', () => {
    const notFog: SceneItem = { ...fogItem('w', true, [0, 0, 1, 0, 1, 1]), metadata: { type: 'wall' } as unknown as SceneItem['metadata'] }
    const grid = buildDmFogGrid([notFog], COLS, ROWS)
    expect(grid.every((row) => row.every((c) => c === null))).toBe(true)
  })
})

describe('fogMask/trazo de pincel', () => {
  const COLS = 100
  const ROWS = 100

  it('cubre la línea central y el grosor, y no lo que está afuera', () => {
    // Trazo horizontal por y=0.5, radio 0.1. Corto a propósito: con los topes
    // redondos un trazo largo cubre también las celdas de los bordes.
    const grid = buildDmFogGrid([strokeItem('s1', [0.3, 0.5, 0.7, 0.5], 0.1)], COLS, ROWS)
    expect(grid[50][50]).toBe('cover') // sobre la línea
    expect(grid[45][50]).toBe('cover') // dentro del radio (0.05)
    expect(grid[55][50]).toBe('cover')
    expect(grid[38][50]).toBeNull() // 0.12 de distancia: afuera
    expect(grid[50][15]).toBeNull() // antes del arranque
    expect(grid[50][85]).toBeNull() // después del final
  })

  it('une dos puntos con una tira continua, no dos discos sueltos', () => {
    // Dos puntos muy separados: tiene que haber niebla en el medio.
    const grid = buildDmFogGrid([strokeItem('s2', [0.1, 0.5, 0.9, 0.5], 0.05)], COLS, ROWS)
    for (const c of [15, 30, 45, 60, 75, 85]) expect(grid[50][c]).toBe('cover')
  })

  it('un trazo de un solo punto es un disco', () => {
    const grid = buildDmFogGrid([strokeItem('s3', [0.5, 0.5], 0.1)], COLS, ROWS)
    expect(grid[50][50]).toBe('cover')
    expect(grid[45][50]).toBe('cover')
    expect(grid[38][50]).toBeNull()
  })

  it('respeta el modo y la precedencia: secret gana sobre cover', () => {
    const grid = buildDmFogGrid(
      [strokeItem('s4', [0.2, 0.5, 0.8, 0.5], 0.15, 'cover'), strokeItem('s5', [0.5, 0.3, 0.5, 0.7], 0.15, 'secret')],
      COLS,
      ROWS,
    )
    expect(grid[50][50]).toBe('secret')
    expect(grid[50][10]).toBe('cover')
  })

  it('el trazo cubre LAS MISMAS celdas que sellarlo con un item por punto', () => {
    // El motivo del cambio no es el área (que es idéntica) sino el conteo de
    // items: 25 puntos de mouse eran 25 items, 25 meshes y 25 filas de
    // `items_json` en el snapshot de cada jugador. Acá va UN item.
    const samples = 25;
    const sello: SceneItem[] = [];
    for (let i = 0; i < samples; i++) {
      sello.push(fogItem(`k${i}`, false, circlePoints(0.1 + (0.8 * i) / (samples - 1), 0.5, 0.04)));
    }
    const area = (grid: (string | null)[][]) => grid.flat().filter((c) => c !== null).length;
    const trazo = buildDmFogGrid([strokeItem('trazo', [0.1, 0.5, 0.9, 0.5], 0.04)], COLS, ROWS);
    expect(area(trazo)).toBe(area(buildDmFogGrid(sello, COLS, ROWS)));
  })

  it('fogBrushRadius: null en un polígono viejo, número en un trazo', () => {
    expect(fogBrushRadius(fogItem('p', false, circlePoints(0.5, 0.5, 0.1)))).toBeNull()
    expect(fogBrushRadius(strokeItem('t', [0.1, 0.5, 0.9, 0.5], 0.08))).toBe(0.08)
  })

  it('extractFogRegions pasa el brushRadius para que el DM lo dibuje con grosor', () => {
    const regions = extractFogRegions([strokeItem('t2', [0.1, 0.5, 0.9, 0.5], 0.08)])
    expect(regions[0].brushRadius).toBe(0.08)
    expect(regions[0].points).toEqual([0.1, 0.5, 0.9, 0.5])
  })
})

describe('fogMask/extractFogRegions', () => {
  it('un secreto no se rellena en el mapa del DM, pero tampoco desaparece', () => {
    // Si el DM se lo dibujara como niebla se ciega en su propia zona, pero si no
    // se dibuja tampoco tiene feedback: pintaba en `Secreto` y no veía nada.
    const secret = fogItem('f-secret', false, [0.1, 0.1, 0.4, 0.1, 0.4, 0.4, 0.1, 0.4])
    secret.metadata = { ...(secret.metadata as object), mode: 'secret' } as typeof secret.metadata
    const cover = fogItem('f-cover', false, [0.5, 0.5, 0.8, 0.5, 0.8, 0.8, 0.5, 0.8])
    const regions = extractFogRegions([secret, cover])
    expect(regions.map((r) => r.id)).toEqual(['f-secret', 'f-cover'])
    expect(regions[0].secret).toBe(true)
    expect(regions[1].secret).toBe(false)
  })

  it('fogItemMode: mode manda, y sin mode se lee revealed', () => {
    const old = fogItem('a', true, [0, 0, 0.1, 0, 0.1, 0.1])
    expect(fogItemMode(old)).toBe('reveal')
    const oldHidden = fogItem('b', false, [0, 0, 0.1, 0, 0.1, 0.1])
    expect(fogItemMode(oldHidden)).toBe('cover')
    const withMode = fogItem('c', true, [0, 0, 0.1, 0, 0.1, 0.1])
    withMode.metadata = { ...(withMode.metadata as object), mode: 'secret' } as typeof withMode.metadata
    expect(fogItemMode(withMode)).toBe('secret')
  })
})

describe('fogMask/roundtrip', () => {
  it('extractFogRegions filtra y mapea los items de niebla', () => {
    const items = [
      fogItem('f1', true, circlePoints(0.5, 0.5, 0.1)),
      fogItem('f2', false, [0.1, 0.1, 0.2, 0.1, 0.2, 0.2, 0.1, 0.2]),
      { ...fogItem('f3', true, [0.4, 0.4, 0.4, 0.5]), id: 'short' },
      {
        id: 'wall-x',
        name: 'W',
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
        layer: 1,
        shape: { type: 'line' as const, points: [0, 0, 1, 1], stroke: '#333', strokeWidth: 1 },
        metadata: { type: 'wall' as const, wallType: 'solid' as const, material: 'stone' as const, height: 1, thickness: 0.1, opacity: 0, lineOfSight: true, movement: true, soundOcclusion: 0 },
      },
    ]
    const regions = extractFogRegions(items)
    expect(regions.map((r) => r.id)).toEqual(['f1', 'f2'])
    expect(regions[0].revealed).toBe(true)
    expect(regions[0].points).toHaveLength(64)
    expect(regions[1].revealed).toBe(false)
  })

  it('isFogItem distingue niebla de otros items', () => {
    expect(isFogItem(fogItem('f', true, circlePoints(0.5, 0.5, 0.1)))).toBe(true)
    expect(isFogItem({ ...fogItem('f', true, circlePoints(0.5, 0.5, 0.1)), metadata: { type: 'zone', zoneType: 'polygon', origin: 'manual', touchedByDm: false, shadowOnly: false, fillColor: '#111', fillOpacity: 0.3, portals: [] } as never })).toBe(false)
  })

  it('circlePoints genera circulo normalizado con radio dado', () => {
    const pts = circlePoints(0.5, 0.5, 0.1, 8)
    expect(pts).toHaveLength(16)
    for (let i = 0; i < pts.length; i += 2) {
      const dx = pts[i] - 0.5
      const dy = pts[i + 1] - 0.5
      const r = Math.hypot(dx, dy)
      expect(r).toBeCloseTo(0.1, 5)
    }
    const north = circlePoints(0.5, 0.5, 0.1, 4)
    expect(north[3]).toBeCloseTo(0.5 + 0.1, 5)
  })

  it('pointInPolygon detecta interior/exterior/borde', () => {
    const ring = [0.2, 0.2, 0.8, 0.2, 0.8, 0.8, 0.2, 0.8]
    expect(pointInPolygon(0.5, 0.5, ring)).toBe(true)
    expect(pointInPolygon(0.1, 0.1, ring)).toBe(false)
    expect(pointInPolygon(0.9, 0.9, ring)).toBe(false)
    expect(pointInPolygon(0.2, 0.5, ring)).toBe(true)
  })

  it('toggleZoneFog: zona ya cubierta → reveal (borra fog dentro)', () => {
    const covered = fogItem('fog-in', false, circlePoints(0.5, 0.5, 0.1))
    const outside = fogItem('fog-out', false, circlePoints(0.1, 0.1, 0.08))
    const res = toggleZoneFog([covered, outside], 'zone-a', [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]])
    expect(res.applied).toBe('reveal')
    expect(res.items.map((i) => i.id)).toEqual(['fog-out'])
  })

  it('toggleZoneFog: zona limpia → hide (crea fog de la zona)', () => {
    const res = toggleZoneFog([], 'zone-a', [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]])
    expect(res.applied).toBe('hide')
    const added = res.items.find((i) => i.id.includes('fog-zone'))
    expect(added).toBeDefined()
    expect((added?.metadata as { revealed: boolean }).revealed).toBe(false)
    // Modo `secret`: con `cover` la herramienta no tapaba nada para el jugador.
    expect((added?.metadata as { mode?: string }).mode).toBe('secret')
    expect((added?.shape as ShapePolygon | undefined)?.points).toEqual([0.4, 0.4, 0.6, 0.4, 0.6, 0.6, 0.4, 0.6])
    expect(((added?.shape as ShapePolygon | undefined)?.points ?? []).length % 2).toBe(0)
    expect(added?.layer).toBe(SceneLayer.FOG)
  })

  it('toggleZoneFog: poligono invalido → none sin cambios', () => {
    const res = toggleZoneFog([], 'zone-b', [])
    expect(res.applied).toBe('none')
    expect(res.items).toHaveLength(0)
  })
})