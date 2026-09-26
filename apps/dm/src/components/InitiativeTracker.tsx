import { useCallback, useEffect, useMemo, useState } from 'react';
import HudPanel from './HudPanel';
import { rollDice } from './DiceRoller';
import { api, type CombatantResponse, type CombatResponse } from '@/lib/api';

interface CombatantSource {
  id: string;
  name: string;
  type: 'character' | 'npc';
  current_pv: number;
  max_pv: number;
  current_pm: number;
  max_pm: number;
}

interface InitiativeTrackerProps {
  combatants: CombatantSource[];
  campaignId: string;
  sceneId: string;
  onUpdateHp: (id: string, current_pv: number) => void;
  onUpdatePm: (id: string, current_pm: number) => void;
  onClose: () => void;
}

const keyOf = (type: string, id: string) => `${type}:${id}`;

export default function InitiativeTracker({
  combatants,
  campaignId,
  sceneId,
  onUpdateHp,
  onUpdatePm,
  onClose,
}: InitiativeTrackerProps) {
  const [combat, setCombat] = useState<CombatResponse | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [selPool, setSelPool] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sources = useMemo(
    () => new Map(combatants.map((c) => [keyOf(c.type, c.id), c])),
    [combatants]
  );

  const inCombat = useMemo(
    () =>
      new Set(
        (combat?.combatants ?? []).map((c) => keyOf(c.entity_type, c.entity_id))
      ),
    [combat]
  );

  const poolCandidates = useMemo(
    () => combatants.filter((c) => !inCombat.has(keyOf(c.type, c.id))),
    [combatants, inCombat]
  );

  // Resume active combat from server (survives refresh) + live poll for player rolls.
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      api.combat
        .getActive(campaignId, sceneId)
        .then((c) => {
          if (!cancelled && c) setCombat(c);
        })
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [campaignId, sceneId]);

  const persistRoll = useCallback(
    (cc: CombatantResponse, value: number) => {
      const src = sources.get(keyOf(cc.entity_type, cc.entity_id));
      api.rolls
        .create(campaignId, {
          entity_type: cc.entity_type,
          entity_id: cc.entity_id,
          entity_name: src?.name,
          roller_name: 'DM',
          dice_type: 6,
          count: 1,
          results: [value],
          total: value,
          label: 'Initiative',
        })
        .catch(() => {});
    },
    [campaignId, sources]
  );

  const handleStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api.combat.start(campaignId, sceneId);
      setCombat(created);
      setSelected([]);
      setSelPool([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start combat');
    } finally {
      setBusy(false);
    }
  }, [campaignId, sceneId]);

  const handleAddPool = useCallback(async () => {
    if (!combat || selPool.length === 0) return;
    const items = selPool.map((key) => {
      const [entityType, entityId] = key.split(':') as [string, string];
      return { entity_type: entityType, entity_id: entityId };
    });
    setBusy(true);
    setError(null);
    try {
      const updated = await api.combat.addCombatants(campaignId, combat.id, items);
      setCombat(updated);
      setSelPool([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setBusy(false);
    }
  }, [combat, campaignId, selPool]);

  const handleRoll = useCallback(
    async (cc: CombatantResponse) => {
      if (!combat) return;
      const { results } = rollDice(6, 1);
      const value = results[0];
      persistRoll(cc, value);
      setBusy(true);
      setError(null);
      try {
        const updated = await api.combat.addCombatants(campaignId, combat.id, [
          { entity_type: cc.entity_type, entity_id: cc.entity_id, initiative: value },
        ]);
        setCombat(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Roll failed');
      } finally {
        setBusy(false);
      }
    },
    [combat, campaignId, persistRoll]
  );

  const handleRollBatch = useCallback(async () => {
    if (!combat || selected.length === 0) return;
    const byKey = new Map(
      combat.combatants.map((c) => [keyOf(c.entity_type, c.entity_id), c])
    );
    // Die results land in selection order → server assigns roll_seq in body
    // order, so ties keep selection order.
    const { results } = rollDice(6, selected.length);
    const items = selected.map((key, i) => {
      const cc = byKey.get(key);
      if (cc) persistRoll(cc, results[i]);
      return {
        entity_type: cc ? cc.entity_type : 'npc',
        entity_id: cc ? cc.entity_id : key,
        initiative: results[i],
      };
    });
    setBusy(true);
    setError(null);
    try {
      const updated = await api.combat.addCombatants(campaignId, combat.id, items);
      setCombat(updated);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Batch roll failed');
    } finally {
      setBusy(false);
    }
  }, [combat, campaignId, selected, persistRoll]);

  const handleNext = useCallback(async () => {
    if (!combat) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.combat.next(campaignId, combat.id);
      setCombat(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Next turn failed');
    } finally {
      setBusy(false);
    }
  }, [combat, campaignId]);

  const handleEnd = useCallback(async () => {
    if (!combat) return;
    setBusy(true);
    setError(null);
    try {
      await api.combat.end(campaignId, combat.id);
      setCombat(null);
      setSelected([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'End combat failed');
    } finally {
      setBusy(false);
    }
  }, [combat, campaignId]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const togglePool = useCallback((key: string) => {
    setSelPool((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const adjustStat = useCallback(
    (entityId: string, field: 'current_pv' | 'current_pm', delta: number, src: CombatantSource) => {
      const max = field === 'current_pv' ? src.max_pv : src.max_pm;
      const current = field === 'current_pv' ? src.current_pv : src.current_pm;
      const newVal = Math.max(0, Math.min(max, current + delta));
      if (field === 'current_pv') onUpdateHp(entityId, newVal);
      else onUpdatePm(entityId, newVal);
    },
    [onUpdateHp, onUpdatePm]
  );

  return (
    <HudPanel
      title={`Initiative — Round ${combat ? combat.round : '-'}`}
      panelId="initiative"
      onClose={onClose}
      defaultX={window.innerWidth - 360}
      defaultY={160}
      defaultWidth={340}
    >
      <div className="space-y-2">
        {!combat && (
          <>
            <button
              onClick={handleStart}
              disabled={busy}
              className="w-full text-xs px-3 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors font-semibold disabled:opacity-50"
            >
              Start Combat
            </button>
            <div className="text-[10px] text-[var(--text-secondary)]">
              Empty combat — now add the tokens that will fight. Roll d6 per
              combatant — highest first, ties go by roll order.
            </div>
          </>
        )}

        {combat && (
          <>
            <div className="flex items-center justify-between mb-1 gap-2">
              <span className="text-[10px] text-[var(--text-secondary)]">
                Round {combat.round} — Turn{' '}
                {combat.combatants.length
                  ? `${combat.current_turn + 1}/${combat.combatants.length}`
                  : '0/0'}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handleNext}
                  disabled={busy}
                  className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
                >
                  Next Turn ▸
                </button>
                <button
                  onClick={handleEnd}
                  disabled={busy}
                  className="text-[10px] px-2 py-1 rounded bg-red-900/60 text-red-200 hover:bg-red-800 transition-colors disabled:opacity-50"
                >
                  End
                </button>
              </div>
            </div>

            {selected.length > 0 && (
              <button
                onClick={handleRollBatch}
                disabled={busy}
                className="w-full text-[10px] px-2 py-1 rounded bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors disabled:opacity-50"
              >
                🎲 Roll d6 × {selected.length} — selected NPCs (in selection order)
              </button>
            )}

            {error && <div className="text-[10px] text-red-400">{error}</div>}

            {poolCandidates.length > 0 && (
              <div className="border-t border-[var(--bg-tertiary)] pt-1.5 mt-1.5">
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">
                  Scene tokens — select who fights
                </p>
                <div className="space-y-0.5 max-h-28 overflow-y-auto">
                  {poolCandidates.map((c) => {
                    const key = keyOf(c.type, c.id);
                    const isSel = selPool.includes(key);
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => togglePool(key)}
                          className="w-3 h-3 accent-[var(--accent)]"
                        />
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${c.type === 'character' ? 'bg-green-400' : 'bg-yellow-400'}`}
                        />
                        <span className="truncate">{c.name}</span>
                        {c.type === 'character' && (
                          <span className="ml-auto text-[9px] opacity-60">player roll</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <button
                  onClick={handleAddPool}
                  disabled={busy || selPool.length === 0}
                  className="w-full mt-1 text-[10px] px-2 py-1 rounded bg-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors disabled:opacity-40"
                >
                  Add to combat ({selPool.length})
                </button>
              </div>
            )}

            <div className="space-y-1">
              {combat.combatants.map((cc, i) => {
                const src = sources.get(keyOf(cc.entity_type, cc.entity_id));
                if (!src) return null;
                const key = keyOf(cc.entity_type, cc.entity_id);
                const isActive = i === combat.current_turn;
                const isDead = src.current_pv <= 0;
                const isSelected = selected.includes(key);
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded text-xs transition-colors ${
                      isActive
                        ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30'
                        : isDead
                          ? 'opacity-40'
                          : ''
                    }`}
                  >
                    {cc.entity_type === 'npc' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(key)}
                        className="w-3 h-3 accent-[var(--accent)] shrink-0"
                        title="Select for batch roll"
                      />
                    )}
                    <span className="w-4 text-center text-[10px] text-[var(--text-secondary)] font-mono">
                      {cc.initiative ?? '—'}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          cc.entity_type === 'character' ? '#4ade80' : '#facc15',
                      }}
                    />
                    <div className="flex-1 min-w-0 flex flex-col leading-tight">
                      <span className="truncate font-medium">{src.name}</span>
                      {cc.entity_type === 'character' && cc.pending_roll === 1 && (
                        <span className="text-[9px] text-amber-400 animate-pulse">
                          ⏳ player roll
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRoll(cc)}
                      disabled={busy}
                      title="Roll d6"
                      className="w-6 h-5 flex items-center justify-center rounded bg-[var(--bg-tertiary)] hover:bg-[var(--accent)]/30 text-[10px] disabled:opacity-50 shrink-0"
                    >
                      🎲
                    </button>

                    {/* HP controls */}
                    <button
                      onClick={() => adjustStat(cc.entity_id, 'current_pv', -1, src)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-red-900/50 hover:bg-red-800 text-red-300 text-[10px] shrink-0"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-[10px]">
                      <span className="text-red-400">{src.current_pv}</span>
                      <span className="text-[var(--text-secondary)]">/{src.max_pv}</span>
                    </span>
                    <button
                      onClick={() => adjustStat(cc.entity_id, 'current_pv', 1, src)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-green-900/50 hover:bg-green-800 text-green-300 text-[10px] shrink-0"
                    >
                      +
                    </button>

                    {/* PM controls */}
                    <button
                      onClick={() => adjustStat(cc.entity_id, 'current_pm', -1, src)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-blue-900/50 hover:bg-blue-800 text-blue-300 text-[10px] shrink-0"
                    >
                      −
                    </button>
                    <span className="w-12 text-center text-[10px]">
                      <span className="text-blue-400">{src.current_pm}</span>
                      <span className="text-[var(--text-secondary)]">/{src.max_pm}</span>
                    </span>
                    <button
                      onClick={() => adjustStat(cc.entity_id, 'current_pm', 1, src)}
                      className="w-5 h-5 flex items-center justify-center rounded bg-blue-900/50 hover:bg-blue-800 text-blue-300 text-[10px] shrink-0"
                    >
                      +
                    </button>
                  </div>
                );
              })}
            </div>

            {combat.combatants.length === 0 && (
              <div className="text-[10px] text-[var(--text-secondary)]">
                No combatants yet.
              </div>
            )}
          </>
        )}
      </div>
    </HudPanel>
  );
}