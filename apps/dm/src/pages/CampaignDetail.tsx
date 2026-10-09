import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Campaign, Character, NPC, Session, WorldState } from '@/lib/api';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

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
  const [deleteOpen, setDeleteOpen] = useState(false);

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
        setWorldState(ws as WorldState | null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
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

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;
  if (error) return <p className="text-[var(--danger)]">Error: {error}</p>;
  if (!campaign) return <p className="text-[var(--text-secondary)]">Campaña no encontrada</p>;

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
            className={cn(buttonVariants({ size: 'sm' }))}
          >
            Abrir VTT
          </Link>
          <Link
            to={`/campaigns/${campaign.id}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Editar
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleExport()}
          >
            Exportar
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatusCard
          label="Sesión activa"
          value={activeSession ? `#${activeSession.number}` : 'Ninguna'}
          accent={!!activeSession}
        />
        <StatusCard label="Personajes" value={String(characters.length)} />
        <StatusCard label="PNJs" value={String(npcs.length)} />
        <StatusCard
          label="Eventos canónicos"
          value={String(worldState?.total_canon_events || 0)}
        />
      </div>

      {/* Active Session Banner */}
      {activeSession && (
        <Link
          to={`/campaigns/${campaign.id}/sessions/${activeSession.id}`}
          className="block mb-8 border border-[var(--success)] rounded-lg p-4 bg-[var(--bg-tertiary)] hover:opacity-90 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[var(--success)] animate-pulse" />
            <div>
              <p className="text-sm font-medium text-[var(--success)]">
                Sesión #{activeSession.number} en progreso
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
          <p className="text-xs text-[var(--text-secondary)] mb-1">Sesiones</p>
          <p className="text-lg font-bold">{sessions.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {completedSessions} completadas · {draftSessions} borradores
          </p>
        </Link>
        <Link
          to={`/campaigns/${campaign.id}/characters`}
          className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">Personajes</p>
          <p className="text-lg font-bold">{characters.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {characters.filter((c) => c.status === 'alive').length} vivos
          </p>
        </Link>
        <Link
          to={`/campaigns/${campaign.id}/npcs`}
          className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
        >
          <p className="text-xs text-[var(--text-secondary)] mb-1">PNJs</p>
          <p className="text-lg font-bold">{npcs.length}</p>
          <p className="text-[10px] text-[var(--text-secondary)] mt-1">
            {npcs.filter((n) => n.status === 'alive').length} vivos
          </p>
        </Link>
      </div>

      {/* Party */}
      {characters.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Grupo</h2>
            <Link
              to={`/campaigns/${campaign.id}/characters`}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              Ver todo
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
                  <span className="text-[var(--hp)]">PV:{c.current_pv}/{c.max_pv}</span>
                  <span className="text-[var(--mp)]">PM:{c.current_pm}/{c.max_pm}</span>
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
            <h2 className="text-lg font-semibold">Sesiones recientes</h2>
            <Link
              to={`/campaigns/${campaign.id}/sessions`}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              Ver todo
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
                  <p className="text-sm font-medium">{s.title || `Sesión ${s.number}`}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{s.date}</p>
                </div>
                <SessionStatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar campaña</DialogTitle>
            <DialogDescription>
              ¿Eliminar la campaña {campaign.name}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete"
              onClick={() => void handleDelete()}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent ? 'text-[var(--success)]' : ''}`}>{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'alive' ? 'bg-[var(--success)]' : status === 'dead' ? 'bg-[var(--danger)]' : 'bg-[var(--warning)]';
  return <div className={`w-2 h-2 rounded-full ${color}`} />;
}

const SESSION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  ARCHIVED: 'Archivada',
};

function SessionStatusBadge({ status }: { status: string }) {
  const variant: BadgeProps['variant'] =
    status === 'ACTIVE' ? 'success' : status === 'COMPLETED' ? 'mp' : 'secondary';
  return <Badge variant={variant}>{SESSION_STATUS_LABEL[status] ?? status}</Badge>;
}
