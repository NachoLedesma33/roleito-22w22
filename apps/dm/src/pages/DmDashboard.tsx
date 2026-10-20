import { useEffect, useState, useRef, Suspense, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useParams, Link } from 'react-router-dom';
import { api, Campaign, Scene, SceneCharacter, Character, NPC, Map as GameMap, LightRequest, Asset } from '@/lib/api';
import { SceneItem, ZoneMetadata, SceneLayer, PortalRef } from '@core/domain/types';
import { useSceneGraph } from '@/lib/useSceneGraph';
import { useWallDetection } from '@/lib/useWallDetection';
import { usePortals } from '@/lib/usePortals';
import { useDoorInteraction } from '@core/scene/door-interaction';
import SceneRenderer from '@/components/SceneRenderer';
import { WEATHER_META, WEATHER_NONE_LABEL, WEATHER_KIND_LABEL, clampWeatherIntensity, WEATHER_INTENSITY_MIN, WEATHER_INTENSITY_MAX } from '@/components/WeatherFX';
import { createEmptyDrawState, createWallItem, type DrawState } from '@/components/WallDrawer';
import { createEmptyZoneDraft, createZoneItem, ZONE_COLORS, ZONE_DEFAULT_COLOR, type ZoneDraft } from '@/components/ZoneDrawer';
import { zonesToGeometry } from '@/components/ZonePortal';
import { toggleZoneFog, type DmFogMode } from '@/lib/fogMask';
import SegmentedControl, { type SegmentedOption } from '@/components/ui/SegmentedControl';
import { createLightItem, LIGHT_PRESETS, attachLightToToken, detachLight, normalizeLightConfig, updateLightSource, FIRE_RADIUS_MIN, FIRE_RADIUS_MAX, FIRE_RADIUS_STEP, FIRE_RADIUS_DEFAULT } from '@/lib/light';
import { LightMetadata } from '@core/domain/types';
import DmContextMenus from '@/components/dm/DmContextMenus';
import DmCommandPalette from '@/components/dm/DmCommandPalette';
import DmDock from '@/components/dm/DmDock';
import AnchoredMenu from '@/components/ui/AnchoredMenu';
import { useAnchoredMenu } from '@/lib/useAnchoredMenu';
import { extractZonePolygons, checkWallCollision } from '@/lib/wall-collision';
import { buildOccluders } from '@/lib/lightOcclusion';
import { extractFogRegions } from '@/lib/fogMask';
import { computeReachableCells } from '@/lib/movementRange';
import { sceneWorldHeight, sceneWorldSize } from '@/lib/sceneWorld';
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
import AudioSettingsMenu from '@/components/AudioSettingsMenu';
import {
  getAudioSettings,
  getSharedAudio,
  normalizeSharedAudio,
  setSharedAudio,
  type AudioSettingKey,
} from '@/lib/audioSettings';
import SceneSettingsHud from '@/components/SceneSettingsHud';
import type { ContextMenuItem } from '@/components/ContextMenu';
import ToastContainer from '@/components/ToastContainer';
import { rollToToast, useToastQueue } from '@/lib/toastQueue';
import TopBar from '@/components/TopBar';
import MinimizedBar from '@/components/MinimizedBar';
import HudPanel from '@/components/HudPanel';
import ToolButton from '@/components/ui/ToolButton';
import IconButton from '@/components/ui/IconButton';
import { staticUrl } from '@/lib/staticUrl';
import { Dices, Swords, NotebookPen, ClipboardList, CalendarDays, ScrollText, FolderOpen, Map as MapIcon, Bot, MessageCircle, Zap, BookOpen, StickyNote, LayoutGrid, Brush, SquareDashed, PaintBucket, Undo2, Redo2, CloudSun, Settings, ImagePlus, Wand2, Square, Mountain, ChevronDown } from 'lucide-react';

export default function DmDashboard() {
  const { t } = useTranslation();
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
  // Dock abierto por defecto en desktop; colapsado en pantallas chicas (el
  // pill ⋯ lo reabre). Sin auto-colapso por click-afuera: en desktop queda fijo.
  const [dockExpanded, setDockExpanded] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [distanceFrom, setDistanceFrom] = useState<string | null>(null);
  const [distanceTo, setDistanceTo] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const [tokenQuickEdit, setTokenQuickEdit] = useState<{ sceneCharId: string; x: number; y: number } | null>(null);
  const [lightRequests, setLightRequests] = useState<LightRequest[]>([]);
  const { toasts: toastQueue, push, pushMany, dismiss } = useToastQueue();
  const [drawState, setDrawState] = useState<DrawState | null>(null);
  const [zoneDraft, setZoneDraft] = useState<ZoneDraft | null>(null);
  const [fogMode, setFogMode] = useState<{ mode: DmFogMode; radius: number } | null>(null);
  const [rectFogMode, setRectFogMode] = useState<{ mode: DmFogMode } | null>(null);
  /**
   * Último modo de niebla usado: el pincel y el rect arrancan donde los dejó el
   * DM, no en un default fijo (§3 del plan de percepción). El default de una
   * sesión nueva es `cover`, que es lo que se pintaba antes ("penumbra").
   */
  const [lastFogMode, setLastFogMode] = useState<DmFogMode>(() => {
    try {
      const saved = localStorage.getItem('roleito:dm:fogMode');
      return saved === 'cover' || saved === 'secret' || saved === 'reveal' ? saved : 'secret';
    } catch {
      return 'secret';
    }
  });
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

  // Grafo de escena + historial (deshacer/rehacer) + guardado debounceado.
  // Todo lo que muta el grafo entra por `handleItemsChange`.
  const { graphRef, sceneItems, handleItemsChange, handleUndo, handleRedo, canUndo, canRedo } =
    useSceneGraph({
      campaignId,
      sceneId: activeScene?.id,
      onHistoryStep: () => {
        setSelectedItemId(null);
        setZoneContextMenu(null);
      },
    });
  const [buildMenuOpen, setBuildMenuOpen] = useState(false);
  // Los menús de clima y lighting abren con click, no con hover: en táctil el
  // hover no existe y el menú era inalcanzable.
  const [openMenu, setOpenMenu] = useState<'lighting' | 'weather' | null>(null);
  const [showZones, setShowZones] = useState(true);
  // Aspect real del fondo (lo reporta SceneRenderer; 1 = cuadrado). Alinea
  // dibujo y colisión con el render en mapas no-cuadrados.
  const [mapAspect, setMapAspect] = useState(1);
  const handleAspectChange = useCallback((a: number) => {
    if (Number.isFinite(a) && a > 0) setMapAspect(a);
  }, []);

  const toggleMenu = (which: 'lighting' | 'weather', anchor: HTMLElement) => {
    if (which === 'lighting') lightingMenu.anchorFrom(anchor);
    else weatherMenu.anchorFrom(anchor);
    setOpenMenu((prev) => (prev === which ? null : which));
  };

  const closeLightingMenu = useCallback(() => setOpenMenu(null), []);
  const closeBuildMenu = useCallback(() => setBuildMenuOpen(false), []);
  const closeMapMenu = useCallback(() => setShowMapMenu(false), []);
  const lightingMenu = useAnchoredMenu({ open: openMenu === 'lighting', onClose: closeLightingMenu, anchorId: 'lighting', align: 'end', width: 150, gap: -2 });
  const weatherMenu = useAnchoredMenu({ open: openMenu === 'weather', onClose: closeLightingMenu, anchorId: 'weather', align: 'end', width: 170, gap: -2 });
  const buildMenu = useAnchoredMenu({ open: buildMenuOpen, onClose: closeBuildMenu, anchorId: 'build' });
  const mapMenu = useAnchoredMenu({ open: showMapMenu, onClose: closeMapMenu, anchorId: 'map', align: 'end', width: 140, gap: 2 });

  const [lightContextMenu, setLightContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  const [fogContextMenu, setFogContextMenu] = useState<{ x: number; y: number; itemId: string } | null>(null);
  // Propuesta de detección sin revisar: ids agregados al grafo que el DM aún
  // no aprobó ni descartó. Mientras viva, la barra de revisión sigue visible.
  const [bgSelector, setBgSelector] = useState<{
    sceneType: string;
    suggestions: { id: string; name: string; style: string; colors: string[] }[];
    dominantColors: string[];
  } | null>(null);
  const [bgCSS, setBgCSS] = useState<string | null>(null);
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

  // Volumen de audio compartido: el DM lo publica en la campaña y llega acá al
  // recargar. El efecto se re-ejecuta al persistir, pero setSharedAudio ignora
  // los cambios idénticos (no entra en loop).
  const campaignRef = useRef<Campaign | null>(null);
  campaignRef.current = campaign;

  useEffect(() => {
    if (!campaign) return;
    setSharedAudio(normalizeSharedAudio(campaign.settings_json?.audio));
  }, [campaign]);

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
          const msg = JSON.parse(ev.data as string) as {
            type?: string;
            scene_id?: string;
            characters?: SceneCharacter[];
          };
          // Camino barato: un token se movio. Antes esto caia al `revision` y
          // hacia `GET /scenes/{id}/characters` por cada tick de teclado.
          if (
            msg.type === 'scene_characters' &&
            msg.scene_id === activeScene.id &&
            Date.now() - lastLocalChangeRef.current > 500 &&
            Array.isArray(msg.characters) &&
            msg.characters.length > 0
          ) {
            // broadcast_positions manda SOLO el token que cambio (o el de un
            // jugador). Reemplazar el array aca borraba todos los demas de la
            // vista del DM: el proximo PUT de characters los borraba de la DB.
            const incomingArr = msg.characters;
            const incoming = new Map(incomingArr.map((c) => [c.id, c]));
            setSceneChars((prev) => {
              const merged = prev.map((c) => incoming.get(c.id) ?? c);
              for (const c of incomingArr) {
                if (!prev.some((p) => p.id === c.id)) merged.push(c);
              }
              return merged;
            });
          } else if (msg.type === 'revision' && Date.now() - lastLocalChangeRef.current > 500) {
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
      const { mapH, mapW } = sceneWorldSize(mScale, mapAspect);
      const item = createWallItem(prev, campaignId ?? '', mapW, mapH)
      if (item) {
        graphRef.addItem(item)
        handleItemsChange(graphRef.getItems())
      }
      return null
    })
  }, [graphRef, handleItemsChange, campaignId, activeScene, mapAspect])

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
      const mapSize = sceneWorldHeight(mScale)
      const item = createZoneItem(prev, zoneColor, mapSize * mapAspect, mapSize)
      if (item) {
        graphRef.addItem(item)
        handleItemsChange(graphRef.getItems())
      }
      return null
    })
  }, [graphRef, handleItemsChange, activeScene, zoneColor, mapAspect])

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

  // Portales entre zonas. El draft es efímero: al elegir el segundo borde se
  // escribe la geometría y desaparece.
  const {
    portalDraft,
    startPortalMode,
    cancelPortalMode,
    handlePortalSelect,
    handlePortalMove,
    handlePortalToggle,
    handlePortalDelete,
  } = usePortals({ graphRef, handleItemsChange, push });
  const startZoneMode = useCallback((mode: 'rect' | 'polygon') => {
    setRectFogMode(null)
    setDrawState(null)
    cancelPortalMode()
    setZoneDraft((prev) => {
      if (prev?.mode === mode) return null
      return createEmptyZoneDraft(mode)
    })
    setBuildMenuOpen(false)
  }, [cancelPortalMode]);



  // Salir de los demás modos es del dashboard, no del portal.
  const handleStartPortal = useCallback(() => {
    setRectFogMode(null);
    setDrawState(null);
    setZoneDraft(null);
    setBuildMenuOpen(false);
    startPortalMode();
  }, [startPortalMode]);

  const portalZones = useMemo(() => {
    if (!portalDraft && !zoneFogActive) return []
    const mScale = activeScene?.map_scale ?? 1
    const mapSize = sceneWorldHeight(mScale)
    const zones = extractZonePolygons(graphRef.getItems(), mapSize * mapAspect, mapSize)
    return zonesToGeometry(zones)
  }, [portalDraft, zoneFogActive, activeScene, graphRef, mapAspect])

  const handleClearAllWalls = useCallback(() => {
    if (!confirm(i18n.t('dmConfirm.clearWalls', '¿Eliminar TODAS las paredes y puertas?'))) return
    const items = graphRef.getItems()
    const toRemove = items.filter(
      (item: SceneItem) => item.metadata?.type === 'wall' || item.metadata?.type === 'door'
    )
    for (const item of toRemove) {
      graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
    push({
      id: `clear-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerClear', 'Limpiar'),
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: i18n.t('dmToast.wallsCleared', 'paredes y puertas eliminadas'),
      timestamp: Date.now(),
    })
  }, [graphRef, handleItemsChange, push]);

  const handleClearAllZones = useCallback(() => {
    const items = graphRef.getItems()
    const toRemove = items.filter(
      (item: SceneItem) => item.metadata?.type === 'zone'
    )
    if (toRemove.length === 0) {
      push({
        id: `clearz-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerClear', 'Limpiar'),
        diceType: 20,
        count: 1,
        results: [0],
        total: 0,
        label: i18n.t('dmToast.noZones', 'no hay zonas para eliminar'),
        timestamp: Date.now(),
      })
      return
    }
    for (const item of toRemove) {
      graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
    push({
      id: `clearz-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerClear', 'Limpiar'),
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: i18n.t('dmToast.zonesCleared', 'zonas eliminadas'),
      timestamp: Date.now(),
    })
  }, [graphRef, handleItemsChange, push]);

  /**
 * Los tres modos de niebla del DM (`engineering/PLAN-VISION-PERCEPCION.md` §3).
 *
 * El matiz de cada uno va en el tooltip, porque las etiquetas son cortas y las
 * consecuencias no: "Cubrir" no le gana a nada, "Secreto" oculta aunque haya
 * luz y "Revelar" muestra aunque esté a oscuras.
 */
const fogModeOptions = useMemo<SegmentedOption<DmFogMode>[]>(
  () => [
    {
      value: 'cover',
      label: t('dm.fogCover', 'Cubrir'),
      title: t('dm.fogCoverHint', 'Penumbra: el jugador ve lo que su personaje percibe'),
      activeClassName: 'bg-slate-600 text-white',
    },
    {
      value: 'secret',
      label: t('dm.fogSecret', 'Secreto'),
      title: t('dm.fogSecretHint', 'El jugador NO ve esta zona, aunque la ilumine'),
      activeClassName: 'bg-red-600 text-white',
    },
    {
      value: 'reveal',
      label: t('dm.fogReveal', 'Revelar'),
      title: t('dm.fogRevealHint', 'El jugador ve esta zona, esté o no iluminada'),
      activeClassName: 'bg-green-600 text-white',
    },
  ],
  [t],
);

/** Cambia el modo de la herramienta activa y lo recuerda para la próxima. */
const applyFogMode = useCallback(
  (mode: DmFogMode) => {
    setLastFogMode(mode);
    try {
      localStorage.setItem('roleito:dm:fogMode', mode);
    } catch {
      /* localStorage puede estar bloqueado: el modo dura lo que la sesión */
    }
    setFogMode((prev) => (prev ? { ...prev, mode } : prev));
    setRectFogMode((prev) => (prev ? { ...prev, mode } : prev));
  },
  [],
);

const startFogMode = useCallback(() => {
    setDrawState(null)
    setZoneDraft(null)
    cancelPortalMode()
    setZoneFogActive(false)
    setRectFogMode(null)
    setFogMode((prev) => {
      if (prev) return null
      return { mode: lastFogMode, radius: 0.08 }
    })
    setBuildMenuOpen(false)
  }, [cancelPortalMode, lastFogMode]);

  const startRectFogMode = useCallback(() => {
    setDrawState(null)
    setZoneDraft(null)
    cancelPortalMode()
    setFogMode(null)
    setZoneFogActive(false)
    setRectFogMode((prev) => {
      if (prev) return null
      return { mode: lastFogMode }
    })
    setBuildMenuOpen(false)
  }, [cancelPortalMode, lastFogMode]);

  const handleFogStroke = useCallback((points: number[]) => {
    if (!fogMode || points.length < 2) return
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
      // `points` es la línea central y `brushRadius` el grosor: un item por
      // pincelada, no uno por punto de mouse.
      shape: { type: 'polygon', points, fill: '#000000' },
      metadata: {
        type: 'fog',
        fogType: 'static',
        mode: fogMode.mode,
        revealed: fogMode.mode === 'reveal',
        brushRadius: fogMode.radius,
      },
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
      metadata: { type: 'fog', fogType: 'static', mode: rectFogMode.mode, revealed: rectFogMode.mode === 'reveal' },
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
    push({
      id: `clearf-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerClear', 'Limpiar'),
      diceType: 20,
      count: 1,
      results: [toRemove.length],
      total: toRemove.length,
      label: toRemove.length === 0 ? i18n.t('dmToast.noFog', 'no hay niebla para eliminar') : i18n.t('dmToast.fogCleared', 'regiones de niebla eliminadas'),
      timestamp: Date.now(),
    })
  }, [graphRef, handleItemsChange, push]);

  const handleClearAllLights = useCallback(() => {
    const items = graphRef.getItems()
    const toRemove = items.filter(
      (item: SceneItem) => item.metadata?.type === 'light'
    )
    if (toRemove.length === 0) {
      push({
        id: `clearl-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerClear', 'Limpiar'),
        diceType: 20,
        count: 1,
        results: [0],
        total: 0,
        label: i18n.t('dmToast.noLights', 'no hay luces para eliminar'),
        timestamp: Date.now(),
      })
      return
    }
    for (const item of toRemove) {
      graphRef.removeItem(item.id)
    }
    handleItemsChange(graphRef.getItems())
  }, [graphRef, handleItemsChange, push]);

  const startZoneFogMode = useCallback(() => {
    setDrawState(null)
    setZoneDraft(null)
    cancelPortalMode()
    setFogMode(null)
    setRectFogMode(null)
    setZoneFogActive((prev) => !prev)
    setBuildMenuOpen(false)
  }, [cancelPortalMode]);

  const startLightPlaceMode = useCallback(() => {
    setDrawState(null)
    setZoneDraft(null)
    cancelPortalMode()
    setFogMode(null)
    setRectFogMode(null)
    setZoneFogActive(false)
    setLightPlaceMode((prev) => {
      if (prev) return null
      return { preset: 'torch' }
    })
    setBuildMenuOpen(false)
  }, [cancelPortalMode]);

  const handleLightPlace = useCallback((point: { x: number; y: number }) => {
    if (!lightPlaceMode) return
    const mScale = activeScene?.map_scale ?? 1
    const mapHeight = sceneWorldHeight(mScale)
    const mapWidth = mapHeight * mapAspect
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
  }, [lightPlaceMode, activeScene, graphRef, handleItemsChange, mapAspect])


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
    push({
      id: `attach-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerLight', 'Luz'),
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: i18n.t('dmToast.lightAttached', 'luz agregada al token'),
      timestamp: Date.now(),
    })
  }, [attachLightMode, graphRef, handleItemsChange, push]);

  const handleLightDetach = useCallback((lightId: string) => {
    const light = graphRef.getItem(lightId)
    if (!light || light.metadata.type !== 'light') return
    graphRef.updateItem(lightId, detachLight(light))
    handleItemsChange(graphRef.getItems())
    setSelectedItemId(null)
    setAttachLightMode(null)
    push({
      id: `detach-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerLight', 'Luz'),
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: i18n.t('dmToast.lightDetached', 'luz quitada del token'),
      timestamp: Date.now(),
    })
  }, [graphRef, handleItemsChange, push]);

  const handleGrantLight = useCallback(async (request: LightRequest) => {
    const sc = sceneCharsRef.current.find((s) => s.id === request.token_id)
    if (!sc || !campaignId) return
    const mScale = activeScene?.map_scale ?? 1
    const mapHeight = sceneWorldHeight(mScale)
    const mapWidth = mapHeight * mapAspect
    const item = createLightItem('torch', { x: sc.x / mapWidth + 0.5, y: sc.z / mapHeight + 0.5 }, mapWidth, mapHeight)
    if (!item) return
    const attached = attachLightToToken(item, sc.id)
    graphRef.addItem(attached)
    handleItemsChange(graphRef.getItems())
    try {
      await api.lightRequests.resolve(campaignId, request.id)
    } catch {}
    setLightRequests((prev) => prev.filter((r) => r.id !== request.id))
    push({
      id: `grant-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerLight', 'Luz'),
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: i18n.t('dmToast.torchGranted', 'antorcha entregada a {{name}}', { name: request.character_name }),
      timestamp: Date.now(),
    })
  }, [campaignId, activeScene, graphRef, handleItemsChange, mapAspect, push]);

  const handleDenyLight = useCallback(async (request: LightRequest) => {
    if (!campaignId) return
    try {
      await api.lightRequests.resolve(campaignId, request.id)
    } catch {}
    setLightRequests((prev) => prev.filter((r) => r.id !== request.id))
    push({
      id: `deny-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerLight', 'Luz'),
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: i18n.t('dmToast.lightDenied', 'luz denegada a {{name}}', { name: request.character_name }),
      timestamp: Date.now(),
    })
  }, [campaignId, push]);

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
    const mapSize = sceneWorldHeight(mScale)
    const items = graphRef.getItems()
    const zone = items.find((i: SceneItem) => i.id === snap.zoneId && i.metadata?.type === 'zone')
    if (!zone) return
    const zonePoly: [number, number][] = extractZonePolygons([zone], mapSize * mapAspect, mapSize)[0].points
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
    push({
      id: `zonefog-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerZoneFog', 'Niebla de zona'),
      diceType: 20,
      count: 1,
      results: [1],
      total: 1,
      label: res.applied === 'reveal' ? i18n.t('dmToast.zoneFogRevealed', 'niebla despejada de la zona') : i18n.t('dmToast.zoneFogHidden', 'niebla cubriendo la zona'),
      timestamp: Date.now(),
    })
  }, [activeScene, graphRef, handleItemsChange, mapAspect, push]);

  // Detección de paredes contra el fondo. Los items llegan al grafo pero
  // quedan como propuesta hasta que el DM apruebe o descarte.
  const {
    detectionMode,
    setDetectionMode,
    useAi,
    toggleAi,
    detectingWalls,
    detectProposal,
    handleAutoDetect,
    handleDetectApprove,
    handleDetectDiscard,
    pruneProposal,
  } = useWallDetection({
    campaignId,
    sceneId: activeScene?.id,
    graphRef,
    handleItemsChange,
    push,
  });

  // El hook no sabe de menús: cerrar el de Construir es del dashboard.
  const handleDetectClick = useCallback(() => {
    setBuildMenuOpen(false);
    void handleAutoDetect();
  }, [handleAutoDetect]);

  const handleDeleteItem = useCallback((itemId: string) => {
    graphRef.removeItem(itemId)
    handleItemsChange(graphRef.getItems())
    // Borrado individual durante revisión: la propuesta pierde ese id (si se
    // vacía, la revisión termina sola).
    pruneProposal(itemId)
  }, [graphRef, handleItemsChange, pruneProposal])

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

  // El dock y la paleta de comandos ofrecen la misma acción: abrir el mapa
  // vinculado a la escena activa.
  const openActiveSceneMap = useCallback(() => {
    const m = maps.find((mm) => mm.id === activeScene?.map_id);
    if (m) setViewingMap(m);
  }, [maps, activeScene]);

  // El menú de zona necesita los portales de esa zona. Se resuelve acá (que es
  // quien tiene el grafo) y se le pasa la función al menú, no el ref.
  const getZonePortals = useCallback((itemId: string): PortalRef[] => {
    const item = graphRef.getItem(itemId)
    return item?.metadata.type === 'zone'
      ? (item.metadata as ZoneMetadata).portals ?? []
      : []
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
        else if (portalDraft) cancelPortalMode()
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
  }, [drawState, zoneDraft, portalDraft, fogMode, rectFogMode, zoneFogActive, lightPlaceMode, placingToken, attachLightMode, selectedItemId, handleDeleteItem, handleUndo, handleRedo, cancelPortalMode]);

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
          pushMany(newRolls.map(rollToToast));
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
  }, [campaignId, pushMany]);

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
      push({
        id: `lighting-err-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerSystem', 'Sistema'),
        diceType: 1, count: 1, results: [1], total: 1,
        label: i18n.t('dmToast.lightingUpdateFailed', 'No se pudo actualizar la iluminación'),
        timestamp: Date.now(),
      });
    }
  };

  const handleChangeWeather = async (weather: string | null) => {
    if (!campaignId || !activeScene) return;
    try {
      const updated = await api.scenes.update(campaignId, activeScene.id, { weather });
      setActiveScene(updated);
      setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch {
      push({
        id: `weather-err-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerSystem', 'Sistema'),
        diceType: 1, count: 1, results: [1], total: 1,
        label: i18n.t('dmToast.weatherChangeFailed', 'No se pudo cambiar el clima'),
        timestamp: Date.now(),
      });
    }
  };

  // Publica el volumen compartido en la campaña (solo cuando el DM sincroniza).
  const persistSharedAudio = useCallback(async () => {
    if (!campaignId) return;
    const audio = getSharedAudio();
    if (!audio) return;
    try {
      const updated = await api.campaigns.update(campaignId, {
        settings_json: { ...(campaignRef.current?.settings_json ?? {}), audio },
      });
      setCampaign(updated);
    } catch {
      push({
        id: `audio-err-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerSystem', 'Sistema'),
        diceType: 1, count: 1, results: [1], total: 1,
        label: i18n.t('dmToast.audioSyncFailed', 'No se pudo sincronizar el audio'),
        timestamp: Date.now(),
      });
    }
  }, [campaignId, push]);

  const handleToggleAudioSync = useCallback((on: boolean) => {
    const current = getSharedAudio();
    if (on) {
      // Al activar, empuja el volumen actual del DM a todos los POV.
      const local = getAudioSettings();
      setSharedAudio({ sync: true, master: local.master, weather: local.weather, dice: local.dice });
    } else {
      setSharedAudio(current ? { ...current, sync: false } : null);
    }
    void persistSharedAudio();
  }, [persistSharedAudio]);

  const handleSharedVolumeChange = useCallback((key: AudioSettingKey, value: number) => {
    const base = getSharedAudio() ?? { sync: true, master: 1, weather: 0.8, dice: 0.8 };
    setSharedAudio({ ...base, [key]: value, sync: true });
    void persistSharedAudio();
  }, [persistSharedAudio]);

  const weatherIntensityTimerRef = useRef<number>(0);

  const commitWeatherIntensity = useCallback(async (sceneId: string, value: number) => {
    if (!campaignId) return;
    try {
      const updated = await api.scenes.update(campaignId, sceneId, { weather_intensity: value });
      setActiveScene(updated);
      setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } catch {
      push({
        id: `weather-int-err-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerSystem', 'Sistema'),
        diceType: 1, count: 1, results: [1], total: 1,
        label: i18n.t('dmToast.weatherIntensityFailed', 'No se pudo ajustar la intensidad del clima'),
        timestamp: Date.now(),
      });
    }
  }, [campaignId, push]);

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
    push({
      id: `attach-ctx-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerLight', 'Luz'),
      diceType: 1, count: 1, results: [1], total: 1,
      label: i18n.t('dmToast.lightAttachedEdit', 'luz agregada — editá en la barra de herramientas'),
      timestamp: Date.now(),
    })
  }, [graphRef, handleItemsChange, push]);

  const handleTokenLightDetach = useCallback((lightId: string) => {
    const light = graphRef.getItem(lightId)
    if (!light || light.metadata.type !== 'light') return
    graphRef.updateItem(lightId, detachLight(light))
    handleItemsChange(graphRef.getItems())
    setSelectedItemId(null)
    setContextMenu(null)
    push({
      id: `detach-ctx-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerLight', 'Luz'),
      diceType: 1, count: 1, results: [1], total: 1,
      label: i18n.t('dmToast.lightDetached', 'luz quitada del token'),
      timestamp: Date.now(),
    })
  }, [graphRef, handleItemsChange, push]);

  const handleCreateAndAttachLight = useCallback((sceneCharId: string) => {
    const sc = sceneCharsRef.current.find((s) => s.id === sceneCharId)
    if (!sc || !activeScene) return
    const mScale = activeScene.map_scale ?? 1
    const mapHeight = sceneWorldHeight(mScale)
    const mapWidth = mapHeight * mapAspect
    const item = createLightItem('lantern', { x: sc.x / mapWidth + 0.5, y: sc.z / mapHeight + 0.5 }, mapWidth, mapHeight)
    if (!item) return
    const attached = attachLightToToken(item, sc.id)
    graphRef.addItem(attached)
    handleItemsChange(graphRef.getItems())
    setContextMenu(null)
    setSelectedItemId(attached.id)
    push({
      id: `create-attach-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerLight', 'Luz'),
      diceType: 1, count: 1, results: [1], total: 1,
      label: i18n.t('dmToast.lightCreatedEdit', 'luz creada — editá en la barra de herramientas'),
      timestamp: Date.now(),
    })
  }, [activeScene, graphRef, handleItemsChange, mapAspect, push]);

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
    const { mapH, mapW } = sceneWorldSize(mScale, mapAspect);
    const normX = (x / mapW) + 0.5;
    const normZ = (z / mapH) + 0.5;

    const walls = graphRef.getItems()
      .filter((item) => item.metadata.type === 'wall' && item.shape?.type === 'line')
      .map((item) => {
        const pts = (item.shape as { type: 'line'; points: number[] }).points;
        return [pts[0], pts[1], pts[2], pts[3]] as [number, number, number, number];
      });

    if (checkWallCollision(normX, normZ, walls, 0.03)) {
      push({
        id: `wall-block-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerWall', 'Pared'),
        diceType: 1,
        count: 1,
        results: [1],
        total: 1,
        label: i18n.t('dmToast.blockedByWall', 'Bloqueado por pared'),
        timestamp: Date.now(),
      });
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
  }, [campaignId, activeScene, graphRef, mapAspect, push]);

  // Qué tapa la luz en la escena. Lo calcula la vista y lo pasa a SceneRenderer:
  // el render no depende de buildOccluders, y el rango de movimiento usa la
  // misma lista en vez de recalcularla.
  const sceneOccluders = useMemo(() => {
    if (!activeScene) return [];
    const { mapH, mapW } = sceneWorldSize(activeScene.map_scale ?? 1, mapAspect);
    return buildOccluders(sceneItems, mapW, mapH);
  }, [activeScene, sceneItems, mapAspect]);
  const sceneFogRegions = useMemo(() => extractFogRegions(sceneItems), [sceneItems]);

  // F7: movement range overlay for the selected token (A* reachable cells).
  const movementRange = useMemo(() => {
    if (!activeScene || !selectedTokenId) return null;
    const sc = sceneChars.find((s) => s.id === selectedTokenId);
    if (!sc) return null;
    const { mapH, mapW } = sceneWorldSize(activeScene.map_scale ?? 1, mapAspect);
    const cellSize = activeScene.grid_size && activeScene.grid_size > 0 ? activeScene.grid_size : 0.5;
    const { cells } = computeReachableCells(
      sc.x, sc.z,
      sc.move_speed ?? 5,
      sceneOccluders, cellSize, mapW, mapH,
    );
    return { tokenId: sc.id, cellSize, cells };
  }, [activeScene, selectedTokenId, sceneChars, sceneOccluders, mapAspect]);

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

  const tokenPatchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleTokenPatch = useCallback(
    (
      sceneCharId: string,
      patch: { token_scale?: number; facing_offset?: number; vision_type?: string; vision_range?: number }
    ) => {
      lastLocalChangeRef.current = Date.now();
      setSceneChars((prev) => prev.map((s) => (s.id === sceneCharId ? { ...s, ...patch } : s)));
      if (!campaignId || !activeScene) return;
      clearTimeout(tokenPatchTimerRef.current);
      tokenPatchTimerRef.current = setTimeout(() => {
        const updated = sceneCharsRef.current.map((s) => ({
          id: s.id,
          entity_type: s.entity_type,
          entity_id: s.entity_id,
          x: s.x,
          y: s.y,
          z: s.z,
          visible: !!s.visible,
          order: s.order,
          statuses: s.statuses ?? [],
          token_scale: s.token_scale ?? 1,
          move_speed: s.move_speed ?? 1,
          facing_offset: s.facing_offset ?? 0,
          vision_type: s.vision_type ?? 'normal',
          vision_range: s.vision_range ?? 6.0,
        }));
        api.scenes.updateCharacters(campaignId, activeScene.id, updated).catch(() => {});
      }, 300);
    },
    [campaignId, activeScene]
  );

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

  const quickEditRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tokenQuickEdit) return;
    const handleDown = (e: MouseEvent) => {
      if (quickEditRef.current && !quickEditRef.current.contains(e.target as Node)) setTokenQuickEdit(null);
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [tokenQuickEdit]);
  useEffect(() => {
    if (tokenQuickEdit && !sceneChars.some((s) => s.id === tokenQuickEdit.sceneCharId)) setTokenQuickEdit(null);
  }, [tokenQuickEdit, sceneChars]);

  const handleTokenContextMenu = useCallback((sceneCharId: string, clientX: number, clientY: number) => {
    const sc = sceneChars.find((s) => s.id === sceneCharId);
    const ent = allEntities.find((x) => x.id === sc?.entity_id);
    const name = ent?.name || i18n.t('dm.unknown', 'Desconocido');

    const allItems = graphRef.getItems()
    const attachedLights = allItems.filter((it) => it.metadata.type === 'light' && (it.metadata as { attachedTo?: string }).attachedTo === sceneCharId)
    const freeLights = allItems.filter((it) => it.metadata.type === 'light' && !(it.metadata as { attachedTo?: string }).attachedTo)

    const lightItems: ContextMenuItem[] = []
    for (const lt of attachedLights) {
      const src = (lt.metadata as { source?: { mode?: string; angle?: number } }).source
      const modeLabel = src?.mode === 'directional' ? i18n.t('dmContext.coneDeg', ' (cono {{angle}}°)', { angle: src.angle ?? 90 }) : i18n.t('dmContext.mode', ' ({{mode}})', { mode: src?.mode ?? 'hard' })
      lightItems.push({ label: i18n.t('dmContext.editLight', 'Editar "{{name}}"{{mode}}', { name: lt.name || i18n.t('dmContext.light', 'luz'), mode: modeLabel }), icon: '⚙', onClick: () => setSelectedItemId(lt.id) })
      lightItems.push({ label: i18n.t('dmContext.detachLight', 'Desprender "{{name}}"', { name: lt.name || i18n.t('dmContext.light', 'luz') }), icon: '🔥', onClick: () => handleTokenLightDetach(lt.id) })
    }
    for (const lt of freeLights) {
      const src = (lt.metadata as { source?: { mode?: string } }).source
      const modeLabel = src?.mode === 'directional' ? i18n.t('dmContext.cone', ' (cono)') : ''
      lightItems.push({ label: i18n.t('dmContext.attachLight', 'Adjuntar "{{name}}"{{mode}}', { name: lt.name || i18n.t('dmContext.light', 'luz'), mode: modeLabel }), icon: '💡', onClick: () => handleTokenLightAttach(sceneCharId, lt.id) })
    }
    lightItems.push({ label: i18n.t('dmContext.newLight', 'Crear nueva luz'), icon: '✨', onClick: () => handleCreateAndAttachLight(sceneCharId) })

    // Estado: sección "Activas" (quitar rápido) + un submenú por categoría — evita lista plana de 18.
    const buildStatusMenuItems = (statusIds: string[]): ContextMenuItem[] => {
      const items: ContextMenuItem[] = [];
      const active = STATUS_OPTIONS.filter((s) => statusIds.includes(s.id));
      if (active.length > 0) {
        items.push({ label: i18n.t('dmContext.activeStatuses', '· Activas'), icon: '✦', disabled: true, onClick: () => {} });
        for (const s of active) {
          items.push({ label: i18n.t('dmContext.removeStatus', 'Quitar {{name}}', { name: s.label }), icon: '✓', onClick: () => handleToggleStatus(sceneCharId, s.id) });
        }
      }
      for (const g of STATUS_GROUPS) {
        const rest = STATUS_OPTIONS.filter((s) => s.group === g.key && !statusIds.includes(s.id));
        if (rest.length === 0) continue;
        items.push({
          label: i18n.t('dmContext.statusGroup', '· {{name}}', { name: g.label }),
          onClick: () => {},
          submenu: rest.map((s) => ({
            label: i18n.t('dmContext.markStatus', 'Marcar {{name}}', { name: s.label }),
            icon: '＋',
            onClick: () => handleToggleStatus(sceneCharId, s.id),
          })),
        });
      }
      return items;
    };

    setContextMenu({
      x: clientX,
      y: clientY,
      items: [
        { label: i18n.t('dmContext.selectToken', 'Seleccionar {{name}}', { name }), icon: '◉', onClick: () => setSelectedTokenId(sceneCharId) },
        { label: sc?.visible ? i18n.t('dmContext.hidePlayers', 'Ocultar a los jugadores') : i18n.t('dmContext.showPlayers', 'Mostrar a los jugadores'), icon: sc?.visible ? '👁' : '🚫', onClick: () => handleToggleVisibility(sceneCharId) },
        { label: '', separator: true, onClick: () => {} },
        { label: i18n.t('dmContext.statusTitle', 'Estado'), icon: '⚠️', onClick: () => {}, disabled: true },
        ...buildStatusMenuItems(sc?.statuses ?? []),
        { label: '', separator: true, onClick: () => {} },
        ...lightItems,
        { label: '', separator: true, onClick: () => {} },
        { label: i18n.t('dmContext.removeFromScene', 'Quitar de la escena'), icon: '🗑', onClick: () => handleRemoveFromScene(sceneCharId), danger: true },
      ],
    });
  }, [sceneChars, allEntities, handleToggleVisibility, handleRemoveFromScene, graphRef, handleTokenLightAttach, handleTokenLightDetach, handleCreateAndAttachLight, handleToggleStatus]);

  const handleTokenDoubleClick = useCallback((sceneCharId: string, clientX: number, clientY: number) => {
    setTokenQuickEdit({ sceneCharId, x: clientX, y: clientY });
  }, []);

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
          } else if (tokenQuickEdit) {
            setTokenQuickEdit(null);
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
  }, [scenes, activeScene, selectedTokenId, showQuickActions, showSessionLog, showSceneNotes, showDiceRoller, showRecap, showNotebook, showAssistant, viewingMap, tokenQuickEdit, handleRemoveFromScene, setContextMenu]);

  const selectedEntity = selectedTokenId
    ? sceneChars.find((sc) => sc.id === selectedTokenId)
    : null;
  const selectedChar = selectedEntity
    ? allEntities.find((e) => e.id === selectedEntity.entity_id)
    : null;

  const quickEditChar = tokenQuickEdit
    ? sceneChars.find((sc) => sc.id === tokenQuickEdit.sceneCharId)
    : null;
  const quickEditEntity = quickEditChar
    ? allEntities.find((e) => e.id === quickEditChar.entity_id)
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
        {t('dm.loadingCampaign', 'Cargando campaña...')}
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-red-400">
        {t('dm.campaignNotFound', 'Campaña no encontrada')}
      </div>
    );
  }

  const sceneIndex = activeScene ? scenes.findIndex((s) => s.id === activeScene.id) + 1 : 0;
  const weatherIntensityK = clampWeatherIntensity(activeScene?.weather_intensity);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden select-none">
      <h1 className="sr-only">{t('dm.tableTitle', 'Mesa de juego')}</h1>
      <TopBar
        title={campaign.name}
        titleTo="/"
        left={
          <>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title={t('dm.toggleSidebar', 'Alternar barra lateral')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div className="w-px h-5 bg-[var(--bg-tertiary)] shrink-0" />
            <select
              value={activeScene?.id || ''}
              onChange={(e) => handleSceneSwitch(e.target.value)}
              aria-label={t('dm.activeScene', 'Escena activa')}
              className="text-sm bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 text-[var(--text-primary)] cursor-pointer shrink-0"
            >
              {scenes.length === 0 && <option value="">{t('dm.noScenes', 'Sin escenas')}</option>}
              {scenes.map((s, i) => (
                <option key={s.id} value={s.id}>
                  {s.name || t('dm.sceneN', 'Escena {{n}}', { n: i + 1 })} {s.status === 'active' ? `(${t('dm.activeShort', 'activa')})` : ''}
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
                  push({
                    id: `sync-${Date.now()}`,
                    rollerName: i18n.t('dmToast.rollerSync', 'Sincronización'),
                    diceType: 20,
                    count: 1,
                    results: [1],
                    total: 1,
                    label: i18n.t('dmToast.sceneSynced', 'Escena "{{name}}" sincronizada con los jugadores', { name: updated.name }),
                    timestamp: Date.now(),
                  });
                } catch {
                  push({
                    id: `sync-err-${Date.now()}`,
                    rollerName: i18n.t('dmToast.rollerSync', 'Sincronización'),
                    diceType: 20,
                    count: 1,
                    results: [0],
                    total: 0,
                    label: i18n.t('dmToast.sceneSyncFailed', 'No se pudo sincronizar la escena'),
                    timestamp: Date.now(),
                  });
                }
              }}
              className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
                activeScene?.status === 'active'
                  ? 'bg-green-600/20 text-green-400 border border-green-600/40'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title={t('dm.syncTitle', 'Sincronizar esta escena con todos los jugadores')}
            >
              {activeScene?.status === 'active' ? t('dm.synced', '✓ Sincronizada') : t('dm.sync', '⟳ Sincronizar')}
            </button>
            <div className="w-px h-5 bg-[var(--bg-tertiary)] shrink-0" />
            
              
        <button
              onClick={handleInviteCode}
              className={`text-xs px-2 py-1 rounded transition-colors shrink-0 ${
                copiedInvite
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
              title={t('dm.copyInviteTitle', 'Copiar link de invitación para jugadores')}
            >
              {copiedInvite ? t('dm.copied', '¡Copiado!') : campaign?.invite_code ? t('dm.invite', '🔗 Invitar') : t('dm.getInvite', '🔗 Obtener invitación')}
            </button>
          </>
        }
      >
        <AudioSettingsMenu className="ml-auto" canSync onToggleSync={handleToggleAudioSync} onVolumeChange={handleSharedVolumeChange} />
        
            
            
            
            
        

        

        

        

        
      </TopBar>

      <div className="flex-1 flex overflow-hidden relative min-w-0">
        {/* Toolbar canvas — HudPanel arrastrable/minimizable */}
        <HudPanel
          title={t('dm.toolbarTitle', 'Herramientas')}
          panelId="dm-toolbar"
          onClose={() => {}}
          hideClose
          defaultX={8}
          defaultY={52}
          defaultWidth={190}
          defaultHeight={typeof window !== 'undefined' ? Math.min(720, window.innerHeight - 120) : 600}
          minWidth={150}
        >
          <div className="flex flex-col items-stretch gap-1">
            <div className="flex items-center gap-1 shrink-0">
              <IconButton
                icon={<Undo2 className="h-4 w-4" />}
                label={t('dm.undo', 'Deshacer (Ctrl+Z)')}
                disabled={!canUndo}
                onClick={handleUndo}
              />
              <IconButton
                icon={<Redo2 className="h-4 w-4" />}
                label={t('dm.redo', 'Rehacer (Ctrl+Shift+Z)')}
                disabled={!canRedo}
                onClick={handleRedo}
              />
            </div>
            <div className="relative shrink-0" data-anchor="build">
              <button
                onClick={(e) => {
                  buildMenu.anchorFrom(e.currentTarget);
                  setBuildMenuOpen(!buildMenuOpen);
                }}
                className={`flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs transition-colors duration-[var(--dur-fast)] ease-[var(--ease-standard)] ${drawState || zoneDraft || portalDraft || fogMode || rectFogMode || zoneFogActive || lightPlaceMode || attachLightMode ? 'bg-amber-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                <Mountain aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{t('dm.build', 'Construir')}</span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </button>
              <AnchoredMenu open={buildMenuOpen} rect={buildMenu.rect} anchorId="build" testId="build-menu" minWidth={180}>
                  <button
                    onClick={() => startDrawMode('wall')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${drawState?.mode === 'wall' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    {t('dm.drawWall', 'Dibujar pared')}
                  </button>
                  <button
                    onClick={() => startDrawMode('door')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${drawState?.mode === 'door' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    {t('dm.placeDoor', 'Colocar puerta')}
                  </button>
                  <button
                    onClick={() => startZoneMode('rect')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${zoneDraft?.mode === 'rect' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    {t('dm.zoneRect', 'Zona (rect)')}
                  </button>
                  <button
                    onClick={() => startZoneMode('polygon')}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${zoneDraft?.mode === 'polygon' ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    {t('dm.zonePolygon', 'Zona (polígono)')}
                  </button>
                  <button
                    onClick={handleStartPortal}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${portalDraft ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    {t('dm.portalZone', 'Portal (zona↔zona)')}
                  </button>
                  <button
                    onClick={startLightPlaceMode}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${lightPlaceMode ? 'text-amber-400' : 'text-[var(--text-secondary)]'}`}
                  >
                    {t('dm.lightPlace', 'Luz (colocar)')}
                  </button>
                  <div className="border-t border-[var(--bg-tertiary)] my-1" />
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">{t('dm.zoneColor', 'Color de zona')}</p>
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
                      {t('dm.detectionBlueprint', 'Plano')}
                    </button>
                    <button
                      onClick={() => setDetectionMode('textured')}
                      className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${detectionMode === 'textured' ? 'bg-amber-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      {t('dm.detectionTextured', 'Texturizado')}
                    </button>
                    <button
                      onClick={toggleAi}
                      className={`flex-1 text-[10px] px-2 py-1 rounded transition-colors ${useAi ? 'bg-purple-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                    >
                      {t('dm.detectionAi', 'IA')}
                    </button>
                  </div>
                  <button
                    onClick={handleDetectClick}
                    disabled={detectingWalls}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${detectingWalls ? 'text-amber-400 animate-pulse' : 'text-[var(--text-secondary)]'}`}
                  >
                    {detectingWalls ? t('dm.detecting', 'Detectando...') : t('dm.detectWalls', 'Detectar paredes')}
                  </button>
                  <button
                    onClick={handleClearAllWalls}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    {t('dm.clearWalls', 'Limpiar todas las paredes')}
                  </button>
                  <button
                    onClick={handleClearAllZones}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    {t('dm.clearZones', '🗑️ Limpiar todas las zonas')}
                  </button>
                  <button
                    onClick={handleClearAllFog}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    {t('dm.clearFog', '🗑️ Limpiar toda la niebla')}
                  </button>
                  <button
                    onClick={handleClearAllLights}
                    className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors text-red-400"
                  >
                    {t('dm.clearLights', '🗑️ Limpiar todas las luces')}
                  </button>
                  <div className="border-t border-[var(--bg-tertiary)] my-1" />
                  <div className="px-3 py-1">
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">{t('dm.wallMaterial', 'Material de paredes')}</p>
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
                    <p className="text-[10px] text-[var(--text-secondary)] mb-1">{t('dm.doorMaterial', 'Material de puertas')}</p>
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
                </AnchoredMenu>


            </div>
            <button
              onClick={() => fileInput.current?.click()}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-secondary)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--text-primary)] shrink-0"
              title={t('dm.uploadBgTitle', 'Subir fondo de mapa')}
            >
              <ImagePlus aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{t('dm.uploadBg', 'Subir fondo')}</span>
            </button>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} data-testid="bg-upload-input" />
            <button
              onClick={handleClassifyBackground}
              disabled={!activeScene?.background_path}
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-secondary)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--text-primary)] shrink-0 disabled:cursor-not-allowed disabled:opacity-40"
              title={t('dm.suggestBgTitle', 'Sugerir fondo para el mapa actual')}
            >
              <Wand2 aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{t('dm.suggestBg', 'Sugerir fondo')}</span>
            </button>
            <div className="relative shrink-0" data-anchor="lighting">
              <button
                onClick={(e) => toggleMenu('lighting', e.currentTarget)}
                aria-expanded={openMenu === 'lighting'}
                aria-haspopup="menu"
                data-testid="lighting-select"
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-secondary)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--text-primary)]"
              >
                <Square aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">
                  {{ neutral: t('dm.lightNeutral', 'Neutra'), dark: t('dm.lightDark', 'Oscura'), dim: t('dm.lightDim', 'Tenue'), bright: t('dm.lightBright', 'Brillante'), torchlight: t('dm.lightTorch', 'Antorcha') }[activeScene?.lighting || 'neutral'] || activeScene?.lighting || t('dm.lightNeutral', 'Neutra')}
                </span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </button>
              <AnchoredMenu open={openMenu === 'lighting'} rect={lightingMenu.rect} anchorId="lighting" testId="lighting-menu" minWidth={150}>
                {['neutral', 'dark', 'dim', 'bright', 'torchlight'].map((mode) => (
                  <button
                    key={mode}
                    role="menuitem"
                    onClick={() => handleToggleLighting(mode)}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                      activeScene?.lighting === mode ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {{ neutral: t('dm.lightNeutral', 'Neutra'), dark: t('dm.lightDark', 'Oscura'), dim: t('dm.lightDim', 'Tenue'), bright: t('dm.lightBright', 'Brillante'), torchlight: t('dm.lightTorch', 'Antorcha') }[mode] || mode}
                  </button>
                ))}
              </AnchoredMenu>
            </div>
            <div className="relative shrink-0" data-anchor="weather">
              <button
                onClick={(e) => toggleMenu('weather', e.currentTarget)}
                aria-expanded={openMenu === 'weather'}
                aria-haspopup="menu"
                className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-secondary)] transition-colors duration-[var(--dur-fast)] hover:text-[var(--text-primary)]"
                data-testid="weather-select"
                title={t('dm.weatherTitle', 'Clima de la escena')}
              >
                <CloudSun aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">
                  {(activeScene?.weather && WEATHER_META[activeScene.weather] ? t(`dm.weather.${activeScene.weather}`, WEATHER_META[activeScene.weather].label) : t('dm.weather.none', WEATHER_NONE_LABEL))}
                </span>
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </button>
              <AnchoredMenu open={openMenu === 'weather'} rect={weatherMenu.rect} anchorId="weather" testId="weather-menu" minWidth={170}>
                <button
                  role="menuitem"
                  onClick={() => handleChangeWeather(null)}
                  className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors ${
                    !activeScene?.weather ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {t('dm.weather.none', WEATHER_NONE_LABEL)}
                </button>
                {(['rain', 'snow', 'fog'] as const).map((kind) => {
                  const entries = Object.entries(WEATHER_META).filter(([, meta]) => meta.kind === kind);
                  if (!entries.length) return null;
                  return (
                    <div key={kind}>
                      <div className="px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-[var(--text-secondary)] opacity-60">
                        {t(`dm.weather.kind.${kind}`, WEATHER_KIND_LABEL[kind])}
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
                          {t(`dm.weather.${key}`, meta.label)}
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
                      <span>{t('dm.weatherIntensity', 'Intensidad')}</span>
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
                      title={t('dm.weatherIntensityTitle', 'Intensidad del clima ({{v}}x)', { v: weatherIntensityK.toFixed(2) })}
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-secondary)] mt-0.5">
                      <span>{t('dm.weatherMild', 'Tenue')}</span>
                      <span>{t('dm.weatherStrong', 'Fuerte')}</span>
                      <span>{t('dm.weatherTorrential', 'Torrencial')}</span>
                    </div>
                  </div>
                )}
              </AnchoredMenu>
            </div>
            {maps.length > 0 && (
              <div className="relative shrink-0" data-anchor="map">
                <button
                  onClick={(e) => {
                    mapMenu.anchorFrom(e.currentTarget);
                    setShowMapMenu((v) => !v);
                  }}
                  className={`w-full text-[10px] px-1.5 py-1 rounded transition-colors ${showMapMenu ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {t('dm.mapBtn', 'Mapa ▾')}
                </button>
                <AnchoredMenu open={showMapMenu} rect={mapMenu.rect} anchorId="map" testId="map-menu" minWidth={140}>
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
                        {t('dm.unlinkMap', 'Desvincular mapa')}
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
                </AnchoredMenu>


              </div>
            )}
            <Link
              to={`/campaigns/${campaignId}/scenes`}
              className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              title={t('dm.sceneMgmtTitle', 'Gestión de escenas')}
              aria-label={t('dm.sceneMgmtTitle', 'Gestión de escenas')}
            >
              ⚙
            </Link>
          </div>
        </HudPanel>

        {/* Hints de modo de dibujo + luz seleccionada — contextual arriba-centro */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-2 max-w-[70%] pointer-events-none">
          {drawState && (
            <span className="text-[10px] text-amber-400 shrink-0">
              {drawState.mode === 'wall' ? t('dm.hintDrawWall', '🧱 Arrastrá para dibujar pared') : t('dm.hintDrawDoor', '🚪 Arrastrá para colocar puerta')} · {t('dm.escCancel', 'ESC cancela')}
            </span>
          )}
          {zoneDraft && (
            <span className="text-[10px] text-amber-400 shrink-0">
              {zoneDraft.mode === 'rect'
                ? t('dm.hintZoneRect', '▭ Arrastrá para dibujar rect de zona')
                : t('dm.hintZonePoly', '⬠ Clic para colocar vértices · clic en el 1er punto para cerrar')} · {t('dm.escCancel', 'ESC cancela')}
            </span>
          )}
          {portalDraft && (
            <span className="text-[10px] text-amber-400 shrink-0">
              {portalDraft.zoneAId
                ? t('dm.hintPortalB', '🚪 Clic en el borde de otra zona para completar el portal')
                : t('dm.hintPortalA', '🚪 Clic en el borde de la zona A')} · {t('dm.escCancel', 'ESC cancela')}
            </span>
          )}
          {fogMode && (
            <div className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 shadow-lg shadow-black/40">
              <SegmentedControl
                value={fogMode.mode}
                onChange={(mode) => applyFogMode(mode)}
                options={fogModeOptions}
                testId="fog-mode-select"
              />
              <input
                type="range"
                min={0.03}
                max={0.2}
                step={0.01}
                value={fogMode.radius}
                onChange={(e) => setFogMode((prev) => prev ? { ...prev, radius: parseFloat(e.target.value) } : prev)}
                className="h-1 w-20 cursor-pointer"
                title={t('dm.brushSize', 'Tamaño del pincel')}
              />
              <span className="w-8 text-[11px] tabular-nums text-[var(--text-secondary)]">
                {(fogMode.radius * 100).toFixed(0)}%
              </span>
            </div>
          )}
          {fogMode && (
            <span className="shrink-0 text-[11px] text-amber-400">
              {t('dm.hintPaintFog', 'Arrastrá para pintar niebla')} · {t('dm.escCancel', 'ESC cancela')}
            </span>
          )}
          {rectFogMode && (
            <div className="pointer-events-auto flex shrink-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-primary)] px-2 py-1.5 shadow-lg shadow-black/40">
              <SegmentedControl
                value={rectFogMode.mode}
                onChange={(mode) => applyFogMode(mode)}
                options={fogModeOptions}
                testId="fog-mode-select"
              />
            </div>
          )}
          {rectFogMode && (
            <span className="shrink-0 text-[11px] text-amber-400">
              {t('dm.hintFogRect', 'Arrastrá para dibujar rect de niebla')} · {t('dm.escCancel', 'ESC cancela')}
            </span>
          )}
          {zoneFogActive && (
            <span className="shrink-0 text-[11px] text-amber-400">
              {t('dm.hintZoneFog', 'Clic dentro de una zona para alternar niebla')} · {t('dm.escCancel', 'ESC cancela')}
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
              {t('dm.hintPlaceLight', '💡 Clic para colocar luz')} · {t('dm.escCancel', 'ESC cancela')}
            </span>
          )}
          {lightPlaceMode && (
            <div className="pointer-events-auto flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-1.5 py-0.5 shrink-0">
              <button
                onClick={() => setLightPlaceMode({ ...lightPlaceMode, fx: undefined, fxRadius: undefined })}
                title={t('dm.fxNone', 'Sin fuego: solo la luz')}
                data-testid="light-fx-none"
                className={`w-6 h-5 rounded text-[10px] transition-colors ${!lightPlaceMode.fx ? 'bg-amber-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                —
              </button>
              <button
                onClick={() => setLightPlaceMode({ ...lightPlaceMode, fx: 'flame' })}
                title={t('dm.fxFlame', 'Llama (la misma del status Ardiendo)')}
                data-testid="light-fx-flame"
                className={`w-6 h-5 rounded text-[10px] transition-colors ${lightPlaceMode.fx === 'flame' ? 'bg-orange-600 text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                🔥
              </button>
              <button
                onClick={() => setLightPlaceMode({ ...lightPlaceMode, fx: 'embers' })}
                title={t('dm.fxEmbers', 'Solo brasas ascendentes')}
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
                    title={t('dm.fireRadius', 'Radio del fuego')}
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
                ? t('dm.hintAttachPick', '🔗 Ahora hacé clic en un token para adjuntar esta luz')
                : t('dm.hintAttachStart', '🔗 Hacé clic en una fuente de luz y luego en un token')} · {t('dm.escCancel', 'ESC cancela')}
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
                  {t('dm.unlink', 'Desvincular')}
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
                title={t('dm.deleteLightTitle', 'Eliminar luz')}
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
                    {m === 'directional' ? t('dm.modeCone', 'cone') : m}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                {t('dm.lightColor', 'color')}
                <input
                  type="color"
                  value={selectedLight.source.color}
                  onChange={(e) => handleLightSourceChange({ color: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border border-[var(--bg-tertiary)]"
                  title={t('dm.lightColorTitle', 'Color de luz')}
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                {t('dm.lightInt', 'int')}
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={selectedLight.source.intensity}
                  onChange={(e) => handleLightSourceChange({ intensity: parseFloat(e.target.value) })}
                  className="w-16 h-1"
                  title={t('dm.lightIntensityTitle', 'Intensidad')}
                />
                <span className="w-7">{selectedLight.source.intensity.toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                {t('dm.lightRange', 'range')}
                <input
                  type="range"
                  min={0.0001}
                  max={0.5}
                  step={0.00001}
                  value={selectedLight.source.radius}
                  onChange={(e) => handleLightSourceChange({ radius: parseFloat(e.target.value) })}
                  className="w-16 h-1"
                  title={t('dm.lightRangeTitle', 'Alcance')}
                />
                <input
                  type="number"
                  min={0.0001}
                  max={0.5}
                  step={0.00001}
                  value={selectedLight.source.radius}
                  onChange={(e) => handleLightSourceChange({ radius: parseFloat(e.target.value) || 0.0001 })}
                  className="w-14 h-4 text-[9px] bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-1 text-[var(--text-primary)] font-mono"
                  title={t('dm.lightRangeExactTitle', 'Alcance (escribí el valor exacto)')}
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                {selectedLight.source.mode === 'hard' ? t('dm.lightEdge', 'edge') : t('dm.lightFalloff', 'falloff')}
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={selectedLight.source.falloff ?? (selectedLight.source.mode === 'hard' ? 1 : 0.6)}
                  onChange={(e) => handleLightSourceChange({ falloff: parseFloat(e.target.value) })}
                  className="w-14 h-1"
                  title={selectedLight.source.mode === 'hard' ? t('dm.lightEdgeTitle', 'Posición del borde brillante') : t('dm.lightFalloffTitle', 'Caída brillante→tenue')}
                />
                <span className="w-8">{(selectedLight.source.falloff ?? (selectedLight.source.mode === 'hard' ? 1 : 0.6)).toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                <span
                  onClick={() => handleLightSourceChange(selectedLight.source.flicker?.enabled
                    ? { flicker: undefined }
                    : { flicker: { speed: selectedLight.source.flicker?.speed ?? 0.3, variance: selectedLight.source.flicker?.variance ?? 0.1, enabled: true } })}
                  className={`cursor-pointer px-1.5 py-0.5 rounded transition-colors ${selectedLight.source.flicker?.enabled ? 'bg-amber-600 text-white' : 'hover:bg-[var(--bg-tertiary)]'}`}
                  title={t('dm.flickerTitle', 'Parpadeo')}
                >
                  {t('dm.flicker', '✨ flick')}
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
                      title={t('dm.flickerSpeedTitle', 'Velocidad de parpadeo (ciclos/seg)')}
                    />
                    <input
                      type="range"
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={selectedLight.source.flicker.variance}
                      onChange={(e) => handleLightSourceChange({ flicker: { speed: selectedLight.source.flicker!.speed, variance: parseFloat(e.target.value), enabled: true } })}
                      className="w-12 h-1"
                      title={t('dm.flickerVarTitle', 'Variación de parpadeo (oscilación de intensidad)')}
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
                  title={t('dm.pulseTitle', 'Pulso')}
                >
                  {t('dm.pulse', '🔶 pulse')}
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
                      title={t('dm.pulseSpeedTitle', 'Velocidad del pulso (ciclos/seg)')}
                    />
                    <input
                      type="range"
                      min={0}
                      max={0.5}
                      step={0.01}
                      value={selectedLight.source.pulse.variance}
                      onChange={(e) => handleLightSourceChange({ pulse: { speed: selectedLight.source.pulse!.speed, variance: parseFloat(e.target.value), enabled: true } })}
                      className="w-12 h-1"
                      title={t('dm.pulseVarTitle', 'Variación del pulso (oscilación de intensidad)')}
                    />
                  </>
                )}
              </label>
              {selectedLight.source.mode === 'directional' && (
                <>
                  <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                    {t('dm.lightAngle', 'angle')}
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={1}
                      value={selectedLight.source.angle ?? 90}
                      onChange={(e) => handleLightSourceChange({ angle: parseFloat(e.target.value) })}
                      className="w-14 h-1"
                      title={t('dm.lightAngleTitle', 'Ángulo del cono')}
                    />
                    <span className="w-8">{selectedLight.source.angle ?? 90}°</span>
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                    {t('dm.lightDir', 'dir')}
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={selectedLight.source.direction ?? 0}
                      onChange={(e) => handleLightSourceChange({ direction: parseFloat(e.target.value) })}
                      className="w-14 h-1"
                      title={t('dm.lightDirTitle', 'Dirección del cono')}
                    />
                    <span className="w-8">{selectedLight.source.direction ?? 0}°</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        {/* Rail capas/niebla — HudPanel arrastrable/minimizable */}
        <HudPanel
          title={t('dm.layersFogTitle', 'Capas y niebla')}
          panelId="dm-layers"
          onClose={() => {}}
          hideClose
          defaultX={typeof window !== 'undefined' ? window.innerWidth - 226 : 1000}
          defaultY={200}
          defaultWidth={210}
          defaultHeight={380}
        >
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {t('dm.layers', 'Capas')}
          </div>
          <ToolButton
            icon={<LayoutGrid className="h-4 w-4" />}
            label={t('dm.zonesBtn', 'Zonas')}
            title={t('dm.showZones', 'Mostrar zonas')}
            active={showZones}
            testId="zones-toggle"
            onClick={() => setShowZones((v) => !v)}
          />
          <div className="my-2 border-t border-[var(--bg-tertiary)]" />
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {t('dm.fog', 'Niebla')}
          </div>
          <ToolButton
            icon={<Brush className="h-4 w-4" />}
            label={t('dm.fogBrush', 'Niebla (pincel)')}
            title={t('dm.fogBrushTitle', 'Niebla (pincel)')}
            active={Boolean(fogMode)}
            onClick={startFogMode}
          />
          <ToolButton
            icon={<SquareDashed className="h-4 w-4" />}
            label={t('dm.fogRect', 'Niebla (rect)')}
            title={t('dm.fogRectTitle', 'Niebla (rect)')}
            active={Boolean(rectFogMode)}
            onClick={startRectFogMode}
          />
          <ToolButton
            icon={<PaintBucket className="h-4 w-4" />}
            label={t('dm.fogZone', 'Niebla de zona')}
            title={t('dm.fogZoneTitle', 'Niebla de zona (alternar)')}
            active={zoneFogActive}
            onClick={startZoneFogMode}
          />
        </HudPanel>
        {/* Dock inferior — acciones de sesión, siempre abierto en desktop */}
        <DmDock
          expanded={dockExpanded}
          onExpand={() => setDockExpanded(true)}
          groups={[
            [
              { key: 'dice', label: t('dm.diceTitle', 'Tirar dados (D)'), icon: Dices, onClick: () => setShowDiceRoller(!showDiceRoller), active: showDiceRoller },
              { key: 'initiative', label: t('dm.initiativeTitle', 'Iniciativa'), icon: Swords, onClick: () => setShowInitiative(!showInitiative), active: showInitiative },
              { key: 'notebook', label: t('dm.notebookTitle', 'Cuaderno del DM (N)'), icon: NotebookPen, onClick: () => setShowNotebook(!showNotebook), active: showNotebook },
              { key: 'recap', label: t('dm.recapTitle', 'Resumen de sesión (R)'), icon: ClipboardList, onClick: () => setShowRecap(!showRecap), active: showRecap },
              { key: 'calendar', label: t('dm.calendarTitle', 'Calendario y relojes'), icon: CalendarDays, onClick: () => setShowCalendar(!showCalendar), active: showCalendar },
              { key: 'quests', label: t('dm.questsTitle', 'Tablón de misiones'), icon: ScrollText, onClick: () => setShowQuests(!showQuests), active: showQuests },
              { key: 'handouts', label: t('dm.handoutsTitle', 'Documentos para jugadores'), icon: FolderOpen, onClick: () => setShowHandouts(!showHandouts), active: showHandouts, testId: 'handouts-toggle' },
              ...(activeScene?.map_id
                ? [{ key: 'map', label: t('dm.openMapTitle', 'Abrir mapa'), icon: MapIcon, onClick: openActiveSceneMap }]
                : []),
            ],
            [
              { key: 'ai', label: t('dm.aiPanelTitle', 'Configuración de IA'), icon: Bot, onClick: () => setShowAIPanel(!showAIPanel), active: showAIPanel, testId: 'ai-panel-button' },
              { key: 'assistant', label: t('dm.assistantTitle', 'Asistente del DM'), icon: MessageCircle, onClick: () => setShowAssistant(!showAssistant), active: showAssistant, activeClassName: 'bg-violet-700 text-white', testId: 'dm-assistant-button' },
              { key: 'quick-actions', label: t('dm.quickActionsTitle', 'Acciones rápidas'), icon: Zap, onClick: () => setShowQuickActions(!showQuickActions), active: showQuickActions },
              { key: 'session-log', label: t('dm.sessionLogTitle', 'Bitácora de sesión'), icon: BookOpen, onClick: () => setShowSessionLog(!showSessionLog), active: showSessionLog },
              { key: 'scene-notes', label: t('dm.sceneNotesTitle', 'Notas de la escena'), icon: StickyNote, onClick: () => setShowSceneNotes(!showSceneNotes), active: showSceneNotes },
              { key: 'scene-settings', label: t('dm.sceneSettingsTitle', 'Ajustes de escena'), icon: Settings, onClick: () => setShowSceneSettings(!showSceneSettings), active: showSceneSettings },
            ],
          ]}
        />
        {detectProposal && (
          <div
            data-testid="detect-review"
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] shadow-xl text-xs whitespace-nowrap"
          >
            <span className="text-[var(--text-secondary)]">
              {t('dm.detectReviewTitle', 'Revisar detección')}: {detectProposal.walls}+{detectProposal.doors}
            </span>
            <button
              type="button"
              data-testid="detect-approve"
              onClick={handleDetectApprove}
              className="px-2 py-1 rounded bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              {t('dm.detectApprove', 'Aprobar ({{n}})', { n: detectProposal.ids.length })}
            </button>
            <button
              type="button"
              data-testid="detect-discard"
              onClick={handleDetectDiscard}
              className="px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {t('dm.detectDiscard', 'Descartar')}
            </button>
          </div>
        )}
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
                  {t('dm.sideSummary', 'Resumen')}
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/characters`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">♦</span>
                  {t('dm.sideCharacters', 'Personajes')}
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/sessions`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">♠</span>
                  {t('dm.sideSessions', 'Sesiones')}
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/scenes`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">▣</span>
                  {t('dm.sideScenes', 'Escenas')}
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/events`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">•</span>
                  {t('dm.sideEvents', 'Eventos')}
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/players`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">○</span>
                  {t('dm.sidePlayers', 'Jugadores')}
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/maps`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">◇</span>
                  {t('dm.sideMaps', 'Imágenes')}
                </Link>
                <Link
                  to={`/campaigns/${campaignId}/assets`}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <span className="text-xs opacity-60">□</span>
                  {t('dm.sideAssets', 'Recursos')}
                </Link>
              </nav>
              <div className="px-4 py-3 border-t border-[var(--bg-tertiary)]">
                <p className="text-[10px] text-[var(--text-secondary)] opacity-60">{t('dm.dmPanel', 'Panel del DM')}</p>
              </div>
            </aside>
          </>
        )}

        {/* 3D Scene Canvas */}
        <div
          className="flex-1 relative min-h-0 min-w-0"
          data-hud-stage
          style={bgCSS ? { background: bgCSS } : undefined}
        >
          {activeScene?.background_path ? (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
                {t('dm.loadingScene3d', 'Cargando escena 3D...')}
              </div>
            }>
              <SceneRenderer
                backgroundUrl={staticUrl(activeScene.background_path)!}
                characters={sceneChars.map((sc) => {
                  const ent = allEntities.find((e) => e.id === sc.entity_id);
                  // Posiciones autoritativas (sin interpolar): la interpolación visual
                  // 60fps ahora vive en SceneRenderer via useFrame.
                  return {
                    id: sc.id,
                    sceneCharId: sc.id,
                    name: ent?.name || t('dm.unknown', 'Desconocido'),
                    type: sc.entity_type,
                    x: sc.x,
                    y: sc.y,
                    z: sc.z,
                    visible: !!sc.visible,
                    portraitUrl: staticUrl(ent?.portrait_path ?? null),
                    modelUrl: staticUrl(ent?.model_path ?? null),
                    rotation: sc.rotation ?? 0,
                    tokenScale: sc.token_scale ?? 1,
                    brightness: sc.brightness ?? 0,
                    facingOffset: sc.facing_offset ?? 0,
                    statuses: sc.statuses ?? [],
                  };
                })}
                draggingId={draggingTokenIdRef.current}
                items={sceneItems}
                occluders={sceneOccluders}
                fogRegions={sceneFogRegions}
                lighting={activeScene.lighting}
                weather={activeScene.weather ?? null}
                weatherIntensity={activeScene.weather_intensity ?? 1}
                selectedTokenId={selectedTokenId}
                selectedItemIds={selectedItemId ? [selectedItemId] : []}
                mapScale={activeScene.map_scale ?? 1}
                onAspectChange={handleAspectChange}
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
                onFogStroke={handleFogStroke}
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
                onTokenDoubleClick={handleTokenDoubleClick}
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
                <p className="text-lg mb-2">{t('dm.noSceneSelected', 'Sin escena seleccionada')}</p>
                <p className="text-sm">
                  {scenes.length === 0
                    ? t('dm.noSceneCreate', 'Creá una escena para empezar.')
                    : t('dm.noSceneSelect', 'Seleccioná una escena o subí un fondo de mapa.')}
                </p>
              </div>
            </div>
          )}
          {lightRequests.length > 0 && (
            <div onPointerDown={(e) => e.stopPropagation()} className="absolute top-3 right-3 z-10 bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--bg-tertiary)] rounded-lg p-2 w-60 max-h-48 overflow-y-auto shadow-lg">
              <p className="text-xs font-medium text-[var(--text-primary)] mb-1.5 px-1">{t('dm.lightRequests', '🕯️ Peticiones de luz')}</p>
              <ul className="space-y-1.5">
                {lightRequests.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="truncate flex-1" title={t('dm.lightRequestTitle', '{{name}} pide luz', { name: r.character_name })}>{r.character_name}</span>
                    <button onClick={() => handleGrantLight(r)} className="px-1.5 py-0.5 rounded bg-emerald-600/80 text-white hover:bg-emerald-500 transition-colors" title={t('dm.grantTorch', 'Entregar antorcha')}>🔦</button>
                    <button onClick={() => handleDenyLight(r)} className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 hover:text-white transition-colors" title={t('dm.deny', 'Denegar')}>✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Token Tray — HudPanel arrastrable/minimizable */}
          <HudPanel
            title={t('dm.tokenTrayTitle', 'Fichas')}
            panelId="dm-token-tray"
            onClose={() => {}}
            hideClose
            defaultX={16}
            defaultY={typeof window !== 'undefined' ? window.innerHeight - 340 : 400}
            defaultWidth={208}
          >
            {/* Distance measurement overlay */}
            {distanceFrom && distanceTo && (() => {
              const from = sceneChars.find((s) => s.id === distanceFrom);
              const to = sceneChars.find((s) => s.id === distanceTo);
              if (!from || !to) return null;
              const dx = to.x - from.x;
              const dz = to.z - from.z;
              const dist = Math.sqrt(dx * dx + dz * dz);
              const gridSize = activeScene?.grid_size ?? 0;
              const squares = gridSize > 0 ? t('dm.squares', ' ({{n}} casillas)', { n: (dist / gridSize).toFixed(1) }) : '';
              return (
                <div className="mb-2 px-2 py-1 bg-[var(--accent)]/20 rounded text-[10px] text-[var(--accent)] text-center">
                  {t('dm.distance', 'Distancia: {{v}} unidades{{sq}}', { v: dist.toFixed(2), sq: squares })}
                </div>
              );
            })()}
            {distanceFrom && !distanceTo && (
              <div className="mb-2 px-2 py-1 bg-[var(--bg-tertiary)] rounded text-[10px] text-[var(--text-secondary)] text-center">
                {t('dm.measureHint', 'Shift+clic en otro token para medir')}
              </div>
            )}
            <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">{t('dm.onScene', 'En escena ({{n}})', { n: sceneChars.length })}</p>
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
                        <span className="truncate">{ent?.name || t('dm.unknown', 'Desconocido')}</span>
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(sc.id)}
                        className="text-[10px] opacity-50 hover:opacity-100 shrink-0"
                        title={sc.visible ? t('dm.hideShort', 'Ocultar') : t('dm.showShort', 'Mostrar')}
                      >
                        {sc.visible ? '👁' : '🚫'}
                      </button>
                      <button
                        onClick={() => handleRemoveFromScene(sc.id)}
                        className="text-red-400 hover:text-red-300 text-[10px] shrink-0"
                        title={t('dm.removeShort', 'Quitar')}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-[var(--text-secondary)] px-1 mb-2">{t('dm.noTokens', 'Sin tokens colocados')}</p>
            )}

            {/* Disponibles entities to add */}
            {allEntities.filter((e) => !new Set(sceneChars.map((sc) => sc.entity_id)).has(e.id)).length > 0 && (
              <>
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">{t('dm.available', 'Disponibles')}</p>
                {placingToken && (
                  <p className="text-[9px] text-amber-400 mb-1 px-1">{t('dm.placeHint', 'Hacé clic en el mapa para colocar (Esc cancela)')}</p>
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
                        <span className="ml-auto text-[9px] opacity-40" title={t('dm.dragPlace', 'Arrastrá al mapa o hacé clic para colocar')}>↗</span>
                      </button>
                    ))}
                </div>
              </>
            )}

            {/* Recursos del DM — arrastrá al mapa para colocar */}
            {assets.length > 0 && (
              <>
                <p className="text-[10px] text-[var(--text-secondary)] mb-1 px-1 mt-2">{t('dm.assets', 'Recursos ({{n}})', { n: assets.length })}</p>
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
                      title={t('dm.assetDrag', '{{name}} (arrastrá al mapa)', { name: a.name })}
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

          </HudPanel>

          {/* Character Sheet HUD — bottom right on desktop, bottom sheet on mobile */}
          {selectedChar && selectedEntity && campaignId && (
            <div onPointerDown={(e) => e.stopPropagation()} className="absolute bottom-4 right-4 z-50 max-sm:left-4 max-sm:right-4 max-sm:bottom-0 max-sm:rounded-b-none">
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
      <DmContextMenus
        contextMenu={contextMenu}
        onCloseContextMenu={() => setContextMenu(null)}
        doorMenu={doorContextMenu}
        onCloseDoorMenu={() => setDoorContextMenu(null)}
        wallMenu={wallContextMenu}
        onCloseWallMenu={() => setWallContextMenu(null)}
        zoneMenu={zoneContextMenu}
        onCloseZoneMenu={() => setZoneContextMenu(null)}
        lightMenu={lightContextMenu}
        onCloseLightMenu={() => setLightContextMenu(null)}
        fogMenu={fogContextMenu}
        onCloseFogMenu={() => setFogContextMenu(null)}
        getZonePortals={getZonePortals}
        onDeleteItem={handleDeleteItem}
        onToggleDoor={toggleDoor}
        onLockDoor={lockDoor}
        onUnlockDoor={unlockDoor}
        onTogglePortal={handlePortalToggle}
        onDeletePortal={handlePortalDelete}
      />

      {tokenQuickEdit && quickEditChar && (
        <div
          ref={quickEditRef}
          data-testid="token-quick-edit"
          className="fixed z-50 w-56 rounded-lg border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] px-3 py-2 shadow-xl animate-in fade-in"
          style={{
            left: Math.min(tokenQuickEdit.x, window.innerWidth - 240),
            top: Math.max(8, Math.min(tokenQuickEdit.y, window.innerHeight - 320)),
          }}
        >
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-2 truncate">
            {quickEditEntity?.name || t('dm.unknown', 'Desconocido')}
          </p>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text-secondary)]">{t('dm.tokenSize', 'Tamaño')}</span>
            <span className="text-[10px] text-[var(--accent)] font-mono">{(quickEditChar.token_scale ?? 1).toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={quickEditChar.token_scale ?? 1}
            onChange={(e) => handleTokenPatch(tokenQuickEdit.sceneCharId, { token_scale: parseFloat(e.target.value) })}
            className="w-full h-1 accent-[var(--accent)]"
          />
          <div className="flex items-center justify-between mb-1 mt-2">
            <span className="text-[10px] text-[var(--text-secondary)]">{t('dm.tokenFacing', 'Orientación')}</span>
            <span className="text-[10px] text-[var(--accent)] font-mono">{Math.round(((quickEditChar.facing_offset ?? 0) * 180) / Math.PI)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={6.28318}
            step={0.017453}
            value={quickEditChar.facing_offset ?? 0}
            onChange={(e) => handleTokenPatch(tokenQuickEdit.sceneCharId, { facing_offset: parseFloat(e.target.value) })}
            className="w-full h-1 accent-[var(--accent)]"
          />
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-secondary)]">{t('dm.visionType', 'Tipo de visión')}</span>
              <span className="text-[10px] text-[var(--accent)] font-mono">{quickEditChar.vision_type ?? 'normal'}</span>
            </div>
            <select
              value={quickEditChar.vision_type ?? 'normal'}
              onChange={(e) => handleTokenPatch(tokenQuickEdit.sceneCharId, { vision_type: e.target.value })}
              className="w-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-[10px] rounded px-1 py-0.5 border border-[var(--border)]"
            >
              <option value="normal">{t('dm.visionNormal', 'Normal')}</option>
              <option value="darkvision">{t('dm.visionDarkvision', 'Visión en la oscuridad')}</option>
            </select>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-secondary)]">{t('dm.visionRange', 'Alcance de visión')}</span>
              <span className="text-[10px] text-[var(--accent)] font-mono">{(quickEditChar.vision_range ?? 6.0).toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={0.5}
              value={quickEditChar.vision_range ?? 6.0}
              onChange={(e) => handleTokenPatch(tokenQuickEdit.sceneCharId, { vision_range: parseFloat(e.target.value) })}
              className="w-full h-1 accent-[var(--accent)]"
            />
          </div>
        </div>
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

      {cmdOpen && (
        <DmCommandPalette
          query={cmdQuery}
          onQueryChange={setCmdQuery}
          onClose={() => setCmdOpen(false)}
          campaignId={campaignId}
          onToggleDice={() => setShowDiceRoller((v) => !v)}
          onToggleInitiative={() => setShowInitiative((v) => !v)}
          onToggleNotebook={() => setShowNotebook((v) => !v)}
          onToggleRecap={() => setShowRecap((v) => !v)}
          onToggleCalendar={() => setShowCalendar((v) => !v)}
          onToggleQuests={() => setShowQuests((v) => !v)}
          onToggleHandouts={() => setShowHandouts((v) => !v)}
          onOpenActiveSceneMap={openActiveSceneMap}
          onToggleAiPanel={() => setShowAIPanel((v) => !v)}
          onToggleAssistant={() => setShowAssistant((v) => !v)}
          onToggleQuickActions={() => setShowQuickActions((v) => !v)}
          onToggleSessionLog={() => setShowSessionLog((v) => !v)}
          onToggleSceneNotes={() => setShowSceneNotes((v) => !v)}
          onToggleSceneSettings={() => setShowSceneSettings((v) => !v)}
          onOpenBuildMenu={() => setBuildMenuOpen(true)}
        />
      )}

      <MinimizedBar />

      <ToastContainer
        toasts={toastQueue}
        onDismiss={dismiss}
      />
    </div>
  );
}
