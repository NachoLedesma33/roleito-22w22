import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, Campaign } from '@/lib/api';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.campaigns.list()
      .then(setCampaigns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    await api.campaigns.delete(id);
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
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

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

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

      {campaigns.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No campaigns yet</p>
          <p className="text-sm">Create one or import an existing campaign.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between">
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
