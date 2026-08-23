import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import SceneRenderer from '@/components/SceneRenderer';

const API_BASE = 'http://localhost:8000/api';
const POLL_MS = 1000;
const VIDA_LABELS: Record<string, string> = {
  vigor: 'V',
  intelligence: 'I',
  dexterity: 'D',
  cunning: 'A',
};

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  return `http://localhost:8000/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

interface PlayerToken {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  portrait_path: string | null;
}

interface PlayerCharOption {
  id: string;
  name: string;
  race: string;
  class_name: string;
  portrait_path: string | null;
}

interface JoinData {
  campaign_id: string;
  campaign_name: string;
  scene_id: string | null;
  scene_name: string;
  background_path: string | null;
  lighting: string;
  characters: PlayerToken[];
  player_characters: PlayerCharOption[];
}

interface InventoryItem {
  name?: string;
  equipped?: boolean;
  [key: string]: unknown;
}

interface MyChar {
  id: string;
  name: string;
  race: string;
  class_: string;
  portrait_path: string | null;
  vigor: string;
  intelligence: string;
  dexterity: string;
  cunning: string;
  max_pv: number;
  max_pm: number;
  current_pv: number | null;
  current_pm: number | null;
  inventory_json: InventoryItem[];
}

type Choice = { kind: 'character'; id: string } | { kind: 'spectator' } | null;

function attrSymbol(v: string): string {
  if (v === '+') return '+';
  if (v === '-') return '\u2212';
  return '/';
}

function pvColor(current: number, max: number): string {
  const pct = max > 0 ? current / max : 0;
  if (pct > 0.5) return '#4ade80';
  if (pct > 0.25) return '#facc15';
  return '#ef4444';
}

function StatBar({
  label,
  current,
  max,
}: {
  label: string;
  current: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 text-[10px] text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded bg-black/60 overflow-hidden border border-gray-700/50">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: label === 'PV' ? pvColor(current, max) : '#60a5fa' }}
        />
      </div>
      <span className="text-[11px] text-gray-300 tabular-nums w-14 text-right shrink-0">
        {current}/{max} {label}
      </span>
    </div>
  );
}

export default function PlayerView() {
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<JoinData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState<Choice>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [myChar, setMyChar] = useState<MyChar | null>(null);
  const [live, setLive] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [fading, setFading] = useState<'in' | 'out' | null>(null);

  const lastRevRef = useRef<string>('');
  const choiceRef = useRef<Choice>(null);
  const sceneIdRef = useRef<string | null>(null);

  const fetchSnapshot = useCallback(async (): Promise<JoinData> => {
    const res = await fetch(`${API_BASE}/campaigns/invite/${code}`);
    if (!res.ok) throw new Error('Invalid invite code');
    return res.json();
  }, [code]);

  const fetchMyChar = useCallback(async (campaignId: string, charId: string) => {
    const res = await fetch(`${API_BASE}/campaigns/${campaignId}/characters/${charId}`);
    if (!res.ok) return null;
    return res.json() as Promise<MyChar>;
  }, []);

  const applySnapshot = useCallback(
    (snap: JoinData) => {
      if (sceneIdRef.current !== null && snap.scene_id !== sceneIdRef.current) {
        setFading('in');
        window.setTimeout(() => {
          sceneIdRef.current = snap.scene_id;
          setData(snap);
          setFading('out');
          window.setTimeout(() => setFading(null), 320);
        }, 380);
      } else {
        sceneIdRef.current = snap.scene_id;
        setData(snap);
      }
    },
    []
  );

  useEffect(() => {
    if (!code) return;

    fetchSnapshot()
      .then((snap) => {
        sceneIdRef.current = snap.scene_id;
        setData(snap);
        setLoading(false);

        const stored = localStorage.getItem(`roleito:pv:${code}`);
        if (stored === 'spectator') {
          const c: Choice = { kind: 'spectator' };
          choiceRef.current = c;
          setChoice(c);
        } else if (stored && snap.player_characters.some((p) => p.id === stored)) {
          const c: Choice = { kind: 'character', id: stored };
          choiceRef.current = c;
          setChoice(c);
          fetchMyChar(snap.campaign_id, stored).then(setMyChar);
        } else if (snap.player_characters.length > 0) {
          setPickerOpen(true);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to join campaign');
        setLoading(false);
      });
  }, [code, fetchSnapshot, fetchMyChar]);

  useEffect(() => {
    if (!code || !data) return;
    let cancelled = false;
    let timer: number;

    const tick = async () => {
      try {
        const res = await fetch(`${API_BASE}/campaigns/invite/${code}/revision`);
        if (!res.ok) throw new Error('revision failed');
        const { revision } = (await res.json()) as { revision: string };
        if (cancelled) return;
        setLive(true);

        if (revision !== lastRevRef.current) {
          lastRevRef.current = revision;
          const snap = await fetchSnapshot();
          if (cancelled) return;
          applySnapshot(snap);

          const c = choiceRef.current;
          if (c?.kind === 'character') {
            fetchMyChar(snap.campaign_id, c.id).then((ch) => {
              if (ch) setMyChar(ch);
            });
          }
        }
      } catch {
        if (!cancelled) setLive(false);
      }
      if (!cancelled) timer = window.setTimeout(tick, POLL_MS);
    };

    timer = window.setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, data, fetchSnapshot, applySnapshot, fetchMyChar]);

  const chooseCharacter = useCallback(
    (id: string) => {
      if (!data) return;
      localStorage.setItem(`roleito:pv:${code}`, id);
      const c: Choice = { kind: 'character', id };
      choiceRef.current = c;
      setChoice(c);
      setPickerOpen(false);
      fetchMyChar(data.campaign_id, id).then(setMyChar);
    },
    [code, data, fetchMyChar]
  );

  const chooseSpectator = useCallback(() => {
    localStorage.setItem(`roleito:pv:${code}`, 'spectator');
    const c: Choice = { kind: 'spectator' };
    choiceRef.current = c;
    setChoice(c);
    setPickerOpen(false);
  }, [code]);

  const changeCharacter = useCallback(() => {
    setPickerOpen(true);
  }, []);

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

  const pv = myChar?.current_pv ?? myChar?.max_pv ?? 0;
  const pm = myChar?.current_pm ?? myChar?.max_pm ?? 0;
  const invItems = myChar?.inventory_json ?? [];

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden select-none">
      <header className="relative z-10 flex items-center gap-3 px-4 py-2 bg-gray-900/90 border-b border-gray-700/50 shrink-0">
        <span className="text-sm font-bold text-emerald-400">{data.campaign_name}</span>
        <div className="w-px h-4 bg-gray-700" />
        <span className="text-xs text-gray-400">{data.scene_name}</span>
        <div className="flex-1" />
        <span className="text-xs text-gray-400" data-testid="player-role">
          {choice?.kind === 'character'
            ? `Viendo como ${myChar?.name ?? '...'}`
            : 'Espectador'}
        </span>
        {choice?.kind === 'character' && (
          <button
            type="button"
            onClick={changeCharacter}
            className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            Cambiar
          </button>
        )}
        <span
          className="flex items-center gap-1.5 text-[10px]"
          title={live ? 'Sincronizado' : 'Reconectando...'}
        >
          <span
            className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}
          />
          <span className={live ? 'text-emerald-400' : 'text-amber-400'}>
            {live ? 'Live' : 'Reconnecting'}
          </span>
        </span>
      </header>

      <div className="flex-1 relative">
        {data.background_path ? (
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Loading scene...
              </div>
            }
          >
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
              readOnly
            />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            El DM aún no abrió una escena
          </div>
        )}

        {data.characters.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-lg p-2" data-testid="on-scene-list">
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

        {myChar && (
          <div
            className="absolute bottom-4 left-4 z-10 w-64 bg-gray-900/85 backdrop-blur border border-gray-700/50 rounded-lg p-3 space-y-2"
            data-testid="player-sheet"
          >
            <div className="flex items-center gap-2.5">
              {myChar.portrait_path ? (
                <img
                  src={staticUrl(myChar.portrait_path)!}
                  alt={myChar.name}
                  className="w-11 h-11 rounded-full object-cover border border-gray-600"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-sm font-bold text-emerald-300">
                  {myChar.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-100 truncate">{myChar.name}</p>
                <p className="text-[10px] text-gray-500 truncate">
                  {[myChar.race, myChar.class_].filter(Boolean).join(' · ') || '\u00A0'}
                </p>
              </div>
              <div className="ml-auto flex gap-1 shrink-0">
                {Object.entries(VIDA_LABELS).map(([key, attrLabel]) => (
                  <span
                    key={key}
                    title={attrLabel}
                    className="w-5 h-5 rounded bg-black/50 border border-gray-700/60 flex items-center justify-center text-[11px] text-gray-300"
                  >
                    {attrSymbol(myChar[key as keyof MyChar] as string)}
                  </span>
                ))}
              </div>
            </div>

            <StatBar label="PV" current={pv} max={myChar.max_pv} />
            <StatBar label="PM" current={pm} max={myChar.max_pm} />

            <button
              type="button"
              onClick={() => setInvOpen((o) => !o)}
              className="w-full text-left text-[10px] text-gray-400 hover:text-gray-200 flex items-center gap-1 pt-0.5"
            >
              <span className={`transition-transform inline-block ${invOpen ? 'rotate-90' : ''}`}>▸</span>
              Inventario ({invItems.length})
            </button>
            {invOpen && (
              <ul className="space-y-0.5 pl-3">
                {invItems.length === 0 && (
                  <li className="text-[10px] text-gray-600">Vacío</li>
                )}
                {invItems.map((item, i) => (
                  <li key={i} className="text-[11px] text-gray-300 flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.equipped ? 'bg-emerald-400' : 'bg-gray-600'}`}
                      title={item.equipped ? 'Equipado' : 'Guardado'}
                    />
                    {(item.name as string) ?? String(item)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {pickerOpen && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-6 w-full max-w-md space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-100">¿Quién sos?</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Elegí tu personaje para ver tu ficha durante la sesión.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {data.player_characters.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => chooseCharacter(p.id)}
                    className="flex items-center gap-2.5 p-3 rounded-lg border border-gray-700/60 hover:border-emerald-500/70 hover:bg-emerald-950/30 transition-colors text-left"
                  >
                    {p.portrait_path ? (
                      <img
                        src={staticUrl(p.portrait_path)!}
                        alt={p.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-600"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-300">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-100 truncate">{p.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {[p.race, p.class_name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={chooseSpectator}
                className="w-full py-2 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
              >
                Entrar como espectador
              </button>
            </div>
          </div>
        )}

        {fading && (
          <div className={`scene-transition-overlay ${fading === 'out' ? 'scene-transition-overlay--out' : ''}`} />
        )}
      </div>
    </div>
  );
}
