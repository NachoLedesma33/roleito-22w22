import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Asset } from '@/lib/api';

export default function AssetList() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

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
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!campaignId || !confirm('Delete this asset?')) return;
    await api.assets.delete(campaignId, assetId);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  };

  if (loading) return <p className="text-[var(--text-secondary)]">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Assets</h1>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="px-4 py-2 text-sm rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Asset'}
        </button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*,audio/*"
        className="hidden"
        onChange={handleUpload}
      />

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {assets.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-lg mb-2">No assets yet</p>
          <p className="text-sm">Upload images, portraits, backgrounds, audio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {assets.map((a) => (
            <div
              key={a.id}
              className="border border-[var(--bg-tertiary)] rounded-lg overflow-hidden group"
            >
              <div className="h-24 bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] text-xs">
                {a.asset_type === 'audio' ? '♪' : '🖼'}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{a.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[var(--text-secondary)] opacity-60">{a.asset_type}</span>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-[10px] px-1 py-0.5 rounded bg-[var(--bg-tertiary)] text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
