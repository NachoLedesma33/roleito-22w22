import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { AnchorRect } from '@/lib/useAnchoredMenu';

interface AnchoredMenuProps {
  open: boolean;
  /** Viene de `useAnchoredMenu`. `null` mantiene el menú fuera de pantalla. */
  rect: AnchorRect | null;
  /** Debe coincidir con el `anchorId` del hook, para que el click dentro no cierre. */
  anchorId: string;
  testId: string;
  minWidth: number;
  children: ReactNode;
}

/**
 * Menú emergente anclado a un botón, renderizado en `document.body` para que
 * el `overflow` del panel que lo contiene no lo recorte. Solo presentación:
 * el posicionamiento y el cierre por click afuera son de `useAnchoredMenu`.
 */
export default function AnchoredMenu({
  open,
  rect,
  anchorId,
  testId,
  minWidth,
  children,
}: AnchoredMenuProps) {
  if (!open) return null;
  return createPortal(
    <div
      role="menu"
      data-testid={testId}
      data-anchored-menu={anchorId}
      className="fixed bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg z-50 py-0.5"
      style={{ left: rect?.left ?? -9999, top: rect?.top ?? -9999, minWidth }}
    >
      {children}
    </div>,
    document.body,
  );
}
