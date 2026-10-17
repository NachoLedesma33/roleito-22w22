import { LightSourceConfig } from '@core/domain/types'
import { lightIntensityAt } from './light'
import { intersectRaySegment2D, Occluder } from './lightOcclusion'

/**
 * Nivel de luz de una celda: la suma de la caída de cada fuente que la alcanza.
 *
 * Es la mitad de la regla de percepcion del plan (`engineering/PLAN-VISION-PERCEPCION.md`):
 * `hay_luz(celda) >= umbral` habilita ver, `sin_obstruccion` recorta. La otra
 * mitad, `ve_en_oscuridad`, la hace el tipo de vision del personaje.
 *
 * Hoy el jugador no usa esto: su vision son poligonos que compiten por zIndex.
 * Reemplazarlos es el paso 3 y 4 del plan.
 */

/** Fuente de luz ya ubicada en coordenadas de mundo (despegada de su token si hace falta). */
export interface WorldLight {
  x: number
  z: number
  source: LightSourceConfig
  /**
   * Direccion del cono en grados, cuando la luz no emite en todas direcciones.
   *
   * Opcional a proposito: las luces del mapa usan `source.direction`, pero una
   * antorcha carried por un token ilumina hacia donde mira el token, y eso lo
   * resuelve quien arma la lista (`rotationToConeDirDeg`). Si viene `null`, la
   * luz ilumina en todas direcciones aunque su mode sea `directional`.
   */
  directionDeg?: number | null
}

/**
 * Radio de la fuente en unidades de mundo.
 *
 * `source.radius` es una fraccion del alto del mapa (0-1), no una distancia:
 * la conversion vive aca y en `playerVision.ts` para que no puedan divergir.
 */
export function lightRadiusWorld(source: LightSourceConfig, mapHeight: number): number {
  return Math.max(0, source.radius) * mapHeight
}

/** Un oclusor corta la luz si esta entre la fuente y la celda. */
function isOccluded(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  dist: number,
  occluders: Occluder[],
): boolean {
  if (dist <= 0 || occluders.length === 0) return false
  for (const o of occluders) {
    const t = intersectRaySegment2D(ox, oz, dx, dz, o.a[0], o.a[1], o.b[0], o.b[1])
    // El 1e-4 descarta el oclusor pegado a la fuente: una antorcha colgada de un
    // token pegado a un muro no puede quedarse sin luz por eso.
    if (t !== null && t > 1e-4 && t < dist) return true
  }
  return false
}

/** La celda cae fuera del cono de la fuente. */
function isOutsideCone(l: WorldLight, dx: number, dz: number, dist: number): boolean {
  if (l.directionDeg == null) return false
  const half = ((l.source.angle ?? 90) / 2) * (Math.PI / 180)
  if (half >= Math.PI) return false
  const toCell = Math.atan2(dz, dx)
  const toLight = l.directionDeg * (Math.PI / 180)
  let delta = toCell - toLight
  while (delta > Math.PI) delta -= 2 * Math.PI
  while (delta < -Math.PI) delta += 2 * Math.PI
  return Math.abs(delta) > half && dist > 0
}

/**
 * Intensidad de luz en `(x, z)`, sumando las fuentes que llegan.
 *
 * No satura en 1: dos antorchas al 20% dan 0.4, que es justo el caso que el
 * umbral del plan quiere poder distinguir de una sola antorcha al 20%. Quien
 * consuma el mask decide si lo recorta.
 *
 * `mapHeight` convierte el radio de cada fuente a unidades de mundo (ver
 * `lightRadiusWorld`); no hay forma de evitarlo sin duplicar esa regla.
 */
export function lightLevelAt(
  x: number,
  z: number,
  lights: WorldLight[],
  occluders: Occluder[],
  mapHeight: number,
): number {
  let total = 0
  for (const l of lights) {
    const radiusWorld = lightRadiusWorld(l.source, mapHeight)
    if (radiusWorld <= 0) continue
    const dx = x - l.x
    const dz = z - l.z
    const dist = Math.hypot(dx, dz)
    // Corte temprano: una fuente fuera de rango no aporta y no toca oclusores.
    if (dist > radiusWorld) continue
    if (isOutsideCone(l, dx, dz, dist)) continue
    if (isOccluded(l.x, l.z, dx / (dist || 1), dz / (dist || 1), dist, occluders)) continue
    total += lightIntensityAt({ ...l.source, radius: radiusWorld }, dist)
  }
  return total
}