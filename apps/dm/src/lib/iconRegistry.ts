import type { ComponentType } from 'react'
import {
  GiArmorVest,
  GiBowArrow,
  GiBrain,
  GiBroadsword,
  GiBurningDot,
  GiCharm,
  GiCrown,
  GiCrossedSwords,
  GiCrystalBall,
  GiCutDiamond,
  GiDuel,
  GiEyeTarget,
  GiFire,
  GiFireball,
  GiFist,
  GiFlame,
  GiFootprint,
  GiHealthNormal,
  GiHearts,
  GiIceCube,
  GiLightningStorm,
  GiMagicSwirl,
  GiPoisonBottle,
  GiPortal,
  GiPotionBall,
  GiPrayer,
  GiRaiseZombie,
  GiRing,
  GiScrollUnfurled,
  GiShield,
  GiSmokeBomb,
  GiSnowflake1,
  GiSparkles,
  GiStoneSphere,
  GiTeleport,
  GiTornado,
  GiSwordWound,
  GiWaterDrop,
  GiWingedEmblem,
} from 'react-icons/gi'

/**
 * Iconografia de habilidades/efectos.
 *
 * Set unificado (game-icons.net via `react-icons/gi`) sobre grid 24px y
 * `currentColor`, para que las habilidades se vean coherentes sin arte propio.
 * Prioridad en la UI: imagen subida por el DM > `icon_id` de este registro >
 * fallback por keyword > fallback generico.
 */
export type AbilityIconComponent = ComponentType<{
  className?: string
  size?: number | string
  title?: string
}>

export const ABILITY_ICONS: Readonly<Record<string, AbilityIconComponent>> = {
  // ataque / fisico
  sword: GiBroadsword,
  slash: GiSwordWound,
  cross: GiCrossedSwords,
  duel: GiDuel,
  fist: GiFist,
  // defensa / equipo
  shield: GiShield,
  armor: GiArmorVest,
  ring: GiRing,
  // fuego
  fire: GiFire,
  flame: GiFlame,
  fireball: GiFireball,
  burn: GiBurningDot,
  // hielo
  ice: GiIceCube,
  snowflake: GiSnowflake1,
  // rayo
  lightning: GiLightningStorm,
  storm: GiLightningStorm,
  // veneno / humo
  poison: GiPoisonBottle,
  smoke: GiSmokeBomb,
  // curacion / soporte
  heal: GiHealthNormal,
  prayer: GiPrayer,
  heart: GiHearts,
  potion: GiPotionBall,
  // a distancia
  bow: GiBowArrow,
  // magia / arcano
  magic: GiMagicSwirl,
  sparkles: GiSparkles,
  charm: GiCharm,
  portal: GiPortal,
  teleport: GiTeleport,
  // naturaleza / elementos
  stone: GiStoneSphere,
  water: GiWaterDrop,
  tornado: GiTornado,
  gem: GiCutDiamond,
  // conocimiento / social
  scroll: GiScrollUnfurled,
  crystal: GiCrystalBall,
  brain: GiBrain,
  eye: GiEyeTarget,
  crown: GiCrown,
  // no-muertos / movimiento / gloria
  undead: GiRaiseZombie,
  movement: GiFootprint,
  glory: GiWingedEmblem,
}

/** Ids canonicos para el selector de iconos (isla de Reparto). */
export const ABILITY_ICON_IDS: ReadonlyArray<string> = Object.keys(ABILITY_ICONS).sort()

export const FALLBACK_ABILITY_ICON: AbilityIconComponent = GiMagicSwirl

/**
 * Resuelve el componente de icono para un id canonico o keyword.
 * Nunca devuelve undefined: cae al fallback generico.
 */
export function resolveAbilityIcon(id?: string | null): AbilityIconComponent {
  if (!id) return FALLBACK_ABILITY_ICON
  const key = id.trim().toLowerCase()
  if (ABILITY_ICONS[key]) return ABILITY_ICONS[key]
  for (const iconId of ABILITY_ICON_IDS) {
    if (key.includes(iconId)) return ABILITY_ICONS[iconId]
  }
  return FALLBACK_ABILITY_ICON
}