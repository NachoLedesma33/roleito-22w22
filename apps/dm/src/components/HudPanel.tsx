import { useRef, useCallback, useState, useEffect, createContext, useContext } from 'react';

interface HudPanelProps {
  title: string;
  panelId: string;
  onClose: () => void;
  children: React.ReactNode;
  defaultX?: number;
  defaultY?: number;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  className?: string;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const MIN_HEIGHT = 150;
const BASE_Z = 20;
let nextZ = BASE_Z;
const STORAGE_PREFIX = 'roleito:hud:';
const EDGE = 6;
const SNAP = 20;

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

function snap(v: number): number {
  return Math.round(v / SNAP) * SNAP;
}

function loadSize(panelId: string): { width: number; height: number } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${panelId}:size`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSize(panelId: string, width: number, height: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${panelId}:size`, JSON.stringify({ width, height }));
  } catch {}
}

function loadPosition(panelId: string): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${panelId}:pos`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function savePosition(panelId: string, x: number, y: number) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${panelId}:pos`, JSON.stringify({ x, y }));
  } catch {}
}

const CURSORS: Record<ResizeEdge, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
};

// Global minimize registry
type MinimizedEntry = { panelId: string; title: string; onRestore: () => void };
let minimizedListeners: Array<() => void> = [];
let minimizedMap = new Map<string, MinimizedEntry>();

function emitMinimizedChange() {
  minimizedListeners.forEach((l) => l());
}

export function useMinimizedPanels(): MinimizedEntry[] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    minimizedListeners.push(listener);
    return () => {
      minimizedListeners = minimizedListeners.filter((l) => l !== listener);
    };
  }, []);
  return Array.from(minimizedMap.values());
}

function registerMinimized(entry: MinimizedEntry) {
  minimizedMap.set(entry.panelId, entry);
  emitMinimizedChange();
}

function unregisterMinimized(panelId: string) {
  minimizedMap.delete(panelId);
  emitMinimizedChange();
}

export default function HudPanel({
  title,
  panelId,
  onClose,
  children,
  defaultX = 100,
  defaultY = 100,
  defaultWidth = 300,
  minWidth = MIN_WIDTH,
  maxWidth = MAX_WIDTH,
  minHeight = MIN_HEIGHT,
  className = '',
}: HudPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const saved = useRef(loadSize(panelId));
  const savedPos = useRef(loadPosition(panelId));

  const [pos, setPos] = useState({
    x: savedPos.current?.x ?? defaultX,
    y: savedPos.current?.y ?? defaultY,
  });
  const [size, setSize] = useState({
    width: saved.current?.width ?? defaultWidth,
    height: saved.current?.height ?? 300,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<ResizeEdge | null>(null);
  const [zIndex, setZIndex] = useState(BASE_Z);
  const [minimized, setMinimized] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, px: 0, py: 0 });

  const bringToFront = useCallback(() => {
    nextZ++;
    setZIndex(nextZ);
  }, []);

  useEffect(() => {
    saveSize(panelId, size.width, size.height);
  }, [panelId, size.width, size.height]);

  useEffect(() => {
    savePosition(panelId, pos.x, pos.y);
  }, [panelId, pos.x, pos.y]);

  const handleMinimize = useCallback(() => {
    setMinimized(true);
    registerMinimized({
      panelId,
      title,
      onRestore: () => setMinimized(false),
    });
  }, [panelId, title]);

  useEffect(() => {
    if (!minimized) {
      unregisterMinimized(panelId);
    }
  }, [minimized, panelId]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!panelRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      bringToFront();
      dragOffset.current = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pos, bringToFront]
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
    if (isDragging) {
      setPos((p) => ({ x: snap(p.x), y: snap(p.y) }));
    }
    setIsDragging(false);
  }, [isDragging]);

  const handleResizeDown = useCallback(
    (edge: ResizeEdge) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      bringToFront();
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: size.width,
        h: size.height,
        px: pos.x,
        py: pos.y,
      };
      setResizeEdge(edge);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [size, pos, bringToFront]
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeEdge) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      const s = resizeStart.current;
      let newW = s.w;
      let newH = s.h;
      let newX = s.px;
      let newY = s.py;

      if (resizeEdge.includes('e')) newW = Math.max(minWidth, Math.min(maxWidth, s.w + dx));
      if (resizeEdge.includes('w')) {
        newW = Math.max(minWidth, Math.min(maxWidth, s.w - dx));
        newX = s.px + (s.w - newW);
      }
      if (resizeEdge.includes('s')) newH = Math.max(minHeight, s.h + dy);
      if (resizeEdge.includes('n')) {
        newH = Math.max(minHeight, s.h - dy);
        newY = s.py + (s.h - newH);
      }

      setSize({ width: newW, height: newH });
      setPos({ x: newX, y: newY });
    },
    [resizeEdge, minWidth, maxWidth, minHeight]
  );

  const handleResizeUp = useCallback(() => {
    setResizeEdge(null);
  }, []);

  if (minimized) return null;

  const edges: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

  return (
    <div
      ref={panelRef}
      className={`fixed bg-[var(--bg-primary)] backdrop-blur-sm border border-[var(--bg-tertiary)] rounded-lg shadow-lg flex flex-col ${className}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        maxHeight: '80vh',
        zIndex,
        cursor: isDragging ? 'grabbing' : resizeEdge ? CURSORS[resizeEdge] : 'default',
      }}
    >
      {/* Drag bar — invisible but functional */}
      <div
        className="absolute inset-x-0 top-0 h-6 cursor-grab active:cursor-grabbing opacity-0 group"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={handleMinimize}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs leading-none px-1"
            title="Minimize"
          >
            –
          </button>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs leading-none px-1"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 pt-2 scrollbar-none">{children}</div>

      {/* Edge/corner resize handles */}
      {edges.map((edge) => {
        const isCorner = edge.length === 2;
        const style: React.CSSProperties = { position: 'absolute', zIndex: 10 };

        if (edge.includes('n')) { style.top = -2; style.height = EDGE; }
        if (edge.includes('s')) { style.bottom = -2; style.height = EDGE; }
        if (edge.includes('e')) { style.right = -2; style.width = EDGE; }
        if (edge.includes('w')) { style.left = -2; style.width = EDGE; }

        if (isCorner) {
          style.width = EDGE * 2;
          style.height = EDGE * 2;
        } else {
          if (edge === 'n' || edge === 's') {
            style.left = EDGE * 2;
            style.right = EDGE * 2;
          } else {
            style.top = EDGE * 2;
            style.bottom = EDGE * 2;
          }
        }

        return (
          <div
            key={edge}
            className={`opacity-0 hover:opacity-100 transition-opacity ${resizeEdge === edge ? '!opacity-100' : ''}`}
            style={{ ...style, cursor: CURSORS[edge] }}
            onPointerDown={handleResizeDown(edge)}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeUp}
          />
        );
      })}
    </div>
  );
}
