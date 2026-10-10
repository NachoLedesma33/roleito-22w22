import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api, NPC } from '@/lib/api';
import { VidaBar, VidaAttrs } from '@/components/VidaDisplay';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

export default function NPCList() {
  const { t } = useTranslation();
  const { id: campaignId } = useParams<{ id: string }>();
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.npcs.list(campaignId)
      .then(setNpcs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleDelete = async (npcId: string) => {
    if (!campaignId) return;
    await api.npcs.delete(campaignId, npcId);
    setNpcs((prev) => prev.filter((n) => n.id !== npcId));
    setDeleteId(null);
  };

  const deleteTarget = npcs.find((n) => n.id === deleteId) ?? null;
  const deleteName = deleteTarget?.name ?? t('npcList.thisNpc', 'este PNJ');

  if (loading) return <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>;
  if (error) return <p className="text-[var(--danger)]">{t('npcList.error', 'Error: {{error}}', { error })}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('npcList.title', 'PNJs')}</h1>
        <Link
          to={`/campaigns/${campaignId}/npcs/new`}
          className={cn(buttonVariants({ size: 'sm' }))}
        >
          {t('npcList.newNpc', 'Nuevo PNJ')}
        </Link>
      </div>

      {npcs.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">{t('npcList.emptyTitle', 'Todavía no hay PNJs')}</p>
          <p className="text-sm">{t('npcList.emptyHint', 'Creá tu primer PNJ para poblar el mundo.')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {npcs.map((n) => (
            <div
              key={n.id}
              className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  to={`/campaigns/${campaignId}/npcs/${n.id}`}
                  className="flex-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-bold text-[var(--text-secondary)]">
                      {n.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold hover:text-[var(--accent)] transition-colors">
                        {n.name}
                      </h2>
                      {n.description && (
                        <p className="text-xs text-[var(--text-secondary)] truncate max-w-xs">
                          {n.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex gap-2 ml-4 items-start">
                  <Badge
                    variant={n.status === 'alive' ? 'success' : n.status === 'dead' ? 'danger' : 'secondary'}
                  >
                    {n.status === 'alive' ? t('characterStatus.alive', 'Vivo') : n.status === 'dead' ? t('characterStatus.dead', 'Muerto') : n.status}
                  </Badge>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteId(n.id)}>
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <VidaAttrs vigor={n.vigor} intelligence={n.intelligence} dexterity={n.dexterity} cunning={n.cunning} />
              </div>
              <div className="mt-3 space-y-2">
                <VidaBar current={n.current_pv} max={n.max_pv} label="PV" color="bg-hp" />
                <VidaBar current={n.current_pm} max={n.max_pm} label="PM" color="bg-mp" />
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>{t('npcList.deleteDialogTitle', 'Eliminar PNJ')}</DialogTitle>
            <DialogDescription>
              {t('npcList.deleteDialogBody', '¿Eliminar a {{name}}? Esta acción no se puede deshacer.', { name: deleteName })}
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
