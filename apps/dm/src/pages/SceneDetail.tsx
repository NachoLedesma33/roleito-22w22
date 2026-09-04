import { useEffect, useRef, useState, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { api, Scene, SceneCharacter, Character, NPC, Map } from '@/lib/api';
import SceneRenderer from '@/components/SceneRenderer';

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  return `/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

function randomOffset(): number {
  return Math.random() * 4 - 2;
}

export default function SceneDetail() {
  const { id: campaignId, sceneId } = useParams<{ id: string; sceneId: string }>();
  const [scene, setScene] = useState<Scene | null>(null);
  const [sceneChars, setSceneChars] = useState<SceneCharacter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [lighting, setLighting] = useState('neutral');
  const [notes, setNotes] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!campaignId || !sceneId) return;
    Promise.all([
      api.scenes.get(campaignId, sceneId),
      api.scenes.getCharacters(campaignId, sceneId).catch(() => []),
      api.characters.list(campaignId).catch(() => []),
      api.npcs.list(campaignId).catch(() => []),
      api.maps.list(campaignId).catch(() => []),
    ])
      .then(([s, sc, c, n, m]) => {
        setScene(s);
        setSceneChars(sc);
        setCharacters(c);
        setNpcs(n);
        setMaps(m);
        setName(s.name);
        setDesc(s.description);
        setLighting(s.lighting);
        setNotes(s.notes || '');
      })
      .finally(() => setLoading(false));
  }, [campaignId, sceneId]);

  useEffect(() => {
    if (!campaignId || !sceneId) return;
    let cancelled = false;
    let timer: number;
    const poll = async () => {
      try {
        const sc = await api.scenes.getCharacters(campaignId, sceneId);
        if (!cancelled) setSceneChars(sc);
      } catch {}
      if (!cancelled) timer = window.setTimeout(poll, 100);
    };
    timer = window.setTimeout(poll, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [campaignId, sceneId]);

  const handleSave = async () => {
    if (!campaignId || !sceneId) return;
    const updated = await api.scenes.update(campaignId, sceneId, { name, description: desc, lighting, notes });
    setScene(updated);
    setEditing(false);
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !sceneId) return;
    const updated = await api.scenes.uploadBackground(campaignId, sceneId, file);
    setScene(updated);
    e.target.value = '';
  };

  const handlePickFromLibrary = async (mapId: string) => {
    if (!campaignId || !sceneId) return;
    const map = maps.find((m) => m.id === mapId);
    if (!map) return;
    const updated = await api.scenes.update(campaignId, sceneId, {});
    setScene({ ...updated, background_path: map.file_path });
  };

  const handleToggleActive = async () => {
    if (!campaignId || !sceneId || !scene) return;
    const newStatus = scene.status === 'active' ? 'inactive' : 'active';
    const updated = await api.scenes.update(campaignId, sceneId, { status: newStatus });
    setScene(updated);
  };

  const handleAddToScene = async (entityType: string, entityId: string) => {
    if (!campaignId || !sceneId) return;
    const newChars = [...sceneChars, {
      entity_type: entityType,
      entity_id: entityId,
      x: randomOffset(),
      y: 0,
      z: randomOffset(),
      visible: true,
      order: sceneChars.length,
    }];
    const updated = await api.scenes.updateCharacters(campaignId, sceneId, newChars);
    setSceneChars(updated);
  };

  const handleRemoveFromScene = async (scId: string) => {
    if (!campaignId || !sceneId) return;
    const updated = sceneChars.filter((c) => c.id !== scId);
    const result = await api.scenes.updateCharacters(campaignId, sceneId, updated);
    setSceneChars(result);
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (!scene) return <p className="text-red-400">Scene not found</p>;

  const allEntities = [
    ...characters.map((c) => ({ type: 'character' as const, id: c.id, name: c.name, sub: `${c.race} ${c.class_}`, portrait_path: c.portrait_path })),
    ...npcs.map((n) => ({ type: 'npc' as const, id: n.id, name: n.name, sub: n.status, portrait_path: n.portrait_path })),
  ];
  const onSceneIds = new Set(sceneChars.map((c) => c.entity_id));

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          {editing ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="px-3 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] text-lg font-bold"
              />
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="px-3 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm flex-1"
                placeholder="Description"
              />
              <select
                value={lighting}
                onChange={(e) => setLighting(e.target.value)}
                className="px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm"
              >
                <option value="neutral">Neutral</option>
                <option value="dark">Dark</option>
                <option value="dim">Dim</option>
                <option value="bright">Bright</option>
                <option value="torchlight">Torchlight</option>
              </select>
              <button onClick={handleSave} className="px-3 py-1 rounded bg-[var(--accent)] text-white text-sm">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{scene.name}</h1>
              {scene.description && <span className="text-[var(--text-secondary)] text-sm">{scene.description}</span>}
              <span className={`text-xs px-2 py-0.5 rounded ${scene.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                {scene.status}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="px-3 py-1 text-sm rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              Edit
            </button>
          )}
          <button onClick={handleToggleActive} className={`px-3 py-1 text-sm rounded ${scene.status === 'active' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
            {scene.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={() => fileInput.current?.click()} className="px-3 py-1 text-sm rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Upload Background
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        <div className="border border-[var(--bg-tertiary)] rounded-lg overflow-hidden bg-black aspect-video">
          {scene.background_path ? (
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">Loading 3D...</div>}>
              <SceneRenderer
                backgroundUrl={staticUrl(scene.background_path)!}
                characters={sceneChars.map((sc) => {
                  const ent = allEntities.find((e) => e.id === sc.entity_id);
                  return {
                    id: sc.id,
                    sceneCharId: sc.id,
                    name: ent?.name || 'Unknown',
                    type: sc.entity_type,
                    x: sc.x,
                    y: sc.y,
                    z: sc.z,
                    visible: !!sc.visible,
                    portraitUrl: staticUrl(ent?.portrait_path ?? null),
                  };
                })}
                lighting={scene.lighting}
                mapScale={scene.map_scale ?? 1}
                gridSize={scene.grid_size ?? 0}
                gridSnap={scene.grid_snap ?? false}
              />
            </Suspense>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
              <div className="text-center">
                <p className="text-lg mb-2">No background image</p>
                <p className="text-sm mb-4">Upload a map or pick from Image Library.</p>
                {maps.length > 0 && (
                  <div className="flex gap-2 justify-center flex-wrap">
                    {maps.filter((m) => m.file_path).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handlePickFromLibrary(m.id)}
                        className="px-3 py-1 text-xs rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent)] transition-colors"
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2">On Scene ({sceneChars.length})</h3>
            {sceneChars.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No entities placed</p>
            ) : (
              <div className="space-y-1">
                {sceneChars.map((sc) => {
                  const ent = allEntities.find((e) => e.id === sc.entity_id);
                  return (
                    <div key={sc.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[var(--bg-tertiary)]">
                      <span>
                        <span className="opacity-50">[{sc.entity_type}]</span> {ent?.name || 'Unknown'}
                      </span>
                      <button
                        onClick={() => handleRemoveFromScene(sc.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2">Available</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {allEntities.filter((e) => !onSceneIds.has(e.id)).map((ent) => (
                <button
                  key={ent.id}
                  onClick={() => handleAddToScene(ent.type, ent.id)}
                  className="w-full flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                >
                  <span>
                    <span className="opacity-50">[{ent.type}]</span> {ent.name}
                  </span>
                  <span className="text-[var(--accent)]">+ Add</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
            <h3 className="text-sm font-medium mb-2">Scene Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleSave}
              placeholder="Notes about this scene..."
              className="w-full h-32 text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded p-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
