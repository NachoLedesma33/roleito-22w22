import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Campaign, Scene, SceneCharacter, Character, NPC, Map as GameMap } from '@/lib/api';
import SceneRenderer from '@/components/SceneRenderer';
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

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  return `http://localhost:8000/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
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
  const [toastQueue, setToastQueue] = useState<ToastRoll[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const lastRollTsRef = useRef<number>(0);
  const serverPosRef = useRef<Map<string, { x: number; z: number; rotation: number }>>(new Map());
  const renderedPosRef = useRef<Map<string, { x: number; z: number; rotation: number }>>(new Map());
  const rafRef = useRef<number>(0);

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
        if (!cancelled) setSceneChars(sc);
      } catch {}
      if (!cancelled) timer = window.setTimeout(poll, 100);
    };
    timer = window.setTimeout(poll, 100);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [campaignId, activeScene]);

  useEffect(() => {
    for (const sc of sceneChars) {
      serverPosRef.current.set(sc.id, { x: sc.x, z: sc.z, rotation: sc.rotation ?? 0 });
    }
    for (const id of serverPosRef.current.keys()) {
      if (!sceneChars.find((sc) => sc.id === id)) {
        serverPosRef.current.delete(id);
        renderedPosRef.current.delete(id);
      }
    }
  }, [sceneChars]);

  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      for (const [id, target] of serverPosRef.current.entries()) {
        const prev = renderedPosRef.current.get(id);
        if (!prev) {
          renderedPosRef.current.set(id, { ...target });
        } else {
          const lerpFactor = 1 - Math.pow(0.00001, 1 / 16);
          prev.x += (target.x - prev.x) * lerpFactor;
          prev.z += (target.z - prev.z) * lerpFactor;
          prev.rotation += (target.rotation - prev.rotation) * lerpFactor;
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

  const handleToggleLighting = async (mode: string) => {
    if (!campaignId || !activeScene) return;
    const updated = await api.scenes.update(campaignId, activeScene.id, { lighting: mode });
    setActiveScene(updated);
    setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  };

  const handleTokenClick = useCallback((tokenId: string) => {
    if (!tokenId) {
      setSelectedTokenId(null);
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
  }, [distanceFrom]);

  const handleTokenDrop = useCallback(async (sceneCharId: string, x: number, z: number) => {
    if (!campaignId || !activeScene) return;
    // Update local state immediately
    setSceneChars((prev) =>
      prev.map((sc) => sc.id === sceneCharId ? { ...sc, x, z } : sc)
    );
    // Persist to backend
    const updated = sceneChars.map((sc) =>
      sc.id === sceneCharId
        ? { entity_type: sc.entity_type, entity_id: sc.entity_id, x, y: sc.y, z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1 }
        : { entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1 }
    );
    try {
      await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
    } catch (err) {
      console.error('Failed to persist token position:', err);
    }
  }, [campaignId, activeScene, sceneChars]);

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
        ? { entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1 }
        : { entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order, token_scale: sc.token_scale ?? 1, move_speed: sc.move_speed ?? 1 }
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

    setContextMenu({
      x: clientX,
      y: clientY,
      items: [
        {
          label: `Select ${name}`,
          icon: '◉',
          onClick: () => setSelectedTokenId(sceneCharId),
        },
        {
          label: sc?.visible ? 'Hide from players' : 'Show to players',
          icon: sc?.visible ? '👁' : '🚫',
          onClick: () => handleToggleVisibility(sceneCharId),
        },
        { label: '', separator: true, onClick: () => {} },
        {
          label: 'View character sheet',
          icon: '📄',
          onClick: () => {
            setSelectedTokenId(sceneCharId);
          },
          disabled: !ent,
        },
        { label: '', separator: true, onClick: () => {} },
        {
          label: 'Remove from scene',
          icon: '🗑',
          onClick: () => handleRemoveFromScene(sceneCharId),
          danger: true,
        },
      ],
    });
  }, [sceneChars, allEntities, handleToggleVisibility, handleRemoveFromScene]);

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
          </>
        }
      >
        <button
          onClick={() => fileInput.current?.click()}
          className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          title="Upload map background"
        >
          Upload BG
        </button>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />

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
        <div className="flex-1 relative min-h-0 min-w-0">
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
                  };
                })}
                lighting={activeScene.lighting}
                selectedTokenId={selectedTokenId}
                mapScale={activeScene.map_scale ?? 1}
                gridSize={activeScene.grid_size ?? 0}
                gridSnap={activeScene.grid_snap ?? false}
                onTokenClick={handleTokenClick}
                onTokenDrop={handleTokenDrop}
                onTokenContextMenu={handleTokenContextMenu}
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

          {/* Token Tray — bottom left, responsive */}
          <div className="absolute bottom-4 left-4 z-10 bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--bg-tertiary)] rounded-lg p-2 max-h-64 overflow-y-auto w-44 md:w-52">
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
                      setSceneChars((prev) => prev.map((s) => s.id === selectedTokenId ? { ...s, token_scale: v } : s));
                    }}
                    onMouseUp={async () => {
                      if (!campaignId || !activeScene) return;
                      const updated = sceneChars.map((s) =>
                        s.id === selectedTokenId
                          ? { entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1 }
                          : { entity_type: s.entity_type, entity_id: s.entity_id, x: s.x, y: s.y, z: s.z, visible: !!s.visible, order: s.order, token_scale: s.token_scale ?? 1, move_speed: s.move_speed ?? 1 }
                      );
                      try {
                        await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
                      } catch (err) {
                        console.error('Failed to persist token scale:', err);
                      }
                    }}
                    className="w-full h-1 accent-[var(--accent)]"
                  />
                  <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 truncate">{ent?.name || 'Unknown'}</p>
                </div>
              );
            })()}
          </div>

          {/* Character Sheet HUD — bottom right on desktop, bottom sheet on mobile */}
          {selectedChar && selectedEntity && campaignId && (
            <div className="absolute bottom-4 right-4 z-10 max-sm:left-4 max-sm:right-4 max-sm:bottom-0 max-sm:rounded-b-none">
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
              onUpdate={async (updates: Partial<Pick<Scene, 'map_scale' | 'grid_size' | 'grid_snap'>>) => {
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

      <MinimizedBar />

      <ToastContainer
        toasts={toastQueue}
        onDismiss={(id) => setToastQueue((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
