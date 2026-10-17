import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AudioSettingsMenu from '@/components/AudioSettingsMenu';
import i18n from '@/lib/i18n';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { BookOpen, CalendarDays, Dices, Flame, Flashlight, FolderOpen, Target, Volume2, VolumeX, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, RotateCcw, RotateCw } from 'lucide-react';
import * as THREE from 'three';
import SceneRenderer from '@/components/SceneRenderer';
import DiceRoller, { rollDice } from '@/components/DiceRoller';
import { PlayerPanelToggles, PlayerPanels, type PlayerPanelId, type PlayerPanelToggle } from '@/components/player/PlayerPanels';
import HudPanel from '@/components/HudPanel';
import { STATUS_OPTIONS } from '@/lib/statusMarkers';
import { abilityIconView, abilityFallbackGlyph } from '@/lib/abilityIcons';
import TopBar from '@/components/TopBar';
import MinimizedBar from '@/components/MinimizedBar';
import { Island, type IslandItem } from '@/components/ui/Island';
import { AnimatePresence, motion } from 'motion/react';
import ToastContainer from '@/components/ToastContainer';
import { rollToToast, useToastQueue } from '@/lib/toastQueue';
import { api, type Character, type DiceRollResponse, type Spell } from '@/lib/api';
import { checkWallCollision, extractZonePolygons, extractPortals, crossZoneBorder } from '@/lib/wall-collision';
import { sceneWorldHeight, sceneWorldSize } from '@/lib/sceneWorld';
import { usePlayerSync, type Choice } from '@/lib/usePlayerSync';
import { type CharPos } from '@/lib/playerVision';
import { buildOccluders } from '@/lib/lightOcclusion';
import { countVisibleCells, type PerceptionMask } from '@/lib/playerPerception';
import { loadExplored, saveExplored } from '@/lib/exploredMemory';
import type { VisionConfig } from '@core/domain/types';
import type { FogRegion } from '@/lib/fogMask';
import type { LosJob } from '@/lib/losWorker';
import { DEFAULT_RENDER_MODE } from '@/lib/overlayY';
import { normalizeSharedAudio, setSharedAudio } from '@/lib/audioSettings';
import { staticUrl } from '@/lib/staticUrl';

const API_BASE = '/api';
const VIDA_LABELS: Record<string, string> = {
  vigor: 'V',
  intelligence: 'I',
  dexterity: 'D',
  cunning: 'A',
};

function abilityIconChip(icon: string | null, name: string) {
  const view = abilityIconView(icon);
  if (!view) return <span className="text-[var(--text-secondary)]">{abilityFallbackGlyph(name)}</span>;
  if (view.kind === 'glyph') return <span>{view.glyph}</span>;
  return <img src={view.url} alt="" className="w-full h-full object-cover" />;
}

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
      <span className="w-5 text-[10px] text-[var(--text-secondary)] shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded bg-black/60 overflow-hidden border border-[var(--bg-tertiary)]">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: label === 'PV' ? pvColor(current, max) : '#60a5fa' }}
        />
      </div>
      <span className="text-[11px] text-[var(--text-primary)] tabular-nums w-14 text-right shrink-0">
        {current}/{max} {label}
      </span>
    </div>
  );
}

export default function PlayerView() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const [audioOn, setAudioOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioStartedRef = useRef(false);
  const [sheetTab, setSheetTab] = useState<'stats' | 'inventory' | 'spells' | 'notes'>('stats');
  const [grimorioOpen, setGrimorioOpen] = useState(false);
  const [grimorioDetail, setGrimorioDetail] = useState<Spell | null>(null);
  const [notesSaving, setNotesSaving] = useState(false);
  const [usingSpellId, setUsingSpellId] = useState<string | null>(null);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  // Paneles de información del jugador (misiones, calendario, documentos): un
  // estado en vez de uno por panel, y los botones salen de la misma fuente.
  const [openPanels, setOpenPanels] = useState<Partial<Record<PlayerPanelId, boolean>>>({});
  const togglePanel = useCallback((id: PlayerPanelId) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const closePanel = useCallback((id: PlayerPanelId) => {
    setOpenPanels((prev) => (prev[id] ? { ...prev, [id]: false } : prev));
  }, []);
  const { toasts: toastQueue, push, pushMany, dismiss } = useToastQueue();
  const [pendingRoll, setPendingRoll] = useState<{
    combat_id: string;
    campaign_id: string;
    scene_id: string;
    entity_type: string;
    entity_id: string;
  } | null>(null);
  const [rollingInit, setRollingInit] = useState(false);
  const [wasdTarget, setWasdTarget] = useState<{ x: number; z: number; rotation: number } | null>(null);
  const [shareLight, setShareLight] = useState(() => {
    try { return localStorage.getItem(`roleito:pv:${code}:sharelight`) !== '0' } catch { return true }
  });
  const [askingLight, setAskingLight] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);
  const handleAspectChange = useCallback((a: number) => {
    if (Number.isFinite(a) && a > 0) setImageAspect(a);
  }, []);
  const myCharRef = useRef<Character | null>(null);
  // Teclas activas (teclado + D-pad táctil). Compartido por el loop de movimiento.
  const keysPressedRef = useRef(new Set<string>());

  const choiceRef = useRef<Choice>(null);
  const sceneIdRef = useRef<string | null>(null);
  const wasdTargetRef = useRef<{ x: number; z: number; rotation: number } | null>(null);
  const lastRollTsRef = useRef<number>(0);
  // Sync con el DM: join inicial, WebSocket y poll de revisions. Los refs se
  // crean acá porque el loop de movimiento también los usa.
  const {
    data, myChar, choice, pickerOpen, loading, error, live, panelRevision,
    notesDraft, fading, setNotesDraft, setChoice, setPickerOpen, setMyChar,
    syncNotesDraft, fetchMyChar,
  } = usePlayerSync(code, { sceneIdRef, choiceRef, wasdTargetRef });
  const dataRef = useRef<typeof data>(null);
  const lastMoveAtRef = useRef(0);
  const lastMoveDirRef = useRef(0);
  const serverPosRef = useRef<Map<string, { x: number; z: number; rotation: number }>>(new Map());
  const serverPosAtRef = useRef<Map<string, number>>(new Map());
  const serverLmatRef = useRef<Map<string, number>>(new Map());
  const clockOffsetRef = useRef(0);
  const velocitiesRef = useRef<Map<string, { vx: number; vz: number; vrotation: number }>>(new Map());
  const lastDataRef = useRef<typeof data>(null);
  const prevAppliedAtRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const renderedPosRef = useRef<Map<string, { x: number; z: number; rotation: number }>>(new Map());
  const rafRef = useRef<number>(0);

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
          pushMany(newRolls.map(rollToToast));
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
  }, [code, data, pushMany]);

  // Ambiente: audio de la escena activa (loop). Arranca tras el gesto del jugador.
  useEffect(() => {
    if (!data) return;
    const el = audioRef.current;
    if (!data.audio_path) {
      el?.pause();
      return;
    }
    const url = staticUrl(data.audio_path);
    if (!url || !el) return;
    if (el.getAttribute('src') !== url) {
      el.src = url;
      el.load();
    }
    if (audioStartedRef.current && audioOn) {
      void el.play().catch(() => {});
    }
  }, [data, choice, audioOn]);

  // Volumen de audio publicado por el DM: si está sincronizado, todos los POV
  // siguen estos valores y los sliders del jugador quedan bloqueados.
  useEffect(() => {
    setSharedAudio(normalizeSharedAudio(data?.audio));
  }, [data?.audio]);

  // Prompt de iniciativa para este jugador (si el DM lo agregó al combate)
  useEffect(() => {
    if (choice?.kind !== 'character' || !data || !data.scene_id) return;
    const sceneId = data.scene_id;
    let cancelled = false;
    let timer: number;

    const pollPending = async () => {
      try {
        const p = await api.combat.getPendingRoll(
          data.campaign_id,
          sceneId,
          choice.id
        );
        if (cancelled) return;
        setPendingRoll(p);
      } catch {
        // best-effort
      }
      if (!cancelled) timer = window.setTimeout(pollPending, 1500);
    };

    timer = window.setTimeout(pollPending, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice?.kind, choice?.kind === 'character' ? (choice as { kind: 'character'; id: string }).id : null, data?.campaign_id, data?.scene_id]);

  const handleInitiativeRoll = useCallback(async () => {
    if (choice?.kind !== 'character' || !pendingRoll) return;
    const { results } = rollDice(6, 1);
    const value = results[0];
    setRollingInit(true);
    try {
      await api.combat.initiativeRoll(pendingRoll.campaign_id, pendingRoll.combat_id, {
        entity_type: 'character',
        entity_id: choice.id,
        initiative: value,
      });
      push(
        rollToToast({
          id: `init-${Date.now()}`,
          roller_name: myChar?.name ?? i18n.t('pv.rollerYou', 'Tú'),
          dice_type: 6,
          count: 1,
          results: [value],
          total: value,
          label: i18n.t('pv.initiativeRoll', 'Iniciativa'),
          created_at: new Date().toISOString(),
        } as DiceRollResponse)
      );
      setPendingRoll(null);
    } catch {
      // Sin pending: el DM ya tiró por este personaje.
      setPendingRoll(null);
    } finally {
      setRollingInit(false);
    }
  }, [choice, pendingRoll, myChar, push]);

  // Keep refs in sync
  useEffect(() => { myCharRef.current = myChar; }, [myChar]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { wasdTargetRef.current = wasdTarget; }, [wasdTarget]);

  const mySceneCharId = useMemo(() => {
    if (choice?.kind !== 'character' || !data) return null
    return data.characters.find(
      (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
    )?.id ?? null
  }, [choice, data])

  useEffect(() => {
    if (!data?.background_path) return
    const img = new Image()
    img.onload = () => {
      if (img.width && img.height) setImageAspect(img.width / img.height)
    }
    img.src = staticUrl(data.background_path)!
  }, [data?.background_path])

  const visionCharPos = useMemo(() => {
    const m = new Map<string, CharPos>()
    if (!data) return m
    for (const c of data.characters) m.set(c.id, { x: c.x, z: c.z })
    if (mySceneCharId && wasdTarget) {
      const coneRotation = lastMoveDirRef.current ?? wasdTarget.rotation
      m.set(mySceneCharId, { x: wasdTarget.x, z: wasdTarget.z, rotation: coneRotation, facingOffset: data.characters.find((c) => c.id === mySceneCharId)?.facing_offset ?? 0 })
    }
    return m
  }, [data, mySceneCharId, wasdTarget])

  // Por ref y no por dependencia del efecto: el intervalo de 250ms no se puede
  // reiniciar en cada snapshot o la percepción se queda sin recalcular.
  const visionCharPosRef = useRef(visionCharPos)
  useEffect(() => { visionCharPosRef.current = visionCharPos }, [visionCharPos])

  // Memoria de lo explorado (paso 6): se lee al entrar a la escena y se pasa al
  // worker. Solo se acumula si el DM encendió `remember_explored` en esta escena.
  const mapScale = data?.map_scale ?? 1
  const mapperH = sceneWorldHeight(mapScale)
  const mapperW = mapperH * imageAspect

  useEffect(() => {
    const d = dataRef.current
    if (!d?.campaign_id || !d?.scene_id || !d.remember_explored) {
      exploredRef.current = null
      return
    }
    const { w: mapW, h: mapH } = mapperRef.current
    if (mapW <= 0 || mapH <= 0) return
    const sc = d.characters.find((c) => c.id === mySceneCharId)
    const visionRange = sc?.vision_range ?? 6
    const res = visionRange <= 8 ? 0.08 : visionRange <= 16 ? 0.12 : 0.18
    const cols = Math.ceil(mapW / res)
    const rows = Math.ceil(mapH / res)
    exploredRef.current = loadExplored(d.campaign_id, d.scene_id, cols, rows)
  }, [data?.campaign_id, data?.scene_id, data?.remember_explored, mySceneCharId, mapperW, mapperH])

  // Percepción (worker + throttle): una sola máscara de alpha con LoS, luz y la
  // niebla del DM ya resueltas (PLAN-VISION-PERCEPCION.md §4.1). Antes esto eran
  // polígonos que competían por zIndex y la visión ganaba contra la niebla siempre.
  // El mask (10K+ DDA rays) corre en un Web Worker para no bloquear el render thread.
  const [perception, setPerception] = useState<PerceptionMask | null>(null)
  const mySceneCharIdRef = useRef<string | null>(null)
  useEffect(() => { mySceneCharIdRef.current = mySceneCharId }, [mySceneCharId])
  const mapperRef = useRef({ w: mapperW, h: mapperH })
  useEffect(() => { mapperRef.current = { w: mapperW, h: mapperH } }, [mapperW, mapperH])
  const lastLosRef = useRef<{ x: number; z: number; sig: string; jobId: number } | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const lastItemsKeyRef = useRef<string | null>(null)
  const exploredRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    const worker = new Worker(new URL('../lib/losWorker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as { kind: string; jobId: number; mask: PerceptionMask | null; explored: Uint8Array | null }
      if (msg?.kind !== 'los') return
      if (!lastLosRef.current || msg.jobId !== lastLosRef.current.jobId) return
      setPerception(msg.mask)
      // Guardar lo acumulado para la próxima sesión (solo si el DM la pidió).
      const d = dataRef.current
      if (msg.explored && d?.scene_id) {
        const cols = msg.mask?.cols ?? 0
        const rows = msg.mask?.rows ?? 0
        if (cols > 0 && rows > 0) {
          saveExplored(d.campaign_id, d.scene_id, msg.explored, cols, rows)
          exploredRef.current = msg.explored
        }
      }
    }
    workerRef.current = worker
    return () => { worker.terminate(); workerRef.current = null }
  }, [])

  useEffect(() => {
    if (!mySceneCharId) return
    const timer = window.setInterval(() => {
      const d = dataRef.current
      if (!d) return
      const sc = d.characters.find((c) => c.id === mySceneCharIdRef.current)
      if (!sc || !workerRef.current) return
      const pos = wasdTargetRef.current ?? { x: sc.x, z: sc.z, rotation: sc.rotation ?? 0 }
      const visionType = sc.vision_type ?? 'normal'
      const visionRange = sc.vision_range ?? 6
      const items = d.items ?? []
      const itemsKey = `${d.scene_id ?? ''}|${items.length}|${items.map((i) => i.id).join(',')}`
      const sigLine = `${visionType}|${visionRange}|${itemsKey}|${shareLight}`
      const last = lastLosRef.current
      if (last && Math.hypot(pos.x - last.x, pos.z - last.z) < 0.25 && last.sig === sigLine) return
      const { w: mapW, h: mapH } = mapperRef.current
      if (mapW <= 0 || mapH <= 0) return
      const visions: VisionConfig[] = [{
        type: visionType as VisionConfig['type'],
        range: visionRange,
        dimRange: visionType === 'normal' ? visionRange * 0.5 : 0,
      }]
      const res = visionRange <= 8 ? 0.08 : visionRange <= 16 ? 0.12 : 0.18
      const jobId = (last?.jobId ?? 0) + 1
      lastLosRef.current = { x: pos.x, z: pos.z, sig: sigLine, jobId }
      const job: LosJob = {
        kind: 'los',
        jobId,
        itemsKey,
        items: lastItemsKeyRef.current === itemsKey ? undefined : items,
        sceneCharId: sc.id,
        entityId: sc.entity_id,
        x: pos.x,
        z: pos.z,
        rotation: pos.rotation ?? 0,
        visions,
        mapW,
        mapH,
        res,
        // El worker no ve a los tokens: las antorchas pegadas a uno/from otro
        // salen de acá, y sin esto el cono propio no seguiría el facing.
        charPos: Object.fromEntries(visionCharPosRef.current),
        shareCarriedLights: shareLight,
        // Memoria de lo explorado (paso 6): solo con la política del DM.
        explored: exploredRef.current,
        accumulate: Boolean(data?.remember_explored),
      }
      lastItemsKeyRef.current = itemsKey
      workerRef.current.postMessage(job)
    }, 250)
    return () => clearInterval(timer)
  }, [mySceneCharId, shareLight])

  // SceneRenderer recibe los cálculos, no los hace: la niebla que ve el jugador es
  // su máscara de percepción. Ya no se le pasan los polígonos de niebla de la
  // escena ni los de las luces: la luz entra al mask como dato y la niebla del DM
  // como rol por celda, así que antes competían entre sí por zIndex y el jugador
  // ganaba siempre.
  const sceneFogRegions = useMemo<FogRegion[]>(() => [], [])
  const sceneOccluders = useMemo(
    () => (data ? buildOccluders(data.items ?? [], mapperW, mapperH) : []),
    [data, mapperW, mapperH],
  )

  const requestLight = useCallback(async () => {
    const d = dataRef.current
    const c = choiceRef.current
    if (!d || !c || c.kind !== 'character') return
    const sc = d.characters.find((ch) => ch.type === 'character' && ch.entity_id === c.id)
    if (!sc || !d.scene_id) return
    setAskingLight(true)
    try {
      await api.lightRequests.create(d.campaign_id, {
        player_id: c.id,
        character_name: myCharRef.current?.name ?? 'player',
        scene_id: d.scene_id,
        token_id: sc.id,
      })
      push({
        id: `asklight-${Date.now()}`,
        rollerName: i18n.t('pv.lightRequestRoller', '🕯️ Petición de luz'),
        diceType: 1,
        count: 1,
        results: [1],
        total: 1,
        label: i18n.t('pv.lightRequestSent', 'solicitud enviada al DM'),
        timestamp: Date.now(),
      })
    } catch {}
    window.setTimeout(() => setAskingLight(false), 5000)
  }, [push]);

  const toggleShareLight = useCallback(() => {
    setShareLight((v) => {
      const next = !v
      try { localStorage.setItem(`roleito:pv:${code}:sharelight`, next ? '1' : '0') } catch {}
      return next
    })
  }, [code])

  const reportMove = async (x: number, z: number, rotation: number, snap: boolean) => {
    const currentData = dataRef.current;
    const cur = choiceRef.current;
    if (!currentData || !cur || cur.kind !== 'character') return;

    const mScale = currentData.map_scale ?? 1;
    const { mapH, mapW } = sceneWorldSize(mScale, imageAspect);

    const sc = currentData.characters.find(
      (ch) => ch.type === 'character' && currentData.player_characters.some((p) => p.id === ch.entity_id && p.id === cur.id)
    );
    if (!sc) return;

    const normX = (x / mapW) + 0.5;
    const normZ = (z / mapH) + 0.5;

    const walls = (currentData.items ?? [])
      .filter((item) => item.metadata?.type === 'wall' && item.shape?.type === 'line')
      .map((item) => {
        const pts = (item.shape as { points: number[] }).points;
        return [pts[0], pts[1], pts[2], pts[3]] as [number, number, number, number];
      });
    if (checkWallCollision(normX, normZ, walls, 0.03)) return;

    const zones = extractZonePolygons(currentData.items ?? [], mapW, mapH);
    const prevNormX = (wasdTargetRef.current?.x ?? sc.x) / mapW + 0.5;
    const prevNormZ = (wasdTargetRef.current?.z ?? sc.z) / mapH + 0.5;
    if (crossZoneBorder(prevNormX, prevNormZ, normX, normZ, zones, extractPortals(currentData.items ?? []))) return;

    if (snap && currentData.grid_snap && currentData.grid_size > 0) {
      x = (Math.round(x / currentData.grid_size - 0.5) + 0.5) * currentData.grid_size;
      z = (Math.round(z / currentData.grid_size - 0.5) + 0.5) * currentData.grid_size;
    }

    const target = { x, z, rotation: ((rotation % (2 * Math.PI)) + Math.PI) % (2 * Math.PI) - Math.PI };
    wasdTargetRef.current = target;
    setWasdTarget(target);
    api.scenes.moveCharacter(currentData.campaign_id, currentData.scene_id!, {
      character_id: cur.id,
      x, z,
      rotation: target.rotation,
    }).catch(() => {});
  };

  // Smooth interpolation targets for other characters' positions
  useEffect(() => {
    if (!data) return;
    const now = performance.now();
    const myId = choice?.kind === 'character'
      ? data.characters.find(
          (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
        )?.id
      : null;
    const prevData = lastDataRef.current;
    lastDataRef.current = data;
    const prevAt = prevAppliedAtRef.current;
    prevAppliedAtRef.current = now;

    let maxLmat = 0;
    for (const c of data.characters) {
      const lmat = c.last_move_at ?? 0;
      if (lmat > maxLmat) maxLmat = lmat;
    }
    if (maxLmat > 0) clockOffsetRef.current = Date.now() / 1000 - maxLmat;

    let dtSec = prevAt ? (now - prevAt) / 1000 : 0;
    if (dtSec < 0.001 || dtSec > 2) dtSec = 0;
    if (prevData && prevData !== data && dtSec > 0) {
      for (const c of data.characters) {
        if (c.id === myId) continue;
        const p = prevData.characters.find((pp) => pp.id === c.id);
        if (!p) continue;
        const delX = c.x - p.x;
        const delZ = c.z - p.z;
        const delR = (c.rotation ?? 0) - (p.rotation ?? 0);
        const movingPos = Math.hypot(delX, delZ) >= 0.0005;
        const movingRot = Math.abs(Math.atan2(Math.sin(delR), Math.cos(delR))) >= 0.001;
        const vx = c.vx ?? 0;
        const vz = c.vz ?? 0;
        const vrot = c.vrot ?? 0;
        velocitiesRef.current.set(c.id, {
          vx: movingPos ? (Math.abs(vx) > 0.001 ? vx : delX / dtSec) : 0,
          vz: movingPos ? (Math.abs(vz) > 0.001 ? vz : delZ / dtSec) : 0,
          vrotation: movingRot ? (Math.abs(vrot) > 0.001 ? vrot : Math.atan2(Math.sin(delR), Math.cos(delR)) / dtSec) : 0,
        });
      }
    }
    for (const c of data.characters) {
      if (c.id === myId) continue;
      serverPosRef.current.set(c.id, { x: c.x, z: c.z, rotation: c.rotation ?? 0 });
      serverPosAtRef.current.set(c.id, now);
      serverLmatRef.current.set(c.id, c.last_move_at ?? 0);
    }
    for (const id of serverPosRef.current.keys()) {
      if (!data.characters.find((c) => c.id === id)) {
        serverPosRef.current.delete(id);
        serverPosAtRef.current.delete(id);
        serverLmatRef.current.delete(id);
        velocitiesRef.current.delete(id);
        renderedPosRef.current.delete(id);
      }
    }
    if (myId) {
      const mySc = data.characters.find((c) => c.id === myId);
      const cur = wasdTargetRef.current;
      if (mySc && cur) {
        const dist = Math.hypot(mySc.x - cur.x, mySc.z - cur.z);
        const idleMs = Date.now() - lastMoveAtRef.current;
        if (idleMs > 500) {
          if (dist > 0.01) {
            const target = { x: mySc.x, z: mySc.z, rotation: mySc.rotation ?? cur.rotation };
            wasdTargetRef.current = target;
            setWasdTarget(target);
          }
        }
      }
    }
  }, [data, choice]);

  useEffect(() => {
    let running = true;
    const myId = choice?.kind === 'character'
      ? data?.characters.find(
          (ch) => ch.type === 'character' && data?.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
        )?.id
      : null;
    const tick = () => {
      if (!running) return;
      const now = performance.now();
      const dtFrame = lastFrameAtRef.current
        ? Math.min(Math.max((now - lastFrameAtRef.current) / 1000, 0.001), 0.12)
        : 0.016;
      lastFrameAtRef.current = now;
      const k = 1 - Math.exp(-36 * dtFrame);
      for (const [id, target] of serverPosRef.current.entries()) {
        if (id === myId) continue;
        const vel = velocitiesRef.current.get(id);
        const t0 = serverPosAtRef.current.get(id) ?? now;
        const sLmat = serverLmatRef.current.get(id) ?? 0;
        let el: number;
        if (clockOffsetRef.current > 0 && sLmat > 0) {
          el = Date.now() / 1000 - clockOffsetRef.current - sLmat;
          if (!(el > 0)) el = 0;
          el = Math.min(el, 0.05);
        } else {
          el = Math.min((now - t0) / 1000, 0.05);
        }
        let px = target.x;
        let pz = target.z;
        let prot = target.rotation;
        if (vel && el > 0) {
          px += vel.vx * el;
          pz += vel.vz * el;
          prot += vel.vrotation * el;
        }
        const prev = renderedPosRef.current.get(id);
        if (!prev) {
          renderedPosRef.current.set(id, { x: px, z: pz, rotation: prot });
        } else {
          prev.x += (px - prev.x) * k;
          prev.z += (pz - prev.z) * k;
          const dr = prot - prev.rotation;
          prev.rotation += Math.atan2(Math.sin(dr), Math.cos(dr)) * k;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [choice, data]);

  // WASD/QE keyboard movement for player's own character
  useEffect(() => {
    const c = choiceRef.current;
    if (!c || c.kind !== 'character') return;

    const ROTATE_SPEED = Math.PI / 8;
    const keysPressed = keysPressedRef.current;
    let moveTimer: number;

    const applyMovement = async () => {
      const currentData = dataRef.current;
      const cur = choiceRef.current;
      if (!currentData || !cur || cur.kind !== 'character') return;

      const sc = currentData.characters.find(
        (ch) => ch.type === 'character' && currentData.player_characters.some((p) => p.id === ch.entity_id && p.id === cur.id)
      );
      if (!sc) return;

      const prev = wasdTargetRef.current;
      let x = prev ? prev.x : sc.x;
      let z = prev ? prev.z : sc.z;
      let rotation = prev ? prev.rotation : (sc.rotation ?? 0);
      let moved = false;
      let hasWasd = false;

      const moveSpeed = 0.15 * (sc.move_speed ?? 1);

      if (keysPressed.has('w') || keysPressed.has('arrowup')) {
        x += Math.sin(rotation) * moveSpeed;
        z += Math.cos(rotation) * moveSpeed;
        moved = true;
        hasWasd = true;
      }
      if (keysPressed.has('s') || keysPressed.has('arrowdown')) {
        x -= Math.sin(rotation) * moveSpeed;
        z -= Math.cos(rotation) * moveSpeed;
        moved = true;
        hasWasd = true;
      }
      if (keysPressed.has('a') || keysPressed.has('arrowleft')) {
        x += Math.cos(rotation) * -moveSpeed;
        z += Math.sin(rotation) * moveSpeed;
        moved = true;
        hasWasd = true;
      }
      if (keysPressed.has('d') || keysPressed.has('arrowright')) {
        x += Math.cos(rotation) * moveSpeed;
        z -= Math.sin(rotation) * moveSpeed;
        moved = true;
        hasWasd = true;
      }
      if (keysPressed.has('q')) {
        rotation += ROTATE_SPEED;
        moved = true;
      }
      if (keysPressed.has('e')) {
        rotation -= ROTATE_SPEED;
        moved = true;
      }

      if (moved) {
        if (hasWasd) {
          const dx = x - (prev ? prev.x : sc.x);
          const dz = z - (prev ? prev.z : sc.z);
          if (dx !== 0 || dz !== 0) {
            lastMoveDirRef.current = Math.atan2(dx, dz);
          }
        }
        lastMoveAtRef.current = Date.now();
        const mapScale = currentData.map_scale ?? 1;
        const { mapH, mapW } = sceneWorldSize(mapScale, imageAspect);
        const tokenRadius = 0.4;
        x = Math.max(-mapW / 2 + tokenRadius, Math.min(mapW / 2 - tokenRadius, x));
        z = Math.max(-mapH / 2 + tokenRadius, Math.min(mapH / 2 - tokenRadius, z));

        const normX = (x / mapW) + 0.5;
        const normZ = (z / mapH) + 0.5;
        const walls = (currentData.items ?? [])
          .filter((item) => item.metadata?.type === 'wall' && item.shape?.type === 'line')
          .map((item) => {
            const pts = (item.shape as { points: number[] }).points;
            return [pts[0], pts[1], pts[2], pts[3]] as [number, number, number, number];
          });
        if (checkWallCollision(normX, normZ, walls, 0.03)) {
          return;
        }

        const zones = extractZonePolygons(currentData.items ?? [], mapW, mapH)
        const prevNormX = (prev ? prev.x : sc.x) / mapW + 0.5
        const prevNormZ = (prev ? prev.z : sc.z) / mapH + 0.5
        if (crossZoneBorder(prevNormX, prevNormZ, normX, normZ, zones, extractPortals(currentData.items ?? []))) {
          return;
        }

        // No grid snap on keyboard movement: rounding 0.15-unit ticks to the
        // grid cell keeps the character stuck on a grid line forever.
        const target = { x, z, rotation: ((rotation % (2 * Math.PI)) + Math.PI) % (2 * Math.PI) - Math.PI };
        wasdTargetRef.current = target;
        setWasdTarget(target);
        api.scenes.moveCharacter(currentData.campaign_id, currentData.scene_id!, {
          character_id: cur.id,
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
      moveTimer = window.setTimeout(gameLoop, 40);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    moveTimer = window.setTimeout(gameLoop, 40);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearTimeout(moveTimer);
    };
  }, [choice?.kind, choice?.kind === 'character' ? (choice as { kind: 'character'; id: string }).id : null, imageAspect]);

  const chooseCharacter = useCallback(
    (id: string) => {
      if (!data) return;
      audioStartedRef.current = true;
      const el = audioRef.current;
      if (el && el.getAttribute('src')) void el.play().catch(() => {});
      localStorage.setItem(`roleito:pv:${code}`, id);
      const c: Choice = { kind: 'character', id };
      choiceRef.current = c;
      setChoice(c);
      setPickerOpen(false);
      const sc = data.characters.find(
        (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === id)
      );
      if (sc) {
        const initTarget = { x: sc.x, z: sc.z, rotation: sc.rotation ?? 0 };
        wasdTargetRef.current = initTarget;
        setWasdTarget(initTarget);
      }
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
    audioStartedRef.current = true;
    const el = audioRef.current;
    if (el && el.getAttribute('src')) void el.play().catch(() => {});
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
        const updated = await res.json() as Character;
        setMyChar(updated);
        syncNotesDraft(updated);
      }
    } catch {
      // keep local draft on failure
    } finally {
      setNotesSaving(false);
    }
  }, [myChar, data, notesDraft, syncNotesDraft]);

  // "Usar" descuenta el coste en PM y deja el evento ability_used (C4): el
  // endpoint hace los dos en la misma transacción y la respuesta trae la
  // ficha ya actualizada, así que el PM bar se refresca con setMyChar.
  const handleUseSpell = useCallback(
    async (spell: Spell) => {
      if (!myChar || !data) return;
      const current = myChar.current_pm ?? myChar.max_pm ?? 0;
      const cost = spell.cost_pm;
      if (!Number.isFinite(cost) || cost > current) return;
      // El click es el gesto que desbloquea audio: sonar acá cuenta como
      // autoplay permitido, aunque la llamada al back falle después.
      if (spell.audio_path) {
        const url = staticUrl(spell.audio_path);
        if (url) void new Audio(url).play().catch(() => {});
      }
      setUsingSpellId(spell.id);
      try {
        const used = await api.abilities.use(data.campaign_id, spell.id, myChar.id);
        setMyChar(used.character);
      } catch {
        // sin respuesta no hay nada que descontar: la ficha queda como estaba
      } finally {
        setUsingSpellId(null);
      }
    },
    [myChar, data],
  );

  const grimorioItems: IslandItem[] = useMemo(() => {
    if (!myChar) return [];
    return myChar.spells_json.map((s) => ({
      id: s.id,
      label: s.name,
      icon: <span className="text-lg leading-none">{abilityIconChip(s.icon, s.name)}</span>,
      hint: `Lv${s.level} · ${s.cost_pm} PM`,
    }));
  }, [myChar]);

  useEffect(() => {
    if (!grimorioDetail) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setGrimorioDetail(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [grimorioDetail]);

  const handleExportMarkdown = useCallback(() => {
    if (!myChar) return;
    const lines: string[] = [];
    lines.push(i18n.t('pv.mdTitle', '# Ficha: {{name}}', { name: myChar.name }));
    lines.push('');
    lines.push(i18n.t('pv.mdRace', '- **Raza**: {{v}}', { v: myChar.race }));
    lines.push(i18n.t('pv.mdClass', '- **Clase**: {{v}}', { v: myChar.class_ }));
    lines.push(i18n.t('pv.mdStatus', '- **Estado**: {{v}}', { v: myChar.status }));
    lines.push(i18n.t('pv.mdKnowledge', '- **Conocimiento**: {{v}}', { v: myChar.knowledge_scope }));
    if (myChar.current_location_id) lines.push(i18n.t('pv.mdLocation', '- **Ubicación**: {{v}}', { v: myChar.current_location_id }));
    lines.push('');
    lines.push(i18n.t('pv.mdAttributes', '## Atributos (VIDA)'));
    lines.push(i18n.t('pv.mdVigor', '- Vigor: {{v}}', { v: myChar.vigor }));
    lines.push(i18n.t('pv.mdIntelligence', '- Inteligencia: {{v}}', { v: myChar.intelligence }));
    lines.push(i18n.t('pv.mdDexterity', '- Destreza: {{v}}', { v: myChar.dexterity }));
    lines.push(i18n.t('pv.mdCunning', '- Astucia: {{v}}', { v: myChar.cunning }));
    lines.push('');
    lines.push(i18n.t('pv.mdDerived', '## Estadísticas Derivadas'));
    lines.push(i18n.t('pv.mdPvMax', '- PV Máx: {{v}}', { v: myChar.max_pv }));
    lines.push(i18n.t('pv.mdPmMax', '- PM Máx: {{v}}', { v: myChar.max_pm }));
    lines.push(i18n.t('pv.mdDefense', '- Defensa: {{v}}', { v: myChar.defense }));
    lines.push(i18n.t('pv.mdPvCurrent', '- PV Actual: {{v}}', { v: myChar.current_pv ?? myChar.max_pv }));
    lines.push(i18n.t('pv.mdPmCurrent', '- PM Actual: {{v}}', { v: myChar.current_pm ?? myChar.max_pm }));
    lines.push('');
    lines.push(i18n.t('pv.mdInventory', '## Inventario'));
    if (myChar.inventory_json.length === 0) {
      lines.push(i18n.t('pv.mdEmpty', '- Vacío'));
    } else {
      myChar.inventory_json.forEach((item) => {
        const equipped = item.equipped ? i18n.t('pv.mdEquipped', ' (Equipado)') : '';
        lines.push(i18n.t('pv.mdItemLine', '- {{name}} x{{qty}}{{equipped}}', { name: item.name || i18n.t('pv.noName', 'Sin nombre'), qty: item.quantity || 1, equipped }));
      });
    }
    lines.push('');
    lines.push(i18n.t('pv.mdSpells', '## Hechizos'));
    if (myChar.spells_json.length === 0) {
      lines.push(i18n.t('pv.mdNoSpells', '- No hay hechizos'));
    } else {
      myChar.spells_json.forEach((spell) => {
        lines.push(i18n.t('pv.mdSpellLine', '- {{name}} (Lv{{l}}, {{cost}} PM)', { name: spell.name, l: spell.level, cost: spell.cost_pm }));
      });
    }
    lines.push('');
    lines.push(i18n.t('pv.mdPlayerNotes', '## Notas del Jugador'));
    lines.push(myChar.player_notes || i18n.t('pv.mdNoNotes', '(Sin notas)'));
    lines.push('');

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${i18n.t('pv.mdFilename', '{{name}}-ficha', { name: myChar.name.replace(/\s+/g, '_') })}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [myChar]);

  // Botones de los paneles de información. Solo el personaje tiene paneles: el
  // espectador no, así que la lista sale vacía y no se dibuja nada.
  const panelToggles = useMemo<PlayerPanelToggle[]>(
    () =>
      choice?.kind === 'character'
        ? [
            {
              id: 'quests',
              label: t('pv.quests', 'Misiones'),
              icon: Target,
              active: !!openPanels.quests,
              onClick: () => togglePanel('quests'),
            },
            {
              id: 'calendar',
              label: t('pv.calendar', 'Calendario'),
              icon: CalendarDays,
              active: !!openPanels.calendar,
              onClick: () => togglePanel('calendar'),
            },
            {
              id: 'handouts',
              label: t('pv.handouts', 'Documentos'),
              icon: FolderOpen,
              active: !!openPanels.handouts,
              onClick: () => togglePanel('handouts'),
              testId: 'player-handouts-toggle',
            },
          ]
        : [],
    [choice, t, openPanels, togglePanel],
  );

  const missingCode = !code;

  if (loading && !missingCode) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-[var(--text-secondary)]">
        {t('pv.joining', 'Uniéndose a la campaña...')}
      </div>
    );
  }

  if (error || missingCode || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-400">
        {error || (missingCode ? t('pv.noCode', 'Sin código de invitación') : t('pv.joinFailedShort', 'No se pudo unir'))}
      </div>
    );
  }

  const pv = myChar?.current_pv ?? myChar?.max_pv ?? 0;
  const pm = myChar?.current_pm ?? myChar?.max_pm ?? 0;
  const invItems = myChar?.inventory_json ?? [];
  const myStatuses = data.characters.find((c) => c.id === mySceneCharId)?.statuses ?? [];

  // D-pad táctil: alimenta el mismo Set que el teclado en el loop de movimiento.
  const pad = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      keysPressedRef.current.add(key);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerUp: () => keysPressedRef.current.delete(key),
    onPointerCancel: () => keysPressedRef.current.delete(key),
    onLostPointerCapture: () => keysPressedRef.current.delete(key),
  });

  return (
    <main className="h-screen flex flex-col bg-black overflow-hidden select-none">
      <h1 className="sr-only">{t('pv.srTitle', 'Vista de jugador')}</h1>
      <audio ref={audioRef} loop className="hidden" />
      <TopBar
        title={data.campaign_name}
        subtitle={data.scene_name}
        className="!bg-[var(--surface)] !border-[var(--bg-tertiary)]/50"
      >
        <span className="text-xs text-[var(--text-secondary)] shrink-0" data-testid="player-role">
          {choice?.kind === 'character'
            ? t('pv.viewingAs', 'Viendo como {{name}}', { name: myChar?.name ?? '...' })
            : t('pv.spectator', 'Espectador')}
        </span>
        {choice && (
          <button
            type="button"
            onClick={changeCharacter}
            className="text-[10px] px-2 py-1 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors shrink-0"
          >
            {choice.kind === 'character' ? t('pv.change', 'Cambiar') : t('pv.chooseChar', 'Elegir personaje')}
          </button>
        )}
        {choice?.kind === 'character' && (
          <button
            type="button"
            onClick={() => setShowDiceRoller(!showDiceRoller)}
            className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
              showDiceRoller
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/70'
            }`}
            title={t('pv.diceTitle', 'Tirar dados')}
          >
            <Dices className="h-3.5 w-3.5" />
          </button>
        )}
        {choice?.kind === 'character' && (
          <button
            type="button"
            onClick={toggleShareLight}
            className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
              shareLight
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/70'
            }`}
            title={shareLight ? t('pv.shareLightOn', 'Compartiendo luz con el grupo') : t('pv.shareLightOff', 'Solo tu luz + luces del DM')}
          >
            <Flashlight className="h-3.5 w-3.5" />
          </button>
        )}
        {data.audio_path && choice && (
          <button
            type="button"
            onClick={() => setAudioOn((v) => !v)}
            className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
              audioOn
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/70'
            }`}
            title={audioOn ? t('pv.audioMute', 'Silenciar ambiente') : t('pv.audioActivate', 'Activar ambiente')}
            data-testid="audio-toggle"
          >
            {audioOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        )}
        <AudioSettingsMenu className="ml-1" />
        {choice?.kind === 'character' && (
          <button
            type="button"
            onClick={requestLight}
            disabled={askingLight}
            className="text-xs px-2 py-1 rounded transition-colors shrink-0 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/70 disabled:opacity-40"
            title={t('pv.askLight', 'Pedir luz al DM')}
          >
            <Flame className="h-3.5 w-3.5" />
          </button>
        )}
        <PlayerPanelToggles toggles={panelToggles} />
        <span
          className="flex items-center gap-1.5 text-[10px] shrink-0"
          title={live ? t('pv.synced', 'Sincronizado') : t('pv.reconnecting', 'Reconectando...')}
        >
          <span
            className={`w-2 h-2 rounded-full ${live ? 'bg-[var(--success)]' : 'bg-[var(--warning)] animate-pulse'}`}
          />
          <span className={live ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
            {live ? t('pv.live', 'En vivo') : t('pv.reconnecting', 'Reconectando...')}
          </span>
        </span>
      </TopBar>

      <div className="flex-1 relative min-h-0 min-w-0" data-hud-stage>
        {pendingRoll && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)]/95 border border-[var(--warning)]/40 shadow-lg"
            data-testid="initiative-prompt"
          >
            <span className="text-[var(--warning)] text-sm">⚔️</span>
            <span className="text-xs text-[var(--text-primary)]">{t('pv.rollInitiative', '¡Tirá iniciativa!')}</span>
            <button
              type="button"
              onClick={handleInitiativeRoll}
              disabled={rollingInit}
              className="text-sm px-2.5 py-1 rounded bg-[var(--warning)] text-black font-semibold hover:bg-[var(--warning)]/80 disabled:opacity-40 transition-colors"
              data-testid="initiative-roll-btn"
            >
              🎲 d6
            </button>
          </div>
        )}
        {data.background_path ? (
          <Suspense
            fallback={
              <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
                {t('pv.loadingScene', 'Cargando escena...')}
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
                if (isMyChar && wasdTarget) {
                  return {
                    id: c.id, sceneCharId: c.id, name: c.name, type: c.type,
                    x: wasdTarget.x, y: c.y, z: wasdTarget.z,
                    visible: true, portraitUrl: staticUrl(c.portrait_path),
                    modelUrl: staticUrl(c.model_path), rotation: wasdTarget.rotation,
                    tokenScale: c.token_scale ?? 1,
                    brightness: c.brightness ?? 0,
                    facingOffset: c.facing_offset ?? 0,
                    statuses: c.statuses ?? [],
                  };
                }
                const interpolated = renderedPosRef.current.get(c.id);
                return {
                  id: c.id, sceneCharId: c.id, name: c.name, type: c.type,
                  x: interpolated ? interpolated.x : c.x,
                  y: c.y,
                  z: interpolated ? interpolated.z : c.z,
                  visible: true, portraitUrl: staticUrl(c.portrait_path),
                  modelUrl: staticUrl(c.model_path),
                  rotation: interpolated ? interpolated.rotation : (c.rotation ?? 0),
                  tokenScale: c.token_scale ?? 1,
                  brightness: c.brightness ?? 0,
                  facingOffset: c.facing_offset ?? 0,
                  statuses: c.statuses ?? [],
                };
              })}
              lighting={data.lighting}
              weather={data.weather ?? null}
              weatherIntensity={data.weather_intensity ?? 1}
              weatherAudioEnabled={audioOn}
              mapScale={data.map_scale ?? 1}
              onAspectChange={handleAspectChange}
              modelYOffset={data.model_y_offset ?? 0}
              items={data.items ?? []}
              occluders={sceneOccluders}
              fogRegions={sceneFogRegions}
              fogPerception={perception}
              readOnly
              fogColor="rgba(5, 5, 20, 0.82)"
              renderMode={DEFAULT_RENDER_MODE}
              gridSize={data.grid_size ?? 0}
              gridSnap={data.grid_snap ?? false}
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
                      const rotation = wasdTarget?.rotation ?? (data.characters.find(
                        (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
                      )?.rotation ?? 0);
                      reportMove(x, z, rotation, true);
                    }
                  : undefined
              }
              onTokenDrag={
                choice?.kind === 'character'
                  ? (_sceneCharId, x, z) => {
                      const rotation = wasdTarget?.rotation ?? (data.characters.find(
                        (ch) => ch.type === 'character' && data.player_characters.some((p) => p.id === ch.entity_id && p.id === choice.id)
                      )?.rotation ?? 0);
                      reportMove(x, z, rotation, false);
                    }
                  : undefined
              }
            />
          </Suspense>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
            {t('pv.noSceneYet', 'El DM aún no abrió una escena')}
          </div>
        )}

        {/*
          La niebla del jugador se pinta en una textura de WebGL, así que no hay
          nada legible en el DOM. Esto es el seam para el e2e de percepción (y un
          dato útil si hay que debuggear por qué alguien ve de más): cuántas
          celdas ve el personaje, y cuántas de la rejilla.
        */}
        <div
          className="hidden"
          aria-hidden="true"
          data-testid="perception-mask"
          data-visible-cells={perception ? countVisibleCells(perception) : 0}
          data-cols={perception?.cols ?? 0}
          data-rows={perception?.rows ?? 0}
        />

        {data.characters.length > 0 && (
          <div className="absolute bottom-4 right-4 z-10 bg-[var(--surface)]/80 backdrop-blur border border-[var(--bg-tertiary)]/50 rounded-lg p-2 max-sm:bottom-auto max-sm:top-16 max-sm:right-2 max-sm:max-w-[140px]" data-testid="on-scene-list">
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">{t('dm.onScene', 'En escena ({{n}})', { n: data.characters.length })}</p>
            <div className="space-y-0.5">
              {data.characters.map((c) => (
                <div key={c.id} className="flex items-center gap-1.5 px-1.5 py-0.5 text-xs text-[var(--text-primary)]">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: c.type === 'character' ? 'var(--success)' : 'var(--warning)',
                    }}
                  />
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {choice?.kind === 'character' && (
          <div
            data-testid="pv-touch-controls"
            className="absolute bottom-4 left-4 z-10 hidden [@media(pointer:coarse)]:grid grid-cols-3 gap-1 select-none touch-none"
          >
            {[
              { k: 'q', label: <RotateCcw className="h-4 w-4" />, name: t('pv.rotateLeft', 'Girar a la izquierda') },
              { k: 'w', label: <ArrowUp className="h-4 w-4" />, name: t('pv.moveUp', 'Mover adelante') },
              { k: 'e', label: <RotateCw className="h-4 w-4" />, name: t('pv.rotateRight', 'Girar a la derecha') },
              { k: 'a', label: <ArrowLeft className="h-4 w-4" />, name: t('pv.moveLeft', 'Mover a la izquierda') },
              { k: 's', label: <ArrowDown className="h-4 w-4" />, name: t('pv.moveDown', 'Mover atrás') },
              { k: 'd', label: <ArrowRight className="h-4 w-4" />, name: t('pv.moveRight', 'Mover a la derecha') },
            ].map((b) => (
              <button
                key={b.k}
                type="button"
                aria-label={b.name}
                title={b.name}
                {...pad(b.k)}
                className="w-12 h-12 touch-none rounded-lg bg-black/60 backdrop-blur border border-[var(--bg-tertiary)] text-[var(--text-primary)] text-lg flex items-center justify-center active:bg-[var(--accent)]/50 active:border-[var(--accent)] transition-colors"
              >
                {b.label}
              </button>
            ))}
          </div>
        )}

        {myChar && (
          <HudPanel
            title={myChar.name}
            panelId="player-sheet"
            onClose={() => {}}
            defaultX={16}
            defaultY={-16}
            defaultWidth={288}
          >
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                {myChar.portrait_path ? (
                  <img
                    src={staticUrl(myChar.portrait_path)!}
                    alt={myChar.name}
                    className="w-12 h-12 rounded-full object-cover border border-[var(--bg-tertiary)]"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/40 flex items-center justify-center text-sm font-bold text-white">
                    {myChar.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{myChar.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    {[myChar.race, myChar.class_].filter(Boolean).join(' · ') || '\u00A0'}
                  </p>
                </div>
                <div className="ml-auto flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    title={t('pv.exportSheet', 'Exportar ficha como Markdown')}
                    className="w-5 h-5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-primary)] hover:text-white text-xs flex items-center justify-center transition-colors"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    title={t('pv.printSheet', 'Imprimir ficha')}
                    className="w-5 h-5 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/70 text-[var(--text-primary)] hover:text-white text-xs flex items-center justify-center transition-colors"
                  >
                    🖨
                  </button>
                  {Object.entries(VIDA_LABELS).map(([key, attrLabel]) => (
                    <span
                      key={key}
                      title={attrLabel}
                      className="w-5 h-5 rounded bg-black/50 border border-[var(--bg-tertiary)] flex items-center justify-center text-[11px] text-[var(--text-primary)]"
                    >
                      {attrSymbol(myChar[key as keyof Character] as string)}
                    </span>
                  ))}
                </div>
              </div>

              <StatBar label="PV" current={pv} max={myChar.max_pv} />
              <StatBar label="PM" current={pm} max={myChar.max_pm} />

              {myStatuses.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wide">{t('pv.status', 'Estado')}</span>
                  {myStatuses.map((s) => {
                    const opt = STATUS_OPTIONS.find((o) => o.id === s);
                    if (!opt) return null;
                    return (
                      <span
                        key={s}
                        title={opt.label}
                        className="w-3.5 h-3.5 rounded-full border border-black/40 shrink-0"
                        style={{ backgroundColor: opt.color }}
                      />
                    );
                  })}
                </div>
              )}

              <div className="flex gap-0.5 bg-[var(--bg-tertiary)]/50 rounded p-0.5 text-[10px]">
                {(['stats', 'inventory', 'spells', 'notes'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSheetTab(tab)}
                    className={`flex-1 py-1 rounded capitalize transition-colors ${
                      sheetTab === tab
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {tab === 'stats' ? t('pv.tabStats', 'Stats') : tab === 'inventory' ? t('pv.tabInv', 'Inv') : tab === 'spells' ? t('pv.tabSpells', 'Hech') : t('pv.tabNotes', 'Notas')}
                  </button>
                ))}
              </div>

              <div className="max-h-48 overflow-y-auto">
                {sheetTab === 'stats' && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: t('pv.attrVigor', 'Vigor'), value: myChar.vigor },
                        { label: t('pv.attrIntel', 'Intel'), value: myChar.intelligence },
                        { label: t('pv.attrDest', 'Dest'), value: myChar.dexterity },
                        { label: t('pv.attrAstuc', 'Astuc'), value: myChar.cunning },
                      ].map((a) => (
                        <div key={a.label} className="text-center bg-[var(--bg-tertiary)]/50 rounded py-1">
                          <p className="text-[9px] text-[var(--text-secondary)]">{a.label}</p>
                          <p className="font-bold text-[var(--text-primary)]">{a.value === '-' ? '−' : a.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <div className="bg-[var(--bg-tertiary)]/50 rounded py-1">
                        <p className="font-bold text-red-400">{myChar.max_pv}</p>
                        <p className="text-[9px] text-[var(--text-secondary)]">{t('pv.pvMax', 'PV máx.')}</p>
                      </div>
                      <div className="bg-[var(--bg-tertiary)]/50 rounded py-1">
                        <p className="font-bold text-blue-400">{myChar.max_pm}</p>
                        <p className="text-[9px] text-[var(--text-secondary)]">{t('pv.pmMax', 'PM máx.')}</p>
                      </div>
                      <div className="bg-[var(--bg-tertiary)]/50 rounded py-1">
                        <p className="font-bold text-green-400">{myChar.defense}</p>
                        <p className="text-[9px] text-[var(--text-secondary)]">{t('pv.defense', 'Defensa')}</p>
                      </div>
                    </div>
                    {myChar.description && (
                      <p className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap">{myChar.description}</p>
                    )}
                  </div>
                )}

                {sheetTab === 'inventory' && (
                  <div className="space-y-1">
                    {invItems.length === 0 ? (
                      <p className="text-[10px] text-[var(--text-secondary)]">{t('pv.empty', 'Vacío')}</p>
                    ) : (
                      invItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.equipped ? 'bg-[var(--success)]' : 'bg-[var(--border)]'
                            }`}
                          />
                          <span className="text-[11px] text-[var(--text-primary)]">
                            {item.name || t('pv.noName', 'Sin nombre')}{item.quantity ? ` x${Number(item.quantity)}` : ''}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {sheetTab === 'spells' && (
                  <div className="space-y-1">
                    <div className="pb-1 mb-1 border-b border-[var(--bg-tertiary)] flex items-center gap-2">
                      <StatBar label="PM" current={pm} max={myChar.max_pm} />
                      <button
                        type="button"
                        onClick={() => setGrimorioOpen(true)}
                        disabled={myChar.spells_json.length === 0}
                        data-testid="grimorio-toggle"
                        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <BookOpen className="h-3 w-3 mr-1 inline" />
                        {t('pv.grimorio', 'Grimorio')}
                      </button>
                    </div>
                    {myChar.spells_json.length === 0 ? (
                      <p className="text-[10px] text-[var(--text-secondary)]">{t('pv.noSpells', 'No hay hechizos')}</p>
                    ) : (
                      myChar.spells_json.map((spell) => (
                        <div
                          key={spell.id}
                          className="flex items-center gap-1.5 text-[11px] text-[var(--text-primary)]"
                        >
                          <span className="w-4 h-4 shrink-0 flex items-center justify-center overflow-hidden text-[11px] leading-none">
                            {abilityIconChip(spell.icon, spell.name)}
                          </span>
                          <span className="text-blue-400">Lv{spell.level}</span> {spell.name} ({spell.cost_pm} PM)
                          {spell.audio_path && (
                            <span
                              className="shrink-0 text-[10px] leading-none"
                              title={t('pv.hasSound', 'Tiene sonido: suena al usar')}
                              data-testid={`spell-audio-${spell.id}`}
                            >
                              🔊
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleUseSpell(spell)}
                            disabled={usingSpellId === spell.id || spell.cost_pm > pm}
                            title={
                              spell.cost_pm > pm
                                ? t('pv.pmNotEnough', 'PM insuficientes')
                                : t('pv.spendPm', 'Gasta {{n}} PM', { n: spell.cost_pm })
                            }
                            className="ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {t('pv.use', 'Usar')}
                          </button>
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
                      placeholder={t('pv.notesPlaceholder', 'Mis notas del personaje...')}
                      className="w-full h-24 text-[10px] bg-[var(--bg-tertiary)]/50 border border-[var(--bg-tertiary)] rounded p-1.5 text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    <button
                      onClick={handleSaveNotes}
                      disabled={notesSaving}
                      className="w-full text-[10px] py-1 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 transition-colors"
                    >
                      {notesSaving ? t('pv.saving', 'Guardando...') : t('pv.saveNotes', 'Guardar notas')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </HudPanel>
        )}

        {pickerOpen && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
            <div className="bg-[var(--surface)] border border-[var(--bg-tertiary)]/60 rounded-xl p-4 sm:p-6 w-full max-w-md space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{t('pv.whoAreYou', '¿Quién sos?')}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {t('pv.pickCharHint', 'Elegí tu personaje para ver tu ficha durante la sesión.')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {data.player_characters.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => chooseCharacter(p.id)}
                    className="flex items-center gap-2.5 p-3 rounded-lg border border-[var(--bg-tertiary)]/60 hover:border-[var(--accent)]/70 hover:bg-[var(--accent)]/10 transition-colors text-left"
                  >
                    {p.model_path ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--bg-tertiary)] bg-[var(--bg-tertiary)] shrink-0">
                        <Suspense fallback={
                          <div className="w-full h-full flex items-center justify-center text-[8px] text-[var(--text-secondary)]">3D</div>
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
                        className="w-10 h-10 rounded-full object-cover border border-[var(--bg-tertiary)]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] flex items-center justify-center text-xs font-bold text-[var(--text-primary)]">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                        {[p.race, p.class_name].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={chooseSpectator}
                className="w-full py-2 rounded-lg border border-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
              >
                {t('pv.enterSpectator', 'Entrar como espectador')}
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
            push(rollToToast(response));
          }}
        />
      )}

      {data && (
        <PlayerPanels
          campaignId={data.campaign_id}
          revision={panelRevision}
          open={openPanels}
          onClose={closePanel}
        />
      )}

      <Island
        open={grimorioOpen}
        onClose={() => setGrimorioOpen(false)}
        onSelect={(id) => {
          const s = myChar?.spells_json.find((x) => x.id === id);
          if (s) {
            setGrimorioOpen(false);
            setGrimorioDetail(s);
          }
        }}
        title={t('pv.grimorio', 'Grimorio')}
        items={grimorioItems}
      />

      <AnimatePresence>
        {grimorioDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setGrimorioDetail(null)}
            data-testid="grimorio-detail"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="w-full max-w-sm rounded-xl border border-[var(--bg-tertiary)] bg-[var(--surface)] p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-2.5">
                <span className="w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden text-lg leading-none">
                  {abilityIconChip(grimorioDetail.icon, grimorioDetail.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                    {grimorioDetail.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    Lv{grimorioDetail.level} · {grimorioDetail.cost_pm} PM
                    {grimorioDetail.audio_path && (
                      <span className="ml-1.5" title={t('pv.hasSound', 'Tiene sonido: suena al usar')}>
                        🔊
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGrimorioDetail(null)}
                  className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  aria-label={t('pv.closeGrimorio', 'Cerrar Grimorio')}
                >
                  ✕
                </button>
              </div>
              <div className="h-px bg-[var(--bg-tertiary)]" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {grimorioDetail.description || t('pv.noDescription', 'Sin descripción.')}
              </p>
              <button
                type="button"
                onClick={() => void handleUseSpell(grimorioDetail)}
                disabled={usingSpellId === grimorioDetail.id || grimorioDetail.cost_pm > pm}
                data-testid="grimorio-detail-use"
                className="w-full py-1.5 rounded border border-[var(--accent)]/60 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {usingSpellId === grimorioDetail.id
                  ? t('pv.using', 'Usando...')
                  : grimorioDetail.cost_pm > pm
                    ? t('pv.pmNotEnough', 'PM insuficientes')
                    : t('pv.usePm', 'Usar ({{n}} PM)', { n: grimorioDetail.cost_pm })}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MinimizedBar />

      <ToastContainer
        toasts={toastQueue}
        onDismiss={dismiss}
      />
    </main>
  );
}
