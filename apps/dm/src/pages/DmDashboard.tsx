import { useEffect, useState, useRef, Suspense, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Campaign, Scene, SceneCharacter, Character, NPC, Map as GameMap, LightRequest } from '@/lib/api';
import { SceneItem, ZoneMetadata, SceneLayer } from '@core/domain/types';
import { SceneGraph } from '@core/scene/scene-graph';
import { useDoorInteraction } from '@core/scene/door-interaction';
import SceneRenderer from '@/components/SceneRenderer';
import { createEmptyDrawState, createWallItem, type DrawState } from '@/components/WallDrawer';
import { createEmptyZoneDraft, createZoneItem, ZONE_COLORS, ZONE_DEFAULT_COLOR, type ZoneDraft } from '@/components/ZoneDrawer';
import { createEmptyPortalDraft, type PortalDraft } from '@/components/PortalDrawerCanvas';
import { createPortalBetween, buildPortalLocalEdge, cyclePortalState, removePortal, zonesToGeometry } from '@/components/ZonePortal';
import { circlePoints, toggleZoneFog } from '@/lib/fogMask';
import { createLightItem, LIGHT_PRESETS, attachLightToToken, detachLight, normalizeLightConfig, updateLightSource } from '@/lib/light';
import { LightMetadata } from '@core/domain/types';
import DoorContextMenu from '@/components/DoorContextMenu';
import WallContextMenu from '@/components/WallContextMenu';
import ZoneContextMenu from '@/components/ZoneContextMenu';
import { extractZonePolygons } from '@/lib/wall-collision';
import { DEFAULT_RENDER_MODE } from '@/lib/overlayY';
import BackgroundSelector, { generateBackgroundCSS } from '@/components/BackgroundSelector';
import SessionLogHud from '@/components/SessionLogHud';
import SceneNotesHud from '@/components/SceneNotesHud';
import QuickActionsHud from '@/components/QuickActionsHud';
import DiceRoller from '@/components/DiceRoller';
import RecapPanel from '@/components/RecapPanel';
import CharacterSheet from '@/components/CharacterSheet';
import InitiativeTracker from '@/components/InitiativeTracker';
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
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [showDiceRoller, setShowDiceRoller] = useState(false);
  const [showInitiative, setShowInitiative] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [viewingMap, setViewingMap] = useState<GameMap | null>(null);
  const [maps, setMaps] = useState<GameMap[]>([]);
  const [transitioning, setTransitioning] = useState<'idle' | 'in' | 'out'>('idle');
  const [showNotebook, setShowNotebook] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);
  const [showSceneSettings, setShowSceneSettings] = useState(false);
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
  const [lightPlaceMode, setLightPlaceMode] = useState<{ preset: string } | null>(null);
  const [attachLightMode, setAttachLightMode] = useState<{ lightId: string | null } | null>(null);
  const [zoneColor, setZoneColor] = useState(ZONE_DEFAULT_COLOR);
  const [wallMaterial, setWallMaterial] = useState<'stone' | 'wood' | 'metal' | 'glass' | 'magic'>('stone');
  const [doorMaterial, setDoorMaterial] = useState<'wood' | 'metal' | 'glass' | 'magic'>('wood');
  const [doorContextMenu, setDoorContextMenu] = useState<{ x: number; y: number; itemId: string; state: string } | null>(null);
  const [wallContextMenu, setWallContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [zoneContextMenu, setZoneContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
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
    suggestions: any[];
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
  const rafRef = useRef<number>(0);
  const sceneCharsRef = useRef(sceneChars);
  sceneCharsRef.current = sceneChars;
  const lastLocalChangeRef = useRef(0);

  useEffect(() => {
    if (!campaignId) return;
    Promise.all([
      api.campaigns.get(campaignId),
      api.scenes.list(campaignId).catch(() => []),
      api.characters.list(campaignId).catch(() => []),
      api.npcs.list(campaignId).catch(() => []),
      api.maps.list(campaignId).catch(() => []),
    ])
      .then(([c, sc, chars, npcList, mapList]) => {
        setCampaign(c);
        setScenes(sc);
        setCharacters(chars);
        setNpcs(npcList);
        setMaps(mapList);
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
    let timer: number;
    const poll = async () => {
      try {
        const sc = await api.scenes.getCharacters(campaignId, activeScene.id);
        if (!cancelled && Date.now() - lastLocalChangeRef.current > 500) setSceneChars(sc);
      } catch {}
      if (!cancelled) timer = window.setTimeout(poll, 100);
    };
    timer = window.setTimeout(poll, 100);
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
        label: 'portal created',
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
    if (!confirm('Delete ALL walls and doors?')) return
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
      rollerName: 'Clear',
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: `walls + doors removed`,
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
        rollerName: 'Clear',
        diceType: 20,
        count: 1,
        results: [0],
        total: 0,
        label: `no zones to remove`,
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
      rollerName: 'Clear',
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: `zones removed`,
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
      rollerName: 'Clear',
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: toRemove.length === 0 ? `no fog to remove` : `fog regions removed`,
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
        rollerName: 'Clear',
        diceType: 20,
        count: 1,
        results: [0],
        total: 0,
        label: `no lights to remove`,
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
      rollerName: 'Light',
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: 'light attached to token',
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
      rollerName: 'Light',
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: 'light detached from token',
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
      rollerName: 'Light',
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
      rollerName: 'Light',
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
      rollerName: 'Zone Fog',
      diceType: 20,
      count: 1,
      results: [1],
      total: 1,
      label: res.applied === 'reveal' ? 'fog cleared for zone' : 'fog covering zone',
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
          rollerName: 'Auto-Detect',
          diceType: 20,
          count: 1,
          results: [result.wall_count],
          total: result.wall_count,
          label: `walls + ${result.door_count} doors detected`,
          timestamp: Date.now(),
        }])
      } else {
        setToastQueue((prev) => [...prev.slice(-4), {
          id: `detect-${Date.now()}`,
          rollerName: 'Auto-Detect',
          diceType: 1,
          count: 1,
          results: [1],
          total: 1,
          label: 'No walls detected — try adjusting the image',
          timestamp: Date.now(),
        }])
      }
    } catch (err) {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `detect-err-${Date.now()}`,
        rollerName: 'Auto-Detect',
        diceType: 1,
        count: 1,
        results: [1],
        total: 1,
        label: 'Detection failed — check backend',
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
        else if (attachLightMode) setAttachLightMode(null)
        else setSelectedItemId(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault()
        handleDeleteItem(selectedItemId)
        setSelectedItemId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawState, zoneDraft, portalDraft, fogMode, rectFogMode, zoneFogActive, lightPlaceMode, attachLightMode, selectedItemId, handleDeleteItem, handleUndo, handleRedo])

  useEffect(() => {
    const now = performance.now();
    const prevData = lastDataRef.current;
    lastDataRef.current = sceneChars;
    const prevAt = prevAppliedAtRef.current;
    prevAppliedAtRef.current = now;
    let dtSec = prevAt ? (now - prevAt) / 1000 : 0;
    if (dtSec < 0.001 || dtSec > 1.5) dtSec = 0;

    let maxLmat = 0;
    for (const sc of sceneChars) {
      const lmat = sc.last_move_at ?? 0;
      if (lmat > maxLmat) maxLmat = lmat;
    }
    if (maxLmat > 0) clockOffsetRef.current = Date.now() / 1000 - maxLmat;

    if (prevData.length > 0 && prevData !== sceneChars && dtSec > 0) {
      for (const sc of sceneChars) {
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
      for (const [id, target] of serverPosRef.current.entries()) {
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
        rollerName: 'System',
        diceType: 1, count: 1, results: [1], total: 1,
        label: 'Failed to update lighting',
        timestamp: Date.now(),
      }]);
    }
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
      rollerName: 'Light',
      diceType: 1, count: 1, results: [1], total: 1,
      label: 'light attached — edit in toolbar',
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
      rollerName: 'Light',
      diceType: 1, count: 1, results: [1], total: 1,
      label: 'light detached from token',
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
      rollerName: 'Light',
      diceType: 1, count: 1, results: [1], total: 1,
      label: 'light created — edit in toolbar',
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

    const mScale = activeScene.map_scale ?? 1;
    const mapH = 10 * mScale;
    const mapW = mapH;
    const normX = (x / mapW) + 0.5;
    const normZ = (z / mapH) + 0.5;

    const walls = graphRef.getItems()
      .filter((item) => item.metadata.type === 'wall' && item.shape?.type === 'line')
      .map((item) => {
        const pts = (item.shape as any).points;
        return [pts[0], pts[1], pts[2], pts[3]] as [number, number, number, number];
      });

    const { checkWallCollision } = await import('@/lib/wall-collision');
    if (checkWallCollision(normX, normZ, walls, 0.03)) {
      setToastQueue((prev) => [...prev.slice(-4), {
        id: `wall-block-${Date.now()}`,
        rollerName: 'Wall',
        diceType: 1,
        count: 1,
        results: [1],
        total: 1,
        label: 'Blocked by wall',
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
        ? { id: scn.id, entity_type: scn.entity_type, entity_id: scn.entity_id, x, y: scn.y, z, visible: !!scn.visible, order: scn.order, token_scale: scn.token_scale ?? 1, move_speed: scn.move_speed ?? 1, facing_offset: scn.facing_offset ?? 0 }
        : { id: scn.id, entity_type: scn.entity_type, entity_id: scn.entity_id, x: scn.x, y: scn.y, z: scn.z, visible: !!scn.visible, order: scn.order, token_scale: scn.token_scale ?? 1, move_speed: scn.move_speed ?? 1, facing_offset: scn.facing_offset ?? 0 }
    );
    try {
      await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
    } catch (err) {
      console.error('Failed to persist token position:', err);
    }
  }, [campaignId, activeScene, graphRef]);

  const handleAddToScene = useCallback(async (entityType: string, entityId: string) => {
    if (!campaignId || !activeScene) return;
    const scale = activeScene.map_scale ?? 1;
    const range = 2 * scale;
    const newChars = [...sceneChars, {
      entity_type: entityType,
      entity_id: entityId,
      x: Math.random() * range * 2 - range,
      y: 0,
      z: Math.random() * range * 2 - range,
      visible: true,
      order: sceneChars.length,
      token_scale: 1,
      move_speed: 1,
      facing_offset: 0,
    }];
    try {
      const result = await api.scenes.updateCharacters(campaignId, activeScene.id, newChars);
      setSceneChars(result);
    } catch (err) {
      console.error('Failed to add token:', err);
    }
  }, [campaignId, activeScene, sceneChars]);

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
        ? { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0 }
        : { id: sc.id, entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1, facing_offset: sc.facing_offset ?? 0 }
    );
    try {
      const result = await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
      setSceneChars(result);
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
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
      lightItems.push({ label: `Edit "${lt.name || 'light'}"${modeLabel}`, icon: '⚙', onClick: () => setSelectedItemId(lt.id) })
      lightItems.push({ label: `Detach "${lt.name || 'light'}"`, icon: '🔥', onClick: () => handleTokenLightDetach(lt.id) })
    }
    for (const lt of freeLights) {
      const src = (lt.metadata as { source?: { mode?: string } }).source
      const modeLabel = src?.mode === 'directional' ? ' (cone)' : ''
      lightItems.push({ label: `Attach "${lt.name || 'light'}"${modeLabel}`, icon: '💡', onClick: () => handleTokenLightAttach(sceneCharId, lt.id) })
    }
    lightItems.push({ label: 'Create new light', icon: '✨', onClick: () => handleCreateAndAttachLight(sceneCharId) })

    setContextMenu({
      x: clientX,
      y: clientY,
      items: [
        { label: `Select ${name}`, icon: '◉', onClick: () => setSelectedTokenId(sceneCharId) },
        { label: sc?.visible ? 'Hide from players' : 'Show to players', icon: sc?.visible ? '👁' : '🚫', onClick: () => handleToggleVisibility(sceneCharId) },
        { label: '', separator: true, onClick: () => {} },
        { label: 'View character sheet', icon: '📄', onClick: () => setSelectedTokenId(sceneCharId), disabled: !ent },
        { label: '', separator: true, onClick: () => {} },
        ...lightItems,
        { label: '', separator: true, onClick: () => {} },
        { label: 'Remove from scene', icon: '🗑', onClick: () => handleRemoveFromScene(sceneCharId), danger: true },
      ],
    });
  }, [sceneChars, allEntities, handleToggleVisibility, handleRemoveFromScene, graphRef, handleTokenLightAttach, handleTokenLightDetach, handleCreateAndAttachLight]);

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
        Loading campaign...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-400">
        Campaign not found
      </div>
    );
  }

  const sceneIndex = activeScene ? scenes.findIndex((s) => s.id === activeScene.id) + 1 : 0;

  return (
    <div className="h-screen flex flex-col bg-black overflow-hidden select-none">
      <TopBar
        title={campaign.name}
        titleTo="/"
        left={
          <>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title="Toggle sidebar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div className="w-px h-5 bg-[var(--bg-tertiary)] shrink-0" />
            <select
              value={activeScene?.id || ''}
              onChange={(e) => handleSceneSwitch(e.target.value)}
              className="text-sm bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              {scenes.length === 0 && <option value="">No scenes</option>}
              {scenes.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {s.name || `Scene ${i + 1}`} {s.status === 'active' ? '(active)' : ''}
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
                    rollerName: 'Sync',
                    diceType: 20,
                    count: 1,
                    results: [1],
                    total: 1,
                    label: `Scene "${updated.name}" synced to players`,
                    timestamp: Date.now(),
                  }]);
                } catch {
                  setToastQueue((prev) => [...prev.slice(-4), {
                    id: `sync-err-${Date.now()}`,
                    rollerName: 'Sync',
                    diceType: 20,
                    count: 1,
                    results: [0],
                    total: 0,
                    label: 'Failed to sync scene',
                    timestamp: Date.now(),
                  }]);
                }
              }}
              className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
                activeScene?.status === 'active'
                  ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title="Sync this scene to all players"
            >
              {activeScene?.status === 'active' ? '✓ Synced' : '⟳ Sync'}
            </button>
            <div className="w-px h-5 bg-[var(--bg-tertiary)] shrink-0" />
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleUndo}
                disabled={undoStackRef.current.length === 0}
                className="text-xs px-1.5 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>
              <button
                onClick={handleRedo}
                disabled={redoStackRef.current.length === 0}
                className="text-xs px-1.5 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Shift+Z)"
              >
                ↷
              </button>
            </div>
            <div ref={buildMenuRef} className="relative shrink-0">
              <button
                onClick={() => setBuildMenuOpen(!buildMenuOpen)}
                className={`text-xs px-2 py-1 rounded transition-colors ${drawState || zoneDraft || portalDraft || fogMode || rectFogMode || zoneFogActive || lightPlaceMode || attachLightMode ? 'bg-amber-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                🧱 Build ▾
              </button>
              {buildMenuOpen && (
                <div className="absolute left-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg z-50 min-w-[180px]">
                  <button
                    onClick={() => startDrawMode('wall')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${drawState?.mode === 'wall' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🧱 Draw Wall
                  </button>
                  <button
                    onClick={() => startDrawMode('door')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${drawState?.mode === 'door' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🚪 Place Door
                  </button>
                  <button
                    onClick={() => startZoneMode('rect')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${zoneDraft?.mode === 'rect' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    ▭ Zone (rect)
                  </button>
                  <button
                    onClick={() => startZoneMode('polygon')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${zoneDraft?.mode === 'polygon' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    ⬠ Zone (polygon)
                  </button>
                  <button
                    onClick={startPortalMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${portalDraft ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🚪 Portal (zone↔zone)
                  </button>
                  <button
                    onClick={startFogMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${fogMode ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🌫️ Fog (paint)
                  </button>
                  <button
                    onClick={startRectFogMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${rectFogMode ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    ▭ Fog (rect)
                  </button>
                  <button
                    onClick={startZoneFogMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${zoneFogActive ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    🧩 Zone fog (toggle)
                  </button>
                  <button
                    onClick={startLightPlaceMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${lightPlaceMode ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    💡 Light (place)
                  </button>
                  <div className="border-t border-[var(--bg-tertiary)] my-1" />
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">Zone color</p>
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
                      Blueprint
                    </button>
                    <button
                      onClick={() => setDetectionMode('textured')}
                      className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${detectionMode === 'textured' ? 'bg-amber-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      Textured
                    </button>
                    <button
                      onClick={() => setUseAi((v) => !v)}
                      className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${useAi ? 'bg-purple-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      AI
                    </button>
                  </div>
                  <button
                    onClick={handleAutoDetect}
                    disabled={detectingWalls}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${detectingWalls ? 'text-amber-400 animate-pulse' : 'text-[var(--text-secondary)]'}`}
                  >
                    {detectingWalls ? '⏳ Detecting...' : '🔍 Auto-detect walls'}
                  </button>
                  <button
                    onClick={handleClearAllWalls}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Clear all walls
                  </button>
                  <button
                    onClick={handleClearAllZones}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Clear all zones
                  </button>
                  <button
                    onClick={handleClearAllFog}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Clear all fog
                  </button>
                  <button
                    onClick={handleClearAllLights}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    🗑️ Clear all lights
                  </button>
                  <div className="border-t border-[var(--bg-tertiary)] my-1" />
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">Wall material</p>
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
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">Door material</p>
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
          </>
        }
      >
        {drawState && (
          <span className="text-[10px] text-amber-400 shrink-0">
            {drawState.mode === 'wall' ? '🧱 Click-drag to draw wall' : '🚪 Click-drag to place door'} · ESC to cancel
          </span>
        )}
            {zoneDraft && (
              <span className="text-[10px] text-amber-400 shrink-0">
                {zoneDraft.mode === 'rect'
                  ? '▭ Click-drag to draw zone rect'
                  : '⬠ Click to place vertices · click 1st point to close'} · ESC to cancel
              </span>
            )}
            {portalDraft && (
              <span className="text-[10px] text-amber-400 shrink-0">
                {portalDraft.zoneAId
                  ? '🚪 Click edge of another zone to complete the portal'
                  : '🚪 Click edge of zone A'} · ESC to cancel
              </span>
            )}
            {fogMode && (
              <>
                <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
                  <button
                    onClick={() => setFogMode((prev) => prev ? { ...prev, reveal: true } : prev)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${fogMode.reveal ? 'bg-green-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                  >
                    Reveal
                  </button>
                  <button
                    onClick={() => setFogMode((prev) => prev ? { ...prev, reveal: false } : prev)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${!fogMode.reveal ? 'bg-red-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                  >
                    Hide
                  </button>
                  <input
                    type="range"
                    min={0.03}
                    max={0.2}
                    step={0.01}
                    value={fogMode.radius}
                    onChange={(e) => setFogMode((prev) => prev ? { ...prev, radius: parseFloat(e.target.value) } : prev)}
                    className="w-20 h-1"
                    title="Brush size"
                  />
                  <span className="text-[9px] text-[var(--text-secondary)] w-8">
                    {(fogMode.radius * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 shrink-0">
                  🌫️ Click-drag to paint fog · ESC to cancel
                </span>
              </>
            )}
            {rectFogMode && (
              <>
                <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
                  <button
                    onClick={() => setRectFogMode((prev) => prev ? { ...prev, reveal: true } : prev)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${rectFogMode.reveal ? 'bg-green-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                  >
                    Reveal
                  </button>
                  <button
                    onClick={() => setRectFogMode((prev) => prev ? { ...prev, reveal: false } : prev)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${!rectFogMode.reveal ? 'bg-red-600 text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                  >
                    Hide
                  </button>
                </div>
                <span className="text-[10px] text-amber-400 shrink-0">
                  ▭ Click-drag to draw fog rect · ESC to cancel
                </span>
              </>
            )}
            {zoneFogActive && (
              <span className="text-[10px] text-amber-400 shrink-0">
                🧩 Click inside a zone to toggle fog · ESC to cancel
              </span>
            )}
            {lightPlaceMode && (
              <>
                <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
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
                <span className="text-[10px] text-amber-400 shrink-0">
                  💡 Click to place light · ESC to cancel
                </span>
              </>
            )}
            {attachLightMode && (
              <span className="text-[10px] text-amber-400 shrink-0">
                {attachLightMode.lightId
                  ? '🔗 Now click a token to attach this light · ESC to cancel'
                  : '🔗 Click a light source, then a token · ESC to cancel'}
              </span>
            )}
            {attachLightMode?.lightId && (() => {
              const selected = graphRef.getItem(attachLightMode.lightId!)
              if (selected?.metadata.type !== 'light' || !(selected.metadata as { attachedTo?: string }).attachedTo) return null
              return (
                <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
                  <button
                    onClick={() => handleLightDetach(attachLightMode.lightId!)}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Detach
                  </button>
                </div>
              )
            })()}
            {selectedLight && (
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 shrink-0">
                <span className="text-[10px] text-[var(--text-secondary)]">💡 {selectedLight.item.name}</span>
                <button
                  onClick={() => { handleDeleteItem(selectedLight.item.id); setSelectedItemId(null) }}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors ml-1"
                  title="Delete light"
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
                    title="Light color"
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
                    title="Intensity"
                  />
                  <span className="w-7">{selectedLight.source.intensity.toFixed(2)}</span>
                </label>
                <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                  range
                  <input
                    type="range"
                    min={0.001}
                    max={0.5}
                    step={0.0001}
                    value={selectedLight.source.radius}
                    onChange={(e) => handleLightSourceChange({ radius: parseFloat(e.target.value) })}
                    className="w-16 h-1"
                    title="Range"
                  />
                  <span className="w-8">{selectedLight.source.radius.toFixed(4)}</span>
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
                    title={selectedLight.source.mode === 'hard' ? 'Bright edge position' : 'Bright→dim falloff'}
                  />
                  <span className="w-8">{(selectedLight.source.falloff ?? (selectedLight.source.mode === 'hard' ? 1 : 0.6)).toFixed(2)}</span>
                </label>
                <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                  <span
                    onClick={() => handleLightSourceChange(selectedLight.source.flicker?.enabled
                      ? { flicker: undefined }
                      : { flicker: { speed: selectedLight.source.flicker?.speed ?? 0.3, variance: selectedLight.source.flicker?.variance ?? 0.1, enabled: true } })}
                    className={`cursor-pointer px-1.5 py-0.5 rounded transition-colors ${selectedLight.source.flicker?.enabled ? 'bg-amber-600 text-white' : 'hover:bg-[var(--bg-tertiary)]'}`}
                    title="Flicker toggle"
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
                        title="Flicker speed (cycles/sec)"
                      />
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.01}
                        value={selectedLight.source.flicker.variance}
                        onChange={(e) => handleLightSourceChange({ flicker: { speed: selectedLight.source.flicker!.speed, variance: parseFloat(e.target.value), enabled: true } })}
                        className="w-12 h-1"
                        title="Flicker variance (intensity swing)"
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
                    title="Pulse toggle"
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
                        title="Pulse speed (cycles/sec)"
                      />
                      <input
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.01}
                        value={selectedLight.source.pulse.variance}
                        onChange={(e) => handleLightSourceChange({ pulse: { speed: selectedLight.source.pulse!.speed, variance: parseFloat(e.target.value), enabled: true } })}
                        className="w-12 h-1"
                        title="Pulse variance (intensity swing)"
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
                        title="Cone angle"
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
                        title="Cone direction"
                      />
                      <span className="w-8">{selectedLight.source.direction ?? 0}°</span>
                    </label>
                  </>
                )}
              </div>
            )}
        <button
          onClick={() => fileInput.current?.click()}
          className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          title="Upload map background"
        >
          Upload BG
        </button>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />

        <button
          onClick={handleClassifyBackground}
          disabled={!activeScene?.background_path}
          className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 disabled:opacity-40"
          title="Suggest background for current map"
        >
          Background
        </button>

        <div className="relative group shrink-0">
          <button className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            {activeScene?.lighting || 'neutral'} ▾
          </button>
          <div className="absolute right-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            {['neutral', 'dark', 'dim', 'bright', 'torchlight'].map((mode) => (
              <button
                key={mode}
                onClick={() => handleToggleLighting(mode)}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                  activeScene?.lighting === mode ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowSceneSettings(!showSceneSettings)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showSceneSettings ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Scene Settings"
        >
          ⚙ Scene
        </button>

        <button
          onClick={handleInviteCode}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
            copiedInvite
              ? 'bg-emerald-600 text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          title="Copy player invite link"
        >
          {copiedInvite ? 'Copied!' : campaign?.invite_code ? '🔗 Invite' : '🔗 Get Invite'}
        </button>

        <button
          onClick={() => setShowInitiative(!showInitiative)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showInitiative ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Initiative Tracker"
        >
          ⚔
        </button>

        <button
          onClick={() => setShowDiceRoller(!showDiceRoller)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showDiceRoller ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Roll dice (D)"
        >
          🎲
        </button>

        <button
          onClick={() => setShowRecap(!showRecap)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showRecap ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Session Recap (R)"
        >
          📋
        </button>

        <button
          onClick={() => setShowNotebook(!showNotebook)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showNotebook ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="DM Notebook (N)"
        >
          📓
        </button>

        <button
          onClick={() => setShowAIPanel(!showAIPanel)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showAIPanel ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="AI Settings"
          data-testid="ai-panel-button"
        >
          🤖
        </button>

        <button
          onClick={() => setShowAssistant(!showAssistant)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showAssistant ? 'bg-violet-700 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="DM Assistant"
          data-testid="dm-assistant-button"
        >
          💬
        </button>

        {activeScene?.map_id && (
          <button
            onClick={() => {
              const m = maps.find((m) => m.id === activeScene.map_id);
              if (m) setViewingMap(m);
            }}
            className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            title="Open map"
          >
            🗺
          </button>
        )}

        {maps.length > 0 && (
          <div className="relative group shrink-0">
            <button className="text-[10px] px-1.5 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Map ▾
            </button>
            <div className="absolute right-0 top-full mt-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
              {activeScene?.map_id && (
                <button
                  onClick={async () => {
                    if (!campaignId || !activeScene) return;
                    const updated = await api.scenes.update(campaignId, activeScene.id, { map_id: null });
                    setActiveScene(updated);
                    setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
                  }}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                >
                  Unlink map
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
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                    activeScene?.map_id === m.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {activeScene?.map_id === m.id ? '✓ ' : ''}{m.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showQuickActions ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Quick Actions"
        >
          ⚡
        </button>
        <button
          onClick={() => setShowSessionLog(!showSessionLog)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showSessionLog ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Session Log"
        >
          📋
        </button>
        <button
          onClick={() => setShowSceneNotes(!showSceneNotes)}
          className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${showSceneNotes ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Scene Notes"
        >
          📝
        </button>

        <Link
          to={`/campaigns/${campaignId}/scenes`}
          className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          title="Scene management"
        >
          ⚙
        </Link>
      </TopBar>

      <div className="flex-1 flex overflow-hidden relative min-w-0">
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
                  Overview
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/characters`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">♦</span>
                  Characters
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/sessions`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">♠</span>
                  Sessions
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/scenes`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">▣</span>
                  Scenes
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/events`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">•</span>
                  Events
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/players`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">○</span>
                  Players
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/maps`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">◇</span>
                  Images
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/assets`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">□</span>
                  Assets
                </Link>
              </nav>
              <div className="px-4 py-3 border-t border-[var(--bg-tertiary)]">
                <p className="text-[10px] text-[var(--text-secondary)] opacity-60">DM Dashboard</p>
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
                Loading 3D scene...
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
                    name: ent?.name || 'Unknown',
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
                  };
                })}
                items={sceneItems}
                lighting={activeScene.lighting}
                selectedTokenId={selectedTokenId}
                selectedItemIds={selectedItemId ? [selectedItemId] : []}
                mapScale={activeScene.map_scale ?? 1}
                modelYOffset={activeScene.model_y_offset ?? 0}
                gridSize={activeScene.grid_size ?? 0}
                gridSnap={activeScene.grid_snap ?? false}
                drawState={drawState}
                showZones
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
                <p className="text-lg mb-2">No scene selected</p>
                <p className="text-sm">
                  {scenes.length === 0
                    ? 'Create a scene to get started.'
                    : 'Select a scene or upload a map background.'}
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
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-[var(--text-secondary)] px-1 mb-2">No tokens placed</p>
            )}

            {/* Available entities to add */}
            {allEntities.filter((e) => !new Set(sceneChars.map((sc) => sc.entity_id)).has(e.id)).length > 0 && (
              <>
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">Available</p>
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {allEntities
                    .filter((e) => !new Set(sceneChars.map((sc) => sc.entity_id)).has(e.id))
                    .map((ent) => (
                      <button
                        key={ent.id}
                        onClick={() => handleAddToScene(ent.type, ent.id)}
                        className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] hover:bg-[var(--bg-tertiary)] transition-colors text-left text-[var(--text-secondary)]"
                      >
                        <span className="text-[var(--accent)]">+</span>
                        <span className="truncate">{ent.name}</span>
                      </button>
                    ))}
                </div>
              </>
            )}

            {/* Token Scale slider when selected */}
            {selectedTokenId && (() => {
              const sc = sceneChars.find((s) => s.id === selectedTokenId);
              if (!sc) return null;
              const ent = allEntities.find((e) => e.id === sc.entity_id);
              return (
                <div className="mt-2 pt-2 border-t border-[var(--bg-tertiary)]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[var(--text-secondary)]">Size</span>
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
                          ? { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: v, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0 }
                          : { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0 }
                      );
                      clearTimeout((window as any).__tokenScaleTimer);
                      (window as any).__tokenScaleTimer = setTimeout(() => {
                        api.scenes.updateCharacters(campaignId, activeScene.id, updated).catch(() => {});
                      }, 300);
                    }}
                    className="w-full h-1 accent-[var(--accent)]"
                  />
                  <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 truncate">{ent?.name || 'Unknown'}</p>
                  <div className="flex items-center justify-between mb-1 mt-2">
                    <span className="text-[10px] text-[var(--text-secondary)]">Facing</span>
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
                          ? { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: v }
                          : { id: s.id, entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1, facing_offset: s.facing_offset ?? 0 }
                      );
                      clearTimeout((window as any).__facingTimer);
                      (window as any).__facingTimer = setTimeout(() => {
                        api.scenes.updateCharacters(campaignId, activeScene.id, updated).catch(() => {});
                      }, 300);
                    }}
                    className="w-full h-1 accent-[var(--accent)]"
                  />
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
          {showInitiative && (
            <InitiativeTracker
              combatants={initiativeCombatants}
              onUpdateHp={handleInitiativeHp}
              onUpdatePm={handleInitiativePm}
              onClose={() => setShowInitiative(false)}
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
            { label: 'Delete light', icon: '🗑️', danger: true, onClick: () => handleDeleteItem(lightContextMenu.itemId) },
          ]}
          onClose={() => setLightContextMenu(null)}
        />
      )}

      {fogContextMenu && (
        <ContextMenu
          x={fogContextMenu.x}
          y={fogContextMenu.y}
          items={[
            { label: 'Delete fog region', icon: '🗑️', danger: true, onClick: () => handleDeleteItem(fogContextMenu.itemId) },
          ]}
          onClose={() => setFogContextMenu(null)}
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
