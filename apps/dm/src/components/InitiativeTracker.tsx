import { useState, useCallback } from 'react';
import HudPanel from './HudPanel';
import { rollDice } from './DiceRoller';

interface Combatant {
  id: string;
  name: string;
  type: 'character' | 'npc';
  initiative: number;
  current_pv: number;
  max_pv: number;
  current_pm: number;
  max_pm: number;
}

interface InitiativeTrackerProps {
  combatants: Combatant[];
  onUpdateHp: (id: string, current_pv: number) => void;
  onUpdatePm: (id: string, current_pm: number) => void;
  onClose: () => void;
}

export default function InitiativeTracker({
  combatants: initial,
  onUpdateHp,
  onUpdatePm,
  onClose,
}: InitiativeTrackerProps) {
  const [combatants, setCombatants] = useState<Combatant[]>(
    initial.map((c) => ({ ...c, initiative: 0 }))
  );
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [started, setStarted] = useState(false);

  const rollAllInitiative = useCallback(() => {
    setCombatants((prev) =>
      prev
        .map((c) => ({ ...c, initiative: rollDice(20, 1).results[0] }))
        .sort((a, b) => b.initiative - a.initiative)
    );
    setStarted(true);
    setCurrentTurn(0);
    setRound(1);
  }, []);

  const nextTurn = useCallback(() => {
    setCurrentTurn((prev) => {
      const next = prev + 1;
      if (next >= combatants.length) {
        setRound((r) => r + 1);
        return 0;
      }
      return next;
    });
  }, [combatants.length]);

  const adjustStat = useCallback(
    (id: string, field: 'current_pv' | 'current_pm', delta: number) => {
      setCombatants((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== id) return c;
          const max = field === 'current_pv' ? c.max_pv : c.max_pm;
          const newVal = Math.max(0, Math.min(max, c[field] + delta));
          return { ...c, [field]: newVal };
        });
        return updated;
      });
      const c = combatants.find((c) => c.id === id);
      if (c) {
        const max = field === 'current_pv' ? c.max_pv : c.max_pm;
        const newVal = Math.max(0, Math.min(max, c[field] + delta));
        if (field === 'current_pv') onUpdateHp(id, newVal);
        else onUpdatePm(id, newVal);
      }
    },
    [combatants, onUpdateHp, onUpdatePm]
  );

  return (
    <HudPanel
      title={`Initiative — Round ${round}`}
      panelId="initiative"
      onClose={onClose}
      defaultX={window.innerWidth - 360}
      defaultY={160}
      defaultWidth={340}
    >
      <div className="space-y-2">
        {!started && (
          <button
            onClick={rollAllInitiative}
            className="w-full text-xs px-3 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors font-semibold"
          >
            Roll Initiative (d20)
          </button>
        )}

        {started && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text-secondary)]">
                Round {round} — Turn {currentTurn + 1}/{combatants.length}
              </span>
              <button
                onClick={nextTurn}
                className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Next Turn ▸
              </button>
            </div>

            <div className="space-y-1">
              {combatants.map((c, i) => {
                const isActive = i === currentTurn;
                const isDead = c.current_pv <= 0;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30'
                        : isDead
                          ? 'opacity-40'
                          : ''
                    }`}
                  >
                    <span className="w-4 text-center text-[10px] text-[var(--text-secondary)] font-mono">
                      {c.initiative}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: c.type === 'character' ? '#4ade80' : '#facc15',
                      }}
                    />
                    <span className="flex-1 truncate font-medium">{c.name}</span>

                    {/* HP controls */}
                    <button
                      onClick={() => adjustStat(c.id, 'current_pv', -1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-red-900/50 hover:bg-red-800 text-red-300 text-[10px]"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-[10px]">
                      <span className="text-red-400">{c.current_pv}</span>
                      <span className="text-[var(--text-secondary)]">/{c.max_pv}</span>
                    </span>
                    <button
                      onClick={() => adjustStat(c.id, 'current_pv', 1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-green-900/50 hover:bg-green-800 text-green-300 text-[10px]"
                    >
                      +
                    </button>

                    {/* PM controls */}
                    <button
                      onClick={() => adjustStat(c.id, 'current_pm', -1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-blue-900/50 hover:bg-blue-800 text-blue-300 text-[10px]"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-[10px]">
                      <span className="text-blue-400">{c.current_pm}</span>
                      <span className="text-[var(--text-secondary)]">/{c.max_pm}</span>
                    </span>
                    <button
                      onClick={() => adjustStat(c.id, 'current_pm', 1)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-blue-900/50 hover:bg-blue-800 text-blue-300 text-[10px]"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={rollAllInitiative}
              className="w-full text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mt-2"
            >
              Re-roll Initiative
            </button>
          </>
        )}
      </div>
    </HudPanel>
  );
}
