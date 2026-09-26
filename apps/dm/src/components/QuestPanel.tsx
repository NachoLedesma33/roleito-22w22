import { useCallback, useEffect, useState, type FormEvent } from 'react';
import HudPanel from './HudPanel';
import { api, type QuestInput, type QuestObjective, type QuestResponse } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  active: 'bg-emerald-900/60 text-emerald-300',
  completed: 'bg-blue-900/60 text-blue-300',
  failed: 'bg-red-900/60 text-red-300',
};

interface QuestPanelProps {
  campaignId: string;
  onClose: () => void;
}

export default function QuestPanel({ campaignId, onClose }: QuestPanelProps) {
  const [quests, setQuests] = useState<QuestResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setQuests(await api.quests.list(campaignId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quests');
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    async (q: QuestResponse) => {
      setBusy(true);
      setError(null);
      try {
        await api.quests.remove(campaignId, q.id);
        setQuests((prev) => prev.filter((x) => x.id !== q.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      } finally {
        setBusy(false);
      }
    },
    [campaignId]
  );

  const handleToggleVisible = useCallback(
    async (q: QuestResponse) => {
      setBusy(true);
      setError(null);
      try {
        const updated = await api.quests.update(campaignId, q.id, {
          title: q.title,
          description: q.description,
          status: q.status,
          objectives: q.objectives,
          reward: q.reward,
          visible_to_players: !q.visible_to_players,
        });
        setQuests((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Update failed');
      } finally {
        setBusy(false);
      }
    },
    [campaignId]
  );

  return (
    <HudPanel
      title="Quest Board"
      panelId="quests"
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
        >
          {creating ? 'Cancel' : '＋ New quest'}
        </button>

        {creating && (
          <QuestForm
            onSubmit={async (data) => {
              setBusy(true);
              setError(null);
              try {
                const created = await api.quests.create(campaignId, data);
                setQuests((prev) => [created, ...prev]);
                setCreating(false);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Create failed');
              } finally {
                setBusy(false);
              }
            }}
            onCancel={() => setCreating(false)}
          />
        )}

        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {quests.map((q) => (
            <div key={q.id} className="rounded border border-[var(--bg-tertiary)] p-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded capitalize ${
                    STATUS_COLORS[q.status] ?? STATUS_COLORS.draft
                  }`}
                >
                  {q.status}
                </span>
                <span className="flex-1 truncate text-xs font-medium">{q.title}</span>
                <button
                  type="button"
                  title={q.visible_to_players ? 'Visible to players' : 'Hidden from players'}
                  onClick={() => handleToggleVisible(q)}
                  disabled={busy}
                  className="text-[10px] opacity-70 hover:opacity-100"
                >
                  {q.visible_to_players ? '👁' : '🚫'}
                </button>
                <button
                  type="button"
                  title="Edit"
                  onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                  className="text-[10px] opacity-70 hover:opacity-100"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => handleDelete(q)}
                  disabled={busy}
                  className="text-[10px] opacity-70 hover:opacity-100"
                >
                  🗑
                </button>
              </div>

              {editingId === q.id ? (
                <QuestForm
                  initial={q}
                  onSubmit={async (data) => {
                    setBusy(true);
                    setError(null);
                    try {
                      const updated = await api.quests.update(campaignId, q.id, data);
                      setQuests((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                      setEditingId(null);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Update failed');
                    } finally {
                      setBusy(false);
                    }
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <>
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
                  {q.reward && (
                    <p className="text-[10px] text-amber-300/80">🏆 {q.reward}</p>
                  )}
                </>
              )}
            </div>
          ))}
          {quests.length === 0 && !creating && (
            <div className="text-[10px] text-[var(--text-secondary)]">No quests yet.</div>
          )}
        </div>
      </div>
    </HudPanel>
  );
}

function QuestForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: QuestResponse;
  onSubmit: (data: QuestInput) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'active');
  const [reward, setReward] = useState(initial?.reward ?? '');
  const [visible, setVisible] = useState(initial?.visible_to_players ?? true);
  const [objectives, setObjectives] = useState<QuestObjective[]>(initial?.objectives ?? []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      status,
      objectives: objectives.filter((o) => o.label.trim() !== ''),
      reward,
      visible_to_players: visible,
    });
  };

  return (
    <form onSubmit={submit} className="space-y-1.5 rounded border border-[var(--bg-tertiary)] p-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quest title"
        required
        className="w-full text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-transparent focus:border-[var(--accent)] outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        rows={2}
        className="w-full text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] border border-transparent focus:border-[var(--accent)] outline-none resize-none"
      />
      <div className="space-y-1">
        {objectives.map((o, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={o.done}
              onChange={(e) =>
                setObjectives((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x))
                )
              }
              className="w-3 h-3 accent-[var(--accent)] shrink-0"
            />
            <input
              value={o.label}
              onChange={(e) =>
                setObjectives((prev) =>
                  prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))
                )
              }
              placeholder={`Objective ${i + 1}`}
              className="flex-1 min-w-0 text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] outline-none"
            />
            <button
              type="button"
              onClick={() => setObjectives((prev) => prev.filter((_, j) => j !== i))}
              className="text-[10px] opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setObjectives((prev) => [...prev, { label: '', done: false }])}
          className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ＋ objective
        </button>
      </div>
      <input
        value={reward}
        onChange={(e) => setReward(e.target.value)}
        placeholder="Reward (e.g. 100 gp)"
        className="w-full text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] outline-none"
      />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-tertiary)] outline-none"
          >
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
            className="w-3 h-3 accent-[var(--accent)]"
          />
          visible
        </label>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
        >
          Save
        </button>
      </div>
    </form>
  );
}