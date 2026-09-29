export type StatusGroup = 'fisico' | 'control' | 'mente' | 'sobrenatural';

export interface StatusOption {
  id: string;
  label: string;
  color: string;
  // Emoji flotante sobre el token (chip con el color característico de la marca).
  icon: string;
  // Categoría para el menú contextual (evita lista plana interminable).
  group: StatusGroup;
}

export const STATUS_GROUPS: { key: StatusGroup; label: string }[] = [
  { key: 'fisico', label: 'Físico' },
  { key: 'control', label: 'Control' },
  { key: 'mente', label: 'Mente' },
  { key: 'sobrenatural', label: 'Sobrenatural' },
];

export const STATUS_OPTIONS: StatusOption[] = [
  // Físico
  { id: 'burning', label: 'Ardiendo', color: '#f97316', icon: '🔥', group: 'fisico' },
  { id: 'bleeding', label: 'Sangrando', color: '#ef4444', icon: '🩸', group: 'fisico' },
  { id: 'poisoned', label: 'Envenenado', color: '#22c55e', icon: '☠️', group: 'fisico' },
  { id: 'shocked', label: 'Electrificado', color: '#facc15', icon: '⚡', group: 'fisico' },
  { id: 'frozen', label: 'Helado', color: '#38bdf8', icon: '❄️', group: 'fisico' },
  { id: 'sick', label: 'Enfermo', color: '#84cc16', icon: '🤢', group: 'fisico' },
  // Control
  { id: 'stunned', label: 'Aturdido', color: '#eab308', icon: '💫', group: 'control' },
  { id: 'prone', label: 'Derribado', color: '#a855f7', icon: '🛌', group: 'control' },
  { id: 'restrained', label: 'Restringido', color: '#06b6d4', icon: '⛓️', group: 'control' },
  { id: 'petrified', label: 'Petrificado', color: '#78716c', icon: '🗿', group: 'control' },
  // Mente
  { id: 'blinded', label: 'Ciego', color: '#9ca3af', icon: '🙈', group: 'mente' },
  { id: 'concentrating', label: 'Concentrando', color: '#3b82f6', icon: '🧘', group: 'mente' },
  { id: 'silenced', label: 'Silenciado', color: '#475569', icon: '🔇', group: 'mente' },
  { id: 'charmed', label: 'Encantado', color: '#ec4899', icon: '💞', group: 'mente' },
  // Sobrenatural
  { id: 'invisible', label: 'Invisible', color: '#a78bfa', icon: '👻', group: 'sobrenatural' },
  { id: 'dead', label: 'Muerto', color: '#6b7280', icon: '💀', group: 'sobrenatural' },
  { id: 'cursed', label: 'Maldito', color: '#9333ea', icon: '🔮', group: 'sobrenatural' },
  { id: 'blessed', label: 'Bendecido', color: '#fbbf24', icon: '✨', group: 'sobrenatural' },
];

export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.id, s.color])
);

export const STATUS_ICONS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.id, s.icon])
);