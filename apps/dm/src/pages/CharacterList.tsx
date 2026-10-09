import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { api, Character } from '@/lib/api';
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

export default function CharacterList() {
  const { t } = useTranslation();
  const { id: campaignId } = useParams<{ id: string }>();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.characters.list(campaignId)
      .then(setCharacters)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleDelete = async (charId: string) => {
    if (!campaignId) return;
    await api.characters.delete(campaignId, charId);
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    setDeleteId(null);
  };

  const deleteTarget = characters.find((c) => c.id === deleteId) ?? null;
  const deleteName = deleteTarget?.name ?? t('characterList.thisCharacter', 'este personaje');

  if (loading) return <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>;
  if (error) return <p className="text-[var(--danger)]">{t('characterList.error', 'Error: {{error}}', { error })}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('characterList.title', 'Personajes')}</h1>
        <Link
          to={`/campaigns/${campaignId}/characters/new`}
          className={cn(buttonVariants({ size: 'sm' }))}
        >
          {t('characterList.newCharacter', 'Nuevo personaje')}
        </Link>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">{t('characterList.emptyTitle', 'Todavía no hay personajes')}</p>
          <p className="text-sm">{t('characterList.emptyHint', 'Creá tu primer personaje para empezar.')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {characters.map((c) => (
            <div
              key={c.id}
              className="border border-[var(--bg-tertiary)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <Link
                  to={`/campaigns/${campaignId}/characters/${c.id}`}
                  className="flex-1"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold hover:text-[var(--accent)] transition-colors">
                        {c.name}
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {c.race} {c.class_} · {c.type === 'player' ? t('characterTypes.player', 'Jugador') : c.type === 'creature' ? t('characterTypes.creature', 'Criatura') : c.type}
                      </p>
                    </div>
                  </div>
                </Link>
                <div className="flex gap-2 ml-4 items-start">
                  <Badge
                    variant={c.status === 'alive' ? 'success' : c.status === 'dead' ? 'danger' : 'secondary'}
                  >
                    {c.status === 'alive' ? t('characterStatus.alive', 'Vivo') : c.status === 'dead' ? t('characterStatus.dead', 'Muerto') : c.status}
                  </Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteId(c.id)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <VidaAttrs vigor={c.vigor} intelligence={c.intelligence} dexterity={c.dexterity} cunning={c.cunning} />
              </div>
              <div className="mt-3 space-y-2">
                <VidaBar current={c.current_pv} max={c.max_pv} label="PV" color="bg-hp" />
                <VidaBar current={c.current_pm} max={c.max_pm} label="PM" color="bg-mp" />
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>{t('characterList.deleteDialogTitle', 'Eliminar personaje')}</DialogTitle>
            <DialogDescription>
              {t('characterList.deleteDialogBody', '¿Eliminar a {{name}}? Esta acción no se puede deshacer.', { name: deleteName })}
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
