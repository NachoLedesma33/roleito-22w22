import { api } from '@/lib/api';
import { Upload, Image, Film, Box, Star, Trash2, Search } from 'lucide-react';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface Asset {
  asset_id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  favorite?: boolean;
  category?: string;
  shared_with?: string | null;
}

interface AssetTrayProps {
  campaignId: string;
  playerId?: string;
}

const CATEGORIES = ['Todos', 'Favoritos', 'Imágenes', 'Videos', 'Modelos'];

export default function AssetTray({ campaignId, playerId }: AssetTrayProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [renameTarget, setRenameTarget] = useState<Asset | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deliverTarget, setDeliverTarget] = useState<Asset | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const fileInput = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.campaigns.listAssets(campaignId);
      let list = data.assets ?? [];
      if (playerId) {
        list = list.filter((a: Asset) => a.shared_with === playerId || a.shared_with === null);
      }
      setAssets(list);
    } catch (e) {
      console.error('List assets failed:', e);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    if (!deliverTarget) return;
    (async () => {
      try {
        const chars = await api.characters.list(campaignId);
        const players = chars.filter((c: any) => c.type === 'player').map((c: any) => ({ id: c.id, name: c.name }));
        setPlayers(players);
        if (players.length > 0) setSelectedPlayer(players[0].id);
      } catch {
        setPlayers([]);
      }
    })();
  }, [deliverTarget, campaignId]);

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

  const filtered = useMemo(() => {
    let list = [...assets].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
    if (activeCategory === 'Favoritos') list = list.filter((a) => a.favorite);
    else if (activeCategory === 'Imágenes') list = list.filter((a) => a.type === 'image');
    else if (activeCategory === 'Videos') list = list.filter((a) => a.type === 'video');
    else if (activeCategory === 'Modelos') list = list.filter((a) => a.type === 'model');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q));
    }
    return list;
  }, [assets, activeCategory, search]);

  return (
    <>
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
        <div className="relative">
          <Search size={10} className="absolute left-2 top-1.5 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full text-[10px] pl-6 pr-2 py-1 rounded bg-[var(--bg-tertiary)] text-white border border-[var(--bg-tertiary)]"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[9px] px-1.5 py-0.5 rounded ${activeCategory === cat ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-white/70 hover:text-white'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        {loading && <p className="text-[10px] text-white/70">Cargando...</p>}
        <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
          {filtered.map((a) => (
            <div
              key={a.asset_id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(a));
              }}
              className="flex flex-col items-center gap-0.5 p-1 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] cursor-grab text-[9px] text-white truncate relative group"
              title={a.name}
            >
              {a.type === 'image' ? (
                <img src={a.url} alt={a.name} className="w-8 h-8 object-cover rounded" />
            ) : a.type === 'video' ? (
              <video src={a.url} className="w-8 h-8 object-cover rounded" muted preload="metadata" />
            ) : (
              iconFor(a.type)
              )}
              <span className="truncate w-full text-center">{a.name}</span>
              <div className="absolute top-0 right-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameTarget(a);
                  setRenameValue(a.name);
                }}
                className="p-0.5 rounded bg-black/50 text-white hover:text-blue-400"
                title="Renombrar"
              >
                ✎
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeliverTarget(a);
                }}
                className="p-0.5 rounded bg-black/50 text-white hover:text-green-400"
                title="Entregar a jugador"
              >
                →
              </button>
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(a);
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
        {filtered.length === 0 && !loading && (
          <p className="text-[10px] text-white/70">Sin assets.</p>
        )}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar asset</DialogTitle>
            <DialogDescription>
              ¿Eliminar "{deleteTarget?.name}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await api.campaigns.deleteAsset(campaignId, deleteTarget.asset_id);
                  await loadAssets();
                } catch { /* best-effort */ }
                setDeleteTarget(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar asset</DialogTitle>
          <DialogDescription>Ingresa el nuevo nombre.</DialogDescription>
        </DialogHeader>
        <input
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          className="w-full text-sm px-2 py-1 rounded bg-[var(--bg-tertiary)] text-white border border-[var(--bg-tertiary)]"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!renameTarget) return;
              try {
                await api.campaigns.renameAsset(campaignId, renameTarget.asset_id, renameValue);
                await loadAssets();
              } catch { /* best-effort */ }
              setRenameTarget(null);
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!deliverTarget} onOpenChange={(open) => { if (!open) setDeliverTarget(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entregar asset a jugador</DialogTitle>
          <DialogDescription>Selecciona el jugador.</DialogDescription>
        </DialogHeader>
        <select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="w-full text-sm px-2 py-1 rounded bg-[var(--bg-tertiary)] text-white border border-[var(--bg-tertiary)]"
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeliverTarget(null)}>Cancelar</Button>
          <Button
            onClick={async () => {
              if (!deliverTarget || !selectedPlayer) return;
              try {
                await api.campaigns.deliverAsset(campaignId, deliverTarget.asset_id, selectedPlayer);
              } catch { /* best-effort */ }
              setDeliverTarget(null);
            }}
          >
            Entregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    </>
  );
}