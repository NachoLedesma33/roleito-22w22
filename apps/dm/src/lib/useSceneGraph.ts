import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { SceneGraph } from '@core/scene/scene-graph';
import type { SceneItem } from '@core/domain/types';

/** Cuántos pasos de deshacer se conservan. */
const MAX_HISTORY = 30;

/** Dos pasos se funden en uno si llegan con menos de este intervalo (ms). */
const COALESCE_MS = 400;

/** Debounce de la persistencia de `items_json`. */
const SAVE_DEBOUNCE_MS = 300;

function sameIds(a: SceneItem[], b: SceneItem[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((i) => i.id));
  return b.every((i) => ids.has(i.id));
}

function snapshotOf(items: SceneItem[]): SceneItem[] {
  return JSON.parse(JSON.stringify(items)) as SceneItem[];
}

export interface UseSceneGraphOptions {
  campaignId: string | undefined;
  sceneId: string | undefined;
  /**
   * Se llama al deshacer o rehacer, antes de aplicar: el grafo no debería
   * saber que hay una selección de token o un menú abierto que invalidated.
   */
  onHistoryStep?: () => void;
}

export interface UseSceneGraphResult {
  graphRef: SceneGraph;
  sceneItems: SceneItem[];
  handleItemsChange: (items: SceneItem[]) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Grafo de escena del VTT más su historial de cambios.
 *
 * Son dos responsabilidades que cambian por motivos distintos y por eso
 * viven juntas: el grafo (qué hay en la escena) y el historial (qué se puede
 * deshacer y cuándo se persiste). `handleItemsChange` es el único punto de
 * entrada para mutar — llama a los 23 sitios que hoy tocan el grafo— y ahí es
 * donde se decide si el cambio entra al historial y si se guarda.
 */
export function useSceneGraph({
  campaignId,
  sceneId,
  onHistoryStep,
}: UseSceneGraphOptions): UseSceneGraphResult {
  const [sceneItems, setSceneItems] = useState<SceneItem[]>([]);
  const [graphRef] = useState(() => new SceneGraph());

  const undoStackRef = useRef<SceneItem[][]>([]);
  const redoStackRef = useRef<SceneItem[][]>([]);
  const sceneItemsRef = useRef<SceneItem[]>([]);
  const applyingHistoryRef = useRef(false);
  const lastUndoAtRef = useRef(0);
  const saveTimerRef = useRef<number>(0);
  // Los botones de deshacer/rehacer leen los stacks para el estado `disabled`.
  // Sin este bump no habría re-render cuando cambian.
  const [, setUndoBump] = useState(0);

  useEffect(() => {
    if (!campaignId || !sceneId) return;
    api.scenes
      .getItems(campaignId, sceneId)
      .then(({ items }) => {
        graphRef.clear();
        items.forEach((item: SceneItem) => graphRef.addItem(item));
        setSceneItems(graphRef.getItems());
      })
      .catch(() => setSceneItems([]));
  }, [campaignId, sceneId, graphRef]);

  useEffect(() => () => window.clearTimeout(saveTimerRef.current), []);

  const pushUndo = useCallback((prev: SceneItem[]) => {
    const now = Date.now();
    const top = undoStackRef.current[undoStackRef.current.length - 1];
    const coalesce = top && sameIds(top, prev) && now - lastUndoAtRef.current < COALESCE_MS;
    if (coalesce) {
      undoStackRef.current[undoStackRef.current.length - 1] = prev;
    } else {
      undoStackRef.current.push(prev);
      if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    }
    lastUndoAtRef.current = now;
    redoStackRef.current = [];
    setUndoBump((c) => c + 1);
  }, []);

  const applyHistoryItems = useCallback(
    (items: SceneItem[]) => {
      applyingHistoryRef.current = true;
      graphRef.clear();
      items.forEach((item) => graphRef.addItem(item));
      sceneItemsRef.current = items;
      setSceneItems([...items]);
      if (campaignId && sceneId) {
        api.scenes.saveItems(campaignId, sceneId, items).catch(() => {});
      }
      applyingHistoryRef.current = false;
    },
    [campaignId, sceneId, graphRef],
  );

  /**
   * Nota: el callback se invoca solo al deshacer, igual que antes. Rehacer no
   * limpia la selección — parece una inconsistencia del original, pero
   * cambiarla acá sería cambiar comportamiento sin que nadie lo pida.
   */
  const handleUndo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(snapshotOf(sceneItemsRef.current));
    onHistoryStep?.();
    applyHistoryItems(prev);
    setUndoBump((c) => c + 1);
  }, [applyHistoryItems, onHistoryStep]);

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(snapshotOf(sceneItemsRef.current));
    applyHistoryItems(next);
    setUndoBump((c) => c + 1);
  }, [applyHistoryItems]);

  const handleItemsChange = useCallback(
    (items: SceneItem[]) => {
      const prev = sceneItemsRef.current;
      if (
        !applyingHistoryRef.current &&
        prev.length > 0 &&
        JSON.stringify(prev) !== JSON.stringify(items)
      ) {
        pushUndo(snapshotOf(prev));
      }
      sceneItemsRef.current = [...items];
      setSceneItems([...items]);
      if (campaignId && sceneId) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(() => {
          api.scenes.saveItems(campaignId, sceneId, items).catch(() => {});
        }, SAVE_DEBOUNCE_MS);
      }
    },
    [campaignId, sceneId, pushUndo],
  );

  return {
    graphRef,
    sceneItems,
    handleItemsChange,
    handleUndo,
    handleRedo,
    canUndo: undoStackRef.current.length > 0,
    canRedo: redoStackRef.current.length > 0,
  };
}
