import { useMinimizedPanels } from './HudPanel';

export default function MinimizedBar() {
  const panels = useMinimizedPanels();

  if (panels.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-wrap justify-end gap-2 max-w-[40vw]">
      {panels.map((p) => (
        <button
          key={p.panelId}
          onClick={p.onRestore}
          className="px-3 py-1.5 bg-[var(--bg-primary)] [backdrop-filter:blur(2px)] border border-[var(--bg-tertiary)] rounded-full text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors shadow-lg"
        >
          {p.title}
        </button>
      ))}
    </div>
  );
}
