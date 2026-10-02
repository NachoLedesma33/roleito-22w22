import { useCallback, useEffect, useRef, useState } from 'react';
import HudPanel from './HudPanel';
import { api, type HandoutResponse } from '@/lib/api';

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  const parts = path.replace(/\\/g, '/').split('/assets/');
  return parts.length > 1 ? `/api/static/${parts[1]}` : null;
}

interface PlayerHandoutPanelProps {
  campaignId: string;
  onClose: () => void;
  /** Cambia cuando el DM muta algo; dispara recarga si el panel está abierto. */
  revision?: string;
}

export default function PlayerHandoutPanel({
  campaignId,
  onClose,
  revision,
}: PlayerHandoutPanelProps) {
  const [handouts, setHandouts] = useState<HandoutResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const lastRevRef = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const all = await api.handouts.list(campaignId);
      setHandouts(all.filter((h) => h.visible_to_players));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los documentos');
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!revision) return;
    if (lastRevRef.current === undefined) {
      lastRevRef.current = revision;
      return;
    }
    if (lastRevRef.current !== revision) {
      lastRevRef.current = revision;
      void load();
    }
  }, [revision, load]);

  return (
    <HudPanel
      title="🗂 Documentos"
      panelId="player-handouts"
      onClose={onClose}
      defaultX={window.innerWidth - 700}
      defaultY={120}
      defaultWidth={340}
    >
      <div className="space-y-2">
        {error && <div className="text-[10px] text-red-400">{error}</div>}

        {handouts.map((h) => {
          const open = openId === h.id;
          const img = staticUrl(h.image_path);
          return (
            <div
              key={h.id}
              data-testid={`player-handout-${h.id}`}
              className="rounded border border-[var(--bg-tertiary)] p-2 space-y-1"
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : h.id)}
                className="w-full flex items-center gap-1.5 text-left"
              >
                <span className="shrink-0 text-[10px] text-[var(--text-secondary)]">
                  {open ? '▾' : '▸'}
                </span>
                <span className="flex-1 truncate text-xs font-medium">{h.title}</span>
              </button>

              {open && (
                <div className="space-y-2 pt-1">
                  {h.content && (
                    <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                      {h.content}
                    </p>
                  )}
                  {img && (
                    <img
                      src={img}
                      alt={h.title}
                      data-testid="player-handout-image"
                      className="max-h-56 w-full rounded border border-[var(--bg-tertiary)] object-contain"
                    />
                  )}
                  {!h.content && !img && (
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      Documento sin contenido.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {handouts.length === 0 && !error && (
          <div className="text-[10px] text-[var(--text-secondary)]">
            Todavía no hay documentos.
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