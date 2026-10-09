import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, Session } from '@/lib/api';
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

export default function SessionDetail() {
  const { id: campaignId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!campaignId || !sessionId) return;
    api.sessions.get(campaignId, sessionId)
      .then(setSession)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId, sessionId]);

  const handleDelete = async () => {
    if (!campaignId || !sessionId) return;
    await api.sessions.delete(campaignId, sessionId);
    navigate(`/campaigns/${campaignId}/sessions`);
  };

  const handleStart = async () => {
    if (!campaignId || !sessionId) return;
    try {
      const updated = await api.sessions.start(campaignId, sessionId);
      setSession(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la sesión');
    }
  };

  const handleEnd = async () => {
    if (!campaignId || !sessionId) return;
    try {
      const updated = await api.sessions.end(campaignId, sessionId);
      setSession(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la sesión');
    }
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;
  if (error) return <p className="text-[var(--danger)]">Error: {error}</p>;
  if (!session) return <p className="text-[var(--text-secondary)]">Sesión no encontrada</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--accent)]">
              #{session.number}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{session.title || `Sesión ${session.number}`}</h1>
              <p className="text-[var(--text-secondary)]">{session.date}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {session.status === 'DRAFT' && (
            <Button size="sm" onClick={() => void handleStart()}>
              Iniciar
            </Button>
          )}
          {session.status === 'ACTIVE' && (
            <Button size="sm" variant="secondary" onClick={() => void handleEnd()}>
              Finalizar
            </Button>
          )}
          <Link
            to={`/campaigns/${campaignId}/sessions/${sessionId}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Editar
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={session.status} />
        <span className="text-xs text-[var(--text-secondary)]">
          Creada {new Date(session.created_at).toLocaleString()}
        </span>
      </div>

      <div className="space-y-6">
        {session.summary && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Resumen</h2>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{session.summary}</p>
          </section>
        )}

        {session.raw_notes && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Notas crudas</h2>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{session.raw_notes}</p>
          </section>
        )}

        {!session.summary && !session.raw_notes && (
          <div className="text-center py-12 text-[var(--text-secondary)]">
            <p>Todavía no hay notas ni resumen.</p>
            <Link
              to={`/campaigns/${campaignId}/sessions/${sessionId}/edit`}
              className="text-[var(--accent)] hover:text-[var(--accent-hover)] text-sm mt-2 inline-block"
            >
              Agregar notas
            </Link>
          </div>
        )}
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar sesión</DialogTitle>
            <DialogDescription>
              ¿Eliminar la sesión {session.title || `#${session.number}`}? Esta acción no se puede deshacer.
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

const SESSION_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  ARCHIVED: 'Archivada',
};

function StatusBadge({ status }: { status: string }) {
  const variant: BadgeProps['variant'] =
    status === 'ACTIVE' ? 'success' : status === 'COMPLETED' ? 'mp' : 'secondary';
  return <Badge variant={variant}>{SESSION_STATUS_LABEL[status] ?? status}</Badge>;
}
