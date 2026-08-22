import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Scene } from '@/lib/api';

export default function SceneList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    api.scenes.list(campaignId)
      .then(setScenes)
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newName.trim()) return;
    setSaving(true);
    try {
      const scene = await api.scenes.create(campaignId, { name: newName, description: newDesc });
      setScenes((prev) => [...prev, scene]);
      setNewName('');
      setNewDesc('');
      setShowForm(false);
      navigate(`/campaigns/${campaignId}/scenes/${scene.id}`);
    } catch {
      // scene creation failure is surfaced by the form staying open
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sceneId: string) => {
    if (!campaignId || !confirm('Delete this scene?')) return;
    await api.scenes.delete(campaignId, sceneId);
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Scenes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          {showForm ? 'Cancel' : 'New Scene'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border border-[var(--bg-tertiary)] rounded-lg p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Scene Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Tavern, Forest, Dungeon..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Optional description"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Scene'}
          </button>
        </form>
      )}

      {scenes.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No scenes yet</p>
          <p className="text-sm">Create scenes to render in 3D.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {scenes.map((s) => (
            <div
              key={s.id}
              className="border border-[var(--bg-tertiary)] rounded-lg overflow-hidden cursor-pointer hover:border-[var(--accent)] transition-colors"
              onClick={() => navigate(`/campaigns/${campaignId}/scenes/${s.id}`)}
            >
              <div className="h-32 bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-sm">
                {s.background_path ? '🗺 Scene' : 'No background'}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{s.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${s.status === 'active' ? 'bg-green-900/30 text-green-400' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                        {s.status}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                        {s.lighting}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
