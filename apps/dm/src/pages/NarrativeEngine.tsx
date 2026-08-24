import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, NarrativeEvent, ParseResponse } from '@/lib/api';

export default function NarrativeEngine() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [text, setText] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [sceneName, setSceneName] = useState('');
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!campaignId || !text.trim() || !sessionId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.narrative.parse(campaignId, {
        text: text.trim(),
        session_id: sessionId.trim(),
        scene_name: sceneName.trim() || undefined,
      });
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Parse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      await api.events.approve(eventId);
      setResult((prev) =>
        prev
          ? { ...prev, events: prev.events.filter((e) => e.event_id !== eventId) }
          : prev,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    }
  };

  const handleReject = async (eventId: string) => {
    try {
      await api.events.reject(eventId);
      setResult((prev) =>
        prev
          ? { ...prev, events: prev.events.filter((e) => e.event_id !== eventId) }
          : prev,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    }
  };

  const handleApproveAll = async () => {
    if (!result) return;
    for (const evt of result.events) {
      try {
        await api.events.approve(evt.event_id);
      } catch {
        // ignore individual failures
      }
    }
    setResult((prev) => (prev ? { ...prev, events: [] } : prev));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Narrative Engine</h1>

      <div className="grid gap-4 mb-6">
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Session ID
          </label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="session-..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            Scene Name (optional)
          </label>
          <input
            type="text"
            value={sceneName}
            onChange={(e) => setSceneName(e.target.value)}
            placeholder="e.g. Vault entrance"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1">
            DM Narration
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="Los aventureros atraviesan lentamente la bóveda mientras las antorchas comienzan a apagarse..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-3 py-2 text-sm resize-y"
          />
        </div>

        <button
          onClick={handleParse}
          disabled={loading || !text.trim() || !sessionId.trim()}
          className="self-start px-4 py-2 rounded bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50"
        >
          {loading ? 'Parsing...' : 'Parse Narrative'}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {result && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              Extracted Events ({result.events.length})
            </h2>
            {result.events.length > 0 && (
              <button
                onClick={handleApproveAll}
                className="text-xs px-3 py-1.5 rounded bg-green-900/50 text-green-400 hover:bg-green-900/80"
              >
                Approve All
              </button>
            )}
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-4 p-3 rounded bg-yellow-900/30 border border-yellow-800/50">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-yellow-400">
                  {w}
                </p>
              ))}
            </div>
          )}

          {result.events.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-secondary)]">
              <p className="text-lg mb-2">No events extracted</p>
              <p className="text-sm">Try more descriptive narration.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {result.events.map((evt) => (
                <div
                  key={evt.event_id}
                  className="border border-[var(--bg-tertiary)] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <EventTypeBadge type={evt.type} />
                        <ConfidenceBadge value={evt.confidence} />
                      </div>
                      <p className="text-sm">{evt.description}</p>
                      <div className="flex gap-4 mt-1 text-xs text-[var(--text-secondary)]">
                        {evt.actor_id && <span>Actor: {evt.actor_id}</span>}
                        {evt.target_id && <span>Target: {evt.target_id}</span>}
                        {evt.location_id && (
                          <span>Location: {evt.location_id}</span>
                        )}
                      </div>
                      {(evt.unresolved_actors.length > 0 ||
                        evt.unresolved_targets.length > 0) && (
                        <div className="mt-2 text-xs text-yellow-400">
                          Unresolved:{' '}
                          {[...evt.unresolved_actors, ...evt.unresolved_targets].join(
                            ', ',
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(evt.event_id)}
                        className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-400 hover:bg-green-900/80"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(evt.event_id)}
                        className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    CHARACTER_CREATED: 'bg-purple-900/50 text-purple-400',
    CHARACTER_DIED: 'bg-red-900/50 text-red-400',
    CHARACTER_INJURED: 'bg-orange-900/50 text-orange-400',
    CHARACTER_HEALED: 'bg-green-900/50 text-green-400',
    CHARACTER_LEVEL_UP: 'bg-indigo-900/50 text-indigo-400',
    CHARACTER_JOINED: 'bg-blue-900/50 text-blue-400',
    CHARACTER_LEFT: 'bg-gray-900/50 text-gray-400',
    LOCATION_ENTERED: 'bg-cyan-900/50 text-cyan-400',
    LOCATION_EXITED: 'bg-cyan-900/50 text-cyan-400',
    LOCATION_DISCOVERED: 'bg-cyan-900/50 text-cyan-400',
    ITEM_FOUND: 'bg-yellow-900/50 text-yellow-400',
    ITEM_USED: 'bg-yellow-900/50 text-yellow-400',
    QUEST_CREATED: 'bg-indigo-900/50 text-indigo-400',
    QUEST_COMPLETED: 'bg-green-900/50 text-green-400',
    COMBAT_STARTED: 'bg-red-900/50 text-red-400',
    COMBAT_ENDED: 'bg-orange-900/50 text-orange-400',
    DIALOGUE: 'bg-blue-900/50 text-blue-400',
    REVELATION: 'bg-purple-900/50 text-purple-400',
    SECRET_DISCOVERED: 'bg-purple-900/50 text-purple-400',
    WORLD_STATE_CHANGED: 'bg-teal-900/50 text-teal-400',
    SCENE_ENTERED: 'bg-blue-900/50 text-blue-400',
    SCENE_EXITED: 'bg-blue-900/50 text-blue-400',
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded ${colors[type] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
    >
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 0.9
      ? 'bg-green-900/50 text-green-400'
      : value >= 0.7
        ? 'bg-yellow-900/50 text-yellow-400'
        : 'bg-red-900/50 text-red-400';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>
      {Math.round(value * 100)}%
    </span>
  );
}
