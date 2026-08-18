import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Session } from '@/lib/api';

export default function SessionList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.sessions.list(campaignId)
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleDelete = async (sessionId: string) => {
    if (!campaignId || !confirm('Delete this session?')) return;
    await api.sessions.delete(campaignId, sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Link
          to={`/campaigns/${campaignId}/sessions/new`}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        >
          New Session
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No sessions yet</p>
          <p className="text-sm">Create your first session to start tracking your campaign.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  to={`/campaigns/${campaignId}/sessions/${s.id}`}
                  className="flex-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                      #{s.number}
                    </div>
                    <div>
                      <h2 className="font-semibold hover:text-[var(--accent)] transition-colors">
                        {s.title || `Session ${s.number}`}
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {s.date}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="flex gap-2 ml-4 items-start">
                  <StatusBadge status={s.status} />
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {(s.summary || s.raw_notes) && (
                <p className="text-xs text-[var(--text-secondary)] mt-2 ml-13 line-clamp-2">
                  {s.summary || s.raw_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
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
