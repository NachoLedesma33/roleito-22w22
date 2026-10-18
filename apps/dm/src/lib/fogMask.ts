import { SceneItem, FogMetadata, SceneLayer, ShapePolygon, DmFogMode } from '@core/domain/types'

export type { DmFogMode }

export interface FogRegion {
  id: string
  points: number[]
  revealed: boolean
  zIndex: number
  /**
   * Si está, `points` es la línea central del trazo y esto el radio: hay que
   * dibujarlo con grosor, no rellenarlo.
   */
  brushRadius?: number
  /**
   * Solo para el mapa del DM. Un secreto no se pinta como niebla (si el DM se
   * dibujara su propia zona secreta se ciega), pero tampoco puede desaparecer:
   * sin esta marca el DM pintaba en `Secreto` y no veía absolutamente nada, y
   * no hay forma de saber si el pincel agarró o no. Se dibuja como contorno.
   */
  secret?: boolean
}

/**
 * Rol de niebla por celda; `null` donde el DM no pintó.
 *
 * Antes esto se peleaba con la visión del jugador por `zIndex` y perdía siempre:
 * `FogOverlay` pintaba las regiones en orden y la visión del jugador iba a 1000
 * contra el 0 de la niebla, así que perforaba siempre. Ahora la niebla entra como
 * **dato** de la percepción del jugador (`playerPerception.ts`) y no compite con
 * nada. Ver `engineering/PLAN-VISION-PERCEPCION.md` §3.
 */
export type DmFogGrid = (DmFogMode | null)[][]

/**
 * El modo de un item de niebla, tolero a los items viejos.
 *
 * Antes el único dato era `revealed: boolean` y significaba "esto está
 * descubierto" (un agujero en la niebla): `false` era penumbra y `true` era
 * revelar. Los items de antes de los 3 modos se leen con esa regla.
 */
export function fogItemMode(item: SceneItem): DmFogMode {
  const meta = item.metadata as FogMetadata
  return meta.mode ?? ((meta.revealed ?? false) ? 'reveal' : 'cover')
}

/**
 * El radio del pincel de un item, o `null` si es un polígono relleno.
 * La presencia del campo ES la marca: los items viejos no lo tienen.
 */
export function fogBrushRadius(item: SceneItem): number | null {
  const meta = item.metadata as FogMetadata
  const r = meta.brushRadius
  return typeof r === 'number' && r > 0 ? r : null
}

/**
 * Rasteriza un segmento con grosor en la rejilla, yendo solo sobre su bounding
 * box. Importante: un trazo largo tiene el bbox de todo el mapa, así que probar
 * celda por celda contra TODOS los segmentos sería O(celdas × segmentos) y peor
 * que los discos sueltos que reemplaza.
 */
function stampSegment(
  grid: DmFogGrid,
  cols: number,
  rows: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius: number,
  mode: DmFogMode,
) {
  const c0 = Math.max(0, Math.floor((Math.min(ax, bx) - radius) * cols))
  const c1 = Math.min(cols - 1, Math.ceil((Math.max(ax, bx) + radius) * cols))
  const r0 = Math.max(0, Math.floor((Math.min(ay, by) - radius) * rows))
  const r1 = Math.min(rows - 1, Math.ceil((Math.max(ay, by) + radius) * rows))
  const ex = bx - ax
  const ey = by - ay
  const len2 = ex * ex + ey * ey
  const r2 = radius * radius
  for (let r = r0; r <= r1; r++) {
    const row = grid[r]
    const ny = (r + 0.5) / rows
    for (let c = c0; c <= c1; c++) {
      if (row[c] === 'secret' || row[c] === 'reveal') continue
      const dx = (c + 0.5) / cols - ax
      const dy = ny - ay
      const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, (dx * ex + dy * ey) / len2))
      if ((dx - ex * t) ** 2 + (dy - ey * t) ** 2 <= r2) row[c] = mode
    }
  }
}

/**
 * La niebla del DM como rejilla de roles, en la misma convención que la máscara
 * del LoS (`[row][col]` con el mapa centrado en el origen).
 */
export function buildDmFogGrid(items: SceneItem[], cols: number, rows: number): DmFogGrid {
  const grid: DmFogGrid = Array.from({ length: rows }, () => Array<DmFogMode | null>(cols).fill(null))
  for (const item of items) {
    if (item.metadata.type !== 'fog') continue
    const shape = item.shape
    if (!shape || shape.type !== 'polygon' || shape.points.length < 2) continue
    const pts = shape.points
    const mode = fogItemMode(item)
    const radius = fogBrushRadius(item)

    if (radius !== null) {
      // Trazo: un disco por segmento. Un solo punto es un segmento de largo 0.
      for (let i = 0; i + 1 < pts.length; i += 2) {
        const ax = pts[i]
        const ay = pts[i + 1]
        const hasNext = i + 3 < pts.length
        stampSegment(grid, cols, rows, ax, ay, hasNext ? pts[i + 2] : ax, hasNext ? pts[i + 3] : ay, radius, mode)
      }
      continue
    }

    if (pts.length < 6) continue
    // Bounding box normalizado: sin esto cada polígono se prueba contra toda la
    // rejilla, y son miles de celdas por celda.
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i])
      maxX = Math.max(maxX, pts[i])
      minY = Math.min(minY, pts[i + 1])
      maxY = Math.max(maxY, pts[i + 1])
    }
    const c0 = Math.max(0, Math.floor(minX * cols))
    const c1 = Math.min(cols - 1, Math.ceil(maxX * cols))
    const r0 = Math.max(0, Math.floor(minY * rows))
    const r1 = Math.min(rows - 1, Math.ceil(maxY * rows))
    for (let r = r0; r <= r1; r++) {
      const ny = (r + 0.5) / rows
      const row = grid[r]
      for (let c = c0; c <= c1; c++) {
        if (row[c] === 'secret' || row[c] === 'reveal') continue
        if (pointInPolygon((c + 0.5) / cols, ny, pts)) row[c] = mode
      }
    }
  }
  return grid
}

export function extractFogRegions(items: SceneItem[]): FogRegion[] {
  const regions: FogRegion[] = []
  for (const item of items) {
    if (item.metadata.type !== 'fog') continue
    const shape = item.shape
    if (!shape || shape.type !== 'polygon') continue
    const radius = fogBrushRadius(item)
    // Un trazo puede ser de un solo segmento (2 puntos); un polígono relleno
    // necesita 3 para cerrar un área.
    if (shape.points.length < (radius !== null ? 2 : 6)) continue
    const mode = fogItemMode(item)
    regions.push({
      id: item.id,
      points: shape.points,
      revealed: (item.metadata as FogMetadata).revealed ?? false,
      zIndex: item.zIndex,
      secret: mode === 'secret',
      ...(radius !== null ? { brushRadius: radius } : {}),
    })
  }
  return regions
}

export function circlePoints(cx: number, cy: number, radius: number, segments = 32): number[] {
  const pts: number[] = []
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2
    pts.push(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius)
  }
  return pts
}

export function isFogItem(item: SceneItem): boolean {
  return item.metadata.type === 'fog'
}

export function pointInPolygon(px: number, py: number, ring: number[]): boolean {
  let inside = false
  const n = ring.length / 2
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i * 2]
    const yi = ring[i * 2 + 1]
    const xj = ring[j * 2]
    const yj = ring[j * 2 + 1]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

export function zoneCentroid(points: number[]): { x: number; y: number } {
  let sx = 0
  let sy = 0
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    sx += points[i * 2]
    sy += points[i * 2 + 1]
  }
  return { x: sx / Math.max(1, n), y: sy / Math.max(1, n) }
}

export interface ZoneFogToggle {
  items: SceneItem[]
  applied: 'reveal' | 'hide' | 'none'
}

export function toggleZoneFog(items: SceneItem[], zoneId: string, zonePolygon: [number, number][]): ZoneFogToggle {
  const poly = zonePolygon.length === 0 ? [] : zonePolygon.flat()
  const fogIds = new Set(
    items
      .filter((item) => isFogItem(item) && item.shape?.type === 'polygon')
      .filter((item) => {
        const c = zoneCentroid((item.shape as ShapePolygon).points)
        return pointInPolygon(c.x, c.y, poly)
      })
      .map((item) => item.id),
  )
  if (fogIds.size > 0) {
    return { items: items.filter((item) => !fogIds.has(item.id)), applied: 'reveal' }
  }
  if (poly.length < 6) return { items, applied: 'none' }
  const fogItem: SceneItem = {
    id: `fog-zone-${zoneId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: 'Fog',
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
    layer: SceneLayer.FOG,
    shape: { type: 'polygon', points: poly, fill: '#000000' },
    // `secret` y no nada: `cover` es penumbra y no le gana a nada, asi que la
    // herramienta "Niebla de zona" tapaba la zona y el jugador no veía cambio
    // ninguno. Cubrir una zona tiene que tapar de verdad.
    metadata: { type: 'fog', fogType: 'static', mode: 'secret', revealed: false },
  }
  return { items: [...items, fogItem], applied: 'hide' }
}