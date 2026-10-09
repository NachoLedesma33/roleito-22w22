import { useEffect, useRef, useState, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { api, Character } from '@/lib/api';
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

function ModelPreview({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
    </group>
  );
}

export default function CharacterDetail() {
  const { id: campaignId, characterId } = useParams<{ id: string; characterId: string }>();
  const navigate = useNavigate();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const modelFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!campaignId || !characterId) return;
    api.characters.get(campaignId, characterId)
      .then(setCharacter)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId, characterId]);

  const handleDelete = async () => {
    if (!campaignId || !characterId) return;
    await api.characters.delete(campaignId, characterId);
    navigate(`/campaigns/${campaignId}/characters`);
  };

  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !characterId) return;
    try {
      const updated = await api.characters.uploadPortrait(campaignId, characterId, file);
      setCharacter(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir');
    }
    e.target.value = '';
  };

  const handleModelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !characterId) return;
    try {
      const updated = await api.characters.uploadModel(campaignId, characterId, file);
      setCharacter(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir');
    }
    e.target.value = '';
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;
  if (error) return <p className="text-[var(--danger)]">Error: {error}</p>;
  if (!character) return <p className="text-[var(--text-secondary)]">Personaje no encontrado</p>;

  const pUrl = portraitUrl(character.portrait_path);
  const mUrl = portraitUrl(character.model_path);

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <button
            onClick={() => fileInput.current?.click()}
            className="w-20 h-20 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-3xl font-bold text-[var(--accent)] overflow-hidden shrink-0 border-2 border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-all cursor-pointer"
            title="Hacé clic para subir retrato"
          >
            {pUrl ? (
              <img src={pUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">📷</span>
            )}
          </button>
          <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{character.name}</h1>
            <p className="text-[var(--text-secondary)]">
              {character.race} {character.class_} · {character.type === 'player' ? 'Jugador' : character.type === 'creature' ? 'Criatura' : character.type}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Badge
                variant={character.status === 'alive' ? 'success' : character.status === 'dead' ? 'danger' : 'secondary'}
              >
                {character.status === 'alive' ? 'Vivo' : character.status === 'dead' ? 'Muerto' : character.status}
              </Badge>
              {!pUrl && (
                <button
                  onClick={() => fileInput.current?.click()}
                  className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  + Subir retrato
                </button>
              )}
              {pUrl && (
                <span className="text-xs text-[var(--danger)]">
                  Retrato subido
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/campaigns/${campaignId}/characters/${characterId}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            Editar
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            Eliminar
          </Button>
        </div>
      </div>

      {character.description && (
        <p className="text-[var(--text-secondary)] mb-6">{character.description}</p>
      )}

      {/* 3D Model Section */}
      <div className="mb-6 border border-[var(--bg-tertiary)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Modelo 3D</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => modelFileInput.current?.click()}
          >
            {mUrl ? 'Reemplazar .glb' : 'Subir .glb'}
          </Button>
          <input ref={modelFileInput} type="file" accept=".glb,.gltf" className="hidden" onChange={handleModelUpload} />
        </div>
        {mUrl ? (
          <div className="w-full h-48 rounded bg-[var(--bg-secondary)]">
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] text-sm">Cargando modelo 3D...</div>}>
              <Canvas camera={{ position: [0, 1.2, 3], fov: 40 }}>
                <ambientLight intensity={1.2} />
                <directionalLight position={[2, 3, 1]} intensity={1.5} />
                <ModelPreview url={mUrl} />
                <OrbitControls enableZoom={true} enablePan={false} autoRotate autoRotateSpeed={2} />
              </Canvas>
            </Suspense>
          </div>
        ) : (
          <div className="w-full h-48 rounded bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] text-sm">
            No hay modelo 3D subido. El token se renderizará como sprite 2D en la escena.
          </div>
        )}
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">Atributos (VIDA)</h2>
          <VidaAttrs vigor={character.vigor} intelligence={character.intelligence} dexterity={character.dexterity} cunning={character.cunning} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Características derivadas</h2>
          <VidaDerived max_pv={character.max_pv} max_pm={character.max_pm} defense={character.defense} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Estado actual</h2>
          <div className="space-y-3">
            <VidaBar current={character.current_pv} max={character.max_pv} label="PV (Puntos de Vida)" color="bg-hp" />
            <VidaBar current={character.current_pm} max={character.max_pm} label="PM (Puntos de Mente)" color="bg-mp" />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Recuperación</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Regeneración física</p>
              <p className="text-sm mt-1">{REGEN_TEXT[character.vigor]}</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Regeneración mental</p>
              <p className="text-sm mt-1">{REGEN_TEXT[character.intelligence]}</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Información</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Conocimiento</p>
              <p className="text-sm mt-1">{character.knowledge_scope}</p>
            </div>
            <div className="border border-[var(--bg-tertiary)] rounded-lg p-3">
              <p className="text-xs text-[var(--text-secondary)]">Ubicación</p>
              <p className="text-sm mt-1">{character.current_location_id || 'Ninguna'}</p>
            </div>
          </div>
        </section>
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent data-testid="confirm-delete-dialog">
          <DialogHeader>
            <DialogTitle>Eliminar personaje</DialogTitle>
            <DialogDescription>
              ¿Eliminar a {character.name}? Esta acción no se puede deshacer.
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
