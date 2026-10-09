import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, Event } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge, type BadgeProps } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

export default function EventList() {
  const { id: campaignId, sessionId } = useParams<{ id: string; sessionId: string }>();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      setError(e instanceof Error ? e.message : 'No se pudo aprobar');
    }
  };

  const handleReject = async (eventId: string) => {
    try {
      const updated = await api.events.reject(eventId);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo rechazar');
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      await api.events.delete(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      setDeleteId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar');
    }
  };

  const deleteTarget = events.find((e) => e.id === deleteId) ?? null;

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          Eventos {sessionId ? `(Sesión)` : `(Campaña)`}
        </h1>
        {sessionId && campaignId && (
          <Link
            to={`/campaigns/${campaignId}/sessions/${sessionId}`}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            Volver a la sesión
          </Link>
        )}
      </div>

      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}

      {events.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">Todavía no hay eventos</p>
          <p className="text-sm">Los eventos aparecerán cuando se procesen las sesiones.</p>
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
                    Actor: {ev.actor_id} · Sesión: {ev.session_id.slice(0, 8)}...
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  {ev.status === 'PROPOSED' && (
                    <>
                      <Button size="sm" onClick={() => void handleApprove(ev.id)}>
                        Aprobar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => void handleReject(ev.id)}>
                        Rechazar
                      </Button>
                    </>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteId(ev.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar evento</DialogTitle>
            <DialogDescription>
              ¿Eliminar el evento {deleteTarget?.type ?? 'seleccionado'}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete"
              onClick={() => void handleDelete(deleteId!)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EVENT_TYPE_VARIANT: Record<string, BadgeProps['variant']> = {
  CHARACTER_DIED: 'danger',
  CHARACTER_INJURED: 'danger',
  NPC_DIED: 'danger',
  COMBAT_STARTED: 'danger',
  CHARACTER_MOVED: 'mp',
  DISCOVERY: 'mp',
  LOCATION_DISCOVERED: 'mp',
  ITEM_FOUND: 'mp',
  CHARACTER_CREATED: 'success',
  NPC_INTRODUCED: 'success',
  QUEST_COMPLETED: 'success',
  COMBAT_ENDED: 'success',
  QUEST_STARTED: 'warning',
  DECISION: 'warning',
  DIALOGUE: 'def',
};

function EventTypeBadge({ type }: { type: string }) {
  return (
    <Badge variant={EVENT_TYPE_VARIANT[type] ?? 'secondary'}>
      {type.replace(/_/g, ' ')}
    </Badge>
  );
}

const CANON_VARIANT: Record<string, BadgeProps['variant']> = {
  CANON: 'canon',
  PROPOSED: 'proposed',
  UNCONFIRMED: 'secondary',
  REJECTED: 'danger',
  DM_ONLY: 'warning',
};

function CanonBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    CANON: 'Canónico',
    PROPOSED: 'Propuesto',
    UNCONFIRMED: 'Sin confirmar',
    REJECTED: 'Rechazado',
    DM_ONLY: 'Solo DM',
  };
  return <Badge variant={CANON_VARIANT[status] ?? 'secondary'}>{labels[status] ?? status}</Badge>;
}
