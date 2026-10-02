import { useCallback, useEffect, useState, type FormEvent } from 'react';
import HudPanel from './HudPanel';
import { api, type HandoutInput, type HandoutResponse } from '@/lib/api';

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  const parts = path.replace(/\\/g, '/').split('/assets/');
  return parts.length > 1 ? `/api/static/${parts[1]}` : null;
}

interface HandoutPanelProps {
  campaignId: string;
  onClose: () => void;
}

export default function HandoutPanel({ campaignId, onClose }: HandoutPanelProps) {
  const [handouts, setHandouts] = useState<HandoutResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setHandouts(await api.handouts.list(campaignId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los documentos');
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const upsert = useCallback((h: HandoutResponse) => {
    setHandouts((prev) => {
      const idx = prev.findIndex((x) => x.id === h.id);
      if (idx === -1) return [h, ...prev];
      const next = [...prev];
      next[idx] = h;
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (h: HandoutResponse) => {
      setBusy(true);
      setError(null);
      try {
        await api.handouts.remove(campaignId, h.id);
        setHandouts((prev) => prev.filter((x) => x.id !== h.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo eliminar');
      } finally {
        setBusy(false);
      }
    },
    [campaignId]
  );

  const handleToggleVisible = useCallback(
    async (h: HandoutResponse) => {
      setBusy(true);
      setError(null);
      try {
        const updated = await api.handouts.update(campaignId, h.id, {
          title: h.title,
          content: h.content,
          image_path: h.image_path,
          visible_to_players: !h.visible_to_players,
        });
        upsert(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo actualizar');
      } finally {
        setBusy(false);
      }
    },
    [campaignId, upsert]
  );

  const handleUploadImage = useCallback(
    async (h: HandoutResponse, file: File) => {
      setBusy(true);
      setError(null);
      try {
        upsert(await api.handouts.uploadImage(campaignId, h.id, file));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo subir la imagen');
      } finally {
        setBusy(false);
      }
    },
    [campaignId, upsert]
  );

  const handleClearImage = useCallback(
    async (h: HandoutResponse) => {
      setBusy(true);
      setError(null);
      try {
        upsert(await api.handouts.clearImage(campaignId, h.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo quitar la imagen');
      } finally {
        setBusy(false);
      }
    },
    [campaignId, upsert]
  );

  return (
    <HudPanel
      title="Documentos para jugadores"
      panelId="handouts"
      onClose={onClose}
      defaultX={window.innerWidth - 380}
      defaultY={120}
      defaultWidth={360}
    >
      <div className="space-y-2">
        {error && <div className="text-[10px] text-red-400">{error}</div>}

        <button
          type="button"
          onClick={() => setCreating(!creating)}
          disabled={busy}
          className={`w-full text-xs px-3 py-1.5 rounded transition-colors ${
            creating
              ? 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              : 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]'
          }`}
          data-testid="handout-new"
        >
          {creating ? 'Cancelar' : '＋ Nuevo documento'}
        </button>

        {creating && (
          <HandoutForm
            onSubmit={async (data) => {
              setBusy(true);
              setError(null);
              try {
                upsert(await api.handouts.create(campaignId, data));
                setCreating(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'No se pudo crear');
              } finally {
                setBusy(false);
              }
            }}
            onCancel={() => setCreating(false)}
          />
        )}

        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {handouts.map((h) => {
            const img = staticUrl(h.image_path);
            return (
              <div
                key={h.id}
                className="rounded border border-[var(--bg-tertiary)] p-2 space-y-1"
                data-testid={`handout-${h.id}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 truncate text-xs font-medium">{h.title}</span>
                  <button
                    type="button"
                    title={h.visible_to_players ? 'Visible para jugadores' : 'Oculto para jugadores'}
                    onClick={() => handleToggleVisible(h)}
                    disabled={busy}
                    className="text-[10px] opacity-70 hover:opacity-100"
                  >
                    {h.visible_to_players ? '👁' : '🚫'}
                  </button>
                  <button
                    type="button"
                    title="Editar"
                    onClick={() => setEditingId(editingId === h.id ? null : h.id)}
                    className="text-[10px] opacity-70 hover:opacity-100"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    title="Eliminar"
                    onClick={() => handleDelete(h)}
                    disabled={busy}
                    className="text-[10px] opacity-70 hover:opacity-100"
                  >
                    🗑
                  </button>
                </div>

                {img && (
                  <img
                    src={img}
                    alt={h.title}
                    data-testid="handout-image"
                    className="w-full max-h-40 object-cover rounded border border-[var(--bg-tertiary)]"
                  />
                )}

                <div className="flex items-center gap-2">
                  <label
                    className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                      busy
                        ? 'opacity-50'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    🖼 {img ? 'Reemplazar imagen' : 'Subir imagen'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={busy}
                      className="hidden"
                      data-testid="handout-image-input"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(h, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {img && (
                    <button
                      type="button"
                      onClick={() => handleClearImage(h)}
                      disabled={busy}
                      className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      Quitar imagen
                    </button>
                  )}
                </div>

                {editingId === h.id ? (
                  <HandoutForm
                    initial={h}
                    onSubmit={async (data) => {
                      setBusy(true);
                      setError(null);
                      try {
                        upsert(await api.handouts.update(campaignId, h.id, data));
                        setEditingId(null);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'No se pudo actualizar');
                      } finally {
                        setBusy(false);
                      }
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  h.content && (
                    <p className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap">
                      {h.content}
                    </p>
                  )
                )}
              </div>
            );
          })}
          {handouts.length === 0 && !creating && (
            <div className="text-[10px] text-[var(--text-secondary)]">
              Todavía no hay documentos.
            </div>
          )}
        </div>
      </div>
    </HudPanel>
  );
}

function HandoutForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: HandoutResponse;
  onSubmit: (data: HandoutInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [visible, setVisible] = useState(initial?.visible_to_players ?? true);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      content,
      image_path: initial?.image_path ?? null,
      visible_to_players: visible,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-1.5 rounded border border-[var(--bg-tertiary)] p-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del documento"
        required
        className="w-full text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-transparent focus:border-[var(--accent)] outline-none"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Texto (pista, nota, carta...)"
        rows={3}
        className="w-full text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-transparent focus:border-[var(--accent)] outline-none resize-none"
      />
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="w-3 h-3 accent-[var(--accent)]"
          />
          visible para jugadores
        </label>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
        >
          Guardar
        </button>
      </div>
    </form>
  );
}