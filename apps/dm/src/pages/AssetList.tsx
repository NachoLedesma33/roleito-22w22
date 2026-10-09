import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Asset } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';

function staticUrl(path: string): string | null {
  if (!path) return null;
  const parts = path.replace(/\\/g, '/').split('/assets/');
  return parts.length > 1 ? `/api/static/${parts[1]}` : null;
}

export default function AssetList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;
    api.assets.list(campaignId)
      .then(setAssets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaignId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;
    setUploading(true);
    try {
      const asset = await api.assets.upload(campaignId, file, file.name);
      setAssets((prev) => [...prev, asset]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo subir');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!campaignId) return;
    await api.assets.delete(campaignId, assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    setDeleteId(null);
  };

  const deleteTarget = assets.find((a) => a.id === deleteId) ?? null;

  if (loading) return <p className="text-[var(--text-secondary)]">Cargando...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recursos</h1>
        <Button
          size="sm"
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'Subiendo...' : 'Subir recurso'}
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*,audio/*"
        className="hidden"
        onChange={handleUpload}
      />

      {error && <p className="text-[var(--danger)] text-sm mb-4">{error}</p>}

      {assets.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">Todavía no hay recursos</p>
          <p className="text-sm">Subí imágenes, retratos, fondos, audio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {assets.map((a) => (
            <div
              key={a.id}
              className="border border-[var(--bg-tertiary)] rounded-lg overflow-hidden group"
            >
              <div className="h-24 bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-xs overflow-hidden">
                {a.asset_type === 'audio' ? (
                  <span>♪</span>
                ) : a.asset_type === 'video' && staticUrl(a.file_path) ? (
                  <video src={staticUrl(a.file_path)!} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                ) : staticUrl(a.file_path) ? (
                  <img src={staticUrl(a.file_path)!} alt={a.name} className="w-full h-full object-cover" />
                ) : (
                  <span>🖼</span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{a.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-secondary)] opacity-60">{a.asset_type === 'image' ? 'Imagen' : a.asset_type === 'audio' ? 'Audio' : a.asset_type}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteId(a.id)}
                  >
                    Borrar
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
            <DialogTitle>Eliminar recurso</DialogTitle>
            <DialogDescription>
              ¿Eliminar el recurso {deleteTarget?.name ?? 'seleccionado'}? Esta acción no se puede deshacer.
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
