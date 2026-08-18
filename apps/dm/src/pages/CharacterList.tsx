import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Character } from '@/lib/api';
import { VidaBar, VidaAttrs } from '@/components/VidaDisplay';

export default function CharacterList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.characters.list(campaignId)
      .then(setCharacters)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleDelete = async (charId: string) => {
    if (!campaignId || !confirm('Delete this character?')) return;
    await api.characters.delete(campaignId, charId);
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Characters</h1>
        <Link
          to={`/campaigns/${campaignId}/characters/new`}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          New Character
        </Link>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No characters yet</p>
          <p className="text-sm">Create your first character to begin.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {characters.map((c) => (
            <div
              key={c.id}
              className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  to={`/campaigns/${campaignId}/characters/${c.id}`}
                  className="flex-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold hover:text-[var(--accent)] transition-colors">
                        {c.name}
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {c.race} {c.class_} · {c.type}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="flex gap-2 ml-4 items-start">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    c.status === 'alive' ? 'bg-green-900/50 text-green-400' :
                    c.status === 'dead' ? 'bg-red-900/50 text-red-400' :
                    'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}>
                    {c.status}
                  </span>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <VidaAttrs vigor={c.vigor} intelligence={c.intelligence} dexterity={c.dexterity} cunning={c.cunning} />
              </div>
              <div className="mt-3 space-y-2">
                <VidaBar current={c.current_pv} max={c.max_pv} label="PV" color="bg-red-500" />
                <VidaBar current={c.current_pm} max={c.max_pm} label="PM" color="bg-blue-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
