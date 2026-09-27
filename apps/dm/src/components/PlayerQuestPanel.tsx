import { useCallback, useEffect, useState } from 'react';
import HudPanel from './HudPanel';
import { api, type QuestResponse } from '@/lib/api';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-900/60 text-emerald-300',
  completed: 'bg-blue-900/60 text-blue-300',
  failed: 'bg-red-900/60 text-red-300',
};

interface PlayerQuestPanelProps {
  campaignId: string;
  onClose: () => void;
}

export default function PlayerQuestPanel({ campaignId, onClose }: PlayerQuestPanelProps) {
  const [quests, setQuests] = useState<QuestResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const all = await api.quests.list(campaignId);
      setQuests(
        all.filter((q) => q.visible_to_players && q.status !== 'draft')
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las misiones');
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const active = quests.filter((q) => q.status === 'active');
  const archive = quests.filter((q) => q.status !== 'active');

  return (
    <HudPanel
      title="🎯 Misiones"
      panelId="player-quests"
      onClose={onClose}
      defaultX={window.innerWidth - 380}
      defaultY={120}
      defaultWidth={360}
    >
      <div className="space-y-2">
        {error && <div className="text-[10px] text-red-400">{error}</div>}

        {active.map((q) => (
          <QuestCard key={q.id} q={q} />
        ))}
        {archive.length > 0 && (
          <div className="text-[10px] text-[var(--text-secondary)] pt-1">Archivo</div>
        )}
        {archive.map((q) => (
          <QuestCard key={q.id} q={q} dim />
        ))}
        {quests.length === 0 && (
          <div className="text-[10px] text-[var(--text-secondary)]">
            No hay misiones activas.
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

function QuestCard({ q, dim }: { q: QuestResponse; dim?: boolean }) {
  return (
    <div
      className={`rounded border border-[var(--bg-tertiary)] p-2 space-y-1 ${
        dim ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
            STATUS_STYLES[q.status] ?? ''
          }`}
        >
          {q.status}
        </span>
        <span className="flex-1 truncate text-xs font-medium">{q.title}</span>
      </div>
      {q.description && (
        <p className="text-[10px] text-[var(--text-secondary)]">{q.description}</p>
      )}
      {q.objectives.length > 0 && (
        <ul className="space-y-0.5">
          {q.objectives.map((o, i) => (
            <li
              key={i}
              className={`text-[10px] flex items-center gap-1 ${
                o.done ? 'text-[var(--text-secondary)] line-through' : ''
              }`}
            >
              <span className="shrink-0">{o.done ? '☑' : '☐'}</span>
              <span className="truncate">{o.label}</span>
            </li>
          ))}
        </ul>
      )}
      {q.reward && <p className="text-[10px] text-amber-300/80">🏆 {q.reward}</p>}
    </div>
  );
}