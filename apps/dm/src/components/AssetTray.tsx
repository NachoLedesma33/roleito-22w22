import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Upload, Image, Film, Box, Star, Trash2 } from 'lucide-react';

interface Asset {
  asset_id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  favorite?: boolean;
}

interface AssetTrayProps {
  campaignId: string;
  onAssetDragStart?: (asset: Asset) => void;
}

export default function AssetTray({ campaignId, onAssetDragStart }: AssetTrayProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.campaigns.listAssets(campaignId);
      setAssets(data.assets ?? []);
    } catch (e) {
      console.error('List assets failed:', e);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.campaigns.uploadAsset(campaignId, file);
      await loadAssets();
    } catch (e) {
      console.error('Upload failed:', e);
    }
    if (fileInput.current) fileInput.current.value = '';
  }, [campaignId, loadAssets]);

  const iconFor = (type: string) => {
    if (type === 'image') return <Image size={16} />;
    if (type === 'video') return <Film size={16} />;
    return <Box size={16} />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white font-bold uppercase tracking-wide">Assets</span>
        <button
          onClick={() => fileInput.current?.click()}
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-white font-bold hover:text-white"
        >
          <Upload size={12} className="inline mr-1" />
          Subir
        </button>
      </div>
      <input ref={fileInput} type="file" className="hidden" onChange={handleUpload} accept="image/*,video/*,.glb,.gltf,.fbx" />
      {loading && <p className="text-[10px] text-[var(--text-secondary)]">Cargando...</p>}
      <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
        {[...assets].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0)).map((a) => (
          <div
            key={a.asset_id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify(a));
              onAssetDragStart?.(a);
            }}
            className="flex flex-col items-center gap-0.5 p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] cursor-grab text-[9px] text-white truncate relative group"
            title={a.name}
          >
            {a.type === 'image' ? (
              <img src={a.url} alt={a.name} className="w-8 h-8 object-cover rounded" />
            ) : (
              iconFor(a.type)
            )}
            <span className="truncate w-full text-center">{a.name}</span>
            <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await api.campaigns.toggleFavorite(campaignId, a.asset_id);
                    await loadAssets();
                  } catch { /* best-effort */ }
                }}
                className="p-0.5 rounded bg-black/50 text-white hover:text-yellow-400"
                title="Favorito"
              >
                <Star size={10} fill={a.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm('¿Eliminar asset?')) return;
                  try {
                    await api.campaigns.deleteAsset(campaignId, a.asset_id);
                    await loadAssets();
                  } catch { /* best-effort */ }
                }}
                className="p-0.5 rounded bg-black/50 text-white hover:text-red-400"
                title="Eliminar"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {assets.length === 0 && !loading && (
        <p className="text-[10px] text-[var(--text-secondary)]">Sin assets. Subí uno.</p>
      )}
    </div>
  );
}