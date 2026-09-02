import { useState, useCallback, useEffect, useRef } from 'react';
import HudPanel from './HudPanel';
import { api, type Character, type NPC, type VidaAttr, type DiceRollResponse } from '@/lib/api';

export interface DiceRoll {
  id: string;
  diceType: number;
  count: number;
  results: number[];
  total: number;
  timestamp: number;
  label?: string;
  rollerName?: string;
}

interface RollerEntity {
  key: string;
  name: string;
  vigor: VidaAttr;
  intelligence: VidaAttr;
  dexterity: VidaAttr;
  cunning: VidaAttr;
}

interface DiceRollerProps {
  onClose: () => void;
  onRoll?: (roll: DiceRoll) => void;
  characters?: Character[];
  npcs?: NPC[];
  campaignId?: string;
  rollerName: string;
  fixedEntityKey?: string;
  onRollCreated?: (response: DiceRollResponse) => void;
}

const DICE_TYPES = [4, 6, 8, 10, 12, 20];

const STATE_NAME: Record<VidaAttr, string> = {
  '+': 'Más',
  '/': 'Neutro',
  '-': 'Menos',
};

function AttrChip({ name, value, color }: { name: string; value: VidaAttr; color: string }) {
  return (
    <div
      title={`${name}: ${STATE_NAME[value]}`}
      className="flex items-center justify-center gap-1 border border-[var(--bg-tertiary)] rounded py-1"
    >
      <span className={`text-[10px] font-bold ${color}`}>{value === '-' ? '−' : value}</span>
      <span className="text-[10px] text-[var(--text-secondary)]">{name[0]}</span>
    </div>
  );
}

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

function responseToRoll(r: DiceRollResponse): DiceRoll {
  return {
    id: r.id,
    diceType: r.dice_type,
    count: r.count,
    results: r.results,
    total: r.total,
    timestamp: new Date(r.created_at).getTime(),
    label: r.label ?? undefined,
    rollerName: r.roller_name,
  };
}

const HISTORY_POLL_MS = 1000;

export default function DiceRoller({
  onClose,
  onRoll,
  characters = [],
  npcs = [],
  campaignId,
  rollerName,
  fixedEntityKey,
  onRollCreated,
}: DiceRollerProps) {
  const [diceType, setDiceType] = useState(6);
  const [count, setCount] = useState(1);
  const [entityKey, setEntityKey] = useState(fixedEntityKey ?? '');
  const [skill, setSkill] = useState('');
  const [lastRoll, setLastRoll] = useState<DiceRoll | null>(null);
  const [history, setHistory] = useState<DiceRoll[]>([]);
  const [rolling, setRolling] = useState(false);
  const [historyEntityKey, setHistoryEntityKey] = useState<string>(fixedEntityKey ?? '');
  const rollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const entities: RollerEntity[] = [
    ...characters.map((c) => ({
      key: `char:${c.id}`,
      name: c.name,
      vigor: c.vigor,
      intelligence: c.intelligence,
      dexterity: c.dexterity,
      cunning: c.cunning,
    })),
    ...npcs.map((n) => ({
      key: `npc:${n.id}`,
      name: n.name,
      vigor: n.vigor,
      intelligence: n.intelligence,
      dexterity: n.dexterity,
      cunning: n.cunning,
    })),
  ];
  const selected = entities.find((e) => e.key === entityKey) ?? null;

  const isDmMode = !fixedEntityKey;

  useEffect(() => {
    if (isDmMode && entityKey && historyEntityKey !== entityKey) {
      setHistoryEntityKey(entityKey);
    }
  }, [entityKey, isDmMode]);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;

    const fetchHistory = async () => {
      try {
        let rolls: DiceRollResponse[];
        if (historyEntityKey === 'all') {
          rolls = await api.rolls.recentAll(campaignId);
        } else {
          const entityId = historyEntityKey.split(':')[1];
          if (!entityId) return;
          rolls = await api.rolls.history(campaignId, entityId);
        }
        if (!cancelled) {
          setHistory(rolls.map(responseToRoll));
        }
      } catch {
        // best-effort
      }
    };

    fetchHistory();
    const timer = window.setInterval(fetchHistory, HISTORY_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [campaignId, historyEntityKey]);

  const handleRoll = useCallback(() => {
    setRolling(true);
    rollTimeout.current = setTimeout(async () => {
      const { results, total } = rollDice(diceType, count);
      const label = [skill.trim(), selected?.name].filter(Boolean).join(' — ') || undefined;

      if (campaignId) {
        try {
          const entityType = selected?.key.split(':')[0];
          const entityId = selected?.key.split(':')[1];
          const response = await api.rolls.create(campaignId, {
            entity_type: entityType,
            entity_id: entityId,
            entity_name: selected?.name,
            roller_name: rollerName,
            dice_type: diceType,
            count,
            results,
            total,
            label,
          });
          const roll = responseToRoll(response);
          setLastRoll(roll);
          setHistory((prev) => [roll, ...prev].slice(0, 20));
          setRolling(false);
          onRoll?.(roll);
          onRollCreated?.(response);
          return;
        } catch {
          // fall through to local-only roll
        }
      }

      const roll: DiceRoll = {
        id: crypto.randomUUID(),
        diceType,
        count,
        results,
        total,
        timestamp: Date.now(),
        label,
      };
      setLastRoll(roll);
      setHistory((prev) => [roll, ...prev].slice(0, 20));
      setRolling(false);
      onRoll?.(roll);
    }, 300);
  }, [diceType, count, skill, selected, campaignId, rollerName, onRoll, onRollCreated]);

  useEffect(() => {
    return () => {
      if (rollTimeout.current) clearTimeout(rollTimeout.current);
    };
  }, []);

  return (
    <HudPanel
      title="Dice Roller"
      panelId="dice-roller"
      onClose={onClose}
      defaultX={80}
      defaultY={80}
      defaultWidth={280}
    >
      <div className="space-y-3">
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

        {!fixedEntityKey && (
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">Roller Para</p>
            <select
              aria-label="Roller Para"
              value={entityKey}
              onChange={(e) => setEntityKey(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="">— Sin personaje —</option>
              {characters.length > 0 && (
                <optgroup label="Personajes">
                  {characters.map((c) => (
                    <option key={c.id} value={`char:${c.id}`}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {npcs.length > 0 && (
                <optgroup label="NPCs">
                  {npcs.map((n) => (
                    <option key={n.id} value={`npc:${n.id}`}>{n.name}</option>
                  ))}
                </optgroup>
              )}
            </select>

            {selected && (
              <div className="grid grid-cols-4 gap-1 mt-2">
                <AttrChip name="Vigor" value={selected.vigor} color="text-red-400" />
                <AttrChip name="Inteligencia" value={selected.intelligence} color="text-blue-400" />
                <AttrChip name="Destreza" value={selected.dexterity} color="text-green-400" />
                <AttrChip name="Astucia" value={selected.cunning} color="text-yellow-400" />
              </div>
            )}

            <input
              type="text"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="Habilidad (ej: Sigilo) — opcional"
              className="w-full mt-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs rounded px-2 py-1.5 placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>
        )}

        {fixedEntityKey && selected && (
          <div className="grid grid-cols-4 gap-1">
            <AttrChip name="Vigor" value={selected.vigor} color="text-red-400" />
            <AttrChip name="Inteligencia" value={selected.intelligence} color="text-blue-400" />
            <AttrChip name="Destreza" value={selected.dexterity} color="text-green-400" />
            <AttrChip name="Astucia" value={selected.cunning} color="text-yellow-400" />
          </div>
        )}

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

        {lastRoll && (
          <div className="bg-[var(--bg-tertiary)]/50 rounded-lg p-3">
            {lastRoll.label && (
              <p className="text-xs font-semibold text-[var(--accent)] truncate mb-1">{lastRoll.label}</p>
            )}
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
          </div>
        )}

        {isDmMode && (
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">History for</p>
            <select
              aria-label="History entity"
              value={historyEntityKey}
              onChange={(e) => setHistoryEntityKey(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="all">All rolls</option>
              {characters.length > 0 && (
                <optgroup label="Personajes">
                  {characters.map((c) => (
                    <option key={c.id} value={`char:${c.id}`}>{c.name}</option>
                  ))}
                </optgroup>
              )}
              {npcs.length > 0 && (
                <optgroup label="NPCs">
                  {npcs.map((n) => (
                    <option key={n.id} value={`npc:${n.id}`}>{n.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 uppercase tracking-wide">History (max 20)</p>
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {history.map((r) => (
                <div
                  key={r.id}
                  className="px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  {r.label && (
                    <p className="text-[10px] font-semibold text-[var(--accent)] truncate">{r.label}</p>
                  )}
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[var(--text-secondary)] font-mono w-14 shrink-0">
                      {formatTime(r.timestamp)}
                    </span>
                    <span className="text-[var(--text-secondary)] shrink-0">
                      {r.count}d{r.diceType}
                    </span>
                    {r.rollerName && (
                      <span className="text-[var(--text-secondary)]/70 shrink-0 truncate max-w-[60px]">
                        {r.rollerName}
                      </span>
                    )}
                    <span className="flex-1 truncate text-[var(--text-secondary)]">
                      {r.results.join(' + ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </HudPanel>
  );
}
