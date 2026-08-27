import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Campaign } from '@/lib/api';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'delete' | 'edit' | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.campaigns.list()
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === campaigns.length) {
        return new Set();
      }
      return new Set(campaigns.map((c) => c.id));
    });
  }, [campaigns]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await api.campaigns.delete(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Delete ${ids.length} campaign(s)?`)) return;
    await api.campaigns.bulkDelete(ids);
    setCampaigns((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setBulkAction(null);
  };

  const handleBulkEdit = async () => {
    const ids = Array.from(selectedIds);
    const data: { name?: string; description?: string } = {};
    if (editName.trim()) data.name = editName.trim();
    if (editDescription.trim()) data.description = editDescription.trim();
    if (Object.keys(data).length === 0) {
      setBulkAction(null);
      return;
    }
    await api.campaigns.bulkUpdate(ids, data);
    setCampaigns((prev) =>
      prev.map((c) => {
        if (!selectedIds.has(c.id)) return c;
        return { ...c, ...data };
      })
    );
    setSelectedIds(new Set());
    setBulkAction(null);
    setEditName('');
    setEditDescription('');
  };

  const handleExport = async (id: string) => {
    const data = await api.campaigns.export(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkExportAll = async () => {
    const ids = Array.from(selectedIds);
    const data = await api.campaigns.bulkExport(ids);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-bulk-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkExportIndividual = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await handleExport(id);
    }
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      const campaign = await api.campaigns.import(data);
      navigate(`/campaigns/${campaign.id}`);
    };
    input.click();
  };

  const openBulkEdit = () => {
    setEditName('');
    setEditDescription('');
    setBulkAction('edit');
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

  const hasSelection = selectedIds.size > 0;
  const allSelected = campaigns.length > 0 && selectedIds.size === campaigns.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            className="px-4 py-2 text-sm rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Import
          </button>
          <Link
            to="/campaigns/new"
            className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            New Campaign
          </Link>
        </div>
      </div>

      {hasSelection && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent)] flex items-center gap-4">
          <span className="text-sm text-[var(--text-primary)]">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="text-xs px-3 py-1.5 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={handleBulkExportAll}
            className="text-xs px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Export (combined)
          </button>
          <button
            onClick={handleBulkExportIndividual}
            className="text-xs px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Export (individual)
          </button>
          <button
            onClick={openBulkEdit}
            className="text-xs px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={clearSelection}
            className="text-xs px-3 py-1.5 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {bulkAction === 'edit' && (
        <div className="mb-4 p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent)]">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            Edit {selectedIds.size} campaign(s)
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="New name (leave empty to keep)"
              className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="New description (leave empty to keep)"
              className="w-full px-3 py-2 text-sm rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-2">
              <button
                onClick={handleBulkEdit}
                className="px-3 py-1.5 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setBulkAction(null)}
                className="px-3 py-1.5 text-sm rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No campaigns yet</p>
          <p className="text-sm">Create one or import an existing campaign.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-3 px-4 py-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {allSelected ? 'Deselect all' : 'Select all'}
            </span>
          </div>
          {campaigns.map((c) => (
            <div
              key={c.id}
              className={`border rounded-lg p-4 transition-colors ${
                selectedIds.has(c.id)
                  ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                  : 'border-[var(--bg-tertiary)] hover:border-[var(--accent)]'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggleSelect(c.id)}
                  className="w-4 h-4 mt-1 rounded border-[var(--bg-tertiary)] text-[var(--accent)] focus:ring-[var(--accent)]"
                />
                <Link
                  to={`/campaigns/${c.id}`}
                  className="flex-1"
                >
                  <h2 className="text-lg font-semibold hover:text-[var(--accent)] transition-colors">
                    {c.name}
                  </h2>
                  {c.description && (
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                      {c.description}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-secondary)] mt-2 opacity-60">
                    Updated {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </Link>
                <div className="flex gap-2 ml-4">
                  <Link
                    to={`/campaigns/${c.id}/manage`}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Manage
                  </Link>
                  <button
                    onClick={() => handleExport(c.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
