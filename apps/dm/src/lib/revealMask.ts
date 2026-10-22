/**
 * La mascara de percepcion del jugador, empaquetada para mandarla al DM.
 *
 * El DM necesita saber QUE esta viendo el jugador ahora (N3: ve a un jugador
 * sin luz solo si esta en lo revelado). La mascara son miles de celdas con un
 * float cada una: mandarla entera por la red en cada cambio es caro, asi que
 * se empaqueta a 1 bit por celda (revelada / no revelada) y se manda en base64.
 *
 * El formato es el mismo que usa `playerPerception.cellCenterX/Z`: la celda
 * (col, row) cubre x = -map_width/2 + (col+0.5)*res, z = -map_height/2 +
 * (row+0.5)*res.
 */

export interface RevealMask {
  cols: number;
  rows: number;
  res: number;
  mapWidth: number;
  mapHeight: number;
  /** Base64: 1 bit por celda, en orden row-major (row * cols + col). */
  bits: string;
}

/** Umbral de alpha para decir "esta celda la veo". */
export const REVEAL_THRESHOLD = 0.01;

/**
 * Un checksum barato de la mascara, para no mandarla si no cambio.
 *
 * No es un hash criptografico: es una suma de los indices de las celdas
 * reveladas mas la cantidad. Suficiente para saber "cambio algo" sin recorrer
 * la mascara dos veces (la primera vez es el coste real).
 */
export function revealSignature(alpha: Float32Array): string {
  let count = 0;
  let sum = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] > REVEAL_THRESHOLD) {
      count++;
      sum = (sum + i) | 0;
    }
  }
  return `${count}:${sum}`;
}

/** Empaqueta la mascara a 1 bit por celda y la devuelve en base64. */
export function packReveal(alpha: Float32Array, cols: number, rows: number): string {
  const n = cols * rows;
  const bytes = new Uint8Array((n + 7) >> 3);
  for (let i = 0; i < n; i++) {
    if (alpha[i] > REVEAL_THRESHOLD) {
      bytes[i >> 3] |= 1 << (i & 7);
    }
  }
  return base64FromBytes(bytes);
}

/** Base64 sin `btoa` (no existe en el worker ni en algunos navegadores viejos). */
function base64FromBytes(bytes: Uint8Array): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += CHARS[b0 >> 2];
    out += CHARS[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : CHARS[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : CHARS[b2 & 63];
  }
  return out;
}

/** Lee un bit de una mascara empaquetada (base64). */
export function readRevealBit(bits: string, index: number): boolean {
  const bytes = bytesFromBase64(bits);
  if (!bytes || index < 0 || index >= bytes.length * 8) return false;
  return (bytes[index >> 3] & (1 << (index & 7))) !== 0;
}

export function bytesFromBase64(b64: string): Uint8Array | null {
  if (!b64) return null;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    const v = CHARS.indexOf(clean[i]);
    if (v < 0) continue;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}




/** Un reveal tal como lo devuelve el backend (nombres del backend). */
export interface RevealLike {
  player_id: string;
  cols: number;
  rows: number;
  res: number;
  map_width: number;
  map_height: number;
  bits: string;
}

/**
 * El punto (x, z) esta dentro de la mascara revelada?
 *
 * `reveals` puede ser de cualquier jugador: el DM ve a un jugador sin luz si
 * esta en lo revelado por ALGUNO de ellos (la mesa ve la mesa).
 */
export function isPointRevealed(
  reveals: readonly RevealLike[],
  x: number,
  z: number,
): boolean {
  for (const r of reveals) {
    if (r.cols <= 0 || r.rows <= 0) continue;
    const col = Math.floor((x + r.map_width / 2) / r.res);
    const row = Math.floor((z + r.map_height / 2) / r.res);
    if (col < 0 || row < 0 || col >= r.cols || row >= r.rows) continue;
    if (readRevealBit(r.bits, row * r.cols + col)) return true;
  }
  return false;
}

/**
 * El DM ve a este personaje?
 *
 * - Con el toggle prendido (o si el personaje esta en una zona con luz) se ve
 *   siempre: el DM tiene autoridad sobre la mesa.
 * - Si todavia no hay ningun reveal publicado se ve: no se le desaparece la
 *   partida de golpe mientras el jugadorrecien entra.
 * - Si no: se ve solo si esta en lo revelado por ALGUN jugador (la mesa ve la
 *   mesa).
 */
export function dmSeesCharacter(input: {
  reveals: readonly RevealLike[];
  x: number;
  z: number;
  /** El personaje esta iluminado (lo calcula el DM con sus propias luces). */
  lit: boolean;
  /** El toggle del DM: ver a los jugadores en la oscuridad. */
  seeAll: boolean;
}): boolean {
  if (input.seeAll) return true;
  if (input.lit) return true;
  if (input.reveals.length === 0) return true;
  return isPointRevealed(input.reveals, input.x, input.z);
}
