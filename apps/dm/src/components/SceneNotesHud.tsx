import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import HudPanel from './HudPanel';

interface SceneNotesHudProps {
  campaignId: string;
  sceneId: string | null;
  sceneName: string;
  onClose: () => void;
}

export default function SceneNotesHud({
  campaignId,
  sceneId,
  sceneName,
  onClose,
}: SceneNotesHudProps) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sceneId) return;
    api.scenes.get(campaignId, sceneId)
      .then((s) => setNotes(s.notes || ''))
      .catch(() => setNotes(''));
  }, [campaignId, sceneId]);

  const handleSave = useCallback(async () => {
    if (!sceneId || saving) return;
    setSaving(true);
    try {
      await api.scenes.update(campaignId, sceneId, { notes });
    } catch {
      // silently fail
    }
    setSaving(false);
  }, [campaignId, sceneId, notes, saving]);

  return (
    <HudPanel
      title={`Scene Notes${sceneName ? ` — ${sceneName}` : ''}`}
      panelId="scene-notes"
      onClose={onClose}
      defaultX={window.innerWidth - 340}
      defaultY={300}
      defaultWidth={320}
    >
      {!sceneId && (
        <p className="text-[10px] text-[var(--text-secondary)] italic">
          No scene selected
        </p>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleSave}
        placeholder="Notes about this scene..."
        className="w-full h-40 text-xs bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded p-2 text-[var(--text-primary)] placeholder-[var(--text-secondary)] resize-none focus:outline-none focus:border-[var(--accent)]"
      />
      {saving && (
        <p className="text-[9px] text-[var(--text-secondary)] mt-1">Saving...</p>
      )}
    </HudPanel>
  );
}
