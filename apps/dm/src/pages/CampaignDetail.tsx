import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Campaign, Character, NPC } from '@/lib/api';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.campaigns.get(id),
      api.characters.list(id).catch(() => []),
      api.npcs.list(id).catch(() => []),
    ])
      .then(([c, chars, npcList]) => {
        setCampaign(c);
        setCharacters(chars);
        setNpcs(npcList);
      })
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
        <InfoCard label="Current Session" value={campaign.current_session_id || 'None'} />
        <InfoCard label="Current Location" value={campaign.current_location_id || 'None'} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Entities</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to={`/campaigns/${campaign.id}/characters`}
            className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
          >
            <p className="font-medium">Characters</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{characters.length} characters</p>
          </Link>
          <Link
            to={`/campaigns/${campaign.id}/npcs`}
            className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
          >
            <p className="font-medium">NPCs</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{npcs.length} NPCs</p>
          </Link>
          <div className="border border-[var(--bg-tertiary)] rounded-lg p-4 opacity-40">
            <p className="font-medium">Sessions</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Coming soon</p>
          </div>
          <div className="border border-[var(--bg-tertiary)] rounded-lg p-4 opacity-40">
            <p className="font-medium">Locations</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Coming soon</p>
          </div>
        </div>
      </div>

      {characters.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Party</h2>
          <div className="grid gap-2">
            {characters.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                to={`/campaigns/${campaign.id}/characters/${c.id}`}
                className="flex items-center gap-3 border border-[var(--bg-tertiary)] rounded-lg p-3 hover:border-[var(--accent)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{c.race} {c.class_}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] text-red-400">PV:{c.current_pv}/{c.max_pv}</span>
                  <span className="text-[10px] text-blue-400">PM:{c.current_pm}/{c.max_pm}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
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
