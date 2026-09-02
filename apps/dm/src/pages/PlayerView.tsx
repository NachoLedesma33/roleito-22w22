import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import SceneRenderer from '@/components/SceneRenderer';
import DiceRoller from '@/components/DiceRoller';
import TopBar from '@/components/TopBar';
import MinimizedBar from '@/components/MinimizedBar';
import ToastContainer, { type ToastRoll, rollToToast } from '@/components/ToastContainer';
import { api } from '@/lib/api';

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
  entity_id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  portrait_path: string | null;
  model_path: string | null;
}

interface PlayerCharOption {
  id: string;
  name: string;
  race: string;
  class_name: string;
  portrait_path: string | null;
  model_path: string | null;
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

interface Spell {
  id: string;
  name: string;
  description: string;
  level: number;
  cost_pm: number;
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
  defense: number;
  current_pv: number | null;
  current_pm: number | null;
  inventory_json: InventoryItem[];
  spells_json: Spell[];
  player_notes: string;
  knowledge_scope: string;
  current_location_id: string | null;
  status: string;
  description: string;
}

type Choice = { kind: 'character'; id: string } | { kind: 'spectator' } | null;

function MiniModelPreview({ url }: { url: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * 0.8;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.3, 0]} scale={[0.8, 0.8, 0.8]}>
      <primitive object={scene.clone()} />
    </group>
  );
}

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
  const [fading, setFading] = useState<'in' | 'out' | null>(null);
  const [sheetTab, setSheetTab] = useState<'stats' | 'inventory' | 'spells' | 'notes'>('stats');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [toastQueue, setToastQueue] = useState<ToastRoll[]>([]);
  const [myPosition, setMyPosition] = useState<{ x: number; z: number; rotation: number } | null>(null);
  const myCharRef = useRef<MyChar | null>(null);
  const mySceneCharRef = useRef<PlayerToken | null>(null);

  const lastRevRef = useRef<string>('');
  const choiceRef = useRef<Choice>(null);
  const sceneIdRef = useRef<string | null>(null);
  const lastRollTsRef = useRef<number>(0);
  const dataRef = useRef<typeof data>(null);
  const myPositionRef = useRef<{ x: number; z: number; rotation: number } | null>(null);

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

  const syncNotesDraft = useCallback((char: MyChar | null) => {
    setNotesDraft(char?.player_notes ?? '');
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
          fetchMyChar(snap.campaign_id, stored).then((ch) => {
            if (ch) {
              setMyChar(ch);
              syncNotesDraft(ch);
            }
          });
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
              if (ch) {
                setMyChar(ch);
                syncNotesDraft(ch);
              }
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

  useEffect(() => {
    if (!code || !data) return;
    let cancelled = false;
    let timer: number;

    const pollRolls = async () => {
      try {
        const newRolls = await api.rolls.recent(data.campaign_id, lastRollTsRef.current);
        if (cancelled) return;
        if (newRolls.length > 0) {
          lastRollTsRef.current = Date.now();
          setToastQueue((prev) => {
            const updated = [...prev, ...newRolls.map(rollToToast)];
            return updated.slice(-5);
          });
        }
      } catch {
        // best-effort
      }
      if (!cancelled) timer = window.setTimeout(pollRolls, 1000);
    };

    timer = window.setTimeout(pollRolls, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, data]);

  // Keep refs in sync
  useEffect(() => { myCharRef.current = myChar; }, [myChar]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { myPositionRef.current = myPosition; }, [myPosition]);

  useEffect(() => {
    if (!data || !myChar || choice?.kind !== 'character') return;
    const sceneChar = data.characters.find(
      (c) => c.type === 'character' && data.player_characters.some((p) => p.id === c.entity_id && p.id === choice.id)
    );
    mySceneCharRef.current = sceneChar ?? null;
    if (sceneChar && myPosition === null) {
      setMyPosition({ x: sceneChar.x, z: sceneChar.z, rotation: sceneChar.rotation ?? 0 });
    }
  }, [data, myChar, choice, myPosition]);

  // WASD/QE keyboard movement for player's own character
  useEffect(() => {
    if (choice?.kind !== 'character') return;

    const MOVE_SPEED = 0.15;
    const ROTATE_SPEED = Math.PI / 8;
    const keysPressed = new Set<string>();
    let moveTimer: number;

    const applyMovement = () => {
      const currentData = dataRef.current;
      const currentPos = myPositionRef.current;
      if (!currentData || choice.kind !== 'character') return;

      const sc = currentData.characters.find(
        (c: any) => c.type === 'character' && currentData.player_characters.some((p: any) => p.id === c.entity_id && p.id === choice.id)
      );
      if (!sc) return;

      const pos = currentPos ?? { x: sc.x, z: sc.z, rotation: sc.rotation ?? 0 };
      let { x, z, rotation } = pos;
      let moved = false;

      if (keysPressed.has('w') || keysPressed.has('arrowup')) {
        x += Math.sin(rotation) * -MOVE_SPEED;
        z += Math.cos(rotation) * -MOVE_SPEED;
        moved = true;
      }
      if (keysPressed.has('s') || keysPressed.has('arrowdown')) {
        x += Math.sin(rotation) * MOVE_SPEED;
        z += Math.cos(rotation) * MOVE_SPEED;
        moved = true;
      }
      if (keysPressed.has('a') || keysPressed.has('arrowleft')) {
        x += Math.sin(rotation - Math.PI / 2) * -MOVE_SPEED;
        z += Math.cos(rotation - Math.PI / 2) * -MOVE_SPEED;
        moved = true;
      }
      if (keysPressed.has('d') || keysPressed.has('arrowright')) {
        x += Math.sin(rotation + Math.PI / 2) * -MOVE_SPEED;
        z += Math.cos(rotation + Math.PI / 2) * -MOVE_SPEED;
        moved = true;
      }
      if (keysPressed.has('q')) {
        rotation -= ROTATE_SPEED;
        moved = true;
      }
      if (keysPressed.has('e')) {
        rotation += ROTATE_SPEED;
        moved = true;
      }

      if (moved) {
        myPositionRef.current = { x, z, rotation };
        setMyPosition({ x, z, rotation });
        api.scenes.moveCharacter(currentData.campaign_id, currentData.scene_id!, {
          character_id: choice.id,
          x, z, rotation,
        }).catch(() => {});
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        keysPressed.add(key);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.key.toLowerCase());
    };

    const gameLoop = () => {
      if (keysPressed.size > 0) applyMovement();
      moveTimer = window.setTimeout(gameLoop, 50);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    moveTimer = window.setTimeout(gameLoop, 50);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearTimeout(moveTimer);
    };
  }, [choice?.kind]);

  const chooseCharacter = useCallback(
    (id: string) => {
      if (!data) return;
      localStorage.setItem(`roleito:pv:${code}`, id);
      const c: Choice = { kind: 'character', id };
      choiceRef.current = c;
      setChoice(c);
      setPickerOpen(false);
      fetchMyChar(data.campaign_id, id).then((ch) => {
        if (ch) {
          setMyChar(ch);
          syncNotesDraft(ch);
        }
      });
    },
    [code, data, fetchMyChar, syncNotesDraft]
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

  const handleSaveNotes = useCallback(async () => {
    if (!myChar || !data) return;
    setNotesSaving(true);
    try {
      const res = await fetch(`${API_BASE}/campaigns/${data.campaign_id}/characters/${myChar.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_notes: notesDraft }),
      });
      if (res.ok) {
        const updated = await res.json() as MyChar;
        setMyChar(updated);
        syncNotesDraft(updated);
      }
    } catch {
      // keep local draft on failure
    } finally {
      setNotesSaving(false);
    }
  }, [myChar, data, notesDraft, syncNotesDraft]);

  const handleExportMarkdown = useCallback(() => {
    if (!myChar) return;
    const lines: string[] = [];
    lines.push(`# Ficha: ${myChar.name}`);
    lines.push('');
    lines.push(`- **Raza**: ${myChar.race}`);
    lines.push(`- **Clase**: ${myChar.class_}`);
    lines.push(`- **Estado**: ${myChar.status}`);
    lines.push(`- **Conocimiento**: ${myChar.knowledge_scope}`);
    if (myChar.current_location_id) lines.push(`- **Ubicación**: ${myChar.current_location_id}`);
    lines.push('');
    lines.push('## Atributos (VIDA)');
    lines.push(`- Vigor: ${myChar.vigor}`);
    lines.push(`- Inteligencia: ${myChar.intelligence}`);
    lines.push(`- Destreza: ${myChar.dexterity}`);
    lines.push(`- Astucia: ${myChar.cunning}`);
    lines.push('');
    lines.push('## Estadísticas Derivadas');
    lines.push(`- PV Máx: ${myChar.max_pv}`);
    lines.push(`- PM Máx: ${myChar.max_pm}`);
    lines.push(`- Defensa: ${myChar.defense}`);
    lines.push(`- PV Actual: ${myChar.current_pv ?? myChar.max_pv}`);
    lines.push(`- PM Actual: ${myChar.current_pm ?? myChar.max_pm}`);
    lines.push('');
    lines.push('## Inventario');
    if (myChar.inventory_json.length === 0) {
      lines.push('- Vacío');
    } else {
      myChar.inventory_json.forEach((item) => {
        const equipped = item.equipped ? ' (Equipado)' : '';
        lines.push(`- ${item.name || 'Sin nombre'} x${item.quantity || 1}${equipped}`);
      });
    }
    lines.push('');
    lines.push('## Hechizos');
    if (myChar.spells_json.length === 0) {
      lines.push('- No hay hechizos');
    } else {
      myChar.spells_json.forEach((spell) => {
        lines.push(`- ${spell.name} (Lv${spell.level}, ${spell.cost_pm} PM)`);
      });
    }
    lines.push('');
    lines.push('## Notas del Jugador');
    lines.push(myChar.player_notes || '(Sin notas)');
    lines.push('');

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${myChar.name.replace(/\s+/g, '_')}-ficha.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [myChar]);

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
      <TopBar
        title={data.campaign_name}
        subtitle={data.scene_name}
        className="!bg-gray-900/90 !border-gray-700/50"
      >
        <span className="text-xs text-gray-400 shrink-0" data-testid="player-role">
          {choice?.kind === 'character'
            ? `Viendo como ${myChar?.name ?? '...'}`
            : 'Espectador'}
        </span>
        {choice?.kind === 'character' && (
          <button
            type="button"
            onClick={changeCharacter}
            className="text-[10px] px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors shrink-0"
          >
            Cambiar
          </button>
        )}
        {choice?.kind === 'character' && (
          <button
            type="button"
            onClick={() => setShowDiceRoller(!showDiceRoller)}
            className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
              showDiceRoller
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
            title="Tirar dados"
          >
            🎲
          </button>
        )}
        <span
          className="flex items-center gap-1.5 text-[10px] shrink-0"
          title={live ? 'Sincronizado' : 'Reconectando...'}
        >
          <span
            className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}
          />
          <span className={live ? 'text-emerald-400' : 'text-amber-400'}>
            {live ? 'Live' : 'Reconnecting'}
          </span>
        </span>
      </TopBar>

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
              characters={data.characters.map((c) => {
                const mySceneCharId = choice?.kind === 'character'
                  ? data.characters.find(
                      (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
                    )?.id
                  : null;
                const isMyChar = c.id === mySceneCharId;
                const pos = isMyChar && myPosition ? myPosition : { x: c.x, z: c.z, rotation: c.rotation ?? 0 };
                return {
                  id: c.id,
                  sceneCharId: c.id,
                  name: c.name,
                  type: c.type,
                  x: pos.x,
                  y: c.y,
                  z: pos.z,
                  visible: true,
                  portraitUrl: staticUrl(c.portrait_path),
                  modelUrl: staticUrl(c.model_path),
                  rotation: pos.rotation,
                };
              })}
              lighting={data.lighting}
              selectedTokenId={
                choice?.kind === 'character'
                  ? data.characters.find(
                      (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
                    )?.id ?? null
                  : null
              }
              movableEntityIds={
                choice?.kind === 'character'
                  ? (() => {
                      const sc = data.characters.find(
                        (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
                      );
                      return sc ? [sc.id] : [];
                    })()
                  : undefined
              }
              onTokenDrop={
                choice?.kind === 'character'
                  ? (_sceneCharId, x, z) => {
                      api.scenes.moveCharacter(data.campaign_id, data.scene_id!, {
                        character_id: choice.id,
                        x, z,
                        rotation: myPosition?.rotation ?? 0,
                      }).catch(() => {});
                      setMyPosition((prev) => ({ x, z, rotation: prev?.rotation ?? 0 }));
                    }
                  : undefined
              }
            />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            El DM aún no abrió una escena
          </div>
        )}

        {data.characters.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 bg-gray-900/80 backdrop-blur border border-gray-700/50 rounded-lg p-2 max-sm:bottom-auto max-sm:top-16 max-sm:right-2 max-sm:max-w-[140px]" data-testid="on-scene-list">
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
            className="absolute bottom-4 left-4 z-10 w-72 max-sm:left-0 max-sm:right-0 max-sm:bottom-0 max-sm:w-auto max-sm:rounded-b-none bg-gray-900/85 backdrop-blur border border-gray-700/50 rounded-lg shadow-xl"
            data-testid="player-sheet"
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                {myChar.portrait_path ? (
                  <img
                    src={staticUrl(myChar.portrait_path)!}
                    alt={myChar.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-600"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center text-sm font-bold text-emerald-300">
                    {myChar.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-100 truncate">{myChar.name}</p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {[myChar.race, myChar.class_].filter(Boolean).join(' · ') || '\u00A0'}
                  </p>
                </div>
                <div className="ml-auto flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    title="Exportar ficha como Markdown"
                    className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs flex items-center justify-center transition-colors"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    title="Imprimir ficha"
                    className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs flex items-center justify-center transition-colors"
                  >
                    🖨
                  </button>
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

              <div className="flex gap-0.5 bg-gray-800/50 rounded p-0.5 text-[10px]">
                {(['stats', 'inventory', 'spells', 'notes'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSheetTab(t)}
                    className={`flex-1 py-1 rounded capitalize transition-colors ${
                      sheetTab === t
                        ? 'bg-emerald-700 text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {t === 'stats' ? 'Stats' : t === 'inventory' ? 'Inv' : t === 'spells' ? 'Hech' : 'Notas'}
                  </button>
                ))}
              </div>

              <div className="max-h-48 overflow-y-auto">
                {sheetTab === 'stats' && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: 'Vigor', value: myChar.vigor },
                        { label: 'Intel', value: myChar.intelligence },
                        { label: 'Dest', value: myChar.dexterity },
                        { label: 'Astuc', value: myChar.cunning },
                      ].map((a) => (
                        <div key={a.label} className="text-center bg-gray-800/50 rounded py-1">
                          <p className="text-[9px] text-gray-500">{a.label}</p>
                          <p className="font-bold text-gray-300">{a.value === '-' ? '−' : a.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="bg-gray-800/50 rounded py-1">
                        <p className="font-bold text-red-400">{myChar.max_pv}</p>
                        <p className="text-[9px] text-gray-500">PV Max</p>
                      </div>
                      <div className="bg-gray-800/50 rounded py-1">
                        <p className="font-bold text-blue-400">{myChar.max_pm}</p>
                        <p className="text-[9px] text-gray-500">PM Max</p>
                      </div>
                      <div className="bg-gray-800/50 rounded py-1">
                        <p className="font-bold text-green-400">{myChar.defense}</p>
                        <p className="text-[9px] text-gray-500">Defensa</p>
                      </div>
                    </div>
                    {myChar.description && (
                      <p className="text-[10px] text-gray-400 whitespace-pre-wrap">{myChar.description}</p>
                    )}
                  </div>
                )}

                {sheetTab === 'inventory' && (
                  <div className="space-y-1">
                    {invItems.length === 0 ? (
                      <p className="text-[10px] text-gray-600">Vacío</p>
                    ) : (
                      invItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.equipped ? 'bg-emerald-400' : 'bg-gray-600'
                            }`}
                          />
                          <span className="text-[11px] text-gray-300">
                            {item.name || 'Sin nombre'}{item.quantity ? ` x${Number(item.quantity)}` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {sheetTab === 'spells' && (
                  <div className="space-y-1">
                    {myChar.spells_json.length === 0 ? (
                      <p className="text-[10px] text-gray-600">No hay hechizos</p>
                    ) : (
                      myChar.spells_json.map((spell) => (
                        <div key={spell.id} className="text-[11px] text-gray-300">
                          <span className="text-blue-400">Lv{spell.level}</span> {spell.name} ({spell.cost_pm} PM)
                        </div>
                      ))
                    )}
                  </div>
                )}

                {sheetTab === 'notes' && (
                  <div className="space-y-2">
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Mis notas del personaje..."
                      className="w-full h-24 text-[10px] bg-gray-800/50 border border-gray-700 rounded p-1.5 text-gray-200 resize-none focus:outline-none focus:border-emerald-600 transition-colors"
                    />
                    <button
                      onClick={handleSaveNotes}
                      disabled={notesSaving}
                      className="w-full text-[10px] py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50 transition-colors"
                    >
                      {notesSaving ? 'Guardando...' : 'Guardar notas'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {pickerOpen && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
            <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-4 sm:p-6 w-full max-w-md space-y-4">
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
                    {p.model_path ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-600 bg-gray-800 shrink-0">
                        <Suspense fallback={
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500">3D</div>
                        }>
                          <Canvas camera={{ position: [0, 0.5, 2], fov: 35 }}>
                            <ambientLight intensity={1.2} />
                            <directionalLight position={[2, 2, 1]} intensity={1.2} />
                            <MiniModelPreview url={staticUrl(p.model_path)!} />
                          </Canvas>
                        </Suspense>
                      </div>
                    ) : p.portrait_path ? (
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

      {showDiceRoller && data && myChar && (
        <DiceRoller
          onClose={() => setShowDiceRoller(false)}
          campaignId={data.campaign_id}
          rollerName={myChar.name}
          fixedEntityKey={`char:${myChar.id}`}
          characters={[]}
          npcs={[]}
          onRollCreated={(response) => {
            lastRollTsRef.current = Date.now();
            setToastQueue((prev) => [...prev, rollToToast(response)].slice(-5));
          }}
        />
      )}

      <MinimizedBar />

      <ToastContainer
        toasts={toastQueue}
        onDismiss={(id) => setToastQueue((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
