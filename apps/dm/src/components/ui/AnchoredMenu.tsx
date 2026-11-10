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
  if (!open || !rect) return null;

  const menuMaxH = Math.round(window.innerHeight * 0.6);
  const spaceBelow = window.innerHeight - rect.top;
  const flipUp = spaceBelow < menuMaxH && rect.top > menuMaxH;

  const style: React.CSSProperties = {
    left: rect.left,
    minWidth,
    maxHeight: '60vh',
    overflowY: 'auto',
  };

  if (flipUp) {
    style.bottom = window.innerHeight - rect.top;
  } else {
    style.top = rect.top;
  }

  return createPortal(
    <div
      role="menu"
      data-testid={testId}
      data-anchored-menu={anchorId}
      className="fixed bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] rounded shadow-lg z-50 py-0.5"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}