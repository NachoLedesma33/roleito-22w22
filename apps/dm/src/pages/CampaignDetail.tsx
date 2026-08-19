import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Campaign, Character, NPC, Session, WorldState } from '@/lib/api';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [worldState, setWorldState] = useState<WorldState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.campaigns.get(id),
      api.characters.list(id).catch(() => []),
      api.npcs.list(id).catch(() => []),
      api.sessions.list(id).catch(() => []),
      api.worldState.get(id).catch(() => null),
    ])
      .then(([c, chars, npcList, sessList, ws]) => {
        setCampaign(c);
        setCharacters(chars);
        setNpcs(npcList);
        setSessions(sessList);
        setWorldState(ws);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Delete this campaign?')) return;
    await api.campaigns.delete(id);
    navigate('/');
  };

  const handleExport = async () => {
    if (!id) return;
    const data = await api.campaigns.export(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaign?.name || id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;
  if (error) return <p className="text-red-400">Error: {error}</p>;
  if (!campaign) return <p className="text-[var(--text-secondary)]">Campaign not found</p>;

  const activeSession = sessions.find((s) => s.status === 'ACTIVE');
  const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length;
  const draftSessions = sessions.filter((s) => s.status === 'DRAFT').length;

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{campaign.name}</h1>
          {campaign.description && (
            <p className="text-[var(--text-secondary)] mt-1">{campaign.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            to={`/campaigns/${campaign.id}`}
            className="text-sm px-3 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
          >
            Open VTT
          </Link>
          <Link
            to={`/campaigns/${campaign.id}/edit`}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Edit
          </Link>
          <button
            onClick={handleExport}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Export
          </button>
          <button
            onClick={handleDelete}
            className="text-sm px-3 py-1 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatusCard
          label="Active Session"
          value={activeSession ? `#${activeSession.number}` : 'None'}
          accent={!!activeSession}
        />
        <StatusCard label="Characters" value={String(characters.length)} />
        <StatusCard label="NPCs" value={String(npcs.length)} />
        <StatusCard
          label="Canon Events"
          value={String(worldState?.total_canon_events || 0)}
        />
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <Link
          to={`/campaigns/${campaign.id}/sessions/${activeSession.id}`}
          className="block mb-8 border border-green-900/50 rounded-lg p-4 bg-green-900/10 hover:border-green-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-green-400">
                Session #{activeSession.number} in progress
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                {activeSession.title || activeSession.date}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link
          to={`/campaigns/${campaign.id}/sessions`}
          className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">Sessions</p>
          <p className="text-lg font-bold">{sessions.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {completedSessions} completed · {draftSessions} drafts
          </p>
        </Link>
        <Link
          to={`/campaigns/${campaign.id}/characters`}
          className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">Characters</p>
          <p className="text-lg font-bold">{characters.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {characters.filter((c) => c.status === 'alive').length} alive
          </p>
        </Link>
        <Link
          to={`/campaigns/${campaign.id}/npcs`}
          className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">NPCs</p>
          <p className="text-lg font-bold">{npcs.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {npcs.filter((n) => n.status === 'alive').length} alive
          </p>
        </Link>
      </div>

      {/* Party */}
      {characters.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Party</h2>
            <Link
              to={`/campaigns/${campaign.id}/characters`}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-2">
            {characters.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/campaigns/${campaign.id}/characters/${c.id}`}
                className="flex items-center gap-3 border border-[var(--bg-tertiary)] rounded-lg p-3 hover:border-[var(--accent)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{c.race} {c.class_}</p>
                </div>
                <div className="flex gap-3 text-[10px]">
                  <span className="text-red-400">PV:{c.current_pv}/{c.max_pv}</span>
                  <span className="text-blue-400">PM:{c.current_pm}/{c.max_pm}</span>
                </div>
                <StatusDot status={c.status} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent Sessions</h2>
            <Link
              to={`/campaigns/${campaign.id}/sessions`}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-2">
            {sessions.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                to={`/campaigns/${campaign.id}/sessions/${s.id}`}
                className="flex items-center gap-3 border border-[var(--bg-tertiary)] rounded-lg p-3 hover:border-[var(--accent)] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                  #{s.number}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.title || `Session ${s.number}`}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{s.date}</p>
                </div>
                <SessionStatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatusCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent ? 'text-green-400' : ''}`}>{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'alive' ? 'bg-green-500' : status === 'dead' ? 'bg-red-500' : 'bg-yellow-500';
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}

function SessionStatusBadge({ status }: { status: string }) {
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
