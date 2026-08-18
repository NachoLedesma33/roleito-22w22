import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Character } from '@/lib/api';
import { VidaBar, VidaAttrs, VidaDerived } from '@/components/VidaDisplay';

export default function CharacterDetail() {
  const { id: campaignId, characterId } = useParams<{ id: string; characterId: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !characterId) return;
    api.characters.get(campaignId, characterId)
      .then(setCharacter)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId, characterId]);

  const handleDelete = async () => {
    if (!campaignId || !characterId || !confirm('Delete this character?')) return;
    await api.characters.delete(campaignId, characterId);
    navigate(`/campaigns/${campaignId}/characters`);
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!character) return <p className="text-[var(--text-secondary)]">Character not found</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl font-bold text-[var(--accent)]">
            {character.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{character.name}</h1>
            <p className="text-[var(--text-secondary)]">
              {character.race} {character.class_} · {character.type}
            </p>
            <span className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${
              character.status === 'alive' ? 'bg-green-900/50 text-green-400' :
              character.status === 'dead' ? 'bg-red-900/50 text-red-400' :
              'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}>
              {character.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/campaigns/${campaignId}/characters/${characterId}/edit`}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {character.description && (
        <p className="text-[var(--text-secondary)] mb-6">{character.description}</p>
      )}

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">Attributes (VIDA)</h2>
          <VidaAttrs vigor={character.vigor} intelligence={character.intelligence} dexterity={character.dexterity} cunning={character.cunning} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Derived Stats</h2>
          <VidaDerived max_pv={character.max_pv} max_pm={character.max_pm} defense={character.defense} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Current State</h2>
          <div className="space-y-3">
            <VidaBar current={character.current_pv} max={character.max_pv} label="PV (Puntos de Vida)" color="bg-red-500" />
            <VidaBar current={character.current_pm} max={character.max_pm} label="PM (Puntos de Mente)" color="bg-blue-500" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Recovery Rates</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Physical Regen</p>
              <p className="text-sm mt-1">{character.vigor} PV / hour</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Mental Regen</p>
              <p className="text-sm mt-1">{character.intelligence} PM / hour</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Knowledge</p>
              <p className="text-sm mt-1">{character.knowledge_scope}</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Location</p>
              <p className="text-sm mt-1">{character.current_location_id || 'None'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
