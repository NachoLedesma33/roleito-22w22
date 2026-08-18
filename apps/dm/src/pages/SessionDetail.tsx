import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Session } from '@/lib/api';

export default function SessionDetail() {
  const { id: campaignId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId || !sessionId) return;
    api.sessions.get(campaignId, sessionId)
      .then(setSession)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId, sessionId]);

  const handleDelete = async () => {
    if (!campaignId || !sessionId || !confirm('Delete this session?')) return;
    await api.sessions.delete(campaignId, sessionId);
    navigate(`/campaigns/${campaignId}/sessions`);
  };

  const handleStart = async () => {
    if (!campaignId || !sessionId) return;
    try {
      const updated = await api.sessions.start(campaignId, sessionId);
      setSession(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start session');
    }
  };

  const handleEnd = async () => {
    if (!campaignId || !sessionId) return;
    try {
      const updated = await api.sessions.end(campaignId, sessionId);
      setSession(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to end session');
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!session) return <p className="text-[var(--text-secondary)]">Session not found</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--accent)]">
              #{session.number}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{session.title || `Session ${session.number}`}</h1>
              <p className="text-[var(--text-secondary)]">{session.date}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {session.status === 'DRAFT' && (
            <button
              onClick={handleStart}
              className="text-sm px-3 py-1 rounded bg-green-900/50 text-green-400 hover:bg-green-900/80 transition-colors"
            >
              Start
            </button>
          )}
          {session.status === 'ACTIVE' && (
            <button
              onClick={handleEnd}
              className="text-sm px-3 py-1 rounded bg-blue-900/50 text-blue-400 hover:bg-blue-900/80 transition-colors"
            >
              End
            </button>
          )}
          <Link
            to={`/campaigns/${campaignId}/sessions/${sessionId}/edit`}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={session.status} />
        <span className="text-xs text-[var(--text-secondary)]">
          Created {new Date(session.created_at).toLocaleString()}
        </span>
      </div>

      <div className="space-y-6">
        {session.summary && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Summary</h2>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{session.summary}</p>
          </section>
        )}

        {session.raw_notes && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Raw Notes</h2>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{session.raw_notes}</p>
          </section>
        )}

        {!session.summary && !session.raw_notes && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <p>No notes or summary yet.</p>
            <Link
              to={`/campaigns/${campaignId}/sessions/${sessionId}/edit`}
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] text-sm mt-2 inline-block"
            >
              Add notes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
    ACTIVE: 'bg-green-900/50 text-green-400',
    COMPLETED: 'bg-blue-900/50 text-blue-400',
    ARCHIVED: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  );
}
