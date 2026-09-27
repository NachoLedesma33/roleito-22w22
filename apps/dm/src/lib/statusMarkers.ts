export interface StatusOption {
  id: string;
  label: string;
  color: string;
  // 'ring' = anillo bajo el token; 'flame' = llama sobre el token; 'none' = solo badge.
  aura?: 'ring' | 'flame' | 'none';
  // 'pulse' = latido (radio+opacity); 'spin' = arco giratorio. Sin campo = estático.
  anim?: 'pulse' | 'spin';
  // Amplificador de la animación (default 1). <1 = sutil, >1 = intenso.
  intensity?: number;
  // Apertura del arco en radianes (solo spin). <2π deja un hueco visible al girar.
  spinArc?: number;
  spinDir?: 1 | -1;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 'blinded', label: 'Ciego', color: '#9ca3af' },
  { id: 'burning', label: 'Ardiendo', color: '#f97316', aura: 'flame' },
  { id: 'bleeding', label: 'Sangrando', color: '#ef4444', anim: 'pulse' },
  { id: 'poisoned', label: 'Envenenado', color: '#22c55e' },
  { id: 'concentrating', label: 'Concentrando', color: '#3b82f6', anim: 'spin', spinArc: 5.2, spinDir: -1, intensity: 0.33 },
  { id: 'stunned', label: 'Aturdido', color: '#eab308', anim: 'spin', spinArc: 2.6, intensity: 1.4 },
  { id: 'prone', label: 'Derribado', color: '#a855f7' },
  { id: 'restrained', label: 'Restringido', color: '#06b6d4' },
  { id: 'invisible', label: 'Invisible', color: '#a78bfa' },
];

export const STATUS_COLORS: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.id, s.color])
);

export interface StatusRenderConfig {
  aura: 'ring' | 'flame' | 'none';
  anim: 'pulse' | 'spin' | 'none';
  intensity: number;
  spinArc: number;
  spinDir: 1 | -1;
}

export const STATUS_CONFIG: Record<string, StatusRenderConfig> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [
    s.id,
    {
      aura: s.aura ?? 'ring',
      anim: s.anim ?? 'none',
      intensity: s.intensity ?? 1,
      spinArc: s.spinArc ?? 2.6,
      spinDir: s.spinDir ?? 1,
    },
  ])
);