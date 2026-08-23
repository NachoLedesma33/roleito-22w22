import type { VidaAttr } from '@/lib/api';

const BORDER_BY_COLOR: Record<string, string> = {
  'text-red-400': 'border-red-400',
  'text-blue-400': 'border-blue-400',
  'text-green-400': 'border-green-400',
  'text-yellow-400': 'border-yellow-400',
};

export function VidaInput({ label, value, onChange, color }: {
  label: string;
  value: VidaAttr;
  onChange: (v: VidaAttr) => void;
  color: string;
}) {
  const name = label.split(' ')[0];
  const options: { v: VidaAttr; symbol: string; state: string }[] = [
    { v: '+', symbol: '+', state: 'más' },
    { v: '/', symbol: '/', state: 'neutro' },
    { v: '-', symbol: '−', state: 'menos' },
  ];

  return (
    <div className="text-center">
      <p className={`text-xs ${color} mb-1`}>{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex rounded overflow-hidden border border-[var(--bg-tertiary)]"
      >
        {options.map(({ v, symbol, state }) => {
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${name} ${state}`}
              onClick={() => onChange(v)}
              className={`flex-1 py-2 text-sm font-bold transition-colors ${
                selected
                  ? `bg-[var(--bg-tertiary)] ${BORDER_BY_COLOR[color] ?? ''}`
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
              }`}
            >
              {symbol}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NumberInput({ label, value, onChange, min = 0 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="text-center">
      <p className={`text-xs text-[var(--text-secondary)] mb-1`}>{label}</p>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, parseInt(e.target.value) || 0))}
        className="w-full px-2 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--accent)]"
        aria-label={label}
      />
    </div>
  );
}

export function VidaAttrsInput({ vigor, intelligence, dexterity, cunning, onChange }: {
  vigor: VidaAttr;
  intelligence: VidaAttr;
  dexterity: VidaAttr;
  cunning: VidaAttr;
  onChange: (attr: 'vigor' | 'intelligence' | 'dexterity' | 'cunning', v: VidaAttr) => void;
}) {
  return (
    <div>
      <p className="text-xs text-[var(--text-secondary)] mb-2">
        + más · / neutro · − menos — indica cuántos dados tirar según el estado
      </p>
      <div className="grid grid-cols-4 gap-3">
        <VidaInput label="Vigor [V]" value={vigor} onChange={(v) => onChange('vigor', v)} color="text-red-400" />
        <VidaInput label="Inteligencia [I]" value={intelligence} onChange={(v) => onChange('intelligence', v)} color="text-blue-400" />
        <VidaInput label="Destreza [D]" value={dexterity} onChange={(v) => onChange('dexterity', v)} color="text-green-400" />
        <VidaInput label="Astucia [A]" value={cunning} onChange={(v) => onChange('cunning', v)} color="text-yellow-400" />
      </div>
    </div>
  );
}
