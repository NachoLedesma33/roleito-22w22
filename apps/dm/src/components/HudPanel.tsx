import { useRef, useCallback, useState } from 'react';

interface HudPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  defaultX?: number;
  defaultY?: number;
  width?: number;
  className?: string;
}

export default function HudPanel({
  title,
  onClose,
  children,
  defaultX = 100,
  defaultY = 100,
  width = 300,
  className = '',
}: HudPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!panelRef.current) return;
      e.preventDefault();
      dragOffset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={panelRef}
      className={`fixed z-20 bg-[var(--bg-primary)]/95 backdrop-blur border border-[var(--bg-tertiary)] rounded-lg shadow-lg flex flex-col ${className}`}
      style={{
        left: pos.x,
        top: pos.y,
        width,
        maxHeight: '70vh',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-[var(--bg-tertiary)] cursor-grab active:cursor-grabbing shrink-0"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm leading-none"
        >
          ×
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">{children}</div>
    </div>
  );
}
