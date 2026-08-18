import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Campaign } from '@/lib/api';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.campaigns.get(id)
      .then(setCampaign)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Delete this campaign?')) return;
    await api.campaigns.delete(id);
    navigate('/');
  };

  const handleExport = async () => {
    if (!id) return;
    const data = await api.campaigns.export(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign?.name || id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!campaign) return <p className="text-[var(--text-secondary)]">Campaign not found</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-[var(--text-secondary)] mt-1">{campaign.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            to={`/campaigns/${campaign.id}/edit`}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleExport}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Export
          </button>
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Created" value={new Date(campaign.created_at).toLocaleString()} />
        <InfoCard label="Updated" value={new Date(campaign.updated_at).toLocaleString()} />
        <InfoCard
          label="Current Session"
          value={campaign.current_session_id || 'None'}
        />
        <InfoCard
          label="Current Location"
          value={campaign.current_location_id || 'None'}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard label="Characters" count={0} disabled />
          <ActionCard label="Sessions" count={0} disabled />
          <ActionCard label="Locations" count={0} disabled />
          <ActionCard label="Events" count={0} disabled />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="text-sm mt-1">{value}</p>
    </div>
  );
}

function ActionCard({ label, count, disabled }: { label: string; count: number; disabled?: boolean }) {
  return (
    <div
      className={`border border-[var(--bg-tertiary)] rounded-lg p-4 ${
        disabled ? 'opacity-40' : 'hover:border-[var(--accent)] cursor-pointer transition-colors'
      }`}
    >
      <p className="font-medium">{label}</p>
      <p className="text-xs text-[var(--text-secondary)] mt-1">{count} items</p>
    </div>
  );
}
