import { useState } from 'react';
import type { Scene } from '@/lib/api';
import { api } from '@/lib/api';
import { gridCellUnits } from '@/lib/sceneWorld';
import { ROOM_SKINS } from '@/lib/roomSkins';
import HudPanel from './HudPanel';

interface SceneSettingsHudProps {
  scene: Scene;
  onUpdate: (updates: Partial<Pick<Scene, 'map_scale' | 'model_y_offset' | 'room_skin' | 'grid_size' | 'grid_snap'>>) => Promise<void>;
  onClose: () => void;
}

export default function SceneSettingsHud({ scene, onUpdate, onClose }: SceneSettingsHudProps) {
  const [mapScale, setMapScale] = useState(scene.map_scale ?? 1);
  const [modelYOffset, setModelYOffset] = useState(scene.model_y_offset ?? 0);
  const [gridSize, setGridSize] = useState(scene.grid_size ?? 0);
  const [gridSnap, setGridSnap] = useState(scene.grid_snap ?? false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  /** La grilla detectada, en unidades del mundo. */
  const [detected, setDetected] = useState<{ cell: number; confidence: number } | null>(null);
  const [detectError, setDetectError] = useState('');

  const isModel = /\.(glb|gltf)$/i.test(scene.background_path ?? '');

  const handleUpdate = async (field: string, value: number | boolean) => {
    setSaving(true);
    try {
      await onUpdate({ [field]: value });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Detecta la grilla del fondo y la propone en unidades del mundo.
   *
   * El backend la mide en pixeles; la conversion es lineal con el alto del
   * mundo (que es el alto de la imagen en unidades).
   */
  const handleDetectGrid = async () => {
    if (!scene.campaign_id || !scene.id) return;
    setDetecting(true);
    setDetectError('');
    try {
      const res = await api.scenes.detectGrid(scene.campaign_id, scene.id);
      if (res.grid.type === 'none' || res.grid.cell_size <= 0) {
        setDetected(null);
        setDetectError('No se encontró grilla en el fondo');
        return;
      }
      const cell = gridCellUnits(
        res.grid.cell_size,
        res.image_size.height,
        scene.map_scale ?? 1,
      );
      setDetected({ cell, confidence: res.grid.confidence });
    } catch {
      setDetectError('No se pudo detectar la grilla');
    } finally {
      setDetecting(false);
    }
  };

  const mapWidth = (10 * mapScale * 4).toFixed(0);
  const mapHeight = (10 * mapScale).toFixed(0);

  return (
    <HudPanel title="Ajustes de escena" panelId="scene-settings" onClose={onClose} className="w-64">
      <div className="space-y-3 p-3">
        {/* Skin de fondo (cuarto virtual) */}
        <div>
          <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Ambiente de fondo</label>
          <select
            className="w-full mt-1 text-[11px] bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] rounded px-2 py-1"
            value={scene.room_skin || 'oggys'}
            onChange={async (e) => {
              const v = e.target.value;
              await onUpdate({ room_skin: v, model_y_offset: 0 });
            }}
          >
            {ROOM_SKINS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        {/* Map Scale */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Escala del mapa</label>
            <span className="text-[10px] text-[var(--accent)] font-mono">{mapScale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={isModel ? 100 : 30}
            step={0.1}
            value={mapScale}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setMapScale(v);
              handleUpdate('map_scale', v);
            }}
            className="w-full h-1 accent-[var(--accent)]"
          />
          <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">
            {mapWidth} × {mapHeight} unidades
          </p>
        </div>

        {/* Altura del mapa (ajuste fino sobre anclaje del skin) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">{isModel ? 'Altura de los tokens (piso visual)' : 'Altura del mapa (ajuste fino)'}</label>
            <span className="text-[10px] text-[var(--accent)] font-mono">{modelYOffset.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={-200}
            max={200}
            step={1}
            value={modelYOffset}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setModelYOffset(v);
              handleUpdate('model_y_offset', v);
            }}
            className="w-full h-1 accent-[var(--accent)]"
          />
          <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">
            Ajuste fino sobre el anclaje del ambiente
          </p>
        </div>

        {/* Grid Size */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Tamaño de cuadrícula</label>
            <span className="text-[10px] text-[var(--accent)] font-mono">{gridSize > 0 ? `${gridSize}` : 'apagada'}</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 5].map((v) => (
              <button
                key={v}
                onClick={() => {
                  setGridSize(v);
                  handleUpdate('grid_size', v);
                }}
                className={`flex-1 text-[10px] py-1 rounded transition-colors ${
                  gridSize === v
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {v === 0 ? 'Apagada' : `${v}`}
              </button>
            ))}
          </div>
          <button
            onClick={handleDetectGrid}
            disabled={detecting}
            data-testid="detect-grid"
            className="mt-1 w-full text-[10px] py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
          >
            {detecting ? 'Detectando grilla...' : 'Detectar grilla del fondo'}
          </button>
          {detected && (
            <div className="mt-1 text-[9px] text-[var(--text-secondary)]">
              <div>
                Detectada: celda {detected.cell.toFixed(2)} unidades (confianza{' '}
                {Math.round(detected.confidence * 100)}%)
              </div>
              <button
                onClick={() => {
                  setGridSize(detected.cell);
                  handleUpdate('grid_size', detected.cell);
                }}
                data-testid="detect-grid-apply"
                className="mt-1 w-full text-[10px] py-1 rounded bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
              >
                Usar esta cuadrícula
              </button>
            </div>
          )}
          {detectError && <p className="mt-1 text-[9px] text-red-400">{detectError}</p>}
        </div>

        {/* Grid Snap */}
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Ajuste a cuadrícula</label>
          <button
            onClick={() => {
              const next = !gridSnap;
              setGridSnap(next);
              handleUpdate('grid_snap', next);
            }}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              gridSnap ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                gridSnap ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </div>

        {saving && (
          <p className="text-[9px] text-[var(--text-secondary)] text-center">Guardando...</p>
        )}
      </div>
    </HudPanel>
  );
}
