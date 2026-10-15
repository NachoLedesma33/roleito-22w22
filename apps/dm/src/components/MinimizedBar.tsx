import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMinimizedPanels } from './HudPanel';
import type { MinimizedCorner } from './HudPanel';

const STAGE_SELECTOR = '[data-hud-stage]';

const CORNER_STYLE: Record<MinimizedCorner, React.CSSProperties> = {
  'top-left': { position: 'absolute', left: 10, top: 10, alignItems: 'flex-start' },
  'top-right': { position: 'absolute', right: 10, top: 10, alignItems: 'flex-end' },
  'bottom-left': { position: 'absolute', left: 10, bottom: 10, alignItems: 'flex-start' },
  'bottom-right': { position: 'absolute', right: 10, bottom: 10, alignItems: 'flex-end' },
};

function useStageEl(): HTMLElement | null {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // El MinimizedBar se monta después que la zona de juego: un tick alcanza.
    setEl(document.querySelector<HTMLElement>(STAGE_SELECTOR));
  }, []);
  return el;
}

export default function MinimizedBar() {
  const panels = useMinimizedPanels();
  const stage = useStageEl();

  if (panels.length === 0) return null;

  // Un contenedor por esquina: cada chip queda donde se minimizó su panel.
  const byCorner = new Map<MinimizedCorner, typeof panels>();
  for (const p of panels) {
    const list = byCorner.get(p.corner);
    if (list) list.push(p);
    else byCorner.set(p.corner, [p]);
  }

  // Sin zona de juego markuppeada: al body, con offsets de viewport.
  const target = stage ?? document.body;
  const styleFor = (corner: MinimizedCorner): React.CSSProperties => {
    if (stage) return CORNER_STYLE[corner];
    const [vertical, horizontal] = corner.split('-');
    return {
      position: 'fixed',
      [vertical === 'top' ? 'top' : 'bottom']: 10,
      [horizontal === 'left' ? 'left' : 'right']: 10,
      alignItems: horizontal === 'left' ? 'flex-start' : 'flex-end',
    } as React.CSSProperties;
  };

  return createPortal(
    <>
      {Array.from(byCorner.entries()).map(([corner, group]) => (
        <div
          key={corner}
          data-testid={`minimized-${corner}`}
          className="z-30 flex flex-col gap-2 pointer-events-none"
          style={styleFor(corner)}
        >
          {group.map((p) => (
            <button
              key={p.panelId}
              onClick={p.onRestore}
              className="pointer-events-auto px-3 py-1.5 bg-[var(--bg-primary)] [backdrop-filter:blur(2px)] border border-[var(--bg-tertiary)] rounded-full text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors shadow-lg whitespace-nowrap"
            >
              {p.title}
            </button>
          ))}
        </div>
      ))}
    </>,
    target,
  );
}
