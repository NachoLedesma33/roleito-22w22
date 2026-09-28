export interface StatusOption {
  id: string;
  label: string;
  color: string;
  // Emoji flotante sobre el token (chip con el color característico de la marca).
  icon: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 'blinded', label: 'Ciego', color: '#9ca3af', icon: '🙈' },
  { id: 'burning', label: 'Ardiendo', color: '#f97316', icon: '🔥' },
  { id: 'bleeding', label: 'Sangrando', color: '#ef4444', icon: '🩸' },
  { id: 'poisoned', label: 'Envenenado', color: '#22c55e', icon: '☠️' },
  { id: 'concentrating', label: 'Concentrando', color: '#3b82f6', icon: '🧘' },
  { id: 'stunned', label: 'Aturdido', color: '#eab308', icon: '💫' },
  { id: 'prone', label: 'Derribado', color: '#a855f7', icon: '🛌' },
  { id: 'restrained', label: 'Restringido', color: '#06b6d4', icon: '⛓️' },
  { id: 'invisible', label: 'Invisible', color: '#a78bfa', icon: '👻' },
];

export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.id, s.color])
);

export const STATUS_ICONS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.id, s.icon])
);