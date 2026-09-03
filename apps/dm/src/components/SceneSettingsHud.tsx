import { useState } from 'react';
import type { Scene } from '@/lib/api';
import HudPanel from './HudPanel';

interface SceneSettingsHudProps {
  scene: Scene;
  onUpdate: (updates: Partial<Pick<Scene, 'map_scale' | 'grid_size' | 'grid_snap'>>) => Promise<void>;
  onClose: () => void;
}

export default function SceneSettingsHud({ scene, onUpdate, onClose }: SceneSettingsHudProps) {
  const [mapScale, setMapScale] = useState(scene.map_scale ?? 1);
  const [gridSize, setGridSize] = useState(scene.grid_size ?? 0);
  const [gridSnap, setGridSnap] = useState(scene.grid_snap ?? false);
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (field: string, value: number | boolean) => {
    setSaving(true);
    try {
      await onUpdate({ [field]: value });
    } finally {
      setSaving(false);
    }
  };

  const mapWidth = (10 * mapScale * 4).toFixed(0);
  const mapHeight = (10 * mapScale).toFixed(0);

  return (
    <HudPanel title="Scene Settings" panelId="scene-settings" onClose={onClose} className="w-64">
      <div className="space-y-3 p-3">
        {/* Map Scale */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Map Scale</label>
            <span className="text-[10px] text-[var(--accent)] font-mono">{mapScale.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10}
            step={0.5}
            value={mapScale}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setMapScale(v);
              handleUpdate('map_scale', v);
            }}
            className="w-full h-1 accent-[var(--accent)]"
          />
          <p className="text-[9px] text-[var(--text-secondary)] mt-0.5">
            {mapWidth} × {mapHeight} units
          </p>
        </div>

        {/* Grid Size */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Grid Size</label>
            <span className="text-[10px] text-[var(--accent)] font-mono">{gridSize > 0 ? `${gridSize}` : 'off'}</span>
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
                {v === 0 ? 'Off' : `${v}`}
              </button>
            ))}
          </div>
        </div>

        {/* Grid Snap */}
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wide">Grid Snap</label>
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
          <p className="text-[9px] text-[var(--text-secondary)] text-center">Saving...</p>
        )}
      </div>
    </HudPanel>
  );
}
