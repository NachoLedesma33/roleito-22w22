import { useMinimizedPanels } from './HudPanel';
import type { MinimizedCorner } from './HudPanel';

const CORNER_POS: Record<MinimizedCorner, string> = {
  'top-left': 'top-4 left-4 items-start',
  'top-right': 'top-4 right-4 items-end',
  'bottom-left': 'bottom-4 left-4 items-start',
  'bottom-right': 'bottom-4 right-4 items-end',
};

export default function MinimizedBar() {
  const panels = useMinimizedPanels();

  if (panels.length === 0) return null;

  // Un contenedor por esquina: cada chip queda donde se minimizó su panel.
  const byCorner = new Map<MinimizedCorner, typeof panels>();
  for (const p of panels) {
    const list = byCorner.get(p.corner);
    if (list) list.push(p);
    else byCorner.set(p.corner, [p]);
  }

  return (
    <>
      {Array.from(byCorner.entries()).map(([corner, group]) => (
        <div
          key={corner}
          data-testid={`minimized-${corner}`}
          className={`fixed ${CORNER_POS[corner]} z-30 flex flex-col gap-2 max-w-[40vw]`}
        >
          {group.map((p) => (
            <button
              key={p.panelId}
              onClick={p.onRestore}
              className="px-3 py-1.5 bg-[var(--bg-primary)] [backdrop-filter:blur(2px)] border border-[var(--bg-tertiary)] rounded-full text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors shadow-lg whitespace-nowrap"
            >
              {p.title}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
