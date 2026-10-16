import { useCallback, useEffect, useState } from 'react';

export interface AnchorRect {
  left: number;
  top: number;
}

export interface UseAnchoredMenuOptions {
  /** Si el menú está abierto: define si se registra el cierre por click fuera / Escape. */
  open: boolean;
  onClose: () => void;
  /**
   * Identificador del disparador. El click dentro de `[data-anchor="<id>"]` o
   * del propio menú no cuenta como "afuera", así que no se cierra al navegar
   * sus propios controles.
   */
  anchorId: string;
  /** `start` alinea el borde izquierdo con el del botón; `end` alinea el derecho. */
  align?: 'start' | 'end';
  /** Ancho del menú; solo lo necesita `align: 'end'` para calcular el lado derecho. */
  width?: number;
  /** Separación respecto del borde inferior del botón. Puede ser negativa. */
  gap?: number;
}

/** Margen mínimo contra el borde del viewport. */
const EDGE = 8;

/**
 * Posicionamiento y cierre de los menús anclados al botón que los abre.
 *
 * Antes cada menú repetía el `getBoundingClientRect` + estado de rect + portal,
 * y el cierre por click afuera estaba en tres efectos distintos con tres
 * selectores distintos. Acá queda un solo mecanismo; el contenido del menú no
 * se toca.
 *
 * El hook NO guarda el estado de apertura: lo maneja el dueño, que puede
 * necesitar exclusivity mutua entre varios menús.
 */
export function useAnchoredMenu({
  open,
  onClose,
  anchorId,
  align = 'start',
  width = 0,
  gap = 0,
}: UseAnchoredMenuOptions) {
  const [rect, setRect] = useState<AnchorRect | null>(null);

  /** Calcula dónde abrir y guarda el rect. Devolverlo permite encadenar el toggle. */
  const anchorFrom = useCallback(
    (el: HTMLElement): AnchorRect => {
      const r = el.getBoundingClientRect();
      const next: AnchorRect = {
        left: Math.max(EDGE, align === 'end' ? r.right - width : r.left),
        top: r.bottom + gap,
      };
      setRect(next);
      return next;
    },
    [align, width, gap],
  );

  useEffect(() => {
    if (!open) return;
    const inside = `closest('[data-anchor="${anchorId}"],[data-anchored-menu="${anchorId}"]')`;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.(inside)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, anchorId]);

  return { rect, anchorFrom };
}
