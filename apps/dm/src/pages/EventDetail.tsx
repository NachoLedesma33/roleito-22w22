import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, Event } from '@/lib/api';

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    api.events.get(eventId)
      .then(setEvent)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleApprove = async () => {
    if (!eventId) return;
    try {
      const updated = await api.events.approve(eventId);
      setEvent(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!eventId) return;
    try {
      const updated = await api.events.reject(eventId);
      setEvent(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reject');
    }
  };

  const handleDelete = async () => {
    if (!eventId || !confirm('Delete this event?')) return;
    await api.events.delete(eventId);
    navigate(-1);
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!event) return <p className="text-[var(--text-secondary)]">Event not found</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
              {event.type.replace(/_/g, ' ')}
            </span>
            <CanonStatusBadge status={event.status} />
          </div>
          <h1 className="text-2xl font-bold">{event.type.replace(/_/g, ' ')}</h1>
        </div>
        <div className="flex gap-2">
          {event.status === 'PROPOSED' && (
            <>
              <button
                onClick={handleApprove}
                className="text-sm px-3 py-1 rounded bg-green-900/50 text-green-400 hover:bg-green-900/80 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={handleReject}
                className="text-sm px-3 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900/80 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {event.description && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Description</h2>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{event.description}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Event ID" value={event.id.slice(0, 8) + '...'} />
            <InfoCard label="Session" value={event.session_id.slice(0, 8) + '...'} />
            <InfoCard label="Actor" value={event.actor_id} />
            <InfoCard label="Target" value={event.target_id || 'None'} />
            <InfoCard label="Location" value={event.location_id || 'None'} />
            <InfoCard label="Confidence" value={`${(event.confidence * 100).toFixed(0)}%`} />
            <InfoCard label="Source" value={event.source_id || 'None'} />
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="text-sm mt-1">{value}</p>
    </div>
  );
}

function CanonStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    CANON: 'bg-green-900/50 text-green-400',
    PROPOSED: 'bg-yellow-900/50 text-yellow-400',
    UNCONFIRMED: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    REJECTED: 'bg-red-900/50 text-red-400',
    DM_ONLY: 'bg-purple-900/50 text-purple-400',
    CONTRADICTORY: 'bg-orange-900/50 text-orange-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[status] || styles.PROPOSED}`}>
      {status}
    </span>
  );
}
