import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

interface EntityState {
  entity_id: string;
  entity_type: string;
  name: string;
  status: string;
  current_location_id: string | null;
  hp: number | null;
  max_hp: number | null;
  metadata: Record<string, unknown>;
}

interface WorldState {
  version: number;
  campaign_id: string;
  current_session_id: string | null;
  current_location_id: string | null;
  current_date: string;
  characters: Record<string, EntityState>;
  npcs: Record<string, EntityState>;
  locations: Record<string, EntityState>;
  quests: Record<string, unknown>;
  active_threads: string[];
  applied_events: string[];
}

export default function WorldStateView() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [state, setState] = useState<WorldState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchState = async () => {
    if (!campaignId) return;
    try {
      setLoading(true);
      const data = await api.get<WorldState>(`/world-state/${campaignId}`);
      setState(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading world state');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
  }, [campaignId]);

  if (loading) return <div className="text-[var(--text-secondary)]">Loading world state...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!state) return <div className="text-[var(--text-secondary)]">No world state found</div>;

  const characters = Object.values(state.characters);
  const npcs = Object.values(state.npcs);
  const locations = Object.values(state.locations);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">World State</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--text-secondary)]">
            Version {state.version} • {state.applied_events.length} events applied
          </span>
          <button
            onClick={fetchState}
            className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)]"
          >
            Recompute
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-secondary)]">Current Session</p>
          <p className="text-lg font-semibold mt-1">{state.current_session_id || 'None'}</p>
        </div>
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-secondary)]">Current Location</p>
          <p className="text-lg font-semibold mt-1">
            {state.current_location_id
              ? state.locations[state.current_location_id]?.name || state.current_location_id
              : 'Unknown'}
          </p>
        </div>
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-secondary)]">Characters</p>
          <p className="text-lg font-semibold mt-1">{characters.length}</p>
        </div>
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-secondary)]">NPCs</p>
          <p className="text-lg font-semibold mt-1">{npcs.length}</p>
        </div>
      </div>

      {state.active_threads.length > 0 && (
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">Active Threads</h2>
          <ul className="space-y-1">
            {state.active_threads.map((thread, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)]">• {thread}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">Characters ({characters.length})</h2>
          <div className="space-y-2">
            {characters.map((c) => (
              <div key={c.entity_id} className="flex items-center justify-between bg-[var(--bg-secondary)] rounded px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    c.status === 'alive' ? 'bg-green-900/50 text-green-400' :
                    c.status === 'dead' ? 'bg-red-900/50 text-red-400' :
                    'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}>{c.status}</span>
                </div>
                {c.hp !== null && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    HP {c.hp}/{c.max_hp}
                  </span>
                )}
              </div>
            ))}
            {characters.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No characters</p>
            )}
          </div>
        </div>

        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-3">NPCs ({npcs.length})</h2>
          <div className="space-y-2">
            {npcs.map((n) => (
              <div key={n.entity_id} className="flex items-center justify-between bg-[var(--bg-secondary)] rounded px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{n.name}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                    n.status === 'alive' ? 'bg-green-900/50 text-green-400' :
                    n.status === 'dead' ? 'bg-red-900/50 text-red-400' :
                    'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}>{n.status}</span>
                </div>
                {n.hp !== null && (
                  <span className="text-xs text-[var(--text-secondary)]">
                    HP {n.hp}/{n.max_hp}
                  </span>
                )}
              </div>
            ))}
            {npcs.length === 0 && (
              <p className="text-sm text-[var(--text-secondary)]">No NPCs</p>
            )}
          </div>
        </div>
      </div>

      <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Locations ({locations.length})</h2>
        <div className="grid grid-cols-3 gap-2">
          {locations.map((loc) => (
            <div key={loc.entity_id} className="bg-[var(--bg-secondary)] rounded px-3 py-2">
              <span className="text-sm font-medium">{loc.name}</span>
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                loc.status === 'active' ? 'bg-blue-900/50 text-blue-400' :
                'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
              }`}>{loc.status}</span>
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">No locations</p>
          )}
        </div>
      </div>

      <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-2">Applied Events ({state.applied_events.length})</h2>
        <p className="text-xs text-[var(--text-secondary)]">
          {state.applied_events.length > 0
            ? `${state.applied_events.length} events have been applied to world state`
            : 'No events have been applied yet'}
        </p>
      </div>
    </div>
  );
}
