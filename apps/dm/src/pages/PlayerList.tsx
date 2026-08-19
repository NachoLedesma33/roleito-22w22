import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Player, Character } from '@/lib/api';

export default function PlayerList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCharId, setNewCharId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    Promise.all([
      api.players.list(campaignId).catch(() => []),
      api.characters.list(campaignId).catch(() => []),
    ])
      .then(([p, c]) => { setPlayers(p); setCharacters(c); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newName.trim()) return;
    setSaving(true);
    try {
      const player = await api.players.create(campaignId, {
        name: newName,
        character_id: newCharId || undefined,
      });
      setPlayers((prev) => [...prev, player]);
      setNewName('');
      setNewCharId('');
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (playerId: string) => {
    if (!campaignId || !confirm('Remove this player?')) return;
    await api.players.delete(campaignId, playerId);
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
  };

  const handleAssign = async (playerId: string, characterId: string) => {
    if (!campaignId) return;
    try {
      const updated = await api.players.update(campaignId, playerId, {
        character_id: characterId || undefined,
      });
      setPlayers((prev) => prev.map((p) => (p.id === playerId ? updated : p)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to assign');
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Players</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Player'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="border border-[var(--bg-tertiary)] rounded-lg p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Player Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Player name"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Assign Character</label>
            <select
              value={newCharId}
              onChange={(e) => setNewCharId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="">No character assigned</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.race} {c.class_})</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Player'}
          </button>
        </form>
      )}

      {players.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No players yet</p>
          <p className="text-sm">Add players and assign them characters.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {players.map((p) => {
            const assignedChar = characters.find((c) => c.id === p.character_id);
            return (
              <div
                key={p.id}
                className="border border-[var(--bg-tertiary)] rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {assignedChar
                          ? `${assignedChar.name} (${assignedChar.race} ${assignedChar.class_})`
                          : 'No character assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={p.character_id || ''}
                      onChange={(e) => handleAssign(p.id, e.target.value)}
                      className="text-xs px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    >
                      <option value="">Unassigned</option>
                      {characters.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
