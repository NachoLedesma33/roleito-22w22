import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

interface SessionMemory {
  session_id: string;
  session_number: number;
  title: string;
  date: string;
  summary: string;
  key_discoveries: string[];
  character_changes: string[];
  word_count: number;
}

interface CampaignMemory {
  campaign_id: string;
  total_sessions: number;
  current_arc: string | null;
  arcs: any[];
  sessions: SessionMemory[];
  active_threads: string[];
  major_npcs: string[];
  key_locations: string[];
}

export default function MemoryView() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [memory, setMemory] = useState<CampaignMemory | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    setLoading(true);
    api.memory.get(campaignId)
      .then(setMemory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleSearch = async () => {
    if (!campaignId || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await api.memory.search(campaignId, searchQuery);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  if (loading) return <div className="text-[var(--text-secondary)]">Loading memory...</div>;
  if (!memory) return <div className="text-[var(--text-secondary)]">No memory data</div>;

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Campaign Memory</h1>

      <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Search Memory</h2>
        <div className="flex gap-2">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search events, NPCs, locations..."
            className="flex-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded text-sm hover:bg-[var(--accent-hover)]"
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-[var(--text-secondary)]">{searchResults.length} results</p>
            {searchResults.map((r, i) => (
              <div key={i} className="bg-[var(--bg-secondary)] rounded px-3 py-2 text-sm">
                <span className="text-[var(--accent)]">S{r.session_number}</span>
                <span className="ml-2 text-[var(--text-secondary)]">[{r.event_type}]</span>
                <span className="ml-2">{r.description}</span>
                <span className="ml-2 text-[var(--text-secondary)]">— {r.actor}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-secondary)]">Total Sessions</p>
          <p className="text-2xl font-bold mt-1">{memory.total_sessions}</p>
        </div>
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-secondary)]">Active NPCs</p>
          <p className="text-2xl font-bold mt-1">{memory.major_npcs.length}</p>
        </div>
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <p className="text-xs text-[var(--text-secondary)]">Key Locations</p>
          <p className="text-2xl font-bold mt-1">{memory.key_locations.length}</p>
        </div>
      </div>

      {memory.active_threads.length > 0 && (
        <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
          <h2 className="text-sm font-semibold mb-2">Active Threads</h2>
          <ul className="space-y-1">
            {memory.active_threads.map((t, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)]">• {t}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border border-[var(--bg-tertiary)] rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Session History</h2>
        <div className="space-y-3">
          {memory.sessions.map((s) => (
            <div key={s.session_id} className="bg-[var(--bg-secondary)] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">
                  Session {s.session_number}: {s.title}
                </h3>
                <span className="text-xs text-[var(--text-secondary)]">{s.date}</span>
              </div>
              {s.summary && (
                <p className="text-sm text-[var(--text-secondary)] mb-2">{s.summary}</p>
              )}
              {s.key_discoveries.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Key Discoveries:</p>
                  {s.key_discoveries.map((d, i) => (
                    <p key={i} className="text-xs text-[var(--text-secondary)]">• {d}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {memory.sessions.length === 0 && (
            <p className="text-sm text-[var(--text-secondary)]">No sessions recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}
