import { useEffect, useState, useRef, Suspense, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Campaign, Scene, SceneCharacter, Character, NPC, Map as GameMap, LightRequest, Asset } from '@/lib/api';
import { SceneItem, ZoneMetadata, SceneLayer } from '@core/domain/types';
import { SceneGraph } from '@core/scene/scene-graph';
import { useDoorInteraction } from '@core/scene/door-interaction';
import SceneRenderer from '@/components/SceneRenderer';
import { WEATHER_META, WEATHER_NONE_LABEL, WEATHER_KIND_LABEL, clampWeatherIntensity, WEATHER_INTENSITY_MIN, WEATHER_INTENSITY_MAX } from '@/components/WeatherFX';
import { createEmptyDrawState, createWallItem, type DrawState } from '@/components/WallDrawer';
import { createEmptyZoneDraft, createZoneItem, ZONE_COLORS, ZONE_DEFAULT_COLOR, type ZoneDraft } from '@/components/ZoneDrawer';
import { createEmptyPortalDraft, type PortalDraft } from '@/components/PortalDrawerCanvas';
import { createPortalBetween, buildPortalLocalEdge, cyclePortalState, removePortal, zonesToGeometry } from '@/components/ZonePortal';
import { circlePoints, toggleZoneFog } from '@/lib/fogMask';
import { createLightItem, LIGHT_PRESETS, attachLightToToken, detachLight, normalizeLightConfig, updateLightSource, FIRE_RADIUS_MIN, FIRE_RADIUS_MAX, FIRE_RADIUS_STEP, FIRE_RADIUS_DEFAULT } from '@/lib/light';
import { LightMetadata } from '@core/domain/types';
import DoorContextMenu from '@/components/DoorContextMenu';
import WallContextMenu from '@/components/WallContextMenu';
import ZoneContextMenu from '@/components/ZoneContextMenu';
import { extractZonePolygons, checkWallCollision } from '@/lib/wall-collision';
import { buildOccluders } from '@/lib/lightOcclusion';
import { computeReachableCells } from '@/lib/movementRange';
import { DEFAULT_RENDER_MODE } from '@/lib/overlayY';
import BackgroundSelector, { generateBackgroundCSS } from '@/components/BackgroundSelector';
import SessionLogHud from '@/components/SessionLogHud';
import SceneNotesHud from '@/components/SceneNotesHud';
import QuickActionsHud from '@/components/QuickActionsHud';
import DiceRoller from '@/components/DiceRoller';
import RecapPanel from '@/components/RecapPanel';
import CharacterSheet from '@/components/CharacterSheet';
import InitiativeTracker from '@/components/InitiativeTracker';
import QuestPanel from '@/components/QuestPanel';
import HandoutPanel from '@/components/HandoutPanel';
import CalendarPanel from '@/components/CalendarPanel';
import { STATUS_OPTIONS, STATUS_GROUPS } from '@/lib/statusMarkers';
import MapViewer from '@/components/MapViewer';
import DMNotebookHud from '@/components/DMNotebookHud';
import AISettingsPanel from '@/components/AISettingsPanel';
import DMAssistant from '@/components/DMAssistant';
import SceneSettingsHud from '@/components/SceneSettingsHud';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';
import ToastContainer, { type ToastRoll, rollToToast } from '@/components/ToastContainer';
import TopBar from '@/components/TopBar';
import MinimizedBar from '@/components/MinimizedBar';

const MAX_HISTORY = 30;

function sameIds(a: SceneItem[], b: SceneItem[]): boolean {
  if (a.length !== b.length) return false
  const ids = new Set(a.map((i) => i.id))
  return b.every((i) => ids.has(i.id))
}

function snapshotOf(items: SceneItem[]): SceneItem[] {
  return JSON.parse(JSON.stringify(items)) as SceneItem[]
}

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  return `/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

export default function DmDashboard() {
  const { id: campaignId } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeScene, setActiveScene] = useState<Scene | null>(null);
  const [sceneChars, setSceneChars] = useState<SceneCharacter[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [showSessionLog, setShowSessionLog] = useState(false);
  const [showSceneNotes, setShowSceneNotes] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showMapMenu, setShowMapMenu] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showInitiative, setShowInitiative] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [showHandouts, setShowHandouts] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [viewingMap, setViewingMap] = useState<GameMap | null>(null);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [transitioning, setTransitioning] = useState<'idle' | 'in' | 'out'>('idle');
  const [showNotebook, setShowNotebook] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showSceneSettings, setShowSceneSettings] = useState(false);
  const [dockExpanded, setDockExpanded] = useState(false);
  const [dockMoreOpen, setDockMoreOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeDock = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setDockExpanded(false);
        setDockMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', closeDock);
    return () => document.removeEventListener('mousedown', closeDock);
  }, []);
  const [distanceFrom, setDistanceFrom] = useState<string | null>(null);
  const [distanceTo, setDistanceTo] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [lightRequests, setLightRequests] = useState<LightRequest[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastRoll[]>([]);
  const [sceneItems, setSceneItems] = useState<SceneItem[]>([]);
  const [graphRef] = useState(() => new SceneGraph());
  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [zoneDraft, setZoneDraft] = useState<ZoneDraft | null>(null);
  const [portalDraft, setPortalDraft] = useState<PortalDraft | null>(null);
  const [fogMode, setFogMode] = useState<{ reveal: boolean; radius: number } | null>(null);
  const [rectFogMode, setRectFogMode] = useState<{ reveal: boolean } | null>(null);
  const lastFogPointRef = useRef<{ x: number; y: number } | null>(null);
  const [zoneFogActive, setZoneFogActive] = useState(false);
  const [lightPlaceMode, setLightPlaceMode] = useState<{ preset: string; fx?: 'flame' | 'embers'; fxRadius?: number } | null>(null);
  const [placingToken, setPlacingToken] = useState<{ entity_type: string; entity_id: string } | null>(null);
  const [attachLightMode, setAttachLightMode] = useState<{ lightId: string | null } | null>(null);
  const [zoneColor, setZoneColor] = useState(ZONE_DEFAULT_COLOR);
  const [wallMaterial, setWallMaterial] = useState<'stone' | 'wood' | 'metal' | 'glass' | 'magic'>('stone');
  const [doorMaterial, setDoorMaterial] = useState<'wood' | 'metal' | 'glass' | 'magic'>('wood');
  const [doorContextMenu, setDoorContextMenu] = useState<{ x: number; y: number; itemId: string; state: string } | null>(null);
  const [wallContextMenu, setWallContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [zoneContextMenu, setZoneContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  const [lightingMenuRect, setLightingMenuRect] = useState<{ left: number; top: number } | null>(null);
  const [weatherMenuRect, setWeatherMenuRect] = useState<{ left: number; top: number } | null>(null);
  // Los menús de clima y lighting abren con click, no con hover: en táctil el
  // hover no existe y el menú era inalcanzable.
  const [openMenu, setOpenMenu] = useState<'lighting' | 'weather' | null>(null);
  const [showZones, setShowZones] = useState(true);

  const toggleMenu = (which: 'lighting' | 'weather', anchor: HTMLElement) => {
    const r = anchor.getBoundingClientRect();
    if (which === 'lighting') {
      setLightingMenuRect({ left: Math.max(8, r.right - 150), top: r.bottom - 2 });
    } else {
      setWeatherMenuRect({ left: Math.max(8, r.right - 170), top: r.bottom - 2 });
    }
    setOpenMenu((prev) => (prev === which ? null : which));
  };

  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu-root]')) setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);
  const [lightContextMenu, setLightContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [fogContextMenu, setFogContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [, setUndoBump] = useState(0);
  const undoStackRef = useRef<SceneItem[][]>([]);
  const redoStackRef = useRef<SceneItem[][]>([]);
  const sceneItemsRef = useRef<SceneItem[]>([]);
  const applyingHistoryRef = useRef(false);
  const lastUndoAtRef = useRef(0);
  const [detectingWalls, setDetectingWalls] = useState(false);
  const [detectionMode, setDetectionMode] = useState<'blueprint' | 'textured'>('blueprint');
  const [useAi, setUseAi] = useState(false);
  const [bgSelector, setBgSelector] = useState<{
    sceneType: string;
    suggestions: { id: string; name: string; style: string; colors: string[] }[];
    dominantColors: string[];
  } | null>(null);
  const [bgCSS, setBgCSS] = useState<string | null>(null);
  const buildMenuRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastRollTsRef = useRef<number>(0);
  const serverPosRef = useRef<Map<string, { x: number; z: number; rotation: number }>>(new Map());
  const serverPosAtRef = useRef<Map<string, number>>(new Map());
  const serverLmatRef = useRef<Map<string, number>>(new Map());
  const clockOffsetRef = useRef(0);
  const velocitiesRef = useRef<Map<string, { vx: number; vz: number; vrotation: number }>>(new Map());
  const lastDataRef = useRef<SceneCharacter[]>([]);
  const prevAppliedAtRef = useRef(0);
  const lastFrameAtRef = useRef(0);
  const renderedPosRef = useRef<Map<string, { x: number; z: number; rotation: number }>>(new Map());
  const draggingTokenIdRef = useRef<string | null>(null);
  const lastDragTsRef = useRef(0);
  const rafRef = useRef<number>(0);
  const sceneCharsRef = useRef(sceneChars);
  sceneCharsRef.current = sceneChars;
  const lastLocalChangeRef = useRef(0);
  const wsOpenRef = useRef(false);

  useEffect(() => {
    if (!campaignId) return;
    Promise.all([
      api.campaigns.get(campaignId),
      api.scenes.list(campaignId).catch(() => []),
      api.characters.list(campaignId).catch(() => []),
      api.npcs.list(campaignId).catch(() => []),
      api.maps.list(campaignId).catch(() => []),
      api.assets.list(campaignId).catch(() => []),
    ])
      .then(([c, sc, chars, npcList, mapList, assetList]) => {
        setCampaign(c);
        setScenes(sc);
        setCharacters(chars);
        setNpcs(npcList);
        setMaps(mapList);
        setAssets(assetList);
        const active = sc.find((s) => s.status === 'active') || sc[0] || null;
        setActiveScene(active);
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !activeScene) return;
    api.scenes.getCharacters(campaignId, activeScene.id)
      .then(setSceneChars)
      .catch(() => setSceneChars([]));
  }, [campaignId, activeScene]);

  useEffect(() => {
    if (!campaignId || !activeScene) return;
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: number;
    const wsUrl = '/api'.replace(/^http/, 'ws') + `/ws/campaigns/${campaignId}`;

    const connectWs = () => {
      if (cancelled) return;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
      const sock = new WebSocket(wsUrl);
      ws = sock;
      sock.onopen = () => {
        if (!cancelled) wsOpenRef.current = true;
      };
      sock.onmessage = async (ev) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string };
          if (msg.type === 'revision' && Date.now() - lastLocalChangeRef.current > 500) {
            const sc = await api.scenes.getCharacters(campaignId, activeScene.id);
            if (!cancelled) setSceneChars(sc);
          }
        } catch {
          // mensaje no JSON: ignorar
        }
      };
      sock.onclose = () => {
        if (cancelled) return;
        if (ws === sock) ws = null;
        wsOpenRef.current = false;
        reconnectTimer = window.setTimeout(connectWs, 1000);
      };
      sock.onerror = () => {
        if (ws === sock) sock.close();
      };
    };

    connectWs();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimer);
      wsOpenRef.current = false;
      if (ws) ws.close();
    };
  }, [campaignId, activeScene]);

  useEffect(() => {
    if (!campaignId || !activeScene) return;
    let cancelled = false;
    let timer: number;
    const poll = async () => {
      if (wsOpenRef.current) {
        if (!cancelled) timer = window.setTimeout(poll, 1500);
        return;
      }
      try {
        const sc = await api.scenes.getCharacters(campaignId, activeScene.id);
        if (!cancelled && Date.now() - lastLocalChangeRef.current > 500) setSceneChars(sc);
      } catch {}
      if (!cancelled) timer = window.setTimeout(poll, 1500);
    };
    timer = window.setTimeout(poll, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [campaignId, activeScene]);

  useEffect(() => {
    if (!campaignId || !activeScene) return;
    api.scenes.getItems(campaignId, activeScene.id)
      .then(({ items }) => {
        graphRef.clear()
        items.forEach((item: SceneItem) => graphRef.addItem(item))
        setSceneItems(graphRef.getItems())
      })
      .catch(() => setSceneItems([]));
  }, [campaignId, activeScene, graphRef]);

  const saveTimerRef = useRef<number>(0);

  const pushUndo = useCallback((prev: SceneItem[]) => {
    const now = Date.now()
    const top = undoStackRef.current[undoStackRef.current.length - 1]
    const coalesce = top && sameIds(top, prev) && now - lastUndoAtRef.current < 400
    if (coalesce) {
      undoStackRef.current[undoStackRef.current.length - 1] = prev
    } else {
      undoStackRef.current.push(prev)
      if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift()
    }
    lastUndoAtRef.current = now
    redoStackRef.current = []
    setUndoBump((c) => c + 1)
  }, [])

  const applyHistoryItems = useCallback((items: SceneItem[]) => {
    applyingHistoryRef.current = true
    graphRef.clear()
    items.forEach((item) => graphRef.addItem(item))
    sceneItemsRef.current = items
    setSceneItems([...items])
    if (campaignId && activeScene) {
      api.scenes.saveItems(campaignId, activeScene.id, items).catch(() => {})
    }
    applyingHistoryRef.current = false
  }, [campaignId, activeScene, graphRef])

  const handleUndo = useCallback(() => {
    const prev = undoStackRef.current.pop()
    if (!prev) return
    redoStackRef.current.push(snapshotOf(sceneItemsRef.current))
    setSelectedItemId(null)
    setZoneContextMenu(null)
    applyHistoryItems(prev)
    setUndoBump((c) => c + 1)
  }, [applyHistoryItems])

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (!next) return
    undoStackRef.current.push(snapshotOf(sceneItemsRef.current))
    applyHistoryItems(next)
    setUndoBump((c) => c + 1)
  }, [applyHistoryItems])

  const handleItemsChange = useCallback((items: SceneItem[]) => {
    const prev = sceneItemsRef.current
    if (!applyingHistoryRef.current && prev.length > 0 && JSON.stringify(prev) !== JSON.stringify(items)) {
      pushUndo(snapshotOf(prev))
    }
    sceneItemsRef.current = [...items]
    setSceneItems([...items])
    if (campaignId && activeScene) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        api.scenes.saveItems(campaignId!, activeScene!.id, items).catch(() => {})
      }, 300)
    }
  }, [campaignId, activeScene, pushUndo])

  const { toggleDoor, lockDoor, unlockDoor } = useDoorInteraction(graphRef, handleItemsChange)

  const handleDrawStart = useCallback((point: { x: number; y: number }) => {
    setDrawState((prev) => prev ? { ...prev, startPoint: point, currentPoint: point } : null)
  }, [])

  const handleDrawMove = useCallback((point: { x: number; y: number }) => {
    setDrawState((prev) => prev ? { ...prev, currentPoint: point } : null)
  }, [])

  const handleDrawEnd = useCallback(() => {
    setDrawState((prev) => {
      if (!prev || !prev.startPoint || !prev.currentPoint) return null
      const mScale = activeScene?.map_scale ?? 1
      const mapH = 10 * mScale
      const mapW = mapH
      const item = createWallItem(prev, campaignId ?? '', mapW, mapH)
      if (item) {
        graphRef.addItem(item)
        handleItemsChange(graphRef.getItems())
      }
      return null
    })
  }, [graphRef, handleItemsChange, campaignId, activeScene])

  const startDrawMode = useCallback((mode: 'wall' | 'door') => {
    setRectFogMode(null)
    setDrawState((prev) => {
      if (prev?.mode === mode) return null
      return createEmptyDrawState(mode, wallMaterial, doorMaterial)
    })
    setBuildMenuOpen(false)
  }, [wallMaterial, doorMaterial])

  const finalizeZoneDraft = useCallback(() => {
    setZoneDraft((prev) => {
      if (!prev) return null
      if (prev.mode === 'rect') {
        const a = prev.startPoint
        const b = prev.currentPoint
        if (!a || !b || Math.hypot(b.x - a.x, b.y - a.y) < 0.2) return null
      } else if (prev.points.length < 3) {
        return null
      }
      const mScale = activeScene?.map_scale ?? 1
      const mapSize = 10 * mScale
      const item = createZoneItem(prev, zoneColor, mapSize, mapSize)
      if (item) {
        graphRef.addItem(item)
        handleItemsChange(graphRef.getItems())
      }
      return null
    })
  }, [graphRef, handleItemsChange, activeScene, zoneColor])

  const handleZoneAddPoint = useCallback((point: { x: number; y: number }) => {
    setZoneDraft((prev) => {
      if (!prev) return prev
      const last = prev.points[prev.points.length - 1]
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.15) return prev
      return { ...prev, points: [...prev.points, point] }
    })
  }, [])

  const handleZoneDragStart = useCallback((point: { x: number; y: number }) => {
    setZoneDraft((prev) => prev ? { ...prev, startPoint: point, currentPoint: point } : prev)
  }, [])

  const handleZoneDragMove = useCallback((point: { x: number; y: number }) => {
    setZoneDraft((prev) => prev ? { ...prev, currentPoint: point } : prev)
  }, [])

  const handleZoneDragEnd = useCallback((_point: { x: number; y: number }) => {
    finalizeZoneDraft()
  }, [finalizeZoneDraft])

  const startZoneMode = useCallback((mode: 'rect' | 'polygon') => {
    setRectFogMode(null)
    setDrawState(null)
    setPortalDraft(null)
    setZoneDraft((prev) => {
      if (prev?.mode === mode) return null
      return createEmptyZoneDraft(mode)
    })
    setBuildMenuOpen(false)
  }, [])

  const startPortalMode = useCallback(() => {
    setRectFogMode(null)
    setDrawState(null)
    setZoneDraft(null)
    setPortalDraft((prev) => {
      if (prev) return null
      return createEmptyPortalDraft()
    })
    setBuildMenuOpen(false)
  }, [])

  const portalZones = useMemo(() => {
    if (!portalDraft && !zoneFogActive) return []
    const mScale = activeScene?.map_scale ?? 1
    const mapSize = 10 * mScale
    const zones = extractZonePolygons(graphRef.getItems(), mapSize, mapSize)
    return zonesToGeometry(zones)
  }, [portalDraft, zoneFogActive, activeScene, graphRef])

  const handlePortalSelect = useCallback((snap: { zoneId: string; point: { x: number; y: number }; a: { x: number; y: number }; b: { x: number; y: number } }) => {
    setPortalDraft((prev) => {
      if (!prev) return prev
      if (!prev.zoneAId) {
        return { ...prev, zoneAId: snap.zoneId, pointA: snap.point, a: snap.a, b: snap.b }
      }
      if (snap.zoneId === prev.zoneAId) return prev
      const items = graphRef.getItems()
      const zoneA = items.find((i) => i.id === prev.zoneAId)
      const zoneB = items.find((i) => i.id === snap.zoneId)
      if (!zoneA || !zoneB) return prev
      const localEdge = buildPortalLocalEdge({ point: prev.pointA!, a: prev.a!, b: prev.b! })
      const { zoneA: aUp, zoneB: bUp } = createPortalBetween(zoneA, zoneB, localEdge)
      graphRef.updateItem(aUp.id, { metadata: aUp.metadata })
      graphRef.updateItem(bUp.id, { metadata: bUp.metadata })
      handleItemsChange(graphRef.getItems())
      setToastQueue((prevQ) => [...prevQ.slice(-4), {
        id: `portal-${Date.now()}`,
        rollerName: 'Portal',
        diceType: 20,
        count: 1,
        results: [1],
        total: 1,
        label: 'portal creado',
        timestamp: Date.now(),
      }])
      return null
    })
  }, [graphRef, handleItemsChange])

  const handlePortalMove = useCallback((point: { x: number; y: number }) => {
    setPortalDraft((prev) => prev ? { ...prev, currentPoint: point } : prev)
  }, [])

  const handlePortalToggle = useCallback((portalId: string) => {
    const next = cyclePortalState(graphRef.getItems(), portalId)
    for (const item of next) {
      graphRef.updateItem(item.id, { metadata: item.metadata })
    }
    handleItemsChange(graphRef.getItems())
  }, [graphRef, handleItemsChange])

  const handlePortalDelete = useCallback((portalId: string) => {
    const next = removePortal(graphRef.getItems(), portalId)
    for (const item of next) {
      graphRef.updateItem(item.id, { metadata: item.metadata })
    }
    handleItemsChange(graphRef.getItems())
  }, [graphRef, handleItemsChange])

  const handleClearAllWalls = useCallback(() => {
    if (!confirm('¿Eliminar TODAS las paredes y puertas?')) return
    const items = graphRef.getItems()
    const toRemove = items.filter(
      (item: SceneItem) => item.metadata?.type === 'wall' || item.metadata?.type === 'door'
    )
    for (const item of toRemove) {
      graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `clear-${Date.now()}`,
      rollerName: 'Limpiar',
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: `paredes y puertas eliminadas`,
      timestamp: Date.now(),
    }])
  }, [graphRef, handleItemsChange])

  const handleClearAllZones = useCallback(() => {
    const items = graphRef.getItems()
    const toRemove = items.filter(
      (item: SceneItem) => item.metadata?.type === 'zone'
    )
    if (toRemove.length === 0) {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `clearz-${Date.now()}`,
        rollerName: 'Limpiar',
        diceType: 20,
        count: 1,
        results: [0],
        total: 0,
        label: `no hay zonas para eliminar`,
        timestamp: Date.now(),
      }])
      return
    }
    for (const item of toRemove) {
      graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `clearz-${Date.now()}`,
      rollerName: 'Limpiar',
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: `zonas eliminadas`,
      timestamp: Date.now(),
    }])
  }, [graphRef, handleItemsChange])

  const startFogMode = useCallback(() => {
    lastFogPointRef.current = null
    setDrawState(null)
    setZoneDraft(null)
    setPortalDraft(null)
    setZoneFogActive(false)
    setRectFogMode(null)
    setFogMode((prev) => {
      if (prev) return null
      return { reveal: true, radius: 0.08 }
    })
    setBuildMenuOpen(false)
  }, [])

  const startRectFogMode = useCallback(() => {
    lastFogPointRef.current = null
    setDrawState(null)
    setZoneDraft(null)
    setPortalDraft(null)
    setFogMode(null)
    setZoneFogActive(false)
    setRectFogMode((prev) => {
      if (prev) return null
      return { reveal: true }
    })
    setBuildMenuOpen(false)
  }, [])

  const handleFogPaint = useCallback((point: { x: number; y: number }) => {
    if (!fogMode) return
    const last = lastFogPointRef.current
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.04) return
    lastFogPointRef.current = point
    const item: SceneItem = {
      id: `fog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: 'Fog',
      x: 0,
      y: 0,
      zIndex: 0,
      scale: 1,
      rotation: 0,
      width: 0,
      height: 0,
      opacity: 1,
      visible: true,
      locked: false,
      disableHit: false,
      disableAutoZIndex: false,
      attachmentIds: [],
      disableAttachmentBehavior: [],
      layer: SceneLayer.FOG,
      shape: { type: 'polygon', points: circlePoints(point.x, point.y, fogMode.radius), fill: '#000000' },
      metadata: { type: 'fog', fogType: 'static', revealed: fogMode.reveal },
    }
    graphRef.addItem(item)
    handleItemsChange(graphRef.getItems())
  }, [fogMode, graphRef, handleItemsChange])

  const handleFogRect = useCallback((points: number[]) => {
    if (!rectFogMode) return
    const item: SceneItem = {
      id: `fogrect-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: 'Fog',
      x: 0,
      y: 0,
      zIndex: 0,
      scale: 1,
      rotation: 0,
      width: 0,
      height: 0,
      opacity: 1,
      visible: true,
      locked: false,
      disableHit: false,
      disableAutoZIndex: false,
      attachmentIds: [],
      disableAttachmentBehavior: [],
      layer: SceneLayer.FOG,
      shape: { type: 'polygon', points, fill: '#000000' },
      metadata: { type: 'fog', fogType: 'static', revealed: rectFogMode.reveal },
    }
    graphRef.addItem(item)
    handleItemsChange(graphRef.getItems())
  }, [rectFogMode, graphRef, handleItemsChange])

  const handleClearAllFog = useCallback(() => {
    const items = graphRef.getItems()
    const toRemove = items.filter((item: SceneItem) => item.metadata?.type === 'fog')
    for (const item of toRemove) {
      graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `clearf-${Date.now()}`,
      rollerName: 'Limpiar',
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: toRemove.length === 0 ? `no hay niebla para eliminar` : `regiones de niebla eliminadas`,
      timestamp: Date.now(),
    }])
  }, [graphRef, handleItemsChange])

  const handleClearAllLights = useCallback(() => {
    const items = graphRef.getItems()
    const toRemove = items.filter(
      (item: SceneItem) => item.metadata?.type === 'light'
    )
    if (toRemove.length === 0) {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `clearl-${Date.now()}`,
        rollerName: 'Limpiar',
        diceType: 20,
        count: 1,
        results: [0],
        total: 0,
        label: `no hay luces para eliminar`,
        timestamp: Date.now(),
      }])
      return
    }
    for (const item of toRemove) {
      graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
  }, [graphRef, handleItemsChange])

  const startZoneFogMode = useCallback(() => {
    setDrawState(null)
    setZoneDraft(null)
    setPortalDraft(null)
    setFogMode(null)
    setRectFogMode(null)
    setZoneFogActive((prev) => !prev)
    setBuildMenuOpen(false)
  }, [])

  const startLightPlaceMode = useCallback(() => {
    setDrawState(null)
    setZoneDraft(null)
    setPortalDraft(null)
    setFogMode(null)
    setRectFogMode(null)
    setZoneFogActive(false)
    setLightPlaceMode((prev) => {
      if (prev) return null
      return { preset: 'torch' }
    })
    setBuildMenuOpen(false)
  }, [])

  const handleLightPlace = useCallback((point: { x: number; y: number }) => {
    if (!lightPlaceMode) return
    const mScale = activeScene?.map_scale ?? 1
    const mapHeight = 10 * mScale
    const mapWidth = 10 * mScale
    const item = createLightItem(lightPlaceMode.preset, point, mapWidth, mapHeight)
    if (!item) return
    // El fuego es opcional y va en el metadata del item de luz, no en un item
    // aparte: asi una antorcha pegada a un token lleva la llama con ella.
    if (lightPlaceMode.fx) {
      const meta = item.metadata as LightMetadata
      meta.fx = lightPlaceMode.fx
      meta.fxRadius = lightPlaceMode.fxRadius ?? FIRE_RADIUS_DEFAULT
    }
    graphRef.addItem(item)
    handleItemsChange(graphRef.getItems())
  }, [lightPlaceMode, activeScene, graphRef, handleItemsChange])


  const handleAttachComplete = useCallback((tokenId: string) => {
    if (!attachLightMode?.lightId) return
    const lightId = attachLightMode.lightId
    const light = graphRef.getItem(lightId)
    if (!light || light.metadata.type !== 'light') {
      setAttachLightMode(null)
      setSelectedItemId(null)
      return
    }
    const attached = attachLightToToken(light, tokenId)
    graphRef.updateItem(lightId, attached)
    handleItemsChange(graphRef.getItems())
    setAttachLightMode(null)
    setSelectedItemId(null)
    setSelectedTokenId(null)
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `attach-${Date.now()}`,
      rollerName: 'Luz',
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: 'luz agregada al token',
      timestamp: Date.now(),
    }])
  }, [attachLightMode, graphRef, handleItemsChange])

  const handleLightDetach = useCallback((lightId: string) => {
    const light = graphRef.getItem(lightId)
    if (!light || light.metadata.type !== 'light') return
    graphRef.updateItem(lightId, detachLight(light))
    handleItemsChange(graphRef.getItems())
    setSelectedItemId(null)
    setAttachLightMode(null)
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `detach-${Date.now()}`,
      rollerName: 'Luz',
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: 'luz quitada del token',
      timestamp: Date.now(),
    }])
  }, [graphRef, handleItemsChange])

  const handleGrantLight = useCallback(async (request: LightRequest) => {
    const sc = sceneCharsRef.current.find((s) => s.id === request.token_id)
    if (!sc || !campaignId) return
    const mScale = activeScene?.map_scale ?? 1
    const mapHeight = 10 * mScale
    const mapWidth = 10 * mScale
    const item = createLightItem('torch', { x: sc.x / mapWidth + 0.5, y: sc.z / mapHeight + 0.5 }, mapWidth, mapHeight)
    if (!item) return
    const attached = attachLightToToken(item, sc.id)
    graphRef.addItem(attached)
    handleItemsChange(graphRef.getItems())
    try {
      await api.lightRequests.resolve(campaignId, request.id)
    } catch {}
    setLightRequests((prev) => prev.filter((r) => r.id !== request.id))
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `grant-${Date.now()}`,
      rollerName: 'Luz',
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: `antorcha entregada a ${request.character_name}`,
      timestamp: Date.now(),
    }])
  }, [campaignId, activeScene, graphRef, handleItemsChange])

  const handleDenyLight = useCallback(async (request: LightRequest) => {
    if (!campaignId) return
    try {
      await api.lightRequests.resolve(campaignId, request.id)
    } catch {}
    setLightRequests((prev) => prev.filter((r) => r.id !== request.id))
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `deny-${Date.now()}`,
      rollerName: 'Luz',
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: `luz denegada a ${request.character_name}`,
      timestamp: Date.now(),
    }])
  }, [campaignId])

  const selectedLight = useMemo(() => {
    if (!selectedItemId || attachLightMode || drawState || zoneDraft || portalDraft || fogMode || rectFogMode || zoneFogActive || lightPlaceMode) return null
    const item = graphRef.getItem(selectedItemId)
    if (item?.metadata.type !== 'light') return null
    return { item, source: normalizeLightConfig((item.metadata as LightMetadata).source) }
  }, [selectedItemId, attachLightMode, drawState, zoneDraft, portalDraft, fogMode, rectFogMode, zoneFogActive, lightPlaceMode, graphRef, sceneItems])

  const handleLightSourceChange = useCallback((patch: Partial<ReturnType<typeof normalizeLightConfig>>) => {
    if (!selectedItemId) return
    const light = graphRef.getItem(selectedItemId)
    if (!light) return
    const updated = updateLightSource(light, patch)
    if (!updated) return
    graphRef.updateItem(selectedItemId, updated)
    handleItemsChange(graphRef.getItems())
  }, [selectedItemId, graphRef, handleItemsChange])

  const handleZoneFogSelect = useCallback((snap: { zoneId: string }) => {
    const mScale = activeScene?.map_scale ?? 1
    const mapSize = 10 * mScale
    const items = graphRef.getItems()
    const zone = items.find((i: SceneItem) => i.id === snap.zoneId && i.metadata?.type === 'zone')
    if (!zone) return
    const zonePoly: [number, number][] = extractZonePolygons([zone], mapSize, mapSize)[0].points
    const res = toggleZoneFog(items, snap.zoneId, zonePoly)
    if (res.applied === 'none') return
    for (const item of res.items) {
      if (!items.some((i: SceneItem) => i.id === item.id)) graphRef.addItem(item)
      else graphRef.updateItem(item.id, item)
    }
    const existingIds = new Set(res.items.map((i: SceneItem) => i.id))
    for (const item of items) {
      if (!existingIds.has(item.id)) graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `zonefog-${Date.now()}`,
      rollerName: 'Niebla de zona',
      diceType: 20,
      count: 1,
      results: [1],
      total: 1,
      label: res.applied === 'reveal' ? 'niebla despejada de la zona' : 'niebla cubriendo la zona',
      timestamp: Date.now(),
    }])
  }, [activeScene, graphRef, handleItemsChange])

  const handleAutoDetect = useCallback(async () => {
    if (!campaignId || !activeScene) return
    setBuildMenuOpen(false)
    setDetectingWalls(true)
    try {
      const result = await api.scenes.detectWalls(campaignId, activeScene.id, useAi ? 'ai' : detectionMode)
      if (result.items && result.items.length > 0) {
        for (const item of result.items) {
          graphRef.addItem(item as SceneItem)
        }
        handleItemsChange(graphRef.getItems())
        setToastQueue((prev) => [...prev.slice(-4), {
          id: `detect-${Date.now()}`,
          rollerName: 'Detección',
          diceType: 20,
          count: 1,
          results: [result.wall_count],
          total: result.wall_count,
          label: `paredes + ${result.door_count} puertas detectadas`,
          timestamp: Date.now(),
        }])
      } else {
        setToastQueue((prev) => [...prev.slice(-4), {
          id: `detect-${Date.now()}`,
          rollerName: 'Detección',
          diceType: 1,
          count: 1,
          results: [1],
          total: 1,
          label: 'No se detectaron paredes — probá ajustar la imagen',
          timestamp: Date.now(),
        }])
      }
    } catch (_err) {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `detect-err-${Date.now()}`,
        rollerName: 'Detección',
        diceType: 1,
        count: 1,
        results: [1],
        total: 1,
        label: 'No se pudo detectar — revisá el backend',
        timestamp: Date.now(),
      }])
    } finally {
      setDetectingWalls(false)
    }
  }, [campaignId, activeScene, graphRef, handleItemsChange, detectionMode, useAi])

  const handleDeleteItem = useCallback((itemId: string) => {
    graphRef.removeItem(itemId)
    handleItemsChange(graphRef.getItems())
  }, [graphRef, handleItemsChange])

  const handleDoorItemClick = useCallback((itemId: string) => {
    setSelectedItemId(itemId)
    const item = graphRef.getItem(itemId)
    if (item?.metadata.type === 'door') toggleDoor(itemId)
  }, [toggleDoor, graphRef])

  const handleItemClickForAttach = useCallback((itemId: string) => {
    if (attachLightMode) {
      const item = graphRef.getItem(itemId)
      if (item?.metadata.type === 'light') {
        setSelectedItemId(itemId)
        setAttachLightMode((prev) => prev ? { lightId: prev.lightId === itemId ? null : itemId } : prev)
      }
      return
    }
    handleDoorItemClick(itemId)
  }, [attachLightMode, graphRef, handleDoorItemClick])

  const handleDoorContextMenu = useCallback((itemId: string, clientX: number, clientY: number) => {
    const item = graphRef.getItem(itemId)
    if (item?.metadata.type === 'door') {
      setDoorContextMenu({ x: clientX, y: clientY, itemId, state: item.metadata.state })
    }
  }, [graphRef])

  const handleWallContextMenu = useCallback((itemId: string, clientX: number, clientY: number) => {
    const item = graphRef.getItem(itemId)
    if (item?.metadata.type === 'wall') {
      setSelectedItemId(itemId)
      setWallContextMenu({ x: clientX, y: clientY, itemId })
    } else if (item?.metadata.type === 'zone') {
      setSelectedItemId(itemId)
      setZoneContextMenu({ x: clientX, y: clientY, itemId })
    } else if (item?.metadata.type === 'light') {
      setSelectedItemId(itemId)
      setLightContextMenu({ x: clientX, y: clientY, itemId })
    } else if (item?.metadata.type === 'fog') {
      setSelectedItemId(itemId)
      setFogContextMenu({ x: clientX, y: clientY, itemId })
    }
  }, [graphRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isTyping = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.ctrlKey || e.metaKey) && !isTyping) {
        const k = e.key.toLowerCase()
        if (k === 'z' && e.shiftKey) {
          e.preventDefault()
          handleRedo()
          return
        }
        if (k === 'z') {
          e.preventDefault()
          handleUndo()
          return
        }
        if (k === 'y') {
          e.preventDefault()
          handleRedo()
          return
        }
      }
      if (e.key === 'Escape') {
        if (drawState) setDrawState(null)
        else if (zoneDraft) setZoneDraft(null)
        else if (portalDraft) setPortalDraft(null)
        else if (fogMode) setFogMode(null)
        else if (rectFogMode) setRectFogMode(null)
        else if (zoneFogActive) setZoneFogActive(false)
        else if (lightPlaceMode) setLightPlaceMode(null)
        else if (placingToken) setPlacingToken(null)
        else if (attachLightMode) setAttachLightMode(null)
        else setSelectedItemId(null)
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
        setCmdQuery('');
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault()
        handleDeleteItem(selectedItemId)
        setSelectedItemId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawState, zoneDraft, portalDraft, fogMode, rectFogMode, zoneFogActive, lightPlaceMode, placingToken, attachLightMode, selectedItemId, handleDeleteItem, handleUndo, handleRedo])

  useEffect(() => {
    const now = performance.now();
    const prevData = lastDataRef.current;
    lastDataRef.current = sceneChars;
    const prevAt = prevAppliedAtRef.current;
    prevAppliedAtRef.current = now;
    let dtSec = prevAt ? (now - prevAt) / 1000 : 0;
    if (dtSec < 0.001 || dtSec > 1.5) dtSec = 0;
    // Mirror PlayerView: characters the DM is dragging are excluded from the
    // interpolation pipeline entirely — rendered pos must track the pointer.
    if (draggingTokenIdRef.current && Date.now() - lastDragTsRef.current > 500) {
      draggingTokenIdRef.current = null;
    }

    let maxLmat = 0;
    for (const sc of sceneChars) {
      const lmat = sc.last_move_at ?? 0;
      if (lmat > maxLmat) maxLmat = lmat;
    }
    if (maxLmat > 0) clockOffsetRef.current = Date.now() / 1000 - maxLmat;

    if (prevData.length > 0 && prevData !== sceneChars && dtSec > 0) {
      for (const sc of sceneChars) {
        if (draggingTokenIdRef.current === sc.id) continue;
        const p = prevData.find((pp) => pp.id === sc.id);
        if (!p) continue;
        const delX = sc.x - p.x;
        const delZ = sc.z - p.z;
        const delR = (sc.rotation ?? 0) - (p.rotation ?? 0);
        const movingPos = Math.hypot(delX, delZ) >= 0.0005;
        const movingRot = Math.abs(Math.atan2(Math.sin(delR), Math.cos(delR))) >= 0.001;
        const vx = sc.vx ?? 0;
        const vz = sc.vz ?? 0;
        const vrot = sc.vrot ?? 0;
        velocitiesRef.current.set(sc.id, {
          vx: movingPos ? (Math.abs(vx) > 0.001 ? vx : delX / dtSec) : 0,
          vz: movingPos ? (Math.abs(vz) > 0.001 ? vz : delZ / dtSec) : 0,
          vrotation: movingRot ? (Math.abs(vrot) > 0.001 ? vrot : Math.atan2(Math.sin(delR), Math.cos(delR)) / dtSec) : 0,
        });
      }
    }
    for (const id of velocitiesRef.current.keys()) {
      if (!sceneChars.find((sc) => sc.id === id)) {
        velocitiesRef.current.delete(id);
      }
    }
    for (const sc of sceneChars) {
      if (draggingTokenIdRef.current === sc.id) continue;
      serverPosRef.current.set(sc.id, { x: sc.x, z: sc.z, rotation: sc.rotation ?? 0 });
      serverPosAtRef.current.set(sc.id, now);
      serverLmatRef.current.set(sc.id, sc.last_move_at ?? 0);
    }
    for (const id of serverPosRef.current.keys()) {
      if (!sceneChars.find((sc) => sc.id === id)) {
        serverPosRef.current.delete(id);
        serverPosAtRef.current.delete(id);
        serverLmatRef.current.delete(id);
        renderedPosRef.current.delete(id);
        velocitiesRef.current.delete(id);
      }
    }
  }, [sceneChars]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (buildMenuRef.current && !buildMenuRef.current.contains(e.target as Node)) {
        setBuildMenuOpen(false)
      }
    }
    if (buildMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [buildMenuOpen]);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      const now = performance.now();
      const dtFrame = lastFrameAtRef.current
        ? Math.min(Math.max((now - lastFrameAtRef.current) / 1000, 0.001), 0.12)
        : 0.016;
      lastFrameAtRef.current = now;
      const k = 1 - Math.exp(-36 * dtFrame);
      // Expire drag-exclusion even without state changes (pointercancel path).
      if (draggingTokenIdRef.current && Date.now() - lastDragTsRef.current > 500) {
        draggingTokenIdRef.current = null;
      }
      for (const [id, target] of serverPosRef.current.entries()) {
        if (draggingTokenIdRef.current === id) continue;
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
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;
    let timer: number;

    const pollRolls = async () => {
      try {
        const newRolls = await api.rolls.recent(campaignId, lastRollTsRef.current);
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
      try {
        const reqs = await api.lightRequests.list(campaignId);
        if (!cancelled) setLightRequests(reqs.filter((r) => r.status === 'pending'));
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
  }, [campaignId]);

  const handleSceneSwitch = useCallback(async (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) setActiveScene(scene);
  }, [scenes]);

  const handleTransit = useCallback(async (targetSceneId: string) => {
    const target = scenes.find((s) => s.id === targetSceneId);
    if (!target) return;
    setTransitioning('in');
    await new Promise((resolve) => setTimeout(resolve, 350));
    setActiveScene(target);
    setSelectedTokenId(null);
    const destMap = target.map_id ? maps.find((m) => m.id === target.map_id) : null;
    setViewingMap(destMap ?? null);
    await new Promise((resolve) => setTimeout(resolve, 120));
    setTransitioning('out');
    await new Promise((resolve) => setTimeout(resolve, 320));
    setTransitioning('idle');
  }, [scenes, maps]);

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;

    let scene = activeScene;
    if (!scene) {
      scene = await api.scenes.create(campaignId, { name: 'Scene 1' });
      setScenes((prev) => [...prev, scene!]);
      setActiveScene(scene);
    }

    const updated = await api.scenes.uploadBackground(campaignId, scene.id, file);
    setActiveScene(updated);
    setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    e.target.value = '';
  };

  const handleClassifyBackground = async () => {
    if (!campaignId || !activeScene?.background_path) return;
    try {
      const classification = await api.scenes.classify(campaignId, activeScene.id);
      if (classification.suggested_backgrounds?.length > 0) {
        setBgSelector({
          sceneType: classification.scene_type,
          suggestions: classification.suggested_backgrounds,
          dominantColors: classification.dominant_colors,
        });
      }
    } catch {
      // classification is optional
    }
  };

  const handleToggleLighting = async (mode: string) => {
    if (!campaignId || !activeScene) return;
    try {
      const updated = await api.scenes.update(campaignId, activeScene.id, { lighting: mode });
      setActiveScene(updated);
      setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `lighting-err-${Date.now()}`,
        rollerName: 'Sistema',
        diceType: 1, count: 1, results: [1], total: 1,
        label: 'No se pudo actualizar la iluminación',
        timestamp: Date.now(),
      }]);
    }
  };

  const handleChangeWeather = async (weather: string | null) => {
    if (!campaignId || !activeScene) return;
    try {
      const updated = await api.scenes.update(campaignId, activeScene.id, { weather });
      setActiveScene(updated);
      setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `weather-err-${Date.now()}`,
        rollerName: 'Sistema',
        diceType: 1, count: 1, results: [1], total: 1,
        label: 'No se pudo cambiar el clima',
        timestamp: Date.now(),
      }]);
    }
  };

  const weatherIntensityTimerRef = useRef<number>(0);

  const commitWeatherIntensity = useCallback(async (sceneId: string, value: number) => {
    if (!campaignId) return;
    try {
      const updated = await api.scenes.update(campaignId, sceneId, { weather_intensity: value });
      setActiveScene(updated);
      setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `weather-int-err-${Date.now()}`,
        rollerName: 'Sistema',
        diceType: 1, count: 1, results: [1], total: 1,
        label: 'No se pudo ajustar la intensidad del clima',
        timestamp: Date.now(),
      }]);
    }
  }, [campaignId]);

  const handleChangeWeatherIntensity = (value: number) => {
    if (!activeScene) return;
    const clamped = clampWeatherIntensity(value);
    // Feedback inmediato en el canvas; el PUT se agrupa para no spamear el backend.
    setActiveScene((prev) => (prev ? { ...prev, weather_intensity: clamped } : prev));
    window.clearTimeout(weatherIntensityTimerRef.current);
    weatherIntensityTimerRef.current = window.setTimeout(() => {
      void commitWeatherIntensity(activeScene.id, clamped);
    }, 250);
  };

  const handleTokenLightAttach = useCallback((sceneCharId: string, lightId: string) => {
    const light = graphRef.getItem(lightId)
    if (!light || light.metadata.type !== 'light') return
    const attached = attachLightToToken(light, sceneCharId)
    graphRef.updateItem(lightId, attached)
    handleItemsChange(graphRef.getItems())
    setContextMenu(null)
    setSelectedItemId(lightId)
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `attach-ctx-${Date.now()}`,
      rollerName: 'Luz',
      diceType: 1, count: 1, results: [1], total: 1,
      label: 'luz agregada — editá en la barra de herramientas',
      timestamp: Date.now(),
    }])
  }, [graphRef, handleItemsChange])

  const handleTokenLightDetach = useCallback((lightId: string) => {
    const light = graphRef.getItem(lightId)
    if (!light || light.metadata.type !== 'light') return
    graphRef.updateItem(lightId, detachLight(light))
    handleItemsChange(graphRef.getItems())
    setSelectedItemId(null)
    setContextMenu(null)
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `detach-ctx-${Date.now()}`,
      rollerName: 'Luz',
      diceType: 1, count: 1, results: [1], total: 1,
      label: 'luz quitada del token',
      timestamp: Date.now(),
    }])
  }, [graphRef, handleItemsChange])

  const handleCreateAndAttachLight = useCallback((sceneCharId: string) => {
    const sc = sceneCharsRef.current.find((s) => s.id === sceneCharId)
    if (!sc || !activeScene) return
    const mScale = activeScene.map_scale ?? 1
    const mapHeight = 10 * mScale
    const mapWidth = 10 * mScale
    const item = createLightItem('lantern', { x: sc.x / mapWidth + 0.5, y: sc.z / mapHeight + 0.5 }, mapWidth, mapHeight)
    if (!item) return
    const attached = attachLightToToken(item, sc.id)
    graphRef.addItem(attached)
    handleItemsChange(graphRef.getItems())
    setContextMenu(null)
    setSelectedItemId(attached.id)
    setToastQueue((prev) => [...prev.slice(-4), {
      id: `create-attach-${Date.now()}`,
      rollerName: 'Luz',
      diceType: 1, count: 1, results: [1], total: 1,
      label: 'luz creada — editá en la barra de herramientas',
      timestamp: Date.now(),
    }])
  }, [activeScene, graphRef, handleItemsChange])

  const handleTokenClick = useCallback((tokenId: string) => {
    if (attachLightMode?.lightId) {
      handleAttachComplete(tokenId)
      return
    }
    if (!tokenId) {
      setSelectedTokenId(null);
      setSelectedItemId(null);
      setDistanceFrom(null);
      setDistanceTo(null);
      return;
    }
    // Shift+click for distance measurement
    if (window.event && (window.event as KeyboardEvent).shiftKey) {
      if (!distanceFrom) {
        setDistanceFrom(tokenId);
        setDistanceTo(null);
      } else if (distanceFrom !== tokenId) {
        setDistanceTo(tokenId);
      } else {
        setDistanceFrom(null);
        setDistanceTo(null);
      }
      return;
    }
    setDistanceFrom(null);
    setDistanceTo(null);
    setSelectedTokenId((prev) => prev === tokenId ? null : tokenId);
  }, [distanceFrom, attachLightMode, handleAttachComplete]);

  const handleTokenDrag = useCallback(async (sceneCharId: string, x: number, z: number) => {
    if (!campaignId || !activeScene) return;
    const sc = sceneCharsRef.current.find((s) => s.id === sceneCharId);
    if (!sc) return;
    lastLocalChangeRef.current = Date.now();
    draggingTokenIdRef.current = sceneCharId;
    lastDragTsRef.current = Date.now();
    // Purge interpolation state so the prop falls back to raw sc.x/z (direct
    // pointer position) on the very next render, exactly like PlayerView.
    serverPosRef.current.delete(sceneCharId);
    serverPosAtRef.current.delete(sceneCharId);
    serverLmatRef.current.delete(sceneCharId);
    velocitiesRef.current.delete(sceneCharId);
    renderedPosRef.current.delete(sceneCharId);
    setSceneChars((prev) =>
      prev.map((s) => s.id === sceneCharId ? { ...s, x, z } : s)
    );
    if (sc.entity_type !== 'character') return;
    try {
      await api.scenes.moveCharacter(campaignId, activeScene.id, {
        character_id: sc.entity_id,
        x, z,
        rotation: sc.rotation ?? 0,
      });
    } catch {
      // best-effort
    }
  }, [campaignId, activeScene]);

  const handleTokenDrop = useCallback(async (sceneCharId: string, x: number, z: number) => {
    if (!campaignId || !activeScene) return;

    lastLocalChangeRef.current = Date.now();
    draggingTokenIdRef.current = null;
    const mScale = activeScene.map_scale ?? 1;
    const mapH = 10 * mScale;
    const mapW = mapH;
    const normX = (x / mapW) + 0.5;
    const normZ = (z / mapH) + 0.5;

    const walls = graphRef.getItems()
      .filter((item) => item.metadata.type === 'wall' && item.shape?.type === 'line')
      .map((item) => {
        const pts = (item.shape as { type: 'line'; points: number[] }).points;
        return [pts[0], pts[1], pts[2], pts[3]] as [number, number, number, number];
      });

    if (checkWallCollision(normX, normZ, walls, 0.03)) {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `wall-block-${Date.now()}`,
        rollerName: 'Pared',
        diceType: 1,
        count: 1,
        results: [1],
        total: 1,
        label: 'Bloqueado por pared',
        timestamp: Date.now(),
      }]);
      return;
    }

    const sc = sceneCharsRef.current.find((s) => s.id === sceneCharId);
    if (!sc) return;
    setSceneChars((prev) =>
      prev.map((s) => s.id === sceneCharId ? { ...s, x, z } : s)
    );

    if (sc.entity_type === 'character') {
      try {
        await api.scenes.moveCharacter(campaignId, activeScene.id, {
          character_id: sc.entity_id,
          x, z,
          rotation: sc.rotation ?? 0,
        });
      } catch {
        // best-effort
      }
      return;
    }

    const current = sceneCharsRef.current;
    const updated = current.map((scn) =>
      scn.id === sceneCharId
        ? { id: scn.id, entity_type: scn.entity_type, entity_id: scn.entity_id, x, y: scn.y, z, visible: !!scn.visible, order: scn.order, token_scale: scn.token_scale ?? 1, move_speed: scn.move_speed ?? 1, facing_offset: scn.facing_offset ?? 0, vision_type: scn.vision_type ?? 'normal', vision_range: scn.vision_range ?? 6.0, statuses: scn.statuses ?? [] }
        : { id: scn.id, entity_type: scn.entity_type, entity_id: scn.entity_id, x: scn.x, y: scn.y, z: scn.z, visible: !!scn.visible, order: scn.order, token_scale: scn.token_scale ?? 1, move_speed: scn.move_speed ?? 1, facing_offset: scn.facing_offset ?? 0, vision_type: scn.vision_type ?? 'normal', vision_range: scn.vision_range ?? 6.0, statuses: scn.statuses ?? [] }
    );
    try {
      await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
    } catch (err) {
      console.error('Failed to persist token position:', err);
    }
  }, [campaignId, activeScene, graphRef]);

  // F7: movement range overlay for the selected token (A* reachable cells).
  const movementRange = useMemo(() => {
    if (!activeScene || !selectedTokenId) return null;
    const sc = sceneChars.find((s) => s.id === selectedTokenId);
    if (!sc) return null;
    const mScale = activeScene.map_scale ?? 1;
    const mapH = 10 * mScale;
    const mapW = mapH;
    const cellSize = activeScene.grid_size && activeScene.grid_size > 0 ? activeScene.grid_size : 0.5;
    const occluders = buildOccluders(sceneItems, mapW, mapH);
    const { cells } = computeReachableCells(
      sc.x, sc.z,
      sc.move_speed ?? 5,
      occluders, cellSize, mapW, mapH,
    );
    return { tokenId: sc.id, cellSize, cells };
  }, [activeScene, selectedTokenId, sceneChars, sceneItems]);

  const handleTokenPlace = useCallback(async (entityType: string, entityId: string, x: number, z: number) => {
    if (!campaignId || !activeScene) return;
    const existing = sceneChars.find((sc) => sc.entity_type === entityType && sc.entity_id === entityId);
    const updated = existing
      ? sceneChars.map((sc) =>
          sc.id === existing.id
            ? { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x, y: sc.y, z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0, vision_type: sc.vision_type ?? 'normal', vision_range: sc.vision_range ?? 6.0, statuses: sc.statuses ?? [] }
            : { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0, vision_type: sc.vision_type ?? 'normal', vision_range: sc.vision_range ?? 6.0, statuses: sc.statuses ?? [] }
        )
      : [...sceneChars, {
          entity_type: entityType,
          entity_id: entityId,
          x,
          y: 0,
          z,
          visible: true,
          order: sceneChars.length,
          token_scale: 1,
          move_speed: 1,
          facing_offset: 0,
          vision_type: 'normal',
          vision_range: 6.0,
        }];
    try {
      const result = await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
      setSceneChars(result);
    } catch (err) {
      console.error('Failed to place token:', err);
    }
    setPlacingToken(null);
  }, [campaignId, activeScene, sceneChars]);

  const handleAssetDrop = useCallback((asset: { name: string; url: string; assetId: string }, x: number, z: number) => {
    if (!campaignId || !activeScene) return;
    const item: SceneItem = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: asset.name,
      x,
      y: z,
      zIndex: 0,
      rotation: 0,
      scale: 2,
      width: 0,
      height: 0,
      opacity: 1,
      visible: true,
      locked: false,
      disableHit: false,
      disableAutoZIndex: false,
      attachmentIds: [],
      disableAttachmentBehavior: [],
      layer: SceneLayer.EFFECTS_ABOVE,
      image: asset.url,
      metadata: { type: 'image', assetId: asset.assetId },
    };
    graphRef.addItem(item);
    handleItemsChange(graphRef.getItems());
  }, [graphRef, handleItemsChange]);

  const handleRemoveFromScene = useCallback(async (sceneCharId: string) => {
    if (!campaignId || !activeScene) return;
    const updated = sceneChars.filter((sc) => sc.id !== sceneCharId);
    try {
      const result = await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
      setSceneChars(result);
      if (selectedTokenId === sceneCharId) setSelectedTokenId(null);
    } catch (err) {
      console.error('Failed to remove token:', err);
    }
  }, [campaignId, activeScene, sceneChars, selectedTokenId]);

  const handleToggleVisibility = useCallback(async (sceneCharId: string) => {
    if (!campaignId || !activeScene) return;
    const updated = sceneChars.map((sc) =>
      sc.id === sceneCharId
        ? { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0, vision_type: sc.vision_type ?? 'normal', vision_range: sc.vision_range ?? 6.0, statuses: sc.statuses ?? [] }
        : { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0, vision_type: sc.vision_type ?? 'normal', vision_range: sc.vision_range ?? 6.0, statuses: sc.statuses ?? [] }
    );
    try {
      const result = await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
      setSceneChars(result);
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
    }
  }, [campaignId, activeScene, sceneChars]);

  const handleToggleStatus = useCallback(async (sceneCharId: string, status: string) => {
    if (!campaignId || !activeScene) return;
    const target = sceneChars.find((sc) => sc.id === sceneCharId);
    if (!target) return;
    const cur = target.statuses ?? [];
    const next = cur.includes(status) ? cur.filter((s) => s !== status) : [...cur, status];
    const updated = sceneChars.map((sc) =>
      sc.id === sceneCharId
        ? { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0, vision_type: sc.vision_type ?? 'normal', vision_range: sc.vision_range ?? 6.0, statuses: next }
        : { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0, vision_type: sc.vision_type ?? 'normal', vision_range: sc.vision_range ?? 6.0, statuses: sc.statuses ?? [] }
    );
    try {
      const result = await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
      setSceneChars(result);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  }, [campaignId, activeScene, sceneChars]);

  const handleInviteCode = useCallback(async () => {
    if (!campaignId) return;
    if (!campaign?.invite_code) {
      const updated = await api.campaigns.generateInviteCode(campaignId);
      setCampaign(updated);
      const url = `${window.location.origin}/campaigns/join/${updated.invite_code}`;
      navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    } else {
      const url = `${window.location.origin}/campaigns/join/${campaign.invite_code}`;
      navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  }, [campaignId, campaign]);

  const allEntities = [
    ...characters.map((c) => ({ ...c, type: 'character' as const, sub: `${c.race} ${c.class_}` })),
    ...npcs.map((n) => ({ ...n, type: 'npc' as const, sub: n.status })),
  ];

  // Close context menu on any click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  const handleTokenContextMenu = useCallback((sceneCharId: string, clientX: number, clientY: number) => {
    const sc = sceneChars.find((s) => s.id === sceneCharId);
    const ent = allEntities.find((x) => x.id === sc?.entity_id);
    const name = ent?.name || 'Unknown';

    const allItems = graphRef.getItems()
    const attachedLights = allItems.filter((it) => it.metadata.type === 'light' && (it.metadata as { attachedTo?: string }).attachedTo === sceneCharId)
    const freeLights = allItems.filter((it) => it.metadata.type === 'light' && !(it.metadata as { attachedTo?: string }).attachedTo)

    const lightItems: ContextMenuItem[] = []
    for (const lt of attachedLights) {
      const src = (lt.metadata as { source?: { mode?: string; angle?: number } }).source
      const modeLabel = src?.mode === 'directional' ? ` (cone ${src.angle ?? 90}°)` : ` (${src?.mode ?? 'hard'})`
      lightItems.push({ label: `Editar "${lt.name || 'luz'}"${modeLabel}`, icon: '⚙', onClick: () => setSelectedItemId(lt.id) })
      lightItems.push({ label: `Desprender "${lt.name || 'luz'}"`, icon: '🔥', onClick: () => handleTokenLightDetach(lt.id) })
    }
    for (const lt of freeLights) {
      const src = (lt.metadata as { source?: { mode?: string } }).source
      const modeLabel = src?.mode === 'directional' ? ' (cono)' : ''
      lightItems.push({ label: `Adjuntar "${lt.name || 'luz'}"${modeLabel}`, icon: '💡', onClick: () => handleTokenLightAttach(sceneCharId, lt.id) })
    }
    lightItems.push({ label: 'Crear nueva luz', icon: '✨', onClick: () => handleCreateAndAttachLight(sceneCharId) })

    // Estado: sección "Activas" (quitar rápido) + categorías para marcar — evita lista plana de 18.
    const buildStatusMenuItems = (statusIds: string[]): ContextMenuItem[] => {
      const items: ContextMenuItem[] = [];
      const active = STATUS_OPTIONS.filter((s) => statusIds.includes(s.id));
      if (active.length > 0) {
        items.push({ label: '· Activas', icon: '✦', disabled: true, onClick: () => {} });
        for (const s of active) {
          items.push({ label: `Quitar ${s.label}`, icon: '✓', onClick: () => handleToggleStatus(sceneCharId, s.id) });
        }
      }
      for (const g of STATUS_GROUPS) {
        const rest = STATUS_OPTIONS.filter((s) => s.group === g.key && !statusIds.includes(s.id));
        if (rest.length === 0) continue;
        items.push({ label: `· ${g.label}`, icon: '▸', disabled: true, onClick: () => {} });
        for (const s of rest) {
          items.push({ label: `Marcar ${s.label}`, icon: '＋', onClick: () => handleToggleStatus(sceneCharId, s.id) });
        }
      }
      return items;
    };

    setContextMenu({
      x: clientX,
      y: clientY,
      items: [
        { label: `Seleccionar ${name}`, icon: '◉', onClick: () => setSelectedTokenId(sceneCharId) },
        { label: sc?.visible ? 'Ocultar a los jugadores' : 'Mostrar a los jugadores', icon: sc?.visible ? '👁' : '🚫', onClick: () => handleToggleVisibility(sceneCharId) },
        { label: '', separator: true, onClick: () => {} },
        { label: 'Ver ficha de personaje', icon: '📄', onClick: () => setSelectedTokenId(sceneCharId), disabled: !ent },
        { label: '', separator: true, onClick: () => {} },
        { label: 'Estado', icon: '⚠️', onClick: () => {}, disabled: true },
        ...buildStatusMenuItems(sc?.statuses ?? []),
        { label: '', separator: true, onClick: () => {} },
        ...lightItems,
        { label: '', separator: true, onClick: () => {} },
        { label: 'Quitar de la escena', icon: '🗑', onClick: () => handleRemoveFromScene(sceneCharId), danger: true },
      ],
    });
  }, [sceneChars, allEntities, handleToggleVisibility, handleRemoveFromScene, graphRef, handleTokenLightAttach, handleTokenLightDetach, handleCreateAndAttachLight, handleToggleStatus]);

  // Keyboard shortcuts
  useEffect(() => {
    const isEditable = (el: Element | null) =>
      el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditable(e.target as Element)) return;

      switch (e.key) {
        case 'Tab':
          e.preventDefault();
          setSidebarOpen((p) => !p);
          break;
        case 'Escape':
          if (viewingMap) {
            setViewingMap(null);
          } else if (selectedTokenId) {
            setSelectedTokenId(null);
          } else if (showDiceRoller) {
            setShowDiceRoller(false);
          } else if (showInitiative) {
            setShowInitiative(false);
          } else if (showQuests) {
            setShowQuests(false);
          } else if (showHandouts) {
            setShowHandouts(false);
          } else if (showCalendar) {
            setShowCalendar(false);
          } else if (showRecap) {
            setShowRecap(false);
          } else if (showNotebook) {
            setShowNotebook(false);
          } else if (showAssistant) {
            setShowAssistant(false);
          } else if (showQuickActions) {
            setShowQuickActions(false);
          } else if (showSessionLog) {
            setShowSessionLog(false);
          } else if (showSceneNotes) {
            setShowSceneNotes(false);
          }
          setContextMenu(null);
          break;
        case '1':
          setShowQuickActions((p) => !p);
          break;
        case '2':
          setShowSessionLog((p) => !p);
          break;
        case '3':
          setShowSceneNotes((p) => !p);
          break;
        case 'd':
          setShowDiceRoller((p) => !p);
          break;
        case 'r':
          setShowRecap((p) => !p);
          break;
        case 'n':
          setShowNotebook((p) => !p);
          break;
        case 'a':
          setShowAssistant((p) => !p);
          break;
        case 'ArrowLeft': {
          if (scenes.length === 0) return;
          const idx = activeScene ? scenes.findIndex((s) => s.id === activeScene.id) : -1;
          const prev = idx > 0 ? idx - 1 : scenes.length - 1;
          setActiveScene(scenes[prev]);
          break;
        }
        case 'ArrowRight': {
          if (scenes.length === 0) return;
          const idx = activeScene ? scenes.findIndex((s) => s.id === activeScene.id) : -1;
          const next = idx < scenes.length - 1 ? idx + 1 : 0;
          setActiveScene(scenes[next]);
          break;
        }
        case 'Delete':
        case 'Backspace':
          if (selectedTokenId) {
            handleRemoveFromScene(selectedTokenId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scenes, activeScene, selectedTokenId, showQuickActions, showSessionLog, showSceneNotes, showDiceRoller, showRecap, showNotebook, showAssistant, viewingMap, handleRemoveFromScene, setContextMenu]);

  const selectedEntity = selectedTokenId
    ? sceneChars.find((sc) => sc.id === selectedTokenId)
    : null;
  const selectedChar = selectedEntity
    ? allEntities.find((e) => e.id === selectedEntity.entity_id)
    : null;

  const initiativeCombatants = sceneChars
    .map((sc) => {
      const ent = allEntities.find((e) => e.id === sc.entity_id);
      if (!ent) return null;
      return {
        id: ent.id,
        name: ent.name,
        type: sc.entity_type as 'character' | 'npc',
        initiative: 0,
        current_pv: ent.current_pv ?? ent.max_pv,
        max_pv: ent.max_pv,
        current_pm: ent.current_pm ?? ent.max_pm,
        max_pm: ent.max_pm,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const handleInitiativeHp = useCallback(
    (entityId: string, current_pv: number) => {
      const sc = sceneChars.find((s) => s.entity_id === entityId);
      if (!sc) return;
      if (sc.entity_type === 'character') {
        api.characters.update(campaignId!, entityId, { current_pv }).then((updated) => {
          setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        });
      } else {
        api.npcs.update(campaignId!, entityId, { current_pv }).then((updated) => {
          setNpcs((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        });
      }
    },
    [sceneChars, campaignId]
  );

  const handleInitiativePm = useCallback(
    (entityId: string, current_pm: number) => {
      const sc = sceneChars.find((s) => s.entity_id === entityId);
      if (!sc) return;
      if (sc.entity_type === 'character') {
        api.characters.update(campaignId!, entityId, { current_pm }).then((updated) => {
          setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        });
      } else {
        api.npcs.update(campaignId!, entityId, { current_pm }).then((updated) => {
          setNpcs((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        });
      }
    },
    [sceneChars, campaignId]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-[var(--text-secondary)]">
        Cargando campaña...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-400">
        Campaña no encontrada
      </div>
    );
  }

  const sceneIndex = activeScene ? scenes.findIndex((s) => s.id === activeScene.id) + 1 : 0;
  const weatherIntensityK = clampWeatherIntensity(activeScene?.weather_intensity);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden select-none">
      <h1 className="sr-only">Mesa de juego</h1>
      <TopBar
        title={campaign.name}
        titleTo="/"
        left={
          <>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title="Alternar barra lateral"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div className="w-px h-5 bg-[var(--bg-tertiary)] shrink-0" />
            <select
              value={activeScene?.id || ''}
              onChange={(e) => handleSceneSwitch(e.target.value)}
              aria-label="Escena activa"
              className="text-sm bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              {scenes.length === 0 && <option value="">Sin escenas</option>}
              {scenes.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {s.name || `Escena ${i + 1}`} {s.status === 'active' ? '(activa)' : ''}
                </option>
              ))}
            </select>
            <span className="text-xs text-[var(--text-secondary)] shrink-0">
              {sceneIndex}/{scenes.length}
            </span>
            <button
              onClick={async () => {
                if (!campaignId || !activeScene) return;
                try {
                  const updated = await api.scenes.sync(campaignId, activeScene.id);
                  setActiveScene(updated);
                  setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : { ...s, status: 'inactive' }));
                  setToastQueue((prev) => [...prev.slice(-4), {
                    id: `sync-${Date.now()}`,
                    rollerName: 'Sincronización',
                    diceType: 20,
                    count: 1,
                    results: [1],
                    total: 1,
                    label: `Escena "${updated.name}" sincronizada con los jugadores`,
                    timestamp: Date.now(),
                  }]);
                } catch {
                  setToastQueue((prev) => [...prev.slice(-4), {
                    id: `sync-err-${Date.now()}`,
                    rollerName: 'Sincronización',
                    diceType: 20,
                    count: 1,
                    results: [0],
                    total: 0,
                    label: 'No se pudo sincronizar la escena',
                    timestamp: Date.now(),
                  }]);
                }
              }}
              className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
                activeScene?.status === 'active'
                  ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Sincronizar esta escena con todos los jugadores"
            >
              {activeScene?.status === 'active' ? '✓ Sincronizada' : '⟳ Sincronizar'}
            </button>
            <div className="w-px h-5 bg-[var(--bg-tertiary)] shrink-0" />
            
              
        <button
              onClick={handleInviteCode}
              className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
                copiedInvite
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Copiar link de invitación para jugadores"
            >
              {copiedInvite ? '¡Copiado!' : campaign?.invite_code ? '🔗 Invitar' : '🔗 Obtener invitación'}
            </button>
          </>
        }
      >
        
            
            
            
            
        

        

        

        

        
      </TopBar>

      <div className="flex-1 flex overflow-hidden relative min-w-0">
        {/* Toolbar canvas — herramientas de escena (izquierda) */}
        <div className="absolute left-2 top-2 z-20 flex flex-col gap-1.5 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-stretch gap-1 rounded-lg bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--bg-tertiary)] p-1 shadow-lg">
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleUndo}
                disabled={undoStackRef.current.length === 0}
                className="text-xs px-1.5 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Deshacer (Ctrl+Z)"
              >
                ↶
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStackRef.current.length === 0}
                className="text-xs px-1.5 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Rehacer (Ctrl+Shift+Z)"
              >
                ↷
              </button>
            </div>
            <div ref={buildMenuRef} className="relative shrink-0">
              <button
                onClick={() => setBuildMenuOpen(!buildMenuOpen)}
                className={`w-full text-xs px-2 py-1 rounded transition-colors ${drawState || zoneDraft || portalDraft || fogMode || rectFogMode || zoneFogActive || lightPlaceMode || attachLightMode ? 'bg-amber-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                🧱 Construir ▾
              </button>
              {buildMenuOpen && (
                <div className="absolute left-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg z-50 min-w-[180px]">
                  <button
                    onClick={() => startDrawMode('wall')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${drawState?.mode === 'wall' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🧱 Dibujar pared
                  </button>
                  <button
                    onClick={() => startDrawMode('door')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${drawState?.mode === 'door' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🚪 Colocar puerta
                  </button>
                  <button
                    onClick={() => startZoneMode('rect')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${zoneDraft?.mode === 'rect' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    ▭ Zona (rect)
                  </button>
                  <button
                    onClick={() => startZoneMode('polygon')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${zoneDraft?.mode === 'polygon' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    ⬠ Zona (polígono)
                  </button>
                  <button
                    onClick={startPortalMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${portalDraft ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🚪 Portal (zona↔zona)
                  </button>
                  <button
                    onClick={startLightPlaceMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${lightPlaceMode ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    💡 Luz (colocar)
                  </button>
                  <div className="border-t border-[var(--bg-tertiary)] my-1" />
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">Color de zona</p>
                    <div className="flex gap-1">
                      {Object.entries(ZONE_COLORS).map(([name, hex]) => (
                        <button
                          key={name}
                          onClick={() => setZoneColor(hex)}
                          className={`w-5 h-5 rounded ${zoneColor === hex ? 'ring-2 ring-amber-400' : ''}`}
                          style={{ backgroundColor: hex }}
                          title={name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 px-3 py-1">
                    <button
                      onClick={() => setDetectionMode('blueprint')}
                      className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${detectionMode === 'blueprint' ? 'bg-blue-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      Plano
                    </button>
                    <button
                      onClick={() => setDetectionMode('textured')}
                      className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${detectionMode === 'textured' ? 'bg-amber-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      Texturizado
                    </button>
                    <button
                      onClick={() => setUseAi((v) => !v)}
                      className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${useAi ? 'bg-purple-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      IA
                    </button>
                  </div>
                  <button
                    onClick={handleAutoDetect}
                    disabled={detectingWalls}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${detectingWalls ? 'text-amber-400 animate-pulse' : 'text-[var(--text-secondary)]'}`}
                  >
                    {detectingWalls ? '⏳ Detectando...' : '🔍 Detectar paredes'}
                  </button>
                  <button
                    onClick={handleClearAllWalls}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Limpiar todas las paredes
                  </button>
                  <button
                    onClick={handleClearAllZones}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Limpiar todas las zonas
                  </button>
                  <button
                    onClick={handleClearAllFog}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Limpiar toda la niebla
                  </button>
                  <button
                    onClick={handleClearAllLights}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Limpiar todas las luces
                  </button>
                  <div className="border-t border-[var(--bg-tertiary)] my-1" />
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">Material de paredes</p>
                    <div className="flex gap-1">
                      {(['stone', 'wood', 'metal', 'glass', 'magic'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setWallMaterial(m)}
                          className={`w-5 h-5 rounded text-[9px] ${wallMaterial === m ? 'ring-2 ring-amber-400' : ''}`}
                          style={{ backgroundColor: m === 'stone' ? '#6b7280' : m === 'wood' ? '#92400e' : m === 'metal' ? '#64748b' : m === 'glass' ? '#93c5fd' : '#a855f7' }}
                          title={m}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">Material de puertas</p>
                    <div className="flex gap-1">
                      {(['wood', 'metal', 'glass', 'magic'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setDoorMaterial(m)}
                          className={`w-5 h-5 rounded text-[9px] ${doorMaterial === m ? 'ring-2 ring-amber-400' : ''}`}
                          style={{ backgroundColor: m === 'wood' ? '#b45309' : m === 'metal' ? '#475569' : m === 'glass' ? '#60a5fa' : '#c084fc' }}
                          title={m}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => fileInput.current?.click()}
              className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title="Subir fondo de mapa"
            >
              Subir fondo
            </button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} data-testid="bg-upload-input" />
            <button
              onClick={handleClassifyBackground}
              disabled={!activeScene?.background_path}
              className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 disabled:opacity-40"
              title="Sugerir fondo para el mapa actual"
            >
              Sugerir fondo
            </button>
            <div className="relative shrink-0" data-menu-root>
              <button
                onClick={(e) => toggleMenu('lighting', e.currentTarget)}
                aria-expanded={openMenu === 'lighting'}
                aria-haspopup="menu"
                data-testid="lighting-select"
                className="w-full text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {{ neutral: 'Neutra', dark: 'Oscura', dim: 'Tenue', bright: 'Brillante', torchlight: 'Antorcha' }[activeScene?.lighting || 'neutral'] || activeScene?.lighting || 'Neutra'} ▾
              </button>
              <div
                role="menu"
                data-testid="lighting-menu"
                className={`fixed bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg transition-all z-50 min-w-[150px] py-0.5 ${
                  openMenu === 'lighting' ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
                style={{ left: lightingMenuRect?.left ?? -9999, top: lightingMenuRect?.top ?? -9999 }}
              >
                {['neutral', 'dark', 'dim', 'bright', 'torchlight'].map((mode) => (
                  <button
                    key={mode}
                    role="menuitem"
                    onClick={() => handleToggleLighting(mode)}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                      activeScene?.lighting === mode ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {{ neutral: 'Neutra', dark: 'Oscura', dim: 'Tenue', bright: 'Brillante', torchlight: 'Antorcha' }[mode] || mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative shrink-0" data-menu-root>
              <button
                onClick={(e) => toggleMenu('weather', e.currentTarget)}
                aria-expanded={openMenu === 'weather'}
                aria-haspopup="menu"
                className="w-full text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                data-testid="weather-select"
                title="Clima de la escena"
              >
                {(activeScene?.weather && WEATHER_META[activeScene.weather] ? WEATHER_META[activeScene.weather].label : WEATHER_NONE_LABEL)} ▾
              </button>
              <div
                role="menu"
                data-testid="weather-menu"
                className={`fixed bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg transition-all z-50 min-w-[170px] py-0.5 ${
                  openMenu === 'weather' ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
                style={{ left: weatherMenuRect?.left ?? -9999, top: weatherMenuRect?.top ?? -9999 }}
              >
                <button
                  role="menuitem"
                  onClick={() => handleChangeWeather(null)}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                    !activeScene?.weather ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {WEATHER_NONE_LABEL}
                </button>
                {(['rain', 'snow', 'fog'] as const).map((kind) => {
                  const entries = Object.entries(WEATHER_META).filter(([, meta]) => meta.kind === kind);
                  if (!entries.length) return null;
                  return (
                    <div key={kind}>
                      <div className="px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] opacity-60">
                        {WEATHER_KIND_LABEL[kind]}
                      </div>
                      {entries.map(([key, meta]) => (
                        <button
                          key={key}
                          role="menuitem"
                          onClick={() => handleChangeWeather(key)}
                          className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                            activeScene?.weather === key ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {meta.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
                {activeScene?.weather && (
                  <div
                    className="border-t border-[var(--bg-tertiary)] mt-0.5 px-3 pt-1.5 pb-2"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mb-1">
                      <span>Intensidad</span>
                      <span className="text-[var(--accent)]" data-testid="weather-intensity-value">
                        {weatherIntensityK.toFixed(2)}×
                      </span>
                    </div>
                    <input
                      type="range"
                      min={WEATHER_INTENSITY_MIN}
                      max={WEATHER_INTENSITY_MAX}
                      step={0.05}
                      value={weatherIntensityK}
                      onChange={(e) => handleChangeWeatherIntensity(parseFloat(e.target.value))}
                      data-testid="weather-intensity"
                      className="w-full h-1 cursor-pointer"
                      title={`Intensidad del clima (${weatherIntensityK.toFixed(2)}x)`}
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-secondary)] mt-0.5">
                      <span>Tenue</span>
                      <span>Fuerte</span>
                      <span>Torrencial</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSceneSettings(!showSceneSettings)}
              className={`w-full text-xs px-2 py-1 rounded transition-colors shrink-0 ${showSceneSettings ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Ajustes de escena"
            >
              ⚙ Escena
            </button>
            {maps.length > 0 && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowMapMenu((v) => !v)}
                  className={`w-full text-[10px] px-1.5 py-1 rounded transition-colors ${showMapMenu ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  Mapa ▾
                </button>
                {showMapMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg z-50 min-w-[140px]">
                    {activeScene?.map_id && (
                      <button
                        onClick={async () => {
                          if (!campaignId || !activeScene) return;
                          const updated = await api.scenes.update(campaignId, activeScene.id, { map_id: null });
                          setActiveScene(updated);
                          setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
                          setShowMapMenu(false);
                        }}
                        className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                      >
                        Desvincular mapa
                      </button>
                    )}
                    {maps.map((m) => (
                      <button
                        key={m.id}
                        onClick={async () => {
                          if (!campaignId || !activeScene) return;
                          const updated = await api.scenes.update(campaignId, activeScene.id, { map_id: m.id });
                          setActiveScene(updated);
                          setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
                          setShowMapMenu(false);
                        }}
                        className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                          activeScene?.map_id === m.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {activeScene?.map_id === m.id ? '✓ ' : ''}{m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Link
              to={`/campaigns/${campaignId}/scenes`}
              className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title="Gestión de escenas"
            >
              ⚙
            </Link>
          </div>
        </div>

        {/* Hints de modo de dibujo + luz seleccionada — contextual arriba-centro */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 max-w-[70%] pointer-events-none">
          {drawState && (
            <span className="text-[10px] text-amber-400 shrink-0">
              {drawState.mode === 'wall' ? '🧱 Arrastrá para dibujar pared' : '🚪 Arrastrá para colocar puerta'} · ESC cancela
            </span>
          )}
          {zoneDraft && (
            <span className="text-[10px] text-amber-400 shrink-0">
              {zoneDraft.mode === 'rect'
                ? '▭ Arrastrá para dibujar rect de zona'
                : '⬠ Clic para colocar vértices · clic en el 1er punto para cerrar'} · ESC cancela
            </span>
          )}
          {portalDraft && (
            <span className="text-[10px] text-amber-400 shrink-0">
              {portalDraft.zoneAId
                ? '🚪 Clic en el borde de otra zona para completar el portal'
                : '🚪 Clic en el borde de la zona A'} · ESC cancela
            </span>
          )}
          {fogMode && (
            <div className="pointer-events-auto flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
              <button
                onClick={() => setFogMode((prev) => prev ? { ...prev, reveal: true } : prev)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${fogMode.reveal ? 'bg-green-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
              >
                Revelar
              </button>
              <button
                onClick={() => setFogMode((prev) => prev ? { ...prev, reveal: false } : prev)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${!fogMode.reveal ? 'bg-red-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
              >
                Ocultar
              </button>
              <input
                type="range"
                min={0.03}
                max={0.2}
                step={0.01}
                value={fogMode.radius}
                onChange={(e) => setFogMode((prev) => prev ? { ...prev, radius: parseFloat(e.target.value) } : prev)}
                className="w-20 h-1"
                title="Tamaño del pincel"
              />
              <span className="text-[9px] text-[var(--text-secondary)] w-8">
                {(fogMode.radius * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {fogMode && (
            <span className="text-[10px] text-amber-400 shrink-0">
              🌫️ Arrastrá para pintar niebla · ESC cancela
            </span>
          )}
          {rectFogMode && (
            <div className="pointer-events-auto flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
              <button
                onClick={() => setRectFogMode((prev) => prev ? { ...prev, reveal: true } : prev)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${rectFogMode.reveal ? 'bg-green-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
              >
                Revelar
              </button>
              <button
                onClick={() => setRectFogMode((prev) => prev ? { ...prev, reveal: false } : prev)}
                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${!rectFogMode.reveal ? 'bg-red-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
              >
                Ocultar
              </button>
            </div>
          )}
          {rectFogMode && (
            <span className="text-[10px] text-amber-400 shrink-0">
              ▭ Arrastrá para dibujar rect de niebla · ESC cancela
            </span>
          )}
          {zoneFogActive && (
            <span className="text-[10px] text-amber-400 shrink-0">
              🧩 Clic dentro de una zona para alternar niebla · ESC cancela
            </span>
          )}
          {lightPlaceMode && (
            <div className="pointer-events-auto flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
              {Object.entries(LIGHT_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setLightPlaceMode({ preset: key })}
                  title={preset.name}
                  className={`w-5 h-5 rounded-full transition-colors ${lightPlaceMode.preset === key ? 'ring-2 ring-amber-400' : ''}`}
                  style={{ backgroundColor: preset.color }}
                />
              ))}
            </div>
          )}
          {lightPlaceMode && (
            <span className="text-[10px] text-amber-400 shrink-0">
              💡 Clic para colocar luz · ESC cancela
            </span>
          )}
          {lightPlaceMode && (
            <div className="pointer-events-auto flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
              <button
                onClick={() => setLightPlaceMode({ ...lightPlaceMode, fx: undefined, fxRadius: undefined })}
                title="Sin fuego: solo la luz"
                data-testid="light-fx-none"
                className={`w-6 h-5 rounded text-[10px] transition-colors ${!lightPlaceMode.fx ? 'bg-amber-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                —
              </button>
              <button
                onClick={() => setLightPlaceMode({ ...lightPlaceMode, fx: 'flame' })}
                title="Llama (la misma del status Ardiendo)"
                data-testid="light-fx-flame"
                className={`w-6 h-5 rounded text-[10px] transition-colors ${lightPlaceMode.fx === 'flame' ? 'bg-orange-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                🔥
              </button>
              <button
                onClick={() => setLightPlaceMode({ ...lightPlaceMode, fx: 'embers' })}
                title="Solo brasas ascendentes"
                data-testid="light-fx-embers"
                className={`w-6 h-5 rounded text-[10px] transition-colors ${lightPlaceMode.fx === 'embers' ? 'bg-orange-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                ✨
              </button>
              {lightPlaceMode.fx && (
                <>
                  <input
                    type="range"
                    min={FIRE_RADIUS_MIN}
                    max={FIRE_RADIUS_MAX}
                    step={FIRE_RADIUS_STEP}
                    value={lightPlaceMode.fxRadius ?? FIRE_RADIUS_DEFAULT}
                    onChange={(e) => setLightPlaceMode({ ...lightPlaceMode, fxRadius: Number(e.target.value) })}
                    title="Radio del fuego"
                    data-testid="light-fx-radius"
                    className="w-20 accent-orange-500"
                  />
                  <span
                    data-testid="light-fx-radius-value"
                    className="text-[10px] text-orange-300 tabular-nums w-11 text-right"
                  >
                    {(lightPlaceMode.fxRadius ?? FIRE_RADIUS_DEFAULT).toFixed(3)}
                  </span>
                </>
              )}
            </div>
          )}
          {attachLightMode && (
            <span className="text-[10px] text-amber-400 shrink-0">
              {attachLightMode.lightId
                ? '🔗 Ahora hacé clic en un token para adjuntar esta luz · ESC cancela'
                : '🔗 Hacé clic en una fuente de luz y luego en un token · ESC cancela'}
            </span>
          )}
          {attachLightMode?.lightId && (() => {
            const selected = graphRef.getItem(attachLightMode.lightId!)
            if (selected?.metadata.type !== 'light' || !(selected.metadata as { attachedTo?: string }).attachedTo) return null
            return (
              <div className="pointer-events-auto flex items-center gap-1 bg-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
                <button
                  onClick={() => handleLightDetach(attachLightMode.lightId!)}
                  className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Desvincular
                </button>
              </div>
            )
          })()}
          {selectedLight && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 shrink-0">
              <span className="text-[10px] text-[var(--text-secondary)]">💡 {selectedLight.item.name}</span>
              <button
                onClick={() => { handleDeleteItem(selectedLight.item.id); setSelectedItemId(null) }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors ml-1"
                title="Eliminar luz"
              >
                🗑
              </button>
              <div className="flex gap-0.5">
                {(['hard', 'soft', 'directional'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => handleLightSourceChange({ mode: m })}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${selectedLight.source.mode === m ? 'bg-amber-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                  >
                    {m === 'directional' ? 'cone' : m}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                color
                <input
                  type="color"
                  value={selectedLight.source.color}
                  onChange={(e) => handleLightSourceChange({ color: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[var(--bg-tertiary)]"
                  title="Color de luz"
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                int
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={selectedLight.source.intensity}
                  onChange={(e) => handleLightSourceChange({ intensity: parseFloat(e.target.value) })}
                  className="w-16 h-1"
                  title="Intensidad"
                />
                <span className="w-7">{selectedLight.source.intensity.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                range
                <input
                  type="range"
                  min={0.0001}
                  max={0.5}
                  step={0.00001}
                  value={selectedLight.source.radius}
                  onChange={(e) => handleLightSourceChange({ radius: parseFloat(e.target.value) })}
                  className="w-16 h-1"
                  title="Alcance"
                />
                <input
                  type="number"
                  min={0.0001}
                  max={0.5}
                  step={0.00001}
                  value={selectedLight.source.radius}
                  onChange={(e) => handleLightSourceChange({ radius: parseFloat(e.target.value) || 0.0001 })}
                  className="w-14 h-4 text-[9px] bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-1 text-[var(--text-primary)] font-mono"
                  title="Alcance (escribí el valor exacto)"
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                {selectedLight.source.mode === 'hard' ? 'edge' : 'falloff'}
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={selectedLight.source.falloff ?? (selectedLight.source.mode === 'hard' ? 1 : 0.6)}
                  onChange={(e) => handleLightSourceChange({ falloff: parseFloat(e.target.value) })}
                  className="w-14 h-1"
                  title={selectedLight.source.mode === 'hard' ? 'Posición del borde brillante' : 'Caída brillante→tenue'}
                />
                <span className="w-8">{(selectedLight.source.falloff ?? (selectedLight.source.mode === 'hard' ? 1 : 0.6)).toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                <span
                  onClick={() => handleLightSourceChange(selectedLight.source.flicker?.enabled
                    ? { flicker: undefined }
                    : { flicker: { speed: selectedLight.source.flicker?.speed ?? 0.3, variance: selectedLight.source.flicker?.variance ?? 0.1, enabled: true } })}
                  className={`cursor-pointer px-1.5 py-0.5 rounded transition-colors ${selectedLight.source.flicker?.enabled ? 'bg-amber-600 text-white' : 'hover:bg-[var(--bg-tertiary)]'}`}
                  title="Parpadeo"
                >
                  ✨ flick
                </span>
                {selectedLight.source.flicker?.enabled && (
                  <>
                    <input
                      type="range"
                      min={0.1}
                      max={2}
                      step={0.01}
                      value={selectedLight.source.flicker.speed}
                      onChange={(e) => handleLightSourceChange({ flicker: { speed: parseFloat(e.target.value), variance: selectedLight.source.flicker!.variance, enabled: true } })}
                      className="w-12 h-1"
                      title="Velocidad de parpadeo (ciclos/seg)"
                    />
                    <input
                      type="range"
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={selectedLight.source.flicker.variance}
                      onChange={(e) => handleLightSourceChange({ flicker: { speed: selectedLight.source.flicker!.speed, variance: parseFloat(e.target.value), enabled: true } })}
                      className="w-12 h-1"
                      title="Variación de parpadeo (oscilación de intensidad)"
                    />
                  </>
                )}
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                <span
                  onClick={() => handleLightSourceChange(selectedLight.source.pulse?.enabled
                    ? { pulse: undefined }
                    : { pulse: { speed: selectedLight.source.pulse?.speed ?? 0.6, variance: selectedLight.source.pulse?.variance ?? 0.2, enabled: true } })}
                  className={`cursor-pointer px-1.5 py-0.5 rounded transition-colors ${selectedLight.source.pulse?.enabled ? 'bg-amber-600 text-white' : 'hover:bg-[var(--bg-tertiary)]'}`}
                  title="Pulso"
                >
                  🔶 pulse
                </span>
                {selectedLight.source.pulse?.enabled && (
                  <>
                    <input
                      type="range"
                      min={0.1}
                      max={2}
                      step={0.01}
                      value={selectedLight.source.pulse.speed}
                      onChange={(e) => handleLightSourceChange({ pulse: { speed: parseFloat(e.target.value), variance: selectedLight.source.pulse!.variance, enabled: true } })}
                      className="w-12 h-1"
                      title="Velocidad del pulso (ciclos/seg)"
                    />
                    <input
                      type="range"
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={selectedLight.source.pulse.variance}
                      onChange={(e) => handleLightSourceChange({ pulse: { speed: selectedLight.source.pulse!.speed, variance: parseFloat(e.target.value), enabled: true } })}
                      className="w-12 h-1"
                      title="Variación del pulso (oscilación de intensidad)"
                    />
                  </>
                )}
              </label>
              {selectedLight.source.mode === 'directional' && (
                <>
                  <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                    angle
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={1}
                      value={selectedLight.source.angle ?? 90}
                      onChange={(e) => handleLightSourceChange({ angle: parseFloat(e.target.value) })}
                      className="w-14 h-1"
                      title="Ángulo del cono"
                    />
                    <span className="w-8">{selectedLight.source.angle ?? 90}°</span>
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                    dir
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={selectedLight.source.direction ?? 0}
                      onChange={(e) => handleLightSourceChange({ direction: parseFloat(e.target.value) })}
                      className="w-14 h-1"
                      title="Dirección del cono"
                    />
                    <span className="w-8">{selectedLight.source.direction ?? 0}°</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rail derecho contextual — capas y niebla (Mesa) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 w-[185px] bg-[var(--bg-secondary)]/90 border border-[var(--bg-tertiary)] rounded-lg p-1.5 shadow-lg">
          <div className="px-1.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Capas</div>
          <button
            onClick={() => setShowZones((v) => !v)}
            className={`w-full text-xs px-2 py-1 rounded transition-colors text-left ${showZones ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'bg-transparent text-[var(--text-secondary)]'}`}
            title="Mostrar zonas"
            data-testid="zones-toggle"
          >
            🧩 Zonas {showZones ? '●' : '○'}
          </button>
          <div className="border-t border-[var(--bg-tertiary)] my-1" />
          <div className="px-1.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)]">Niebla</div>
          <button
            onClick={startFogMode}
            className={`block w-full text-left px-2 py-1 text-xs rounded transition-colors ${fogMode ? 'text-amber-400 bg-[var(--bg-tertiary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            title="Niebla (pincel)"
          >
            🌫️ Niebla (pincel)
          </button>
          <button
            onClick={startRectFogMode}
            className={`block w-full text-left px-2 py-1 text-xs rounded transition-colors ${rectFogMode ? 'text-amber-400 bg-[var(--bg-tertiary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            title="Niebla (rect)"
          >
            ▭ Niebla (rect)
          </button>
          <button
            onClick={startZoneFogMode}
            className={`block w-full text-left px-2 py-1 text-xs rounded transition-colors ${zoneFogActive ? 'text-amber-400 bg-[var(--bg-tertiary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
            title="Niebla de zona (alternar)"
          >
            🧩 Niebla de zona (alternar)
          </button>
        </div>
        {/* Dock inferior — acciones de sesión, colapsable */}
        <div
          ref={dockRef}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30"
          onMouseEnter={() => setDockExpanded(true)}
        >
          <div className="flex items-center gap-0.5 rounded-full bg-[var(--bg-primary)]/95 backdrop-blur border border-[var(--bg-tertiary)] px-2 py-1.5 shadow-xl">
            {dockExpanded ? (
              <>
                <button
                  onClick={() => setShowDiceRoller(!showDiceRoller)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showDiceRoller ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  title="Tirar dados (D)"
                >
                  🎲
                </button>
                <button
                  onClick={() => setShowInitiative(!showInitiative)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showInitiative ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  title="Iniciativa"
                >
                  ⚔
                </button>
                <button
                  onClick={() => setShowNotebook(!showNotebook)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showNotebook ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  title="Cuaderno del DM (N)"
                >
                  📓
                </button>
                <button
                  onClick={() => setShowRecap(!showRecap)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showRecap ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  title="Resumen de sesión (R)"
                >
                  📋
                </button>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showCalendar ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  title="Calendario y relojes"
                >
                  📅
                </button>
                <button
                  onClick={() => setShowQuests(!showQuests)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showQuests ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  title="Tablón de misiones"
                >
                  📜
                </button>
                <button
                  onClick={() => setShowHandouts(!showHandouts)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${showHandouts ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                  title="Documentos para jugadores"
                  data-testid="handouts-toggle"
                >
                  🗂
                </button>
                {activeScene?.map_id && (
                  <button
                    onClick={() => {
                      const m = maps.find((m) => m.id === activeScene.map_id);
                      if (m) setViewingMap(m);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    title="Abrir mapa"
                  >
                    🗺
                  </button>
                )}
                <div className="w-px h-5 bg-[var(--bg-tertiary)] mx-1" />
                <div className="relative">
                  <button
                    onClick={() => setDockMoreOpen((v) => !v)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    title="Más acciones"
                    aria-label="Más acciones"
                  >
                    ＋
                  </button>
                  {dockMoreOpen && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded-lg shadow-xl p-1 min-w-[180px]">
                    <button
                      onClick={() => setShowAIPanel(!showAIPanel)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${showAIPanel ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                      title="Configuración de IA"
                      data-testid="ai-panel-button"
                    >
                      🤖 Configuración de IA
                    </button>
                    <button
                      onClick={() => setShowAssistant(!showAssistant)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${showAssistant ? 'bg-violet-700 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                      title="Asistente del DM"
                      data-testid="dm-assistant-button"
                    >
                      💬 Asistente del DM
                    </button>
                    <button
                      onClick={() => setShowQuickActions(!showQuickActions)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${showQuickActions ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                      title="Acciones rápidas"
                    >
                      ⚡ Acciones rápidas
                    </button>
                    <button
                      onClick={() => setShowSessionLog(!showSessionLog)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${showSessionLog ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                      title="Bitácora de sesión"
                    >
                      📋 Bitácora
                    </button>
                    <button
                      onClick={() => setShowSceneNotes(!showSceneNotes)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded transition-colors ${showSceneNotes ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
                      title="Notas de la escena"
                    >
                      📝 Notas de la escena
                    </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={() => setDockExpanded(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                title="Acciones del DM"
                aria-label="Acciones del DM"
              >
                ⋯
              </button>
            )}
          </div>
        </div>
        {/* Sidebar — lg+: permanent toggle, md/sm: overlay */}
        {sidebarOpen && (
          <>
            <div
              className="absolute inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative z-30 w-56 bg-[var(--bg-primary)] border-r border-[var(--bg-tertiary)] flex flex-col shrink-0 max-lg:absolute max-lg:inset-y-0 max-lg:left-0">
              <nav className="flex-1 py-3 px-2 space-y-1">
                <Link
                  to={`/campaigns/${campaignId}`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">◆</span>
                  Resumen
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/characters`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">♦</span>
                  Personajes
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/sessions`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">♠</span>
                  Sesiones
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/scenes`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">▣</span>
                  Escenas
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/events`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">•</span>
                  Eventos
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/players`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">○</span>
                  Jugadores
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/maps`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">◇</span>
                  Imágenes
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/assets`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">□</span>
                  Recursos
                </Link>
              </nav>
              <div className="px-4 py-3 border-t border-[var(--bg-tertiary)]">
                <p className="text-[10px] text-[var(--text-secondary)] opacity-60">Panel del DM</p>
              </div>
            </aside>
          </>
        )}

        {/* 3D Scene Canvas */}
        <div
          className="flex-1 relative min-h-0 min-w-0"
          style={bgCSS ? { background: bgCSS } : undefined}
        >
          {activeScene?.background_path ? (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
                Cargando escena 3D...
              </div>
            }>
              <SceneRenderer
                backgroundUrl={staticUrl(activeScene.background_path)!}
                characters={sceneChars.map((sc) => {
                  const ent = allEntities.find((e) => e.id === sc.entity_id);
                  const interpolated = renderedPosRef.current.get(sc.id);
                  return {
                    id: sc.id,
                    sceneCharId: sc.id,
                    name: ent?.name || 'Desconocido',
                    type: sc.entity_type,
                    x: interpolated ? interpolated.x : sc.x,
                    y: sc.y,
                    z: interpolated ? interpolated.z : sc.z,
                    visible: !!sc.visible,
                    portraitUrl: staticUrl(ent?.portrait_path ?? null),
                    modelUrl: staticUrl(ent?.model_path ?? null),
                    rotation: interpolated ? interpolated.rotation : (sc.rotation ?? 0),
                    tokenScale: sc.token_scale ?? 1,
                    brightness: sc.brightness ?? 0,
                    facingOffset: sc.facing_offset ?? 0,
                    statuses: sc.statuses ?? [],
                  };
                })}
                items={sceneItems}
                lighting={activeScene.lighting}
                weather={activeScene.weather ?? null}
                weatherIntensity={activeScene.weather_intensity ?? 1}
                selectedTokenId={selectedTokenId}
                selectedItemIds={selectedItemId ? [selectedItemId] : []}
                mapScale={activeScene.map_scale ?? 1}
                modelYOffset={activeScene.model_y_offset ?? 0}
                gridSize={activeScene.grid_size ?? 0}
                gridSnap={activeScene.grid_snap ?? false}
                movementRange={movementRange}
                drawState={drawState}
                showZones={showZones}
                renderMode={DEFAULT_RENDER_MODE}
                zoneDraft={zoneDraft}
                onZoneAddPoint={handleZoneAddPoint}
                onZoneDragStart={handleZoneDragStart}
                onZoneDragMove={handleZoneDragMove}
                onZoneDragEnd={handleZoneDragEnd}
                onZoneFinish={finalizeZoneDraft}
                portalDraft={portalDraft}
                fogBrush={fogMode}
                fogColor="rgba(15, 23, 42, 0.55)"
                onFogPaint={handleFogPaint}
                fogRect={rectFogMode}
                onFogRect={handleFogRect}
                portalZones={portalZones}
                onPortalSelect={handlePortalSelect}
                onPortalMove={handlePortalMove}
                zoneFogActive={zoneFogActive}
                onZoneFogSelect={handleZoneFogSelect}
                lightPlace={lightPlaceMode}
                onLightPlace={handleLightPlace}
                lightAttach={attachLightMode}
                tokenPlace={placingToken}
                onTokenPlace={handleTokenPlace}
                onAssetDrop={handleAssetDrop}
                onTokenClick={handleTokenClick}
                onTokenDrop={handleTokenDrop}
                onTokenDrag={handleTokenDrag}
                onTokenContextMenu={handleTokenContextMenu}
                onItemClick={handleItemClickForAttach}
                onItemContextMenu={(itemId, clientX, clientY) => {
                  const item = graphRef.getItem(itemId)
                  if (item?.metadata.type === 'door') handleDoorContextMenu(itemId, clientX, clientY)
                  else if (item?.metadata.type === 'wall' || item?.metadata.type === 'zone') handleWallContextMenu(itemId, clientX, clientY)
                }}
                onDrawStart={handleDrawStart}
                onDrawMove={handleDrawMove}
                onDrawEnd={handleDrawEnd}
              />
            </Suspense>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
              <div className="text-center">
                <p className="text-lg mb-2">Sin escena seleccionada</p>
                <p className="text-sm">
                  {scenes.length === 0
                    ? 'Creá una escena para empezar.'
                    : 'Seleccioná una escena o subí un fondo de mapa.'}
                </p>
              </div>
            </div>
          )}
          {lightRequests.length > 0 && (
            <div onPointerDown={(e) => e.stopPropagation()} className="absolute top-3 right-3 z-10 bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--bg-tertiary)] rounded-lg p-2 w-60 max-h-48 overflow-y-auto shadow-lg">
              <p className="text-xs font-medium text-[var(--text-primary)] mb-1.5 px-1">🕯️ Peticiones de luz</p>
              <ul className="space-y-1.5">
                {lightRequests.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="truncate flex-1" title={`${r.character_name} pide luz`}>{r.character_name}</span>
                    <button onClick={() => handleGrantLight(r)} className="px-1.5 py-0.5 rounded bg-emerald-600/80 text-white hover:bg-emerald-500 transition-colors" title="Entregar antorcha">🔦</button>
                    <button onClick={() => handleDenyLight(r)} className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Denegar">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Token Tray — bottom left, responsive */}
          <div onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-4 left-4 z-10 bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--bg-tertiary)] rounded-lg p-2 max-h-64 overflow-y-auto w-44 md:w-52">
            {/* Distance measurement overlay */}
            {distanceFrom && distanceTo && (() => {
              const from = sceneChars.find((s) => s.id === distanceFrom);
              const to = sceneChars.find((s) => s.id === distanceTo);
              if (!from || !to) return null;
              const dx = to.x - from.x;
              const dz = to.z - from.z;
              const dist = Math.sqrt(dx * dx + dz * dz);
              const gridSize = activeScene?.grid_size ?? 0;
              const squares = gridSize > 0 ? ` (${(dist / gridSize).toFixed(1)} squares)` : '';
              return (
                <div className="mb-2 px-2 py-1 bg-[var(--accent)]/20 rounded text-[10px] text-[var(--accent)] text-center">
                  Distance: {dist.toFixed(2)} units{squares}
                </div>
              );
            })()}
            {distanceFrom && !distanceTo && (
              <div className="mb-2 px-2 py-1 bg-[var(--bg-tertiary)] rounded text-[10px] text-[var(--text-secondary)] text-center">
                Shift+click another token to measure
              </div>
            )}
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">On Scene ({sceneChars.length})</p>
            {sceneChars.length > 0 ? (
              <div className="space-y-0.5 mb-2">
                {sceneChars.map((sc) => {
                  const ent = allEntities.find((e) => e.id === sc.entity_id);
                  const isSelected = selectedTokenId === sc.id;
                  return (
                    <div
                      key={sc.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        handleTokenContextMenu(sc.id, e.clientX, e.clientY);
                      }}
                      className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors cursor-default ${
                        isSelected
                          ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <button
                        onClick={() => handleTokenClick(sc.id)}
                        className="flex items-center gap-1.5 flex-1 text-left"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              sc.entity_type === 'character' ? '#4ade80' :
                              sc.entity_type === 'npc' ? '#facc15' : '#94a3b8',
                          }}
                        />
                        <span className="truncate">{ent?.name || 'Unknown'}</span>
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(sc.id)}
                        className="text-[10px] opacity-50 hover:opacity-100 shrink-0"
                        title={sc.visible ? 'Hide' : 'Show'}
                      >
                        {sc.visible ? '👁' : '🚫'}
                      </button>
                      <button
                        onClick={() => handleRemoveFromScene(sc.id)}
                        className="text-red-400 hover:text-red-300 text-[10px] shrink-0"
                        title="Quitar"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-[var(--text-secondary)] px-1 mb-2">Sin tokens colocados</p>
            )}

            {/* Disponibles entities to add */}
            {allEntities.filter((e) => !new Set(sceneChars.map((sc) => sc.entity_id)).has(e.id)).length > 0 && (
              <>
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">Disponibles</p>
                {placingToken && (
                  <p className="text-[9px] text-amber-400 mb-1 px-1">Hacé clic en el mapa para colocar (Esc cancela)</p>
                )}
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {allEntities
                    .filter((e) => !new Set(sceneChars.map((sc) => sc.entity_id)).has(e.id))
                    .map((ent) => (
                      <button
                        key={ent.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('roleito/token', `${ent.type}:${ent.id}`);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => setPlacingToken({ entity_type: ent.type, entity_id: ent.id })}
                        className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors text-left ${
                          placingToken?.entity_id === ent.id ? 'text-amber-400 bg-[var(--bg-tertiary)]' : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        <span className="text-[var(--accent)]">+</span>
                        <span className="truncate">{ent.name}</span>
                        <span className="ml-auto text-[9px] opacity-40" title="Arrastrá al mapa o hacé clic para colocar">↗</span>
                      </button>
                    ))}
                </div>
              </>
            )}

            {/* Recursos del DM — arrastrá al mapa para colocar */}
            {assets.length > 0 && (
              <>
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1 mt-2">Recursos ({assets.length})</p>
                <div className="grid grid-cols-4 gap-1 max-h-24 overflow-y-auto">
                  {assets.map((a) => (
                    <div
                      key={a.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'roleito/asset',
                          JSON.stringify({ name: a.name, url: staticUrl(a.file_path), assetId: a.id }),
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="aspect-square rounded overflow-hidden border border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-colors cursor-grab"
                      title={`${a.name} (arrastrá al mapa)`}
                    >
                      <img
                        src={staticUrl(a.file_path)!}
                        alt={a.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Token Scale slider when selected */}
            {selectedTokenId && (() => {
              const sc = sceneChars.find((s) => s.id === selectedTokenId);
              if (!sc) return null;
              const ent = allEntities.find((e) => e.id === sc.entity_id);
              const win = window as unknown as { __tokenScaleTimer?: ReturnType<typeof setTimeout>; __facingTimer?: ReturnType<typeof setTimeout>; __visionTypeTimer?: ReturnType<typeof setTimeout>; __visionRangeTimer?: ReturnType<typeof setTimeout> };
              return (
                <div className="mt-2 pt-2 border-t border-[var(--bg-tertiary)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--text-secondary)]">Tamaño</span>
                    <span className="text-[10px] text-[var(--accent)] font-mono">{(sc.token_scale ?? 1).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={sc.token_scale ?? 1}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      lastLocalChangeRef.current = Date.now();
                      setSceneChars((prev) => prev.map((s) => s.id === selectedTokenId ? { ...s, token_scale: v } : s));
                      if (!campaignId || !activeScene) return;
                      const updated = sceneCharsRef.current.map((s) =>
                        s.id === selectedTokenId
                          ? { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: v, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0, vision_type: s.vision_type ?? 'normal', vision_range: s.vision_range ?? 6.0 }
                          : { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0, vision_type: s.vision_type ?? 'normal', vision_range: s.vision_range ?? 6.0 }
                      );
                      clearTimeout(win.__tokenScaleTimer);
                      win.__tokenScaleTimer = setTimeout(() => {
                        api.scenes.updateCharacters(campaignId, activeScene.id, updated).catch(() => {});
                      }, 300);
                    }}
                    className="w-full h-1 accent-[var(--accent)]"
                  />
                  <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 truncate">{ent?.name || 'Unknown'}</p>
                  <div className="flex items-center justify-between mb-1 mt-2">
                    <span className="text-[10px] text-[var(--text-secondary)]">Orientación</span>
                    <span className="text-[10px] text-[var(--accent)] font-mono">{Math.round(((sc.facing_offset ?? 0) * 180) / Math.PI)}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6.28318}
                    step={0.017453}
                    value={sc.facing_offset ?? 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      lastLocalChangeRef.current = Date.now();
                      setSceneChars((prev) => prev.map((s) => s.id === selectedTokenId ? { ...s, facing_offset: v } : s));
                      if (!campaignId || !activeScene) return;
                      const updated = sceneCharsRef.current.map((s) =>
                        s.id === selectedTokenId
                          ? { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: v, vision_type: s.vision_type ?? 'normal', vision_range: s.vision_range ?? 6.0 }
                          : { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0, vision_type: s.vision_type ?? 'normal', vision_range: s.vision_range ?? 6.0 }
                      );
                      clearTimeout(win.__facingTimer);
                      win.__facingTimer = setTimeout(() => {
                        api.scenes.updateCharacters(campaignId, activeScene.id, updated).catch(() => {});
                      }, 300);
                    }}
                    className="w-full h-1 accent-[var(--accent)]"
                  />
                {/* Vision Type */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--text-secondary)]">Tipo de visión</span>
                    <span className="text-[10px] text-[var(--accent)] font-mono">{sc.vision_type ?? 'normal'}</span>
                  </div>
                  <select
                    value={sc.vision_type ?? 'normal'}
                    onChange={(e) => {
                      const v = e.target.value;
                      lastLocalChangeRef.current = Date.now();
                      setSceneChars((prev) => prev.map((s) => s.id === selectedTokenId ? { ...s, vision_type: v } : s));
                      if (!campaignId || !activeScene) return;
                      const updated = sceneCharsRef.current.map((s) =>
                        s.id === selectedTokenId
                          ? { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0, vision_type: v, vision_range: s.vision_range ?? 6.0 }
                          : { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0, vision_type: s.vision_type ?? 'normal', vision_range: s.vision_range ?? 6.0 }
                      );
                      clearTimeout(win.__visionTypeTimer);
                      win.__visionTypeTimer = setTimeout(() => {
                        api.scenes.updateCharacters(campaignId, activeScene.id, updated).catch(() => {});
                      }, 300);
                    }}
                    className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] rounded px-1 py-0.5 border border-[var(--border)]"
                  >
                    <option value="normal">Normal</option>
                    <option value="darkvision">Visión en la oscuridad</option>
                    <option value="blindsight">Sentido ciego</option>
                    <option value="tremorsense">Sentido de vibración</option>
                    <option value="truesight">Visión verdadera</option>
                  </select>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--text-secondary)]">Alcance de visión</span>
                    <span className="text-[10px] text-[var(--accent)] font-mono">{(sc.vision_range ?? 6.0).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={0.5}
                    value={sc.vision_range ?? 6.0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      lastLocalChangeRef.current = Date.now();
                      setSceneChars((prev) => prev.map((s) => s.id === selectedTokenId ? { ...s, vision_range: v } : s));
                      if (!campaignId || !activeScene) return;
                      const updated = sceneCharsRef.current.map((s) =>
                        s.id === selectedTokenId
                          ? { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0, vision_type: s.vision_type ?? 'normal', vision_range: v }
                          : { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0, vision_type: s.vision_type ?? 'normal', vision_range: s.vision_range ?? 6.0 }
                      );
                      clearTimeout(win.__visionRangeTimer);
                      win.__visionRangeTimer = setTimeout(() => {
                        api.scenes.updateCharacters(campaignId, activeScene.id, updated).catch(() => {});
                      }, 300);
                    }}
                    className="w-full h-1 accent-[var(--accent)]"
                  />
                </div>
              </div>
            );
          })()}
        </div>

          {/* Character Sheet HUD — bottom right on desktop, bottom sheet on mobile */}
          {selectedChar && selectedEntity && campaignId && (
            <div onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-4 right-4 z-10 max-sm:left-4 max-sm:right-4 max-sm:bottom-0 max-sm:rounded-b-none">
              <CharacterSheet
                entity={selectedChar}
                entityType={selectedEntity.entity_type as 'character' | 'npc'}
                campaignId={campaignId}
                statuses={sceneChars.find((sc) => sc.entity_id === selectedChar.id)?.statuses ?? []}
                onUpdate={(updated) => {
                  if (selectedEntity.entity_type === 'character') {
                    setCharacters((prev) => prev.map((c) => c.id === updated.id ? updated as Character : c));
                  } else {
                    setNpcs((prev) => prev.map((n) => n.id === updated.id ? updated as NPC : n));
                  }
                }}
                onClose={() => setSelectedTokenId(null)}
              />
            </div>
          )}
          {/* HUD Panels */}
          {showQuickActions && (
            <QuickActionsHud
              campaignId={campaignId!}
              onClose={() => setShowQuickActions(false)}
            />
          )}
          {showSessionLog && (
            <SessionLogHud
              sessionId={null}
              sessionTitle=""
              onClose={() => setShowSessionLog(false)}
            />
          )}
          {showSceneNotes && activeScene && (
            <SceneNotesHud
              campaignId={campaignId!}
              sceneId={activeScene.id}
              sceneName={activeScene.name || ''}
              onClose={() => setShowSceneNotes(false)}
            />
          )}
          {showDiceRoller && (
            <DiceRoller
              onClose={() => setShowDiceRoller(false)}
              characters={characters}
              npcs={npcs}
              campaignId={campaignId}
              rollerName="DM"
            />
          )}
          {showInitiative && activeScene && (
            <InitiativeTracker
              combatants={initiativeCombatants}
              campaignId={campaignId!}
              sceneId={activeScene.id}
              onUpdateHp={handleInitiativeHp}
              onUpdatePm={handleInitiativePm}
              onClose={() => setShowInitiative(false)}
            />
          )}
          {showQuests && campaignId && (
            <QuestPanel
              campaignId={campaignId}
              onClose={() => setShowQuests(false)}
            />
          )}
          {showHandouts && campaignId && (
            <HandoutPanel
              campaignId={campaignId}
              onClose={() => setShowHandouts(false)}
            />
          )}
          {showCalendar && campaignId && (
            <CalendarPanel
              campaignId={campaignId}
              onClose={() => setShowCalendar(false)}
            />
          )}
          {showRecap && campaignId && (
            <RecapPanel
              campaignId={campaignId}
              onClose={() => setShowRecap(false)}
            />
          )}
          {showAIPanel && <AISettingsPanel onClose={() => setShowAIPanel(false)} />}
          {showAssistant && campaignId && (
            <DMAssistant
              campaignId={campaignId}
              onClose={() => setShowAssistant(false)}
            />
          )}
          {viewingMap && (
            <MapViewer
              map={viewingMap}
              onClose={() => setViewingMap(null)}
              scenes={scenes}
              currentSceneId={activeScene?.id ?? null}
              onTransit={handleTransit}
            />
          )}
          {transitioning !== 'idle' && (
            <div className={`scene-transition-overlay ${transitioning === 'out' ? 'scene-transition-overlay--out' : ''}`} />
          )}
          {showNotebook && campaignId && (
            <DMNotebookHud
              campaignId={campaignId}
              onClose={() => setShowNotebook(false)}
            />
          )}
          {showSceneSettings && activeScene && campaignId && (
            <SceneSettingsHud
              scene={activeScene}
              onUpdate={async (updates: Partial<Pick<Scene, 'map_scale' | 'model_y_offset' | 'grid_size' | 'grid_snap'>>) => {
                const updated = await api.scenes.update(campaignId, activeScene.id, updates);
                setActiveScene(updated);
                setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
              }}
              onClose={() => setShowSceneSettings(false)}
            />
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {doorContextMenu && (
        <DoorContextMenu
          x={doorContextMenu.x}
          y={doorContextMenu.y}
          doorState={doorContextMenu.state as 'open' | 'closed' | 'locked'}
          onToggle={() => toggleDoor(doorContextMenu.itemId)}
          onLock={() => lockDoor(doorContextMenu.itemId)}
          onUnlock={() => unlockDoor(doorContextMenu.itemId)}
          onDelete={() => handleDeleteItem(doorContextMenu.itemId)}
          onClose={() => setDoorContextMenu(null)}
        />
      )}

      {bgSelector && (
        <BackgroundSelector
          sceneType={bgSelector.sceneType}
          suggestions={bgSelector.suggestions}
          dominantColors={bgSelector.dominantColors}
          onSelect={(bgId) => {
            const bg = bgSelector.suggestions.find((s) => s.id === bgId);
            if (bg) {
              setBgCSS(generateBackgroundCSS(bgSelector.sceneType, bg.colors));
            }
            setBgSelector(null);
          }}
          onUseDefault={() => setBgSelector(null)}
          onClose={() => setBgSelector(null)}
        />
      )}

      {wallContextMenu && (
        <WallContextMenu
          x={wallContextMenu.x}
          y={wallContextMenu.y}
          onDelete={() => handleDeleteItem(wallContextMenu.itemId)}
          onClose={() => setWallContextMenu(null)}
        />
      )}

      {zoneContextMenu && (() => {
        const item = graphRef.getItem(zoneContextMenu.itemId)
        const portals = item?.metadata.type === 'zone'
          ? (item.metadata as ZoneMetadata).portals ?? []
          : []
        return (
          <ZoneContextMenu
            x={zoneContextMenu.x}
            y={zoneContextMenu.y}
            portals={portals}
            onTogglePortal={handlePortalToggle}
            onDeletePortal={handlePortalDelete}
            onDelete={() => handleDeleteItem(zoneContextMenu.itemId)}
            onClose={() => setZoneContextMenu(null)}
          />
        )
      })()}

      {lightContextMenu && (
        <ContextMenu
          x={lightContextMenu.x}
          y={lightContextMenu.y}
          items={[
            { label: 'Eliminar luz', icon: '🗑️', danger: true, onClick: () => handleDeleteItem(lightContextMenu.itemId) },
          ]}
          onClose={() => setLightContextMenu(null)}
        />
      )}

      {fogContextMenu && (
        <ContextMenu
          x={fogContextMenu.x}
          y={fogContextMenu.y}
          items={[
            { label: 'Eliminar región de niebla', icon: '🗑️', danger: true, onClick: () => handleDeleteItem(fogContextMenu.itemId) },
          ]}
          onClose={() => setFogContextMenu(null)}
        />
      )}

      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/60"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setCmdOpen(false); }}
        >
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded-xl shadow-2xl overflow-hidden">
            <input
              autoFocus
              value={cmdQuery}
              onChange={(e) => setCmdQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setCmdOpen(false); }}
              placeholder="Buscar acción… (Ctrl+K)"
              className="w-full bg-transparent px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/60"
            />
            <div className="max-h-72 overflow-y-auto border-t border-[var(--bg-tertiary)]">
              {(() => {
                const q = cmdQuery.trim().toLowerCase();
                const links = [
                  { label: 'VTT', icon: '◆', to: `/campaigns/${campaignId}` },
                  { label: 'Resumen de la campaña', icon: '◇', to: `/campaigns/${campaignId}/manage` },
                  { label: 'Personajes', icon: '♦', to: `/campaigns/${campaignId}/characters` },
                  { label: 'Sesiones', icon: '♠', to: `/campaigns/${campaignId}/sessions` },
                  { label: 'Escenas', icon: '▣', to: `/campaigns/${campaignId}/scenes` },
                  { label: 'Narrativa', icon: '✒', to: `/campaigns/${campaignId}/narrative` },
                  { label: 'Jugadores', icon: '○', to: `/campaigns/${campaignId}/players` },
                  { label: 'Imágenes', icon: '◇', to: `/campaigns/${campaignId}/maps` },
                  { label: 'Recursos', icon: '□', to: `/campaigns/${campaignId}/assets` },
                  { label: 'Voz (TTS)', icon: '♪', to: `/campaigns/${campaignId}/tts` },
                  { label: 'Agentes', icon: '🤖', to: `/campaigns/${campaignId}/agents` },
                  { label: 'Estado del mundo', icon: '🌍', to: `/campaigns/${campaignId}/world-state` },
                  { label: 'Memoria', icon: '🧠', to: `/campaigns/${campaignId}/memory` },
                ];
                const actions = [
                  { label: 'Tirar dados', icon: '🎲', run: () => setShowDiceRoller((v) => !v) },
                  { label: 'Iniciativa', icon: '⚔', run: () => setShowInitiative((v) => !v) },
                  { label: 'Cuaderno del DM', icon: '📓', run: () => setShowNotebook((v) => !v) },
                  { label: 'Resumen de sesión', icon: '📋', run: () => setShowRecap((v) => !v) },
                  { label: 'Calendario y relojes', icon: '📅', run: () => setShowCalendar((v) => !v) },
                  { label: 'Tablón de misiones', icon: '📜', run: () => setShowQuests((v) => !v) },
                  { label: 'Documentos para jugadores', icon: '🗂', run: () => setShowHandouts((v) => !v) },
                  { label: 'Abrir mapa', icon: '🗺', run: () => {
                    const m = maps.find((mm) => mm.id === activeScene?.map_id);
                    if (m) setViewingMap(m);
                  } },
                  { label: 'Configuración de IA', icon: '🤖', run: () => setShowAIPanel((v) => !v) },
                  { label: 'Asistente del DM', icon: '💬', run: () => setShowAssistant((v) => !v) },
                  { label: 'Acciones rápidas', icon: '⚡', run: () => setShowQuickActions((v) => !v) },
                  { label: 'Bitácora de sesión', icon: '📋', run: () => setShowSessionLog((v) => !v) },
                  { label: 'Notas de la escena', icon: '📝', run: () => setShowSceneNotes((v) => !v) },
                  { label: 'Ajustes de escena', icon: '⚙', run: () => setShowSceneSettings((v) => !v) },
                  { label: 'Construir', icon: '🧱', run: () => setBuildMenuOpen(true) },
                ];
                const filtered = [
                  ...links.filter((l) => !q || l.label.toLowerCase().includes(q)).map((l) => (
                    <Link
                      key={l.label}
                      to={l.to}
                      onClick={() => setCmdOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <span className="text-xs opacity-60">{l.icon}</span>
                      {l.label}
                    </Link>
                  )),
                  ...actions.filter((a) => !q || a.label.toLowerCase().includes(q)).map((a) => (
                    <button
                      key={a.label}
                      onClick={() => { a.run(); setCmdOpen(false); }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <span className="text-xs opacity-60">{a.icon}</span>
                      {a.label}
                    </button>
                  )),
                ];
                return filtered.length > 0 ? filtered : (
                  <p className="px-4 py-3 text-xs text-[var(--text-secondary)]">Sin resultados</p>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <MinimizedBar />

      <ToastContainer
        toasts={toastQueue}
        onDismiss={(id) => setToastQueue((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
