import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, Scene } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

export default function SceneList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.scenes.list(campaignId)
      .then(setScenes)
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newName.trim()) return;
    setSaving(true);
    try {
      const scene = await api.scenes.create(campaignId, { name: newName, description: newDesc });
      setScenes((prev) => [...prev, scene]);
      setNewName('');
      setNewDesc('');
      setShowForm(false);
      navigate(`/campaigns/${campaignId}/scenes/${scene.id}`);
    } catch {
      // scene creation failure is surfaced by the form staying open
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sceneId: string) => {
    if (!campaignId) return;
    await api.scenes.delete(campaignId, sceneId);
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    setDeleteId(null);
  };

  const deleteTarget = scenes.find((s) => s.id === deleteId) ?? null;

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Escenas</h1>
        <Button
          size="sm"
          variant={showForm ? 'outline' : 'default'}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancelar' : 'Nueva escena'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border border-[var(--bg-tertiary)] rounded-lg p-4 mb-6 space-y-3">
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Nombre de la escena</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Taberna, Bosque, Mazmorra..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Descripción</label>
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              placeholder="Descripción opcional"
            />
          </div>
          <Button
            type="submit"
            disabled={saving || !newName.trim()}
          >
            {saving ? 'Creando...' : 'Crear escena'}
          </Button>
        </form>
      )}

      {scenes.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">Todavía no hay escenas</p>
          <p className="text-sm">Creá escenas para renderizar en 3D.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {scenes.map((s) => (
            <div
              key={s.id}
              className="border border-[var(--bg-tertiary)] rounded-lg overflow-hidden cursor-pointer hover:border-[var(--accent)] transition-colors"
              onClick={() => navigate(`/campaigns/${campaignId}/scenes/${s.id}`)}
            >
              <div className="h-32 bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-sm">
                {s.background_path ? '🗺 Escena' : 'Sin fondo'}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{s.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge variant={s.status === 'active' ? 'success' : 'secondary'}>
                        {s.status === 'active' ? 'Activa' : s.status}
                      </Badge>
                      <Badge variant="secondary">
                        {s.lighting === 'neutral' ? 'Neutra' : s.lighting === 'dark' ? 'Oscura' : s.lighting === 'dim' ? 'Tenue' : s.lighting === 'bright' ? 'Brillante' : s.lighting === 'torchlight' ? 'Antorcha' : s.lighting}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
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
            <DialogTitle>Eliminar escena</DialogTitle>
            <DialogDescription>
              ¿Eliminar la escena {deleteTarget?.name ?? 'seleccionada'}? Esta acción no se puede deshacer.
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
