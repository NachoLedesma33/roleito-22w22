import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Campaign, Scene, SceneCharacter, Character, NPC } from '@/lib/api';
import SceneRenderer from '@/components/SceneRenderer';
import SessionLogHud from '@/components/SessionLogHud';
import SceneNotesHud from '@/components/SceneNotesHud';
import QuickActionsHud from '@/components/QuickActionsHud';
import DiceRoller from '@/components/DiceRoller';
import ContextMenu, { ContextMenuItem } from '@/components/ContextMenu';

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const charPortraitInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!campaignId) return;
    Promise.all([
      api.campaigns.get(campaignId),
      api.scenes.list(campaignId).catch(() => []),
      api.characters.list(campaignId).catch(() => []),
      api.npcs.list(campaignId).catch(() => []),
    ])
      .then(([c, sc, chars, npcList]) => {
        setCampaign(c);
        setScenes(sc);
        setCharacters(chars);
        setNpcs(npcList);
        const active = sc.find((s) => s.status === 'active') || sc[0] || null;
        setActiveScene(active);
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId || !activeScene) {
      setSceneChars([]);
      return;
    }
    api.scenes.getCharacters(campaignId, activeScene.id)
      .then(setSceneChars)
      .catch(() => setSceneChars([]));
  }, [campaignId, activeScene]);

  const handleSceneSwitch = useCallback(async (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) setActiveScene(scene);
  }, [scenes]);

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !activeScene) return;
    const updated = await api.scenes.uploadBackground(campaignId, activeScene.id, file);
    setActiveScene(updated);
    setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    e.target.value = '';
  };

  const handlePortraitUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId || !selectedEntity) return;
    try {
      if (selectedEntity.entity_type === 'character') {
        const updated = await api.characters.uploadPortrait(campaignId, selectedEntity.entity_id, file);
        setCharacters((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      } else {
        const updated = await api.npcs.uploadPortrait(campaignId, selectedEntity.entity_id, file);
        setNpcs((prev) => prev.map((n) => n.id === updated.id ? updated : n));
      }
    } catch {
    }
    e.target.value = '';
  };

  const handleToggleLighting = async (mode: string) => {
    if (!campaignId || !activeScene) return;
    const updated = await api.scenes.update(campaignId, activeScene.id, { lighting: mode });
    setActiveScene(updated);
    setScenes((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  };

  const handleTokenClick = useCallback((tokenId: string) => {
    setSelectedTokenId((prev) => prev === tokenId ? null : tokenId);
  }, []);

  const handleTokenDrop = useCallback(async (sceneCharId: string, x: number, z: number) => {
    if (!campaignId || !activeScene) return;
    // Update local state immediately
    setSceneChars((prev) =>
      prev.map((sc) => sc.id === sceneCharId ? { ...sc, x, z } : sc)
    );
    // Persist to backend
    const updated = sceneChars.map((sc) =>
      sc.id === sceneCharId
        ? { entity_type: sc.entity_type, entity_id: sc.entity_id, x, y: sc.y, z, visible: !!sc.visible, order: sc.order }
        : { entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order }
    );
    try {
      await api.scenes.updateCharacters(campaignId, activeScene.id, updated);
    } catch (err) {
      console.error('Failed to persist token position:', err);
    }
  }, [campaignId, activeScene, sceneChars]);

  const handleAddToScene = useCallback(async (entityType: string, entityId: string) => {
    if (!campaignId || !activeScene) return;
    const newChars = [...sceneChars, {
      entity_type: entityType,
      entity_id: entityId,
      x: Math.random() * 4 - 2,
      y: 0,
      z: Math.random() * 4 - 2,
      visible: true,
      order: sceneChars.length,
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
        ? { entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !sc.visible, order: sc.order }
        : { entity_type: sc.entity_type, entity_id: sc.entity_id, x: sc.x, y: sc.y, z: sc.z, visible: !!sc.visible, order: sc.order }
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
          if (selectedTokenId) {
            setSelectedTokenId(null);
          } else if (showDiceRoller) {
            setShowDiceRoller(false);
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
  }, [scenes, activeScene, selectedTokenId, showQuickActions, showSessionLog, showSceneNotes, showDiceRoller, handleRemoveFromScene, setContextMenu]);

  const selectedEntity = selectedTokenId
    ? sceneChars.find((sc) => sc.id === selectedTokenId)
    : null;
  const selectedChar = selectedEntity
    ? allEntities.find((e) => e.id === selectedEntity.entity_id)
    : null;

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
      {/* TopBar */}
      <header className="relative z-10 flex items-center gap-3 px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--bg-tertiary)] shrink-0">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>

        <Link to="/" className="text-sm font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] shrink-0">
          {campaign.name}
        </Link>

        <div className="w-px h-5 bg-[var(--bg-tertiary)]" />

        {/* Scene Selector */}
        <div className="flex items-center gap-2">
          <select
            value={activeScene?.id || ''}
            onChange={(e) => handleSceneSwitch(e.target.value)}
            className="text-sm bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded px-2 py-1 text-[var(--text-primary)] cursor-pointer"
          >
            {scenes.length === 0 && <option value="">No scenes</option>}
            {scenes.map((s, i) => (
              <option key={s.id} value={s.id}>
                {s.name || `Scene ${i + 1}`} {s.status === 'active' ? '(active)' : ''}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--text-secondary)]">
            {sceneIndex}/{scenes.length}
          </span>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={() => fileInput.current?.click()}
          className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Upload map background"
        >
          Upload BG
        </button>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUploadBg} />

        {/* Lighting Dropdown */}
        <div className="relative group">
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

        {/* Invite Code */}
        <button
          onClick={handleInviteCode}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            copiedInvite
              ? 'bg-emerald-600 text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          title="Copy player invite link"
        >
          {copiedInvite ? 'Copied!' : campaign?.invite_code ? '🔗 Invite' : '🔗 Get Invite'}
        </button>

        <button
          onClick={() => setShowDiceRoller(!showDiceRoller)}
          className={`text-xs px-2 py-1 rounded transition-colors ${showDiceRoller ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Roll dice (D)"
        >
          🎲
        </button>

        {/* HUD Toggle Buttons */}
        <button
          onClick={() => setShowQuickActions(!showQuickActions)}
          className={`text-xs px-2 py-1 rounded transition-colors ${showQuickActions ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Quick Actions"
        >
          ⚡
        </button>
        <button
          onClick={() => setShowSessionLog(!showSessionLog)}
          className={`text-xs px-2 py-1 rounded transition-colors ${showSessionLog ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Session Log"
        >
          📋
        </button>
        <button
          onClick={() => setShowSceneNotes(!showSceneNotes)}
          className={`text-xs px-2 py-1 rounded transition-colors ${showSceneNotes ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          title="Scene Notes"
        >
          📝
        </button>

        <Link
          to={`/campaigns/${campaignId}/scenes`}
          className="text-xs px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          title="Scene management"
        >
          ⚙
        </Link>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Sidebar */}
        {sidebarOpen && (
          <>
            <div
              className="absolute inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="relative z-30 w-56 bg-[var(--bg-primary)] border-r border-[var(--bg-tertiary)] flex flex-col shrink-0">
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
        <div className="flex-1 relative">
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
                  return {
                    id: sc.id,
                    sceneCharId: sc.id,
                    name: ent?.name || 'Unknown',
                    type: sc.entity_type,
                    x: sc.x,
                    y: sc.y,
                    z: sc.z,
                    visible: !!sc.visible,
                    portraitUrl: staticUrl(ent?.portrait_path ?? null),
                  };
                })}
                lighting={activeScene.lighting}
                selectedTokenId={selectedTokenId}
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

          {/* Token Tray — bottom left */}
          <div className="absolute bottom-4 left-4 z-10 bg-[var(--bg-primary)]/90 backdrop-blur border border-[var(--bg-tertiary)] rounded-lg p-2 max-h-64 overflow-y-auto w-52">
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
          </div>

          {/* Character Sheet HUD — bottom right, on token click */}
          {selectedChar && selectedEntity && (
            <div className="absolute bottom-4 right-4 z-10 bg-[var(--bg-primary)]/95 backdrop-blur border border-[var(--bg-tertiary)] rounded-lg p-4 w-72">
              <div className="flex items-start gap-3 mb-3">
                <button
                  onClick={() => charPortraitInput.current?.click()}
                  className="w-12 h-12 rounded overflow-hidden shrink-0 border border-dashed border-[var(--bg-tertiary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                  title="Click to upload portrait"
                >
                  {selectedChar.portrait_path ? (
                    <img
                      src={staticUrl(selectedChar.portrait_path)!}
                      alt={selectedChar.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg font-bold text-[var(--accent)]">
                      {selectedChar.name.charAt(0)}
                    </div>
                  )}
                </button>
                <input ref={charPortraitInput} type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{selectedChar.name}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {selectedChar.type === 'character'
                      ? `${selectedChar.race} ${selectedChar.class_}`
                      : `NPC · ${selectedChar.status}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTokenId(null)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs"
                >
                  ×
                </button>
              </div>

              {/* VIDA Stats */}
              <div className="grid grid-cols-4 gap-1 mb-3">
                {[
                  { label: 'V', value: selectedChar.vigor },
                  { label: 'I', value: selectedChar.intelligence },
                  { label: 'D', value: selectedChar.dexterity },
                  { label: 'A', value: selectedChar.cunning },
                ].map((stat) => (
                  <div key={stat.label} className="text-center bg-[var(--bg-tertiary)] rounded py-1">
                    <p className="text-[9px] text-[var(--text-secondary)]">{stat.label}</p>
                    <p className="text-xs font-bold">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* PV/PM Bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-red-400">PV</span>
                    <span className="text-[var(--text-secondary)]">
                      {selectedChar.current_pv ?? selectedChar.max_pv}/{selectedChar.max_pv}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all"
                      style={{ width: `${((selectedChar.current_pv ?? selectedChar.max_pv) / selectedChar.max_pv) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="text-blue-400">PM</span>
                    <span className="text-[var(--text-secondary)]">
                      {selectedChar.current_pm ?? selectedChar.max_pm}/{selectedChar.max_pm}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${((selectedChar.current_pm ?? selectedChar.max_pm) / selectedChar.max_pm) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <Link
                  to={`/campaigns/${campaignId}/characters/${selectedChar.id}`}
                  className="flex-1 text-center text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  View Sheet
                </Link>
                <button
                  onClick={() => setSelectedTokenId(null)}
                  className="text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Remove
                </button>
              </div>
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
    </div>
  );
}
