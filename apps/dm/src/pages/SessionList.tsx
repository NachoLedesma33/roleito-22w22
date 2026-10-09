import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
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

export default function SessionList() {
  const { t } = useTranslation();
  const { id: campaignId } = useParams<{ id: string }>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.sessions.list(campaignId)
      .then(setSessions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleDelete = async (sessionId: string) => {
    if (!campaignId) return;
    await api.sessions.delete(campaignId, sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setDeleteId(null);
  };

  const deleteTarget = sessions.find((s) => s.id === deleteId) ?? null;

  if (loading) return <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>;
  if (error) return <p className="text-[var(--danger)]">{t('sessionList.error', 'Error: {{error}}', { error })}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('sessionList.title', 'Sesiones')}</h1>
        <Link
          to={`/campaigns/${campaignId}/sessions/new`}
          className={cn(buttonVariants({ size: 'sm' }))}
        >
          {t('sessionList.newSession', 'Nueva sesión')}
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">{t('sessionList.emptyTitle', 'Todavía no hay sesiones')}</p>
          <p className="text-sm">{t('sessionList.emptyHint', 'Creá tu primera sesión para empezar a registrar tu campaña.')}</p>
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
                        {s.title || t('sessionList.sessionNumber', 'Sesión {{number}}', { number: s.number })}
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {s.date}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="flex gap-2 ml-4 items-start">
                  <StatusBadge status={s.status} />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteId(s.id)}
                  >
                    {t('common.delete')}
                  </Button>
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
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>{t('sessionList.deleteDialogTitle', 'Eliminar sesión')}</DialogTitle>
            <DialogDescription>
              {t('sessionList.deleteDialogBody', '¿Eliminar la sesión {{name}}? Esta acción no se puede deshacer.', {
                name: deleteTarget?.title ?? String(deleteTarget?.number ?? ''),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete"
              onClick={() => void handleDelete(deleteId!)}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const variant: BadgeProps['variant'] =
    status === 'ACTIVE' ? 'success' : status === 'COMPLETED' ? 'mp' : 'secondary';
  const label =
    status === 'DRAFT'
      ? t('sessionStatus.draft', 'Borrador')
      : status === 'ACTIVE'
        ? t('sessionStatus.active', 'Activa')
        : status === 'COMPLETED'
          ? t('sessionStatus.completed', 'Completada')
          : status === 'ARCHIVED'
            ? t('sessionStatus.archived', 'Archivada')
            : status;
  return <Badge variant={variant}>{label}</Badge>;
}
