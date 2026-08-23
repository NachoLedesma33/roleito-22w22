import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import type { VidaAttr } from '@/lib/api';
import { VidaAttrsInput, NumberInput } from '@/components/VidaInputs';

export default function NPCForm() {
  const { id: campaignId, npcId } = useParams<{ id: string; npcId: string }>();
  const isEdit = npcId && npcId !== 'new';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [vigor, setVigor] = useState<VidaAttr>('/');
  const [intelligence, setIntelligence] = useState<VidaAttr>('/');
  const [dexterity, setDexterity] = useState<VidaAttr>('/');
  const [cunning, setCunning] = useState<VidaAttr>('/');
  const [maxPv, setMaxPv] = useState(10);
  const [maxPm, setMaxPm] = useState(10);
  const [defense, setDefense] = useState(5);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && campaignId && npcId) {
      api.npcs.get(campaignId, npcId)
        .then((n) => {
          setName(n.name);
          setDescription(n.description);
          setVigor(n.vigor);
          setIntelligence(n.intelligence);
          setDexterity(n.dexterity);
          setCunning(n.cunning);
          setMaxPv(n.max_pv);
          setMaxPm(n.max_pm);
          setDefense(n.defense);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [campaignId, npcId, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !campaignId) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const data = {
        name,
        description,
        vigor,
        intelligence,
        dexterity,
        cunning,
        max_pv: maxPv,
        max_pm: maxPm,
        defense,
      };
      if (isEdit) {
        await api.npcs.update(campaignId, npcId!, data);
        navigate(`/campaigns/${campaignId}/npcs/${npcId}`);
      } else {
        const npc = await api.npcs.create(campaignId, data);
        navigate(`/campaigns/${campaignId}/npcs/${npc.id}`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">
        {isEdit ? 'Edit NPC' : 'New NPC'}
      </h1>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="NPC name"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] h-24 resize-none"
            placeholder="Who is this NPC?"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Attributes (VIDA)</label>
          <VidaAttrsInput
            vigor={vigor}
            intelligence={intelligence}
            dexterity={dexterity}
            cunning={cunning}
            onChange={(attr, v) => {
              if (attr === 'vigor') setVigor(v);
              else if (attr === 'intelligence') setIntelligence(v);
              else if (attr === 'dexterity') setDexterity(v);
              else setCunning(v);
            }}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Stats</label>
          <div className="grid grid-cols-3 gap-3">
            <NumberInput label="Max PV" value={maxPv} onChange={setMaxPv} />
            <NumberInput label="Max PM" value={maxPm} onChange={setMaxPm} />
            <NumberInput label="Defensa" value={defense} onChange={setDefense} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create NPC'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
