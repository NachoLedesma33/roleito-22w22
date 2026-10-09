import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
      setError(e instanceof Error ? e.message : 'No se pudo aprobar');
    }
  };

  const handleReject = async () => {
    if (!eventId) return;
    try {
      const updated = await api.events.reject(eventId);
      setEvent(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo rechazar');
    }
  };

  const handleDelete = async () => {
    if (!eventId) return;
    await api.events.delete(eventId);
    navigate(-1);
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;
  if (error) return <p className="text-[var(--danger)]">Error: {error}</p>;
  if (!event) return <p className="text-[var(--text-secondary)]">Evento no encontrado</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">
              {event.type.replace(/_/g, ' ')}
            </Badge>
            <CanonStatusBadge status={event.status} />
          </div>
          <h1 className="text-2xl font-bold">{event.type.replace(/_/g, ' ')}</h1>
        </div>
        <div className="flex gap-2">
          {event.status === 'PROPOSED' && (
            <>
              <Button size="sm" onClick={() => void handleApprove()}>
                Aprobar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => void handleReject()}>
                Rechazar
              </Button>
            </>
          )}
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {event.description && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Descripción</h2>
            <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{event.description}</p>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Detalles</h2>
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="ID del evento" value={event.id.slice(0, 8) + '...'} />
            <InfoCard label="Sesión" value={event.session_id.slice(0, 8) + '...'} />
            <InfoCard label="Actor" value={event.actor_id} />
            <InfoCard label="Objetivo" value={event.target_id || 'Ninguno'} />
            <InfoCard label="Ubicación" value={event.location_id || 'Ninguno'} />
            <InfoCard label="Confianza" value={`${(event.confidence * 100).toFixed(0)}%`} />
            <InfoCard label="Fuente" value={event.source_id || 'Ninguno'} />
          </div>
        </section>
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar evento</DialogTitle>
            <DialogDescription>
              ¿Eliminar este evento? Esta acción no se puede deshacer.
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
      <p className="text-sm mt-1">{value}</p>
    </div>
  );
}

function CanonStatusBadge({ status }: { status: string }) {
  const variant: BadgeProps['variant'] = CANON_VARIANT[status] ?? 'secondary';
  return <Badge variant={variant}>{CANON_LABEL[status] ?? status}</Badge>;
}

const CANON_VARIANT: Record<string, BadgeProps['variant']> = {
  CANON: 'canon',
  PROPOSED: 'proposed',
  UNCONFIRMED: 'secondary',
  REJECTED: 'danger',
  DM_ONLY: 'warning',
  CONTRADICTORY: 'warning',
};

const CANON_LABEL: Record<string, string> = {
  CANON: 'Canónico',
  PROPOSED: 'Propuesto',
  UNCONFIRMED: 'Sin confirmar',
  REJECTED: 'Rechazado',
  DM_ONLY: 'Solo DM',
  CONTRADICTORY: 'Contradictorio',
};
