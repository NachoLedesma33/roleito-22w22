/**
 * Zonas fantasma (`shadowOnly`).
 *
 * Del diseno de producto (`docs/HYBRID-SHADOW-GEOMETRY.md`): una zona
 * fantasma es referencia visual: proyecta sombra pero no frena al token ni
 * tapa la vista. Es el caso de las zonas que la IA proposed como borrador.
 *
 * El flag existia en `ZoneMetadata` pero no lo leia nadie: se escribia siempre
 * en `false` y nunca hacia nada.
 */

/** True si la zona es fantasma: solo afecta la luz/sombra. */
export function isShadowOnly(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) return false;
  const meta = (item as { metadata?: { shadowOnly?: boolean } }).metadata;
  return meta?.shadowOnly === true;
}
