import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, NPC } from '@/lib/api';
import type { VidaAttr } from '@/lib/api';
import { VidaBar, VidaAttrs, VidaDerived } from '@/components/VidaDisplay';
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

const REGEN_TEXT: Record<VidaAttr, string> = {
  '+': 'Rápida (más dados)',
  '/': 'Normal',
  '-': 'Lenta (menos dados)',
};

function portraitUrl(path: string | null): string | null {
  if (!path) return null;
  return `/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

export default function NPCDetail() {
  const { id: campaignId, npcId } = useParams<{ id: string; npcId: string }>();
  const navigate = useNavigate();
  const [npc, setNpc] = useState<NPC | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!campaignId || !npcId) return;
    api.npcs.get(campaignId, npcId)
      .then(setNpc)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId, npcId]);

  const handleDelete = async () => {
    if (!campaignId || !npcId) return;
    await api.npcs.delete(campaignId, npcId);
    navigate(`/campaigns/${campaignId}/npcs`);
  };

  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !npcId) return;
    try {
      const updated = await api.npcs.uploadPortrait(campaignId, npcId, file);
      setNpc(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir');
    }
    e.target.value = '';
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;
  if (error) return <p className="text-[var(--danger)]">Error: {error}</p>;
  if (!npc) return <p className="text-[var(--text-secondary)]">PNJ no encontrado</p>;

  const pUrl = portraitUrl(npc.portrait_path);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInput.current?.click()}
            className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-2xl font-bold text-[var(--text-secondary)] overflow-hidden shrink-0 hover:ring-2 hover:ring-[var(--accent)] transition-all cursor-pointer"
            title="Hacé clic para subir retrato"
          >
            {pUrl ? (
              <img src={pUrl} alt={npc.name} className="w-full h-full object-cover" />
            ) : (
              npc.name.charAt(0).toUpperCase()
            )}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
          <div>
            <h1 className="text-2xl font-bold">{npc.name}</h1>
            <Badge
              variant={npc.status === 'alive' ? 'success' : npc.status === 'dead' ? 'danger' : 'secondary'}
            >
              {npc.status === 'alive' ? 'Vivo' : npc.status === 'dead' ? 'Muerto' : npc.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/campaigns/${campaignId}/npcs/${npcId}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Editar
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      {npc.description && (
        <p className="text-[var(--text-secondary)] mb-6">{npc.description}</p>
      )}

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">Atributos (VIDA)</h2>
          <VidaAttrs vigor={npc.vigor} intelligence={npc.intelligence} dexterity={npc.dexterity} cunning={npc.cunning} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Características derivadas</h2>
          <VidaDerived max_pv={npc.max_pv} max_pm={npc.max_pm} defense={npc.defense} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Estado actual</h2>
          <div className="space-y-3">
            <VidaBar current={npc.current_pv} max={npc.max_pv} label="PV (Puntos de Vida)" color="bg-hp" />
            <VidaBar current={npc.current_pm} max={npc.max_pm} label="PM (Puntos de Mente)" color="bg-mp" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Recuperación</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Regeneración física</p>
              <p className="text-sm mt-1">{REGEN_TEXT[npc.vigor]}</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Regeneración mental</p>
              <p className="text-sm mt-1">{REGEN_TEXT[npc.intelligence]}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Información</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Conocimiento</p>
              <p className="text-sm mt-1">{npc.knowledge_scope}</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Ubicación</p>
              <p className="text-sm mt-1">{npc.current_location_id || 'Ninguna'}</p>
            </div>
          </div>
        </section>
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar PNJ</DialogTitle>
            <DialogDescription>
              ¿Eliminar a {npc.name}? Esta acción no se puede deshacer.
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
