/**
 * Memoria de lo explorado: qué recuerda el jugador entre sesiones.
 *
 * Es estado del *espectador*, no del mundo: si fuera al backend habría que
 * decidir de quién es la memoria (¿del personaje? ¿del jugador? ¿de la party?)
 * y cómo viaja por el WS. Local-first es la identidad del producto, así que vive
 * en `localStorage`, por `(campaign_id, scene_id)`.
 *
 * Solo se acumula mientras la política del DM está encendida
 * (`Scene.remember_explored`). Al apagarla se deja de acumular: **lo ya
 * acumulado no se borra** (§4bis del plan).
 *
 * `secreto` le gana siempre: si no, "secreto" se filtra en cuanto el jugador
 * pasa una vez por la zona.
 */

/** Formato en disco: RLE de la máscara acumulada, en runs de celdas vistas. */
interface StoredMemory {
  v: 1
  cols: number
  rows: number
  /** `[longitud, ...]` en celdas por fila, alternando oculta/vista desde 0. */
  rle: number[]
  updatedAt: number
}

const KEY_PREFIX = 'roleito:explored'

function storageKey(campaignId: string, sceneId: string): string {
  return `${KEY_PREFIX}:${campaignId}:${sceneId}`
}

/** RLE → máscara (1 = vista). */
export function decodeRle(rle: number[], total: number): Uint8Array {
  const out = new Uint8Array(total)
  let i = 0
  let value = 0
  for (const run of rle) {
    if (value === 1) {
      for (let k = 0; k < run && i < total; k++) out[i++] = 1
    } else {
      i += run
    }
    value = value === 1 ? 0 : 1
  }
  return out
}

/**
 * Máscara → RLE. La niebla es mayormente ceros, así que esto pesa poco.
 *
 * El primer run es siempre de ceros, aunque la máscara empiece con vistas: si
 * no, el decoder no tiene forma de saber si arrancó en 0 o en 1 y una máscara
 * toda vista se guardaría como toda oculta.
 */
export function encodeRle(mask: Uint8Array): number[] {
  const rle: number[] = []
  let current = 0
  let run = 0
  for (let i = 0; i < mask.length; i++) {
    const v = mask[i] === 1 ? 1 : 0
    if (v === current) {
      run++
    } else {
      rle.push(run)
      current = v
      run = 1
    }
  }
  rle.push(run)
  return rle
}

export function loadExplored(
  campaignId: string | null,
  sceneId: string | null,
  cols: number,
  rows: number,
): Uint8Array | null {
  if (!campaignId || !sceneId) return null
  let raw: string | null
  try {
    raw = localStorage.getItem(storageKey(campaignId, sceneId))
  } catch {
    return null // localStorage bloqueado: la memoria es un extra, no un requisito
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as StoredMemory
    // Rejilla distinta (cambió la resolución o el tamaño del mapa): lo que se
    // guardó ya no describe este mapa, así que se descarta en vez de correrlo.
    if (parsed.v !== 1 || parsed.cols !== cols || parsed.rows !== rows) return null
    return decodeRle(parsed.rle, cols * rows)
  } catch {
    return null
  }
}

/** Une lo que se ve ahora con lo que ya se había visto. */
export function accumulateExplored(previous: Uint8Array | null, current: Uint8Array): Uint8Array {
  if (!previous || previous.length !== current.length) return Uint8Array.from(current)
  const out = new Uint8Array(current.length)
  for (let i = 0; i < current.length; i++) out[i] = current[i] === 1 || previous[i] === 1 ? 1 : 0
  return out
}

export function saveExplored(
  campaignId: string | null,
  sceneId: string | null,
  mask: Uint8Array,
  cols: number,
  rows: number,
): void {
  if (!campaignId || !sceneId) return
  const payload: StoredMemory = {
    v: 1,
    cols,
    rows,
    rle: encodeRle(mask),
    updatedAt: Date.now(),
  }
  try {
    localStorage.setItem(storageKey(campaignId, sceneId), JSON.stringify(payload))
  } catch {
    /* cuota llena o localStorage bloqueado: perder la memoria no rompe la partida */
  }
}

/** Borra lo acumulado de una escena. Lo usa el DM desde su toggle. */
export function forgetExplored(campaignId: string | null, sceneId: string | null): void {
  if (!campaignId || !sceneId) return
  try {
    localStorage.removeItem(storageKey(campaignId, sceneId))
  } catch {
    /* nada que hacer */
  }
}