/**
 * Tamaño del mundo de una escena, en unidades de grilla.
 *
 * `mapH` y `mapW` son **semi**-dimensiones: el mundo va de `-mapW/2` a
 * `+mapW/2`, y por eso la normalización `x / mapW + 0.5` da 0 y 1 en los
 * bordes. La escena es un cuadrado de `2 * WORLD_HALF_SPAN` celdas de lado con
 * `map_scale = 1`. Con una imagen rectangular el alto se mantiene y el ancho
 * se deriva del aspecto de la imagen.
 */

/** Media-ancho del mundo en unidades de grilla, con `map_scale = 1`. */
export const WORLD_HALF_SPAN = 10;

/** `map_scale` ausente se trata como escala 1. Alto del mundo en unidades de grilla. */
export function sceneWorldHeight(mapScale: number | null | undefined): number {
  return WORLD_HALF_SPAN * (mapScale ?? 1);
}

/** El alto del mundo y el ancho derivado del aspecto de la imagen. */
export function sceneWorldSize(
  mapScale: number | null | undefined,
  aspect: number,
): { mapH: number; mapW: number } {
  const mapH = sceneWorldHeight(mapScale);
  return { mapH, mapW: mapH * aspect };
}
