/**
 * Qué items salieron de la detección automática de paredes.
 *
 * El backend (`wall_detection.scene_items_from_detection`) genera los ids con
 * prefijo `wall-auto-` / `door-auto-`. Es el único marcador que sobrevive: los
 * muros detectados en campañas viejas no tienen metadata que los delate, y con
 * la detección hoy determinista el prefijo además es lo único que permite
 * distinguir "generado" de "dibujado a mano" sin adivinar por geometría.
 */
const AUTO_ID_PREFIXES = ['wall-auto-', 'door-auto-'];

export function isAutoDetectedItem(item: { id: string }): boolean {
  return AUTO_ID_PREFIXES.some((prefix) => item.id.startsWith(prefix));
}

/** Qué tipo de item detectado es: muro, puerta o nada (lo dibujado a mano). */
export function autoDetectedKind(item: { id: string }): 'wall' | 'door' | null {
  if (item.id.startsWith('wall-auto-')) return 'wall';
  if (item.id.startsWith('door-auto-')) return 'door';
  return null;
}
