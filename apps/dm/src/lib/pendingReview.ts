/**
 * Geometria pendiente de revision.
 *
 * Un item con `pendingReview` salio de una deteccion y el DM todavia no lo
 * aprobo: es una PROPUESTA, no geometria. Hasta que el DM lo aprueba no
 * bloquea el movimiento, no ocluye la luz ni la vision, y no le llega al
 * jugador.
 *
 * El flag vive en el item (`SceneItem.pendingReview`), asi que viaja al
 * backend y sobrevive a que el DM recargue la pagina.
 *
 * Ojo: el filtro es `!== true` y no `=== false`: los items que el DM dibujo a
 * mano nunca tuvieron el flag y no pueden quedar afuera.
 */
export function isPendingReview(item: unknown): boolean {
  if (typeof item !== 'object' || item === null) return false;
  return (item as { pendingReview?: boolean }).pendingReview === true;
}

/** Solo los items que ya afectan al juego (aprobados, o nunca propuestos). */
export function approvedItems<T extends object>(items: T[]): T[] {
  return items.filter((item) => !isPendingReview(item));
}
