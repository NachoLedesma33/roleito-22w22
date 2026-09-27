import { useCallback, useEffect, useState, type FormEvent } from 'react';
import HudPanel from './HudPanel';
import { api, type CalendarState } from '@/lib/api';

function Segments({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-3 rounded-sm transition-colors ${
            i < filled ? 'bg-emerald-500' : 'bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}

interface CalendarPanelProps {
  campaignId: string;
  onClose: () => void;
}

export default function CalendarPanel({ campaignId, onClose }: CalendarPanelProps) {
  const [state, setState] = useState<CalendarState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSize, setNewSize] = useState(4);

  const load = useCallback(async () => {
    try {
      setState(await api.calendar.get(campaignId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el calendario');
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const advance = useCallback(
    async (addDays: number) => {
      setBusy(true);
      try {
        setState(await api.calendar.advance(campaignId, addDays));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Advance failed');
      } finally {
        setBusy(false);
      }
    },
    [campaignId]
  );

  const handleCreate = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!newTitle.trim()) return;
      setBusy(true);
      try {
        await api.calendar.createClock(campaignId, {
          title: newTitle.trim(),
          segments_total: newSize,
        });
        setNewTitle('');
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Create failed');
      } finally {
        setBusy(false);
      }
    },
    [campaignId, newTitle, newSize, load]
  );

  const handleTick = useCallback(
    async (clockId: string, delta: number) => {
      setBusy(true);
      try {
        const c = state?.clocks.find((x) => x.id === clockId);
        if (!c) return;
        await api.calendar.updateClock(campaignId, clockId, {
          segments_filled: Math.max(0, Math.min(c.segments_total, c.segments_filled + delta)),
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Tick failed');
      } finally {
        setBusy(false);
      }
    },
    [campaignId, state, load]
  );

  const handleToggleVisible = useCallback(
    async (clockId: string) => {
      setBusy(true);
      try {
        const c = state?.clocks.find((x) => x.id === clockId);
        if (!c) return;
        await api.calendar.updateClock(campaignId, clockId, {
          visible_to_players: !c.visible_to_players,
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Toggle failed');
      } finally {
        setBusy(false);
      }
    },
    [campaignId, state, load]
  );

  const handleDelete = useCallback(
    async (clockId: string) => {
      setBusy(true);
      try {
        await api.calendar.removeClock(campaignId, clockId);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      } finally {
        setBusy(false);
      }
    },
    [campaignId, load]
  );

  const dateLabel = state
    ? `${state.day} de ${state.month_names[state.month - 1] ?? ''} de ${state.year}`
    : '…';

  return (
    <HudPanel
      title="📅 Calendario y Relojes"
      panelId="calendar"
      onClose={onClose}
      defaultX={window.innerWidth - 420}
      defaultY={120}
      defaultWidth={400}
    >
      <div className="p-3 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-lg font-semibold text-[var(--accent)]">{dateLabel}</div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => advance(-7)}
              className="px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
              title="Retroceder una semana"
            >
              −7
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => advance(-1)}
              className="px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
              title="Retroceder un día"
            >
              −1
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => advance(1)}
              className="px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
              title="Avanzar un día"
            >
              +1
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => advance(7)}
              className="px-2 py-1 rounded bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
              title="Avanzar una semana"
            >
              +7
            </button>
          </div>
        </div>

        {error && <div className="text-red-400 text-xs">{error}</div>}

        <div className="border-t border-[var(--bg-tertiary)] pt-3 space-y-2">
          <div className="font-semibold text-xs text-[var(--text-secondary)] uppercase tracking-wide">
            Relojes de progreso
          </div>
          {state && state.clocks.length === 0 && (
            <div className="text-xs text-[var(--text-secondary)]">Sin relojes todavía.</div>
          )}
          {state?.clocks.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded bg-[var(--bg-tertiary)]/50 px-2 py-1.5"
            >
              <div>
                <div className="font-medium">
                  {c.title}
                  {!c.visible_to_players && <span className="ml-1 text-xs">🚫</span>}
                </div>
                <Segments total={c.segments_total} filled={c.segments_filled} />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleTick(c.id, -1)}
                  className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
                  title="Quitar un segmento"
                >
                  −1
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleTick(c.id, 1)}
                  className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
                  title="Marcar un segmento"
                >
                  +1
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleVisible(c.id)}
                  className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] hover:text-[var(--accent)]"
                  title="Visible para jugadores"
                >
                  {c.visible_to_players ? '👁' : '🚫'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(c.id)}
                  className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] hover:text-red-400"
                  title="Eliminar reloj"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
          <form onSubmit={handleCreate} className="flex gap-2 pt-1">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nuevo reloj (ritual, doom timer…)"
              className="flex-1 min-w-0 rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            <select
              value={newSize}
              onChange={(e) => setNewSize(Number(e.target.value))}
              className="rounded bg-[var(--bg-tertiary)] px-1 py-1 text-xs"
            >
              {[4, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy || !newTitle.trim()}
              className="px-2 py-1 rounded bg-[var(--accent)] text-white disabled:opacity-40"
            >
              Añadir
            </button>
          </form>
        </div>
      </div>
    </HudPanel>
  );
}