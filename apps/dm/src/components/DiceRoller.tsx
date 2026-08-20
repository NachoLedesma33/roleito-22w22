import { useState, useCallback, useEffect, useRef } from 'react';
import HudPanel from './HudPanel';

export interface DiceRoll {
  id: string;
  diceType: number;
  count: number;
  results: number[];
  total: number;
  timestamp: number;
  label?: string;
}

interface DiceRollerProps {
  onClose: () => void;
  onRoll?: (roll: DiceRoll) => void;
}

const DICE_TYPES = [4, 6, 8, 10, 12, 20];

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(diceType: number, count: number): { results: number[]; total: number } {
  const results = Array.from({ length: count }, () => rollDie(diceType));
  const total = results.reduce((a, b) => a + b, 0);
  return { results, total };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DiceRoller({ onClose, onRoll }: DiceRollerProps) {
  const [diceType, setDiceType] = useState(6);
  const [count, setCount] = useState(1);
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [history, setHistory] = useState<DiceRoll[]>([]);
  const [rolling, setRolling] = useState(false);
  const rollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleRoll = useCallback(() => {
    setRolling(true);
    rollTimeout.current = setTimeout(() => {
      const { results, total } = rollDice(diceType, count);
      const roll: DiceRoll = {
        id: crypto.randomUUID(),
        diceType,
        count,
        results,
        total,
        timestamp: Date.now(),
      };
      setLastRoll(roll);
      setHistory((prev) => [roll, ...prev].slice(0, 50));
      setRolling(false);
      onRoll?.(roll);
    }, 300);
  }, [diceType, count, onRoll]);

  useEffect(() => {
    return () => {
      if (rollTimeout.current) clearTimeout(rollTimeout.current);
    };
  }, []);

  return (
    <HudPanel
      title="Dice Roller"
      onClose={onClose}
      defaultX={80}
      defaultY={80}
      width={280}
    >
      <div className="space-y-3">
        {/* Dice Type Selector */}
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Die Type</p>
          <div className="flex gap-1">
            {DICE_TYPES.map((d) => (
              <button
                key={d}
                onClick={() => setDiceType(d)}
                className={`flex-1 py-1.5 rounded text-xs font-mono font-bold transition-colors ${
                  diceType === d
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                d{d}
              </button>
            ))}
          </div>
        </div>

        {/* Count Selector */}
        <div>
          <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Count</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCount((c) => Math.max(1, c - 1))}
              className="w-8 h-8 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-bold transition-colors"
            >
              −
            </button>
            <span className="flex-1 text-center text-lg font-bold font-mono">{count}</span>
            <button
              onClick={() => setCount((c) => Math.min(10, c + 1))}
              className="w-8 h-8 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-bold transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Roll Button */}
        <button
          onClick={handleRoll}
          disabled={rolling}
          className={`w-full py-2.5 rounded font-semibold text-sm transition-all ${
            rolling
              ? 'bg-[var(--accent)]/50 text-white/70 cursor-wait'
              : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]'
          }`}
        >
          {rolling ? 'Rolling...' : `Roll ${count}d${diceType}`}
        </button>

        {/* Last Roll Result */}
        {lastRoll && (
          <div className="bg-[var(--bg-tertiary)]/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Result</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{lastRoll.count}d{lastRoll.diceType}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {lastRoll.results.map((r, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-mono font-bold ${
                    r === lastRoll.diceType
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                      : r === 1
                      ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/40'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                  }`}
                >
                  {r}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Total</span>
              <span className="text-lg font-bold font-mono text-[var(--text-primary)]">
                {lastRoll.total}
              </span>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">History</p>
            <div className="space-y-0.5 max-h-32 overflow-y-auto">
              {history.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 px-2 py-1 rounded text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <span className="text-[var(--text-secondary)] font-mono w-14 shrink-0">
                    {formatTime(r.timestamp)}
                  </span>
                  <span className="text-[var(--text-secondary)] shrink-0">
                    {r.count}d{r.diceType}
                  </span>
                  <span className="flex-1 truncate text-[var(--text-secondary)]">
                    {r.results.join(' + ')}
                  </span>
                  <span className="font-bold font-mono text-[var(--text-primary)]">
                    {r.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
