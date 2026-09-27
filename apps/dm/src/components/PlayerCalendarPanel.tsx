import { useCallback, useEffect, useState } from 'react';
import HudPanel from './HudPanel';
import { api, type CalendarState} from '@/lib/api';

interface PlayerCalendarPanelProps {
  campaignId: string;
  onClose: () => void;
}

export default function PlayerCalendarPanel({ campaignId, onClose }: PlayerCalendarPanelProps) {
  const [state, setState] = useState<CalendarState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await api.calendar.get(campaignId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calendar');
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleClocks = state?.clocks.filter((c) => c.visible_to_players) ?? [];

  return (
    <HudPanel
      title="📅 Calendario"
      panelId="player-calendar"
      onClose={onClose}
      defaultX={window.innerWidth - 360}
      defaultY={120}
      defaultWidth={340}
    >
      <div className="space-y-2 p-3">
        {error && <div className="text-[10px] text-red-400">{error}</div>}
        {state ? (
          <div className="text-lg font-semibold text-[var(--accent)]">
            {state.day} de {state.month_names[state.month - 1] ?? ''} de {state.year}
          </div>
        ) : (
          <div className="text-xs text-[var(--text-secondary)]">Cargando…</div>
        )}

        {state && visibleClocks.length > 0 && (
          <div className="border-t border-[var(--bg-tertiary)] pt-2 space-y-1.5">
            <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">
              Relojes compartidos
            </div>
            {visibleClocks.map((c) => (
              <div key={c.id} className="rounded bg-[var(--bg-tertiary)]/50 px-2 py-1.5">
                <div className="text-xs font-medium">{c.title}</div>
                <div className="flex gap-1 pt-1">
                  {Array.from({ length: c.segments_total }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-3 w-3 rounded-sm ${
                        i < c.segments_filled ? 'bg-emerald-500' : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={load}
          className="w-full text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ⟳ Recargar
        </button>
      </div>
    </HudPanel>
  );
}