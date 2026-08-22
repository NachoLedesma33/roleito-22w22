import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import SceneRenderer from '@/components/SceneRenderer';

const API_BASE = 'http://localhost:8000/api';

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  return `http://localhost:8000/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

interface PlayerCharacter {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  portrait_path: string | null;
}

interface JoinData {
  campaign_id: string;
  campaign_name: string;
  scene_id: string | null;
  scene_name: string;
  background_path: string | null;
  lighting: string;
  characters: PlayerCharacter[];
}

export default function PlayerView() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<JoinData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!code) return;

    fetch(`${API_BASE}/campaigns/invite/${code}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Invalid invite code');
        return res.json();
      })
      .then((d: JoinData) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to join campaign');
        setLoading(false);
      });
  }, [code]);

  useEffect(() => {
    if (!code || !data) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/campaigns/invite/${code}`);
        if (res.ok) {
          const updated = await res.json();
          setData(updated);
        }
      } catch {
        // silently retry on next tick
      }
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [code, data?.scene_id]);

  const missingCode = !code;

  if (loading && !missingCode) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-gray-400">
        Joining campaign...
      </div>
    );
  }

  if (error || missingCode || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-400">
        {error || (missingCode ? 'No invite code provided' : 'Failed to join')}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden select-none">
      {/* Minimal top bar for player */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-2 bg-gray-900/90 border-b border-gray-700/50 shrink-0">
        <span className="text-sm font-bold text-emerald-400">{data.campaign_name}</span>
        <div className="w-px h-4 bg-gray-700" />
        <span className="text-xs text-gray-400">{data.scene_name}</span>
        <div className="flex-1" />
        <span className="text-[10px] text-gray-500">Player View</span>
      </header>

      {/* 3D Scene — read only */}
      <div className="flex-1 relative">
        {data.background_path ? (
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              Loading scene...
            </div>
          }>
            <SceneRenderer
              backgroundUrl={staticUrl(data.background_path)!}
              characters={data.characters.map((c) => ({
                id: c.id,
                sceneCharId: c.id,
                name: c.name,
                type: c.type,
                x: c.x,
                y: c.y,
                z: c.z,
                visible: true,
                portraitUrl: staticUrl(c.portrait_path),
              }))}
              lighting={data.lighting}
            />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No scene active
          </div>
        )}

        {/* Character list overlay — bottom right */}
        {data.characters.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-lg p-2">
            <p className="text-[10px] text-gray-500 mb-1 px-1">On Scene ({data.characters.length})</p>
            <div className="space-y-0.5">
              {data.characters.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs text-gray-300">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: c.type === 'character' ? '#4ade80' : '#facc15',
                    }}
                  />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
