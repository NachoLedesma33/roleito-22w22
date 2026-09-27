export interface StatusOption {
  id: string;
  label: string;
  color: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 'blinded', label: 'Ciego', color: '#9ca3af' },
  { id: 'burning', label: 'Ardiendo', color: '#f97316' },
  { id: 'bleeding', label: 'Sangrando', color: '#ef4444' },
  { id: 'poisoned', label: 'Envenenado', color: '#22c55e' },
  { id: 'concentrating', label: 'Concentrando', color: '#3b82f6' },
  { id: 'stunned', label: 'Aturdido', color: '#eab308' },
  { id: 'prone', label: 'Derribado', color: '#a855f7' },
  { id: 'restrained', label: 'Restringido', color: '#06b6d4' },
  { id: 'invisible', label: 'Invisible', color: '#a78bfa' },
];

export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.id, s.color])
);