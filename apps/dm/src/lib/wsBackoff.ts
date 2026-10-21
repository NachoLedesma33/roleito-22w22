/**
 * El backoff del reconexionado del WebSocket.
 *
 * Sin esto, cada reconexion abre un socket contra el tunel. Con una red
 * inestable (el celular del jugador cambiando de red, el tunel de Cloudflare
 * renegociando) eso son decenas de sockets por minuto: el tunel lo martilla y
 * el backend paga el costo.
 *
 * La politica es simple y predecible: 1 s, 2 s, 4 s, 8 s, 15 s (tope). Al
 * abrirse el socket, el intento vuelve a cero (la red volvio a estar bien:
 * no hay que seguir esperando).
 *
 * Es una funcion pura a proposito: la politica se testea sin WS ni timers.
 */

export const WS_BACKOFF_BASE_MS = 1000;
export const WS_BACKOFF_MAX_MS = 15000;

/**
 * El delay antes del proximo intento de conexion.
 *
 * @param attempt 0 = primer intento (1 s), 1 = segundo (2 s), 2 = tercero (4 s)...
 */
export function wsReconnectDelay(attempt: number): number {
  const exp = WS_BACKOFF_BASE_MS * Math.pow(2, Math.max(0, attempt));
  return Math.min(exp, WS_BACKOFF_MAX_MS);
}
