import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, NPC } from '@/lib/api';
import { VidaBar, VidaAttrs, VidaDerived } from '@/components/VidaDisplay';

function portraitUrl(path: string | null): string | null {
  if (!path) return null;
  return `http://localhost:8000/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

export default function NPCDetail() {
  const { id: campaignId, npcId } = useParams<{ id: string; npcId: string }>();
  const navigate = useNavigate();
  const [npc, setNpc] = useState<NPC | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!campaignId || !npcId) return;
    api.npcs.get(campaignId, npcId)
      .then(setNpc)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId, npcId]);

  const handleDelete = async () => {
    if (!campaignId || !npcId || !confirm('Delete this NPC?')) return;
    await api.npcs.delete(campaignId, npcId);
    navigate(`/campaigns/${campaignId}/npcs`);
  };

  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !npcId) return;
    try {
      const updated = await api.npcs.uploadPortrait(campaignId, npcId, file);
      setNpc(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
    e.target.value = '';
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!npc) return <p className="text-[var(--text-secondary)]">NPC not found</p>;

  const pUrl = portraitUrl(npc.portrait_path);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInput.current?.click()}
            className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl font-bold text-[var(--text-secondary)] overflow-hidden shrink-0 hover:ring-2 hover:ring-[var(--accent)] transition-all cursor-pointer"
            title="Click to upload portrait"
          >
            {pUrl ? (
              <img src={pUrl} alt={npc.name} className="w-full h-full object-cover" />
            ) : (
              npc.name.charAt(0).toUpperCase()
            )}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
          <div>
            <h1 className="text-2xl font-bold">{npc.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded inline-block mt-1 ${
              npc.status === 'alive' ? 'bg-green-900/50 text-green-400' :
              npc.status === 'dead' ? 'bg-red-900/50 text-red-400' :
              'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}>
              {npc.status}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/campaigns/${campaignId}/npcs/${npcId}/edit`}
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

      {npc.description && (
        <p className="text-[var(--text-secondary)] mb-6">{npc.description}</p>
      )}

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">Attributes (VIDA)</h2>
          <VidaAttrs vigor={npc.vigor} intelligence={npc.intelligence} dexterity={npc.dexterity} cunning={npc.cunning} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Derived Stats</h2>
          <VidaDerived max_pv={npc.max_pv} max_pm={npc.max_pm} defense={npc.defense} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Current State</h2>
          <div className="space-y-3">
            <VidaBar current={npc.current_pv} max={npc.max_pv} label="PV (Puntos de Vida)" color="bg-red-500" />
            <VidaBar current={npc.current_pm} max={npc.max_pm} label="PM (Puntos de Mente)" color="bg-blue-500" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Recovery Rates</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Physical Regen</p>
              <p className="text-sm mt-1">{npc.vigor} PV / hour</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Mental Regen</p>
              <p className="text-sm mt-1">{npc.intelligence} PM / hour</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Info</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Knowledge</p>
              <p className="text-sm mt-1">{npc.knowledge_scope}</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Location</p>
              <p className="text-sm mt-1">{npc.current_location_id || 'None'}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
