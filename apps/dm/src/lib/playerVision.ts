import { SceneItem, LightMetadata } from '@core/domain/types'
import { normalizeLightConfig } from './light'
import { WorldLight } from './lightMask'

/**
 * De dónde sale la luz que percibe un jugador.
 *
 * Antes esto armaba polígonos que competían con la niebla por `zIndex`; ahora
 * devuelve las fuentes en coordenadas de mundo y el mask de luz las suma
 * (`lightMask.ts`, paso 2 del plan de percepción). El círculo ambiente no está
 * acá: es `ve_en_oscuridad` de una visión normal (`playerPerception.ts`).
 */

export const AMBIENT_RADIUS = 0.15

export interface CharPos {
  x: number
  z: number
  rotation?: number
  facingOffset?: number
}

export interface VisionOptions {
  shareCarriedLights?: boolean
}

export function rotationToConeDirDeg(rotationRad: number): number {
  return (Math.atan2(-Math.cos(rotationRad), Math.sin(rotationRad)) * 180) / Math.PI
}

export function lightVisionOrigin(item: SceneItem, charPos: Map<string, CharPos>): CharPos | null {
  const meta = item.metadata as LightMetadata
  if (meta.attachedTo) {
    const p = charPos.get(meta.attachedTo)
    return p ? { x: p.x, z: p.z, rotation: p.rotation, facingOffset: p.facingOffset } : null
  }
  return { x: item.x, z: item.y }
}

/**
 * Las fuentes de luz que le iluminan la escena a este jugador.
 *
 * `attachedTo` se resuelve acá y no en el mask: una antorcha colgada de un token
 * ilumina desde el token, y si es direccional, hacia donde mira ese token.
 */
export function collectWorldLights(
  items: SceneItem[],
  charPos: Map<string, CharPos>,
  ownSceneCharId: string | null,
  opts: VisionOptions = {},
): WorldLight[] {
  const lights: WorldLight[] = []
  for (const item of items) {
    if (!item.visible || item.metadata.type !== 'light') continue
    const meta = item.metadata as LightMetadata
    if (meta.attachedTo && meta.attachedTo !== ownSceneCharId && opts.shareCarriedLights === false) continue
    const origin = lightVisionOrigin(item, charPos)
    if (!origin) continue
    const source = normalizeLightConfig(meta.source)
    const ownCone = meta.attachedTo === ownSceneCharId && source.mode === 'directional'
    const directionDeg =
      source.mode !== 'directional'
        ? null
        : ownCone && origin.rotation !== undefined
          ? rotationToConeDirDeg(
              (origin.rotation ?? 0) +
                (origin.facingOffset ?? 0) +
                ((source.direction ?? 0) * Math.PI) / 180,
            )
          : (source.direction ?? 0)
    lights.push({ x: origin.x, z: origin.z, source, directionDeg })
  }
  return lights
}