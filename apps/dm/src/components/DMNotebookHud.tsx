import { useState, useEffect, useCallback } from 'react';
import HudPanel from './HudPanel';
import { api, DMNotebook, DMNotebookVersion } from '@/lib/api';

interface DMNotebookHudProps {
  campaignId: string;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'notes', label: 'Notes' },
  { value: 'rules', label: 'Rules' },
  { value: 'lore', label: 'Lore' },
  { value: 'locations', label: 'Locations' },
  { value: 'npcs', label: 'NPCs' },
  { value: 'decisions', label: 'Decisions' },
];

const CATEGORY_ICONS: Record<string, string> = {
  notes: '📝',
  rules: '📜',
  lore: '📖',
  locations: '🗺',
  npcs: '👤',
  decisions: '⚖️',
};

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DMNotebookHud({ campaignId, onClose }: DMNotebookHudProps) {
  const [notebooks, setNotebooks] = useState<DMNotebook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<DMNotebookVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    api.notebooks.list(campaignId)
      .then(setNotebooks)
      .catch(() => setNotebooks([]))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const selected = notebooks.find((n) => n.id === selectedId);

  useEffect(() => {
    if (!selectedId) return;
    api.notebooks.get(campaignId, selectedId).then((n) => {
      setTitleDraft(n.title);
      setContentDraft(n.content);
    });
  }, [selectedId, campaignId]);

  const filtered = filterCat === 'all'
    ? notebooks
    : notebooks.filter((n) => n.category === filterCat);

  const handleCreate = useCallback(async () => {
    const nb = await api.notebooks.create(campaignId, { title: 'New Note', category: 'notes' });
    setNotebooks((prev) => [nb, ...prev]);
    setSelectedId(nb.id);
    setEditing(true);
    setTitleDraft(nb.title);
    setContentDraft(nb.content);
  }, [campaignId]);

  const handleSave = useCallback(async () => {
    if (!selectedId) return;
    const updated = await api.notebooks.update(campaignId, selectedId, {
      title: titleDraft,
      content: contentDraft,
    });
    setNotebooks((prev) => prev.map((n) => (n.id === selectedId ? updated : n)));
    setEditing(false);
  }, [campaignId, selectedId, titleDraft, contentDraft]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await api.notebooks.delete(campaignId, id);
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setEditing(false);
      setShowVersions(false);
    }
  }, [campaignId, selectedId]);

  const handlePin = useCallback(async (id: string, pinned: number) => {
    const updated = await api.notebooks.update(campaignId, id, { pinned: pinned ? 0 : 1 });
    setNotebooks((prev) => {
      const next = prev.map((n) => (n.id === id ? updated : n));
      return [...next].sort(
        (a, b) => b.pinned - a.pinned || b.updated_at.localeCompare(a.updated_at),
      );
    });
  }, [campaignId]);

  const handleShowVersions = useCallback(async (id: string) => {
    const vers = await api.notebooks.versions(id);
    setVersions(vers);
    setShowVersions(true);
  }, []);

  const handleRestore = useCallback(async (notebookId: string, versionId: string) => {
    const updated = await api.notebooks.restoreVersion(notebookId, versionId);
    setNotebooks((prev) => prev.map((n) => (n.id === notebookId ? updated : n)));
    setTitleDraft(updated.title);
    setContentDraft(updated.content);
    setShowVersions(false);
  }, []);

  const handleCategoryChange = useCallback(async (id: string, category: string) => {
    const updated = await api.notebooks.update(campaignId, id, { category });
    setNotebooks((prev) => prev.map((n) => (n.id === id ? updated : n)));
  }, [campaignId]);

  if (loading) {
    return (
      <HudPanel title="DM Notebook" onClose={onClose} defaultX={100} defaultY={80} width={420}>
        <p className="text-xs text-[var(--text-secondary)]">Loading...</p>
      </HudPanel>
    );
  }

  return (
    <HudPanel title="DM Notebook" onClose={onClose} defaultX={100} defaultY={80} width={440}>
      <div className="space-y-3">
        {/* Category Filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setFilterCat('all')}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              filterCat === 'all' ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            All ({notebooks.length})
          </button>
          {CATEGORIES.map((c) => {
            const count = notebooks.filter((n) => n.category === c.value).length;
            return (
              <button
                key={c.value}
                onClick={() => setFilterCat(c.value)}
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  filterCat === c.value ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {CATEGORY_ICONS[c.value]} {c.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            className="flex-1 text-[10px] px-2 py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors font-medium"
          >
            + New Note
          </button>
          {selected && (
            <>
              {editing ? (
                <button
                  onClick={handleSave}
                  className="flex-1 text-[10px] px-2 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 transition-colors font-medium"
                >
                  Save
                </button>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex-1 text-[10px] px-2 py-1.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleShowVersions(selected.id)}
                className="text-[10px] px-2 py-1.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                History
              </button>
            </>
          )}
        </div>

        {/* Note List / Editor */}
        {selected && !showVersions ? (
          <div className="space-y-2">
            {/* Note Header */}
            <div className="flex items-center gap-2">
              {editing ? (
                <input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="flex-1 text-sm font-bold bg-transparent text-[var(--text-primary)] border-b border-[var(--bg-tertiary)] focus:border-[var(--accent)] focus:outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 text-sm font-bold">{selected.title}</span>
              )}
              <select
                value={selected.category}
                onChange={(e) => handleCategoryChange(selected.id, e.target.value)}
                className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button
                onClick={() => handlePin(selected.id, selected.pinned)}
                className="text-xs"
                title={selected.pinned ? 'Unpin' : 'Pin'}
              >
                {selected.pinned ? '📌' : '📍'}
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="text-[var(--text-secondary)] hover:text-red-400 text-xs"
                title="Delete"
              >
                🗑
              </button>
            </div>

            <p className="text-[10px] text-[var(--text-secondary)]">
              {formatTime(selected.updated_at)}
            </p>

            {/* Content Editor / Display */}
            {editing ? (
              <textarea
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                className="w-full h-64 text-xs bg-[var(--bg-primary)] text-[var(--text-primary)] rounded p-2 border border-[var(--bg-tertiary)] focus:border-[var(--accent)] focus:outline-none resize-none font-mono"
                spellCheck={false}
              />
            ) : (
              <div className="max-h-64 overflow-y-auto text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed bg-[var(--bg-tertiary)]/30 rounded p-2">
                {selected.content || 'No content. Click Edit to add.'}
              </div>
            )}

            <button
              onClick={() => {
                setSelectedId(null);
                setEditing(false);
                setShowVersions(false);
              }}
              className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Back to list
            </button>
          </div>
        ) : showVersions ? (
          <div className="space-y-2">
            <button
              onClick={() => setShowVersions(false)}
              className="text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Back to note
            </button>
            <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Version History</p>
            {versions.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No previous versions.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--bg-tertiary)]/30 hover:bg-[var(--bg-tertiary)] transition-colors group"
                  >
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono shrink-0">
                      v{v.version_number}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] flex-1 truncate">
                      {formatTime(v.created_at)}
                    </span>
                    <button
                      onClick={() => handleRestore(selected!.id, v.id)}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Note List */
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] text-center py-4">
                No notes yet. Click "+ New Note" to start.
              </p>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedId(n.id)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-[var(--bg-tertiary)] transition-colors flex items-center gap-2"
                >
                  <span className="text-xs shrink-0">{CATEGORY_ICONS[n.category] || '📝'}</span>
                  <span className="text-xs font-medium truncate flex-1">
                    {n.pinned ? '📌 ' : ''}{n.title}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                    {formatTime(n.updated_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </HudPanel>
  );
}
