import { useEffect, useRef, useState, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { api } from '@/lib/api';
import type { VidaAttr } from '@/lib/api';
import { VidaAttrsInput, NumberInput } from '@/components/VidaInputs';

function ModelPreview({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
    </group>
  );
}

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
  const [vigor, setVigor] = useState<VidaAttr>('/');
  const [intelligence, setIntelligence] = useState<VidaAttr>('/');
  const [dexterity, setDexterity] = useState<VidaAttr>('/');
  const [cunning, setCunning] = useState<VidaAttr>('/');
  const [maxPv, setMaxPv] = useState(10);
  const [maxPm, setMaxPm] = useState(10);
  const [defense, setDefense] = useState(5);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelPreviewUrl, setModelPreviewUrl] = useState<string | null>(null);
  const modelFileInput = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!isEdit);
  const [error, setError] = useState<string | null>(null);

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
          setMaxPv(c.max_pv);
          setMaxPm(c.max_pm);
          setDefense(c.defense);
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
        max_pv: maxPv,
        max_pm: maxPm,
        defense,
      };
      if (isEdit) {
        await api.characters.update(campaignId, characterId!, data);
        if (portraitFile) {
          await api.characters.uploadPortrait(campaignId, characterId!, portraitFile);
        }
        if (modelFile) {
          await api.characters.uploadModel(campaignId, characterId!, modelFile);
        }
        navigate(`/campaigns/${campaignId}/characters/${characterId}`);
      } else {
        const char = await api.characters.create(campaignId, data);
        if (portraitFile) {
          await api.characters.uploadPortrait(campaignId, char.id, portraitFile);
        }
        if (modelFile) {
          await api.characters.uploadModel(campaignId, char.id, modelFile);
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
          <label className="block text-sm text-[var(--text-secondary)] mb-1">3D Model (.glb)</label>
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => modelFileInput.current?.click()}
              className="w-20 h-20 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center overflow-hidden shrink-0 border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-all"
            >
              {modelPreviewUrl ? (
                <div className="w-full h-full">
                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--text-secondary)]">Loading...</div>}>
                    <Canvas camera={{ position: [0, 1, 2.5], fov: 40 }}>
                      <ambientLight intensity={1.2} />
                      <directionalLight position={[2, 3, 1]} intensity={1.5} />
                      <ModelPreview url={modelPreviewUrl} />
                      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0} />
                    </Canvas>
                  </Suspense>
                </div>
              ) : (
                <span className="text-2xl">🧊</span>
              )}
            </button>
            <input
              ref={modelFileInput}
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setModelFile(file);
                  setModelPreviewUrl(URL.createObjectURL(file));
                }
                e.target.value = '';
              }}
            />
            <div className="text-xs text-[var(--text-secondary)]">
              <p>{modelFile ? modelFile.name : 'No file selected'}</p>
              <p className="mt-1">Optional. Upload a .glb 3D model. If set, renders as 3D token in scene.</p>
              {modelPreviewUrl && (
                <button
                  type="button"
                  onClick={() => { setModelFile(null); setModelPreviewUrl(null); }}
                  className="mt-1 text-red-400 hover:text-red-300"
                >
                  Remove model
                </button>
              )}
            </div>
          </div>
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
