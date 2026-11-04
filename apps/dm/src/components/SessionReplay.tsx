import { useEffect, useState } from 'react';
import { api, type Event } from '@/lib/api';
import HudPanel from './HudPanel';

interface SessionReplayProps {
  campaignId: string;
  sessionId: string;
  onClose: () => void;
}

const TYPE_ICONS: Record<string, string> = {
  movement: '→',
  combat: '⚔',
  dialogue: '💬',
  roll: '🎲',
  scene_change: '🗺',
  loot: '💰',
  status: '✨',
  default: '•',
};

export default function SessionReplay({ campaignId, sessionId, onClose }: SessionReplayProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    api.events.listBySession(campaignId, sessionId)
      .then((evs) => { if (!cancelled) setEvents(evs); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId, sessionId]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const types = ['all', ...Array.from(new Set(events.map((e) => e.type)))];

  return (
    <HudPanel title="Replay de sesión" panelId="session-replay" onClose={onClose} className="w-[420px]">
      <div className="space-y-3 p-3">
        <div className="flex gap-1 flex-wrap">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[10px] px-2 py-0.5 rounded border ${filter === t ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
            >
              {t === 'all' ? 'Todos' : t}
            </button>
          ))}
        </div>
        {loading && <p className="text-xs text-[var(--text-secondary)]">Cargando eventos...</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!loading && filtered.length === 0 && <p className="text-xs text-[var(--text-secondary)]">Sin eventos.</p>}
        <div className="max-h-96 overflow-y-auto space-y-1">
          {filtered.map((ev, i) => (
            <div key={ev.id ?? i} className="flex items-start gap-2 text-xs border-b border-[var(--bg-tertiary)]/30 pb-1">
              <span className="text-[var(--accent)] shrink-0">{TYPE_ICONS[ev.type] ?? TYPE_ICONS.default}</span>
              <div className="min-w-0">
                <p className="text-[var(--text-primary)] truncate">{ev.type}</p>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">{ev.actor_id ?? ''} · {ev.description ?? ''}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-secondary)]">Total: {events.length} eventos · Mostrando: {filtered.length}</p>
      </div>
    </HudPanel>
  );
}