import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Map } from '@/lib/api';

export default function MapList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.maps.list(campaignId)
      .then(setMaps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newName.trim()) return;
    setSaving(true);
    try {
      const map = await api.maps.create(campaignId, { name: newName, description: newDesc });
      setMaps((prev) => [...prev, map]);
      setPendingMapId(map.id);
      setNewName('');
      setNewDesc('');
      setShowForm(false);
      setTimeout(() => fileInput.current?.click(), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !pendingMapId) return;
    try {
      const updated = await api.maps.upload(campaignId, pendingMapId, file);
      setMaps((prev) => prev.map((m) => (m.id === pendingMapId ? updated : m)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPendingMapId(null);
      e.target.value = '';
    }
  };

  const handleDelete = async (mapId: string) => {
    if (!campaignId || !confirm('Delete this map?')) return;
    await api.maps.delete(campaignId, mapId);
    setMaps((prev) => prev.filter((m) => m.id !== mapId));
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Maps</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          {showForm ? 'Cancel' : 'New Map'}
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="border border-[var(--bg-tertiary)] rounded-lg p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Map Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="World Map, Dungeon Floor 1..."
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
            {saving ? 'Creating...' : 'Create & Upload Image'}
          </button>
        </form>
      )}

      {maps.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No maps yet</p>
          <p className="text-sm">Upload maps for your sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {maps.map((m) => (
            <div
              key={m.id}
              className="border border-[var(--bg-tertiary)] rounded-lg overflow-hidden"
            >
              {m.file_path ? (
                <div className="h-40 bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-sm">
                  🗺 Map image
                </div>
              ) : (
                <div className="h-40 bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-sm">
                  No image uploaded
                </div>
              )}
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    {m.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{m.description}</p>
                    )}
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1 opacity-60">{m.map_type}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
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
