import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import i18n from '@/lib/i18n';
import { isAutoDetectedItem } from '@/lib/autoDetected';
import type { SceneItem } from '@core/domain/types';
import type { SceneGraph } from '@core/scene/scene-graph';
import type { ToastRoll } from '@/lib/toastQueue';

/** Modo de detección que se le pide al backend. `ai` no es un modo visual. */
export type DetectionMode = 'blueprint' | 'textured';

export interface DetectProposal {
  ids: string[];
  walls: number;
  doors: number;
}

export interface UseWallDetectionOptions {
  campaignId: string | undefined;
  sceneId: string | undefined;
  graphRef: SceneGraph;
  handleItemsChange: (items: SceneItem[]) => void;
  /** Notificación de la cola de toasts del dashboard. */
  push: (toast: ToastRoll) => void;
}

export interface UseWallDetectionResult {
  detectionMode: DetectionMode;
  setDetectionMode: (mode: DetectionMode) => void;
  useAi: boolean;
  toggleAi: () => void;
  detectingWalls: boolean;
  /** Propuesta sin aprobar: los items ya están en el grafo pero en revisión. */
  detectProposal: DetectProposal | null;
  handleAutoDetect: () => Promise<void>;
  handleDetectApprove: () => void;
  handleDetectDiscard: () => void;
  /** Saca un item de la propuesta; si se vacía, la revisión termina sola. */
  pruneProposal: (itemId: string) => void;
}

/**
 * Detección de paredes contra la imagen de fondo de la escena.
 *
 * El DM nunca escribe en el canon desde acá: la detección *agrega* items al
 * grafo y deja una propuesta abierta. Hasta que el DM apruebe o descarte, los
 * items son proposal, no geometría aceptada. Por eso `detectProposal` es
 * estado de primera clase y no un detalle del toast.
 *
 * Regla de re-detección: cada detección **regenera** el set automático (los
 * items que خروج de una detección anterior se borran antes de proponer los
 * nuevos). Detectar dos veces no apila dos juegos de muros; lo dibujado a mano
 * nunca se toca.
 */
export function useWallDetection({
  campaignId,
  sceneId,
  graphRef,
  handleItemsChange,
  push,
}: UseWallDetectionOptions): UseWallDetectionResult {
  const [detectionMode, setDetectionModeState] = useState<DetectionMode>('blueprint');
  const [useAi, setUseAi] = useState(false);
  const [detectingWalls, setDetectingWalls] = useState(false);
  const [detectProposal, setDetectProposal] = useState<DetectProposal | null>(null);

  const setDetectionMode = useCallback((mode: DetectionMode) => setDetectionModeState(mode), []);
  const toggleAi = useCallback(() => setUseAi((v) => !v), []);

  const handleAutoDetect = useCallback(async () => {
    if (!campaignId || !sceneId) return;
    setDetectingWalls(true);
    try {
      const result = await api.scenes.detectWalls(campaignId, sceneId, useAi ? 'ai' : detectionMode);
      // Una deteccion REGENERA el set automatico: se va lo que salio de una
      // deteccion anterior y se propone de nuevo. Antes solo se reemplazaba la
      // propuesta sin aprobar, asi que detectar sobre muros ya aprobados
      // acumulaba una segunda copia encima, y como la deteccion ahora es
      // determinista esa copia era exacta. Lo dibujado a mano no se toca.
      for (const item of graphRef.getItems()) {
        if (isAutoDetectedItem(item)) graphRef.removeItem(item.id);
      }
      const items = ((result.items ?? []) as SceneItem[]).filter((item) => item && item.id);
      for (const item of items) {
        graphRef.addItem(item);
      }
      handleItemsChange(graphRef.getItems());
      if (items.length > 0) {
        setDetectProposal({
          ids: items.map((item) => item.id),
          walls: result.wall_count ?? items.length,
          doors: result.door_count ?? 0,
        });
        push({
          id: `detect-${Date.now()}`,
          rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
          diceType: 20,
          count: 1,
          results: [items.length],
          total: items.length,
          label: i18n.t('dmToast.detectProposed', '{{walls}} paredes + {{doors}} puertas propuestas — revisar', {
            walls: result.wall_count ?? items.length,
            doors: result.door_count ?? 0,
          }),
          timestamp: Date.now(),
        });
      } else {
        setDetectProposal(null);
        push({
          id: `detect-${Date.now()}`,
          rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
          diceType: 1,
          count: 1,
          results: [1],
          total: 1,
          label: i18n.t('dmToast.noWallsDetected', 'No se detectaron paredes — probá ajustar la imagen'),
          timestamp: Date.now(),
        });
      }
    } catch {
      push({
        id: `detect-err-${Date.now()}`,
        rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
        diceType: 1,
        count: 1,
        results: [1],
        total: 1,
        label: i18n.t('dmToast.detectFailed', 'No se pudo detectar — revisá el backend'),
        timestamp: Date.now(),
      });
    } finally {
      setDetectingWalls(false);
    }
  }, [campaignId, sceneId, graphRef, handleItemsChange, detectionMode, useAi, push]);

  const handleDetectApprove = useCallback(() => {
    if (!detectProposal) return;
    const n = detectProposal.ids.length;
    setDetectProposal(null);
    push({
      id: `detect-ok-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
      diceType: 1,
      count: 1,
      results: [n],
      total: n,
      label: i18n.t('dmToast.detectApproved', '{{n}} paredes confirmadas', { n }),
      timestamp: Date.now(),
    });
  }, [detectProposal, push]);

  const handleDetectDiscard = useCallback(() => {
    if (!detectProposal) return;
    const ids = new Set(detectProposal.ids);
    for (const id of ids) graphRef.removeItem(id);
    handleItemsChange(graphRef.getItems());
    setDetectProposal(null);
    push({
      id: `detect-no-${Date.now()}`,
      rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
      diceType: 1,
      count: 1,
      results: [1],
      total: 1,
      label: i18n.t('dmToast.detectDiscarded', 'detección descartada'),
      timestamp: Date.now(),
    });
  }, [detectProposal, graphRef, handleItemsChange, push]);

  const pruneProposal = useCallback((itemId: string) => {
    setDetectProposal((prev) => {
      if (!prev || !prev.ids.includes(itemId)) return prev;
      const ids = prev.ids.filter((id) => id !== itemId);
      return ids.length > 0 ? { ...prev, ids } : null;
    });
  }, []);

  return {
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
  };
}
