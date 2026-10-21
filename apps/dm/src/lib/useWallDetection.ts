import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import i18n from '@/lib/i18n';
import { autoDetectedKind, isAutoDetectedItem, isTouchedByDm, zonePoints, zonesOverlap } from '@/lib/autoDetected';
import type { SceneItem } from '@core/domain/types';
import type { SceneGraph } from '@core/scene/scene-graph';
import type { ToastRoll } from '@/lib/toastQueue';

/** Modo de detección que se le pide al backend. `ai` no es un modo visual. */
export type DetectionMode = 'blueprint' | 'textured';

export interface DetectProposal {
  ids: string[];
  walls: number;
  doors: number;
  /**
   * Las zonas que encontró la detección (las "salas").
   *
   * Son la geometria de verdad: el perimetro de la zona ES la pared. Los
   * muros sueltos solo aparecen cuando no hay zona que los cubra.
   */
  rooms: { id: string; label: string; area: number }[];
}

/**
 * Arma la propuesta a partir de los items propuestos.
 *
 * Los conteos salen de los ITEMS, no de las estadisticas del detector: lo
 * que se propone es lo que hay en la escena. (El detector puede haber
 * encontrado 5 paredes que en el grafo son el borde de 2 zonas: los items
 * son 2 zonas, no 5 paredes + 2 zonas.)
 */
function proposalFromItems(
  items: SceneItem[],
  rooms?: DetectProposal['rooms'],
): DetectProposal {
  const zoneItems = items.filter((i) => autoDetectedKind(i) === 'zone');
  return {
    ids: items.map((i) => i.id),
    walls: items.filter((i) => autoDetectedKind(i) === 'wall').length,
    doors: items.filter((i) => autoDetectedKind(i) === 'door').length,
    rooms:
      rooms ??
      zoneItems.map((i) => ({ id: i.id, label: i.name, area: 0 })),
  };
}

export interface UseWallDetectionOptions {
  campaignId: string | undefined;
  sceneId: string | undefined;
  graphRef: SceneGraph;
  /** Los items que hay en la grafo ahora: para reabrir una propuesta sin revisar. */
  items?: SceneItem[];
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
  /** Detecta en varias escenas de una vez (batch). */
  handleAutoDetectAll: (targets: { id: string }[]) => Promise<void>;
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
  items = [],
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
      // **Excepcion**: la zona que el DM toco manda (touchedByDm): se conserva
      // y la deteccion nueva no propone otra encima.
      const conservadas: SceneItem[] = [];
      for (const item of graphRef.getItems()) {
        if (!isAutoDetectedItem(item)) continue;
        if (isTouchedByDm(item)) {
          conservadas.push(item);
          continue;
        }
        graphRef.removeItem(item.id);
      }
      const items = ((result.items ?? []) as SceneItem[]).filter((item) => {
        if (!item || !item.id) return false;
        // Una zona de la IA que pisa una zona que el DM toco: se descarta la
        // propuesta (la del DM manda).
        if (autoDetectedKind(item) !== 'zone') return true;
        const pts = zonePoints(item);
        if (!pts) return true;
        return !conservadas.some((k) => {
          const kp = zonePoints(k);
          return kp ? zonesOverlap(pts, kp) : false;
        });
      });
      for (const item of items) {
        // Quedan pendientes de revision: el flag viaja con el item, asi que la
        // propuesta sobrevive a que el DM recargue la pagina.
        graphRef.addItem({ ...item, pendingReview: true });
      }
      handleItemsChange(graphRef.getItems());
      if (items.length > 0) {
        setDetectProposal(
          proposalFromItems(
            items,
            (result.rooms ?? []).map((r) => ({ id: r.id, label: r.label, area: r.area })),
          ),
        );
        push({
          id: `detect-${Date.now()}`,
          rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
          diceType: 20,
          count: 1,
          results: [items.length],
          total: items.length,
          label: i18n.t('dmToast.detectProposed', '{{n}} elementos propuestos — revisar', {
            n: items.length,
          }),
          timestamp: Date.now(),
        });
        // Se pidió IA y la propuesta la hizo OpenCV (plano clasificado como
        // blueprint, o la IA caída): el DM tiene que saber con qué motor se
        // hizo, o cree que revisó una propuesta de IA.
        if (useAi && !result.ai_used) {
          push({
            id: `detect-cv-${Date.now()}`,
            rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
            diceType: 1,
            count: 1,
            results: [1],
            total: 1,
            label: i18n.t('dmToast.detectFallbackCv', 'La IA no se pudo usar: la detección la hizo computer vision'),
            timestamp: Date.now(),
          });
        }
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

  /**
   * Detecta en varias escenas de una vez.
   *
   * Cada escena queda con su propuesta PENDIENTE (pendingReview), así que el
   * DM la revisa al entrar a cada una: el flag viaja con el item y el banner
   * se reabre solo. Como la deteccion no persiste, el frontend decide que se
   * guarda en cada escena.
   */
  const handleAutoDetectAll = useCallback(
    async (targets: { id: string }[]) => {
      if (!campaignId || targets.length === 0) return;
      setDetectingWalls(true);
      try {
        let detectadas = 0;
        for (const target of targets) {
          const [{ items: existentes }, res] = await Promise.all([
            api.scenes.getItems(campaignId, target.id),
            api.scenes.detectWalls(campaignId, target.id, useAi ? 'ai' : detectionMode),
          ]);
          const nuevos = ((res.items ?? []) as SceneItem[]).filter((i) => i && i.id);
          if (nuevos.length === 0) continue;
          const conFlag = nuevos.map((i) => ({ ...i, pendingReview: true }));
          if (target.id === sceneId) {
            // La escena activa: el grafo local se actualiza ya, como en la
            // deteccion individual.
            for (const item of graphRef.getItems()) {
              if (isAutoDetectedItem(item) && !isTouchedByDm(item)) graphRef.removeItem(item.id);
            }
            for (const item of conFlag) graphRef.addItem(item);
            handleItemsChange(graphRef.getItems());
            setDetectProposal(proposalFromItems(conFlag));
          } else {
            // Otra escena: se guarda por la API, con la propuesta pendiente.
            // Regenera el set automatico de esa escena (como la deteccion
            // individual) y deja los nuevos pendientes de revision. Lo que el
            // DM toco se conserva.
            await api.scenes.saveItems(campaignId, target.id, [
              ...existentes.filter((i) => !isAutoDetectedItem(i) || isTouchedByDm(i)),
              ...conFlag,
            ]);
          }
          detectadas++;
        }
        push({
          id: `detect-batch-${Date.now()}`,
          rollerName: i18n.t('dmToast.rollerDetect', 'Detección'),
          diceType: 20,
          count: 1,
          results: [detectadas],
          total: detectadas,
          label: i18n.t(
            'dmToast.detectBatch',
            '{{n}} escenas detectadas — revisá la propuesta de cada una',
            { n: detectadas },
          ),
          timestamp: Date.now(),
        });
      } catch {
        push({
          id: `detect-batch-err-${Date.now()}`,
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
    },
    [campaignId, sceneId, graphRef, handleItemsChange, detectionMode, useAi, push],
  );

  /**
   * Reabre una propuesta que quedo sin revisar (el DM recargó la pagina a
   * mitad de la revision).
   *
   * Sin esto los muros detectados quedaban aceptados sin que nadie los
   * mirara: el flag `pendingReview` viaja con el item, asi que la propuesta se
   * reconstruye sola.
   *
   * UNA vez por escena: si no, competiria con el approve (este quita el flag
   * del grafo, pero el prop `items` todavia tiene el valor viejo y la
   * reapertura volveria a abrirla).
   */
  const reopenedRef = useRef(false);
  useEffect(() => {
    reopenedRef.current = false;
  }, [sceneId]);

  useEffect(() => {
    if (detectProposal || reopenedRef.current) return;
    const pending = items.filter((item) => item.pendingReview);
    if (pending.length === 0) return;
    reopenedRef.current = true;
    setDetectProposal(proposalFromItems(pending));
  }, [items, detectProposal, sceneId]);

  const handleDetectApprove = useCallback(() => {
    if (!detectProposal) return;
    const n = detectProposal.ids.length;
    // Los items quedan aceptados: se les saca el flag de "pendiente" para que
    // la propuesta no se reabra sola.
    for (const id of detectProposal.ids) {
      graphRef.updateItem(id, { pendingReview: false });
    }
    handleItemsChange(graphRef.getItems());
    // Esta propuesta ya se aprobo: no se reabre sola.
    reopenedRef.current = true;
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
  }, [detectProposal, graphRef, handleItemsChange, push]);

  const handleDetectDiscard = useCallback(() => {
    if (!detectProposal) return;
    const ids = new Set(detectProposal.ids);
    for (const id of ids) graphRef.removeItem(id);
    handleItemsChange(graphRef.getItems());
    // Descartada: tampoco se reabre sola.
    reopenedRef.current = true;
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
    handleAutoDetectAll,
    handleDetectApprove,
    handleDetectDiscard,
    pruneProposal,
  };
}
