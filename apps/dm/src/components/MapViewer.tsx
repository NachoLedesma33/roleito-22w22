import { useState, useEffect, useCallback, useRef } from 'react';
import { api, Map, MapMarker, Scene } from '@/lib/api';

function staticUrl(path: string | null): string | null {
  if (!path) return null;
  return `http://localhost:8000/api/static/${path.replace(/\\/g, '/').split('/assets/')[1]}`;
}

const MARKER_COLORS = [
  '#60a5fa', '#4ade80', '#facc15', '#ef4444', '#a78bfa',
  '#f472b6', '#fb923c', '#34d399', '#818cf8', '#f87171',
];

const MARKER_TYPES = [
  { value: 'poi', label: 'POI' },
  { value: 'battle', label: 'Battle' },
  { value: 'treasure', label: 'Treasure' },
  { value: 'danger', label: 'Danger' },
  { value: 'npc', label: 'NPC' },
  { value: 'shop', label: 'Shop' },
  { value: 'camp', label: 'Camp' },
];

const TRANSITION_COLOR = '#fbbf24';

const TRANSITION_TYPES = [{ value: 'transition', label: 'Transition' }];

interface MapViewerProps {
  map: Map;
  onClose: () => void;
  scenes?: Scene[];
  currentSceneId?: string | null;
  onTransit?: (targetSceneId: string) => void;
}

export default function MapViewer({ map, onClose, scenes, currentSceneId, onTransit }: MapViewerProps) {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [placing, setPlacing] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [editingMarker, setEditingMarker] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ active: boolean; startX: number; startY: number; origPanX: number; origPanY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('poi');
  const [newColor, setNewColor] = useState('#60a5fa');
  const [transitionForm, setTransitionForm] = useState<{ x: number; y: number } | null>(null);
  const [transTargetId, setTransTargetId] = useState('');
  const [transReturn, setTransReturn] = useState(true);

  const availableTypes = onTransit ? [...MARKER_TYPES, ...TRANSITION_TYPES] : MARKER_TYPES;

  useEffect(() => {
    api.mapMarkers.list(map.id).then(setMarkers).catch(() => setMarkers([]));
  }, [map.id]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.25, z + (e.deltaY > 0 ? -0.1 : 0.1))));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (placing || e.button !== 0) return;
    setDragState({ active: true, startX: e.clientX, startY: e.clientY, origPanX: pan.x, origPanY: pan.y });
  }, [placing, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState?.active) return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    setPan({ x: dragState.origPanX + dx, y: dragState.origPanY + dy });
  }, [dragState]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleMapClick = useCallback(async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (newType === 'transition') {
      setTransTargetId('');
      setTransReturn(true);
      setTransitionForm({ x, y });
      return;
    }

    try {
      const marker = await api.mapMarkers.create(map.id, {
        label: newLabel || 'Marker',
        marker_type: newType,
        x, y,
        color: newColor,
      });
      setMarkers((prev) => [...prev, marker]);
      setPlacing(false);
      setNewLabel('');
    } catch {
      // marker creation failure is non-fatal; stay in placing mode
    }
  }, [placing, map.id, newLabel, newType, newColor]);

  const destScenes = scenes?.filter((s) => s.id !== currentSceneId) ?? [];

  const handleCreateTransition = useCallback(async () => {
    if (!transitionForm || !transTargetId || !onTransit) return;
    const target = scenes?.find((s) => s.id === transTargetId);
    try {
      const marker = await api.mapMarkers.create(map.id, {
        label: target?.name || 'Transition',
        marker_type: 'transition',
        target_scene_id: transTargetId,
        x: transitionForm.x,
        y: transitionForm.y,
        color: TRANSITION_COLOR,
      });
      setMarkers((prev) => [...prev, marker]);
      const here = scenes?.find((s) => s.id === currentSceneId);
      if (transReturn && target?.map_id) {
        await api.mapMarkers.create(target.map_id, {
          label: here?.name || 'Transition',
          marker_type: 'transition',
          target_scene_id: currentSceneId ?? undefined,
          x: transitionForm.x,
          y: transitionForm.y,
          color: TRANSITION_COLOR,
        });
      }
    } catch {
      // creation failure is non-fatal; keep the form open for retry
      return;
    }
    setTransitionForm(null);
    setPlacing(false);
  }, [transitionForm, transTargetId, transReturn, map.id, scenes, currentSceneId, onTransit]);

  const handleDeleteMarker = useCallback(async (id: string) => {
    await api.mapMarkers.delete(id);
    setMarkers((prev) => prev.filter((m) => m.id !== id));
    if (selectedMarker === id) setSelectedMarker(null);
  }, [selectedMarker]);

  const handleUpdateMarker = useCallback(async (id: string, data: Partial<MapMarker>) => {
    const updated = await api.mapMarkers.update(id, data);
    setMarkers((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setEditingMarker(null);
  }, []);

  const mapUrl = staticUrl(map.file_path);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--bg-tertiary)] shrink-0">
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm">
          ← Back
        </button>
        <div className="w-px h-5 bg-[var(--bg-tertiary)]" />
        <span className="text-sm font-bold">{map.name}</span>
        <span className="text-[10px] text-[var(--text-secondary)]">
          {Math.round(zoom * 100)}% · {markers.length} markers
        </span>

        <div className="flex-1" />

        {/* Zoom Controls */}
        <button
          onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
          className="w-7 h-7 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm flex items-center justify-center"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          className="w-7 h-7 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm flex items-center justify-center"
        >
          −
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="text-[10px] px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Reset
        </button>

        <div className="w-px h-5 bg-[var(--bg-tertiary)]" />

        {/* Add Marker Controls */}
        {placing ? (
          <div className="flex items-center gap-1.5">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="w-24 text-[10px] px-1.5 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              autoFocus
            />
            <select
              value={newType}
              onChange={(e) => {
                setNewType(e.target.value);
                if (e.target.value === 'transition') setNewColor(TRANSITION_COLOR);
              }}
              className="text-[10px] px-1 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none"
            >
              {availableTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {newType !== 'transition' && (
              <select
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="text-[10px] px-1 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none"
              >
                {MARKER_COLORS.map((c) => (
                  <option key={c} value={c} style={{ color: c }}>●</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setPlacing(false)}
              className="text-[10px] px-2 py-1 rounded bg-red-900/50 text-red-300"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPlacing(true)}
            className="text-[10px] px-2 py-1 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          >
            + Add Marker
          </button>
        )}
      </div>

      {/* Map Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${placing ? 'cursor-crosshair' : dragState?.active ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleMapClick}
      >
        <div
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Map Image */}
          {mapUrl ? (
            <img
              src={mapUrl}
              alt={map.name}
              className="max-w-none select-none pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="w-96 h-96 bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)]">
              No image uploaded
            </div>
          )}

          {/* Markers */}
          {markers.map((m) => {
            const isSelected = m.id === selectedMarker;
            const isEditing = m.id === editingMarker;
            return (
              <div
                key={m.id}
                className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group ${isSelected ? 'z-20' : 'z-10'}`}
                style={{
                  left: `${m.x * 100}%`,
                  top: `${m.y * 100}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMarker(isSelected ? null : m.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingMarker(m.id);
                }}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[8px] font-bold text-white transition-transform ${isSelected ? 'scale-150' : 'group-hover:scale-125'}`}
                  style={{ backgroundColor: m.color }}
                  title={`${m.label} (${m.marker_type})`}
                >
                  {m.label.charAt(0).toUpperCase()}
                </div>
                {(isSelected || isEditing) && (
                  <div
                    className="absolute top-6 left-1/2 -translate-x-1/2 bg-[var(--bg-primary)]/85 [backdrop-filter:blur(2px)] border border-[var(--bg-tertiary)] rounded p-2 shadow-lg min-w-[140px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isEditing ? (
                      <div className="space-y-1.5">
                        <input
                          value={m.label}
                          onChange={(e) => handleUpdateMarker(m.id, { label: e.target.value })}
                          className="w-full text-[10px] px-1.5 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none"
                          autoFocus
                        />
                        <select
                          value={m.marker_type}
                          onChange={(e) => handleUpdateMarker(m.id, { marker_type: e.target.value })}
                          className="w-full text-[10px] px-1 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none"
                        >
                          {MARKER_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-0.5 flex-wrap">
                          {MARKER_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => handleUpdateMarker(m.id, { color: c })}
                              className="w-4 h-4 rounded-full border border-white/30"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingMarker(null)}
                            className="flex-1 text-[10px] py-0.5 rounded bg-[var(--accent)] text-white"
                          >
                            Done
                          </button>
                          <button
                            onClick={() => handleDeleteMarker(m.id)}
                            className="text-[10px] px-2 py-0.5 rounded bg-red-900/50 text-red-300"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold">{m.label}</p>
                        {m.marker_type === 'transition' && m.target_scene_id && (
                          <p className="text-[10px] text-[var(--text-secondary)]">
                            → {scenes?.find((s) => s.id === m.target_scene_id)?.name ?? 'unknown scene'}
                          </p>
                        )}
                        <div className="flex gap-1 mt-1">
                          {m.marker_type === 'transition' && m.target_scene_id && onTransit && (
                            <button
                              onClick={() => onTransit(m.target_scene_id!)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                            >
                              Travel
                            </button>
                          )}
                          <button
                            onClick={() => setEditingMarker(m.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMarker(m.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Placing hint */}
        {placing && !transitionForm && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--accent)]/90 text-white text-xs px-3 py-1.5 rounded-full">
            {newType === 'transition' ? 'Click on map to place the transition' : 'Click on map to place marker'}
          </div>
        )}

        {/* Transition destination form */}
        {transitionForm && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
            <div
              className="bg-[var(--bg-primary)] border border-[var(--bg-tertiary)] rounded-lg p-4 w-72 space-y-3 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm font-bold">Transition to…</p>
              <select
                value={transTargetId}
                onChange={(e) => setTransTargetId(e.target.value)}
                className="w-full text-xs px-2 py-1.5 rounded bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                autoFocus
              >
                <option value="">Select scene…</option>
                {destScenes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={transReturn}
                  onChange={(e) => setTransReturn(e.target.checked)}
                  className="accent-[var(--accent)]"
                />
                Create return door on destination
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateTransition}
                  disabled={!transTargetId}
                  className="flex-1 text-xs py-1.5 rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => setTransitionForm(null)}
                  className="text-xs px-3 py-1.5 rounded bg-red-900/50 text-red-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
