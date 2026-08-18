import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, NPC } from '@/lib/api';
import { VidaBar, VidaAttrs } from '@/components/VidaDisplay';

export default function NPCList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.npcs.list(campaignId)
      .then(setNpcs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleDelete = async (npcId: string) => {
    if (!campaignId || !confirm('Delete this NPC?')) return;
    await api.npcs.delete(campaignId, npcId);
    setNpcs((prev) => prev.filter((n) => n.id !== npcId));
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">NPCs</h1>
        <Link
          to={`/campaigns/${campaignId}/npcs/new`}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          New NPC
        </Link>
      </div>

      {npcs.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No NPCs yet</p>
          <p className="text-sm">Create your first NPC to populate the world.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {npcs.map((n) => (
            <div
              key={n.id}
              className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  to={`/campaigns/${campaignId}/npcs/${n.id}`}
                  className="flex-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)]">
                      {n.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold hover:text-[var(--accent)] transition-colors">
                        {n.name}
                      </h2>
                      {n.description && (
                        <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs">
                          {n.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex gap-2 ml-4 items-start">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    n.status === 'alive' ? 'bg-green-900/50 text-green-400' :
                    n.status === 'dead' ? 'bg-red-900/50 text-red-400' :
                    'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}>
                    {n.status}
                  </span>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <VidaAttrs vigor={n.vigor} intelligence={n.intelligence} dexterity={n.dexterity} cunning={n.cunning} />
              </div>
              <div className="mt-3 space-y-2">
                <VidaBar current={n.current_pv} max={n.max_pv} label="PV" color="bg-red-500" />
                <VidaBar current={n.current_pm} max={n.max_pm} label="PM" color="bg-blue-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
