import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { VidaDerived } from '@/components/VidaDisplay';

export default function CharacterForm() {
  const { id: campaignId, characterId } = useParams<{ id: string; characterId: string }>();
  const isEdit = characterId && characterId !== 'new';
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('player');
  const [description, setDescription] = useState('');
  const [className, setClassName] = useState('');
  const [race, setRace] = useState('');
  const [vigor, setVigor] = useState(1);
  const [intelligence, setIntelligence] = useState(1);
  const [dexterity, setDexterity] = useState(1);
  const [cunning, setCunning] = useState(1);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);

  const max_pv = vigor * 2 + dexterity;
  const max_pm = intelligence * 2 + cunning;
  const defense = dexterity + cunning;

  useEffect(() => {
    if (isEdit && campaignId && characterId) {
      api.characters.get(campaignId, characterId)
        .then((c) => {
          setName(c.name);
          setType(c.type);
          setDescription(c.description);
          setClassName(c.class_);
          setRace(c.race);
          setVigor(c.vigor);
          setIntelligence(c.intelligence);
          setDexterity(c.dexterity);
          setCunning(c.cunning);
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [campaignId, characterId, isEdit]);

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
        type,
        description,
        class_name: className,
        race,
        vigor,
        intelligence,
        dexterity,
        cunning,
      };
      if (isEdit) {
        await api.characters.update(campaignId, characterId!, data);
        if (portraitFile) {
          await api.characters.uploadPortrait(campaignId, characterId!, portraitFile);
        }
        navigate(`/campaigns/${campaignId}/characters/${characterId}`);
      } else {
        const char = await api.characters.create(campaignId, data);
        if (portraitFile) {
          await api.characters.uploadPortrait(campaignId, char.id, portraitFile);
        }
        navigate(`/campaigns/${campaignId}/characters/${char.id}`);
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
        {isEdit ? 'Edit Character' : 'New Character'}
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
            placeholder="Character name"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="player">Player</option>
              <option value="npc">NPC</option>
              <option value="creature">Creature</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Race</label>
            <input
              type="text"
              value={race}
              onChange={(e) => setRace(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Humano, Elfo..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Class</label>
          <input
            type="text"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            placeholder="Guerrero, Mago..."
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] h-24 resize-none"
            placeholder="Character description..."
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">Portrait</label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="w-20 h-20 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl font-bold text-[var(--accent)] overflow-hidden shrink-0 border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-all"
            >
              {portraitPreview ? (
                <img src={portraitPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm">📷</span>
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPortraitFile(file);
                  setPortraitPreview(URL.createObjectURL(file));
                }
                e.target.value = '';
              }}
            />
            <div className="text-xs text-[var(--text-secondary)]">
              <p>{portraitFile ? portraitFile.name : 'No file selected'}</p>
              <p className="mt-1">Optional. Upload a portrait for this character.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Attributes (VIDA)</label>
          <div className="grid grid-cols-4 gap-3">
            <VidaInput label="Vigor [V]" value={vigor} onChange={setVigor} color="text-red-400" />
            <VidaInput label="Inteligencia [I]" value={intelligence} onChange={setIntelligence} color="text-blue-400" />
            <VidaInput label="Destreza [D]" value={dexterity} onChange={setDexterity} color="text-green-400" />
            <VidaInput label="Astucia [A]" value={cunning} onChange={setCunning} color="text-yellow-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">Derived Stats</label>
          <VidaDerived max_pv={max_pv} max_pm={max_pm} defense={defense} />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Character'}
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

function VidaInput({ label, value, onChange, color }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-xs ${color} mb-1`}>{label}</p>
      <input
        type="number"
        min={1}
        max={20}
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
        className="w-full px-2 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] text-center focus:outline-none focus:border-[var(--accent)]"
      />
    </div>
  );
}
