/**
 * Iconos del catálogo de habilidades.
 *
 * `Ability.icon` guarda o el slug de acá (se pinta con el emoji, sin tocar
 * storage) o la ruta absoluta de un archivo subido, el mismo convenio que
 * `Character.portrait_path`. Cualquier otra cosa —vacío, slug que ya no existe,
 * path roto— degrada a null y el caller dibuja la primera letra del nombre.
 */

export interface AbilityIconOption {
  id: string;
  glyph: string;
  label: string;
}

export const ABILITY_ICON_OPTIONS: AbilityIconOption[] = [
  { id: 'flame', glyph: '🔥', label: 'Llama' },
  { id: 'bolt', glyph: '⚡', label: 'Rayo' },
  { id: 'snow', glyph: '❄️', label: 'Frío' },
  { id: 'drop', glyph: '💧', label: 'Agua' },
  { id: 'leaf', glyph: '🍃', label: 'Naturaleza' },
  { id: 'mountain', glyph: '⛰️', label: 'Tierra' },
  { id: 'wind', glyph: '🌬️', label: 'Aire' },
  { id: 'sparkles', glyph: '✨', label: 'Destellos' },
  { id: 'moon', glyph: '🌙', label: 'Noche' },
  { id: 'star', glyph: '⭐', label: 'Estrella' },
  { id: 'eye', glyph: '👁️', label: 'Visión' },
  { id: 'ghost', glyph: '👻', label: 'Espíritu' },
  { id: 'skull', glyph: '💀', label: 'Muerte' },
  { id: 'heart', glyph: '❤️', label: 'Vida' },
  { id: 'sword', glyph: '⚔️', label: 'Espada' },
  { id: 'shield', glyph: '🛡️', label: 'Escudo' },
  { id: 'arrow', glyph: '🏹', label: 'Proyectil' },
  { id: 'hammer', glyph: '🔨', label: 'Martillo' },
  { id: 'bomb', glyph: '💣', label: 'Explosión' },
  { id: 'wand', glyph: '🪄', label: 'Varita' },
  { id: 'book', glyph: '📖', label: 'Conjuro' },
  { id: 'lock', glyph: '🔒', label: 'Sellado' },
  { id: 'key', glyph: '🔑', label: 'Clave' },
  { id: 'gear', glyph: '⚙️', label: 'Mecánica' },
  { id: 'music', glyph: '🎵', label: 'Sonido' },
  { id: 'coins', glyph: '💰', label: 'Oro' },
];

export const ABILITY_ICON_GLYPHS: Record<string, string> = Object.fromEntries(
  ABILITY_ICON_OPTIONS.map((i) => [i.id, i.glyph])
);

export type AbilityIconView =
  | { kind: 'glyph'; glyph: string }
  | { kind: 'image'; url: string };

/** null = sin icono usable; el caller cae a la inicial del nombre. */
export function abilityIconView(
  icon: string | null | undefined
): AbilityIconView | null {
  if (!icon) return null;
  const glyph = ABILITY_ICON_GLYPHS[icon];
  if (glyph) return { kind: 'glyph', glyph };
  const relative = icon.replace(/\\/g, '/').split('/assets/')[1];
  if (!relative) return null;
  return { kind: 'image', url: `/api/static/${relative}` };
}

/** Chip de respaldo: inicial del nombre en mayúscula. */
export function abilityFallbackGlyph(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}
