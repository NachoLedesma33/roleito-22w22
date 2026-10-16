import { useCallback, useState } from 'react';
import i18n from '@/lib/i18n';
import type { ToastRoll } from '@/lib/toastQueue';
import {
  buildPortalLocalEdge,
  createPortalBetween,
  cyclePortalState,
  removePortal,
} from '@/components/ZonePortal';
import { createEmptyPortalDraft, type PortalDraft } from '@/components/PortalDrawerCanvas';
import type { SceneGraph } from '@core/scene/scene-graph';

/** Lo que `PortalDrawerCanvas` devuelve al elegir un borde de zona. */
export interface PortalSelectSnapshot {
  zoneId: string;
  point: { x: number; y: number };
  a: { x: number; y: number };
  b: { x: number; y: number };
}

export interface UsePortalsOptions {
  graphRef: SceneGraph;
  handleItemsChange: (items: ReturnType<SceneGraph['getItems']>) => void;
  push: (toast: ToastRoll) => void;
}

export interface UsePortalsResult {
  portalDraft: PortalDraft | null;
  /** Empieza el draft. No cierra otros modos: eso es del dashboard. */
  startPortalMode: () => void;
  cancelPortalMode: () => void;
  handlePortalSelect: (snap: PortalSelectSnapshot) => void;
  handlePortalMove: (point: { x: number; y: number }) => void;
  handlePortalToggle: (portalId: string) => void;
  handlePortalDelete: (portalId: string) => void;
}

/**
 * Portales entre zonas.
 *
 * El portal se dibuja en dos pasos: el DM elige un borde de la primera zona y
 * después un borde de la segunda; recién ahí se escribe la geometría en ambas.
 * El draft vive acá porque es estado efímero de esa interacción y no de la
 * escena: al completarse o cancelarse desaparece sin rastro.
 *
 * Vive en `lib/` y no en `core/scene/` porque notifica al usuario (`push` +
 * `i18n`). La regla que.apply: si el hook llama a la API o emite una
 * notificación, es de la capa de aplicación.
 */
export function usePortals({ graphRef, handleItemsChange, push }: UsePortalsOptions): UsePortalsResult {
  const [portalDraft, setPortalDraft] = useState<PortalDraft | null>(null);

  const startPortalMode = useCallback(() => {
    setPortalDraft((prev) => (prev ? null : createEmptyPortalDraft()));
  }, []);

  const cancelPortalMode = useCallback(() => setPortalDraft(null), []);

  const handlePortalSelect = useCallback(
    (snap: PortalSelectSnapshot) => {
      setPortalDraft((prev) => {
        if (!prev) return prev;
        // Primer borde: todavía no hay con qué emparejarlo.
        if (!prev.zoneAId) {
          return { ...prev, zoneAId: snap.zoneId, pointA: snap.point, a: snap.a, b: snap.b };
        }
        if (snap.zoneId === prev.zoneAId) return prev;
        const items = graphRef.getItems();
        const zoneA = items.find((i) => i.id === prev.zoneAId);
        const zoneB = items.find((i) => i.id === snap.zoneId);
        if (!zoneA || !zoneB) return prev;
        const localEdge = buildPortalLocalEdge({ point: prev.pointA!, a: prev.a!, b: prev.b! });
        const { zoneA: aUp, zoneB: bUp } = createPortalBetween(zoneA, zoneB, localEdge);
        graphRef.updateItem(aUp.id, { metadata: aUp.metadata });
        graphRef.updateItem(bUp.id, { metadata: bUp.metadata });
        handleItemsChange(graphRef.getItems());
        push({
          id: `portal-${Date.now()}`,
          rollerName: i18n.t('dmToast.rollerPortal', 'Portal'),
          diceType: 20,
          count: 1,
          results: [1],
          total: 1,
          label: i18n.t('dmToast.portalCreated', 'portal creado'),
          timestamp: Date.now(),
        });
        return null;
      });
    },
    [graphRef, handleItemsChange, push],
  );

  const handlePortalMove = useCallback((point: { x: number; y: number }) => {
    setPortalDraft((prev) => (prev ? { ...prev, currentPoint: point } : prev));
  }, []);

  const handlePortalToggle = useCallback(
    (portalId: string) => {
      const next = cyclePortalState(graphRef.getItems(), portalId);
      for (const item of next) {
        graphRef.updateItem(item.id, { metadata: item.metadata });
      }
      handleItemsChange(graphRef.getItems());
    },
    [graphRef, handleItemsChange],
  );

  const handlePortalDelete = useCallback(
    (portalId: string) => {
      const next = removePortal(graphRef.getItems(), portalId);
      for (const item of next) {
        graphRef.updateItem(item.id, { metadata: item.metadata });
      }
      handleItemsChange(graphRef.getItems());
    },
    [graphRef, handleItemsChange],
  );

  return {
    portalDraft,
    startPortalMode,
    cancelPortalMode,
    handlePortalSelect,
    handlePortalMove,
    handlePortalToggle,
    handlePortalDelete,
  };
}
