/**
 * Qué items salieron de la detección automática de paredes.
 *
 * El backend (`wall_detection.scene_items_from_detection`) genera los ids con
 * prefijo `wall-auto-` / `door-auto-` / `zone-auto-`. Es el único marcador que
 * sobrevive: los muros detectados en campañas viejas no tienen metadata que
 * los delate, y con la detección hoy determinista el prefijo además es lo
 * único que permite distinguir "generado" de "dibujado a mano" sin adivinar
 * por geometría.
 *
 * `room-auto-` es el prefijo viejo de las zonas (cuando eran salas): se sigue
 * reconociendo para que al re-detectar se limpien también.
 */
const AUTO_ID_PREFIXES = ['wall-auto-', 'door-auto-', 'zone-auto-', 'room-auto-'];

export function isAutoDetectedItem(item: { id: string }): boolean {
  return AUTO_ID_PREFIXES.some((prefix) => item.id.startsWith(prefix));
}

/** Qué tipo de item detectado es: muro, puerta, zona o nada (lo dibujado a mano). */
export function autoDetectedKind(item: { id: string }): 'wall' | 'door' | 'zone' | null {
  if (item.id.startsWith('wall-auto-')) return 'wall';
  if (item.id.startsWith('door-auto-')) return 'door';
  if (item.id.startsWith('zone-auto-') || item.id.startsWith('room-auto-')) return 'zone';
  return null;
}

/**
 * El DM toco esta zona: su edicion manda sobre la de la IA.
 *
 * Es lo que hace que "re-detectar" no le pise el trabajo del DM: la zona que
 * el toco se conserva y la nueva deteccion no propone otra encima.
 */
export function isTouchedByDm(item: {
  id: string;
  metadata?: { type?: string; touchedByDm?: boolean };
}): boolean {
  return item.metadata?.type === 'zone' && item.metadata?.touchedByDm === true;
}

/** Los puntos normalizados (0-1) de una zona, o null si no es una zona. */
export function zonePoints(item: {
  shape?: { type?: string; points?: number[] };
}): number[] | null {
  if (item.shape?.type !== 'polygon' || !item.shape.points) return null;
  return item.shape.points;
}

/** Dos zonas se pisan si sus cajas se cruzan (aproximacion barata). */
export function zonesOverlap(a: number[], b: number[]): boolean {
  const box = (pts: number[]) => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i + 1 < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]);
      maxX = Math.max(maxX, pts[i]);
      minY = Math.min(minY, pts[i + 1]);
      maxY = Math.max(maxY, pts[i + 1]);
    }
    return { minX, minY, maxX, maxY };
  };
  const ba = box(a);
  const bb = box(b);
  return ba.minX <= bb.maxX && bb.minX <= ba.maxX && ba.minY <= bb.maxY && bb.minY <= ba.maxY;
}
