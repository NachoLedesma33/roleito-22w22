import type { VidaAttr } from '@/lib/api';

interface VidaBarProps {
  current: number | null;
  max: number;
  label: string;
  color: string;
}

export function VidaBar({ current, max, label, color }: VidaBarProps) {
  const val = current ?? max;
  const pct = max > 0 ? (val / max) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span>{val} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--bg-tertiary)]">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface VidaAttrsProps {
  vigor: VidaAttr;
  intelligence: VidaAttr;
  dexterity: VidaAttr;
  cunning: VidaAttr;
}

const ATTR_STATE_LABEL: Record<VidaAttr, string> = {
  '+': 'Más',
  '/': 'Neutro',
  '-': 'Menos',
};

export function VidaAttrs({ vigor, intelligence, dexterity, cunning }: VidaAttrsProps) {
  const attrs = [
    { label: 'V', name: 'Vigor', value: vigor, color: 'text-red-400' },
    { label: 'I', name: 'Inteligencia', value: intelligence, color: 'text-blue-400' },
    { label: 'D', name: 'Destreza', value: dexterity, color: 'text-green-400' },
    { label: 'A', name: 'Astucia', value: cunning, color: 'text-yellow-400' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {attrs.map((a) => (
        <div key={a.label} className="text-center border border-[var(--bg-tertiary)] rounded p-2">
          <p className={`text-lg font-bold ${a.color}`} title={ATTR_STATE_LABEL[a.value]}>
            {a.value === '-' ? '−' : a.value}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">{a.name}</p>
          <p className="text-[10px] text-[var(--text-secondary)] opacity-60">[{a.label}]</p>
        </div>
      ))}
    </div>
  );
}

interface VidaDerivedProps {
  max_pv: number;
  max_pm: number;
  defense: number;
}

export function VidaDerived({ max_pv, max_pm, defense }: VidaDerivedProps) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="border border-[var(--bg-tertiary)] rounded p-2">
        <p className="text-sm font-bold text-red-400">{max_pv}</p>
        <p className="text-xs text-[var(--text-secondary)]">PV Max</p>
      </div>
      <div className="border border-[var(--bg-tertiary)] rounded p-2">
        <p className="text-sm font-bold text-blue-400">{max_pm}</p>
        <p className="text-xs text-[var(--text-secondary)]">PM Max</p>
      </div>
      <div className="border border-[var(--bg-tertiary)] rounded p-2">
        <p className="text-sm font-bold text-green-400">{defense}</p>
        <p className="text-xs text-[var(--text-secondary)]">Defensa</p>
      </div>
    </div>
  );
}
