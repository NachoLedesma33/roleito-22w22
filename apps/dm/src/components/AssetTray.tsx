import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Image, Film, Box } from 'lucide-react';

interface Asset {
  asset_id: string;
  name: string;
  type: string;
  url: string;
  size: number;
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
      const res = await fetch(`/api/campaigns/${campaignId}/assets`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets ?? []);
      }
    } catch {
      // best-effort
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
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/assets`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        await loadAssets();
      }
    } catch {
      // best-effort
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
        <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Assets</span>
        <button
          onClick={() => fileInput.current?.click()}
          className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Upload size={12} className="inline mr-1" />
          Subir
        </button>
      </div>
      <input ref={fileInput} type="file" className="hidden" onChange={handleUpload} accept="image/*,video/*,.glb,.gltf,.fbx" />
      {loading && <p className="text-[10px] text-[var(--text-secondary)]">Cargando...</p>}
      <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
        {assets.map((a) => (
          <div
            key={a.asset_id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/json', JSON.stringify(a));
              onAssetDragStart?.(a);
            }}
            className="flex flex-col items-center gap-0.5 p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] cursor-grab text-[9px] text-[var(--text-secondary)] truncate"
            title={a.name}
          >
            {a.type === 'image' ? (
              <img src={a.url} alt={a.name} className="w-8 h-8 object-cover rounded" />
            ) : (
              iconFor(a.type)
            )}
            <span className="truncate w-full text-center">{a.name}</span>
          </div>
        ))}
      </div>
      {assets.length === 0 && !loading && (
        <p className="text-[10px] text-[var(--text-secondary)]">Sin assets. Subí uno.</p>
      )}
    </div>
  );
}