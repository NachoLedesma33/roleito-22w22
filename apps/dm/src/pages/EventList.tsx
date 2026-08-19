import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Event } from '@/lib/api';

export default function EventList() {
  const { id: campaignId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    const p = sessionId
      ? api.events.listBySession(campaignId, sessionId)
      : api.events.listByCampaign(campaignId);
    p.then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId, sessionId]);

  const handleApprove = async (eventId: string) => {
    try {
      const updated = await api.events.approve(eventId);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    }
  };

  const handleReject = async (eventId: string) => {
    try {
      const updated = await api.events.reject(eventId);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reject');
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await api.events.delete(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Events {sessionId ? `(Session)` : `(Campaign)`}
        </h1>
        {sessionId && campaignId && (
          <Link
            to={`/campaigns/${campaignId}/sessions/${sessionId}`}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            Back to Session
          </Link>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {events.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No events yet</p>
          <p className="text-sm">Events will appear as sessions are processed.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="border border-[var(--bg-tertiary)] rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <EventTypeBadge type={ev.type} />
                    <CanonBadge status={ev.status} />
                  </div>
                  <p className="text-sm">{ev.description || ev.type}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Actor: {ev.actor_id} · Session: {ev.session_id.slice(0, 8)}...
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {ev.status === 'PROPOSED' && (
                    <>
                      <button
                        onClick={() => handleApprove(ev.id)}
                        className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-400 hover:bg-green-900/80"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(ev.id)}
                        className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(ev.id)}
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

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    CHARACTER_CREATED: 'bg-purple-900/50 text-purple-400',
    CHARACTER_DIED: 'bg-red-900/50 text-red-400',
    CHARACTER_INJURED: 'bg-orange-900/50 text-orange-400',
    CHARACTER_MOVED: 'bg-blue-900/50 text-blue-400',
    NPC_INTRODUCED: 'bg-teal-900/50 text-teal-400',
    NPC_DIED: 'bg-red-900/50 text-red-400',
    LOCATION_DISCOVERED: 'bg-cyan-900/50 text-cyan-400',
    ITEM_FOUND: 'bg-yellow-900/50 text-yellow-400',
    QUEST_STARTED: 'bg-indigo-900/50 text-indigo-400',
    QUEST_COMPLETED: 'bg-green-900/50 text-green-400',
    COMBAT_STARTED: 'bg-red-900/50 text-red-400',
    COMBAT_ENDED: 'bg-orange-900/50 text-orange-400',
    DISCOVERY: 'bg-cyan-900/50 text-cyan-400',
    DECISION: 'bg-violet-900/50 text-violet-400',
    DIALOGUE: 'bg-blue-900/50 text-blue-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${colors[type] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
      {type.replace(/_/g, ' ')}
    </span>
  );
}

function CanonBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    CANON: 'bg-green-900/50 text-green-400',
    PROPOSED: 'bg-yellow-900/50 text-yellow-400',
    UNCONFIRMED: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    REJECTED: 'bg-red-900/50 text-red-400',
    DM_ONLY: 'bg-purple-900/50 text-purple-400',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${styles[status] || styles.PROPOSED}`}>
      {status}
    </span>
  );
}
